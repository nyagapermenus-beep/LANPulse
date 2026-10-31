from __future__ import annotations

import csv
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
import io
import json
import math
import os
import platform
import re
import socket
import sqlite3
import subprocess
import threading
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from flask import Flask, Response, jsonify, request, send_from_directory
from network_core import evaluate_status, parse_ports, validate_private_ipv4

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
INSTANCE_DIR = BASE_DIR / "instance"
INSTANCE_DIR.mkdir(exist_ok=True)
DB_PATH = Path(os.environ.get("LANPULSE_DB", INSTANCE_DIR / "lanpulse.db"))
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
POLL_INTERVAL = max(10, int(os.environ.get("LANPULSE_INTERVAL", "30")))
PING_TIMEOUT_MS = max(300, min(5000, int(os.environ.get("LANPULSE_PING_TIMEOUT_MS", "1000"))))
HIGH_LATENCY_MS = float(os.environ.get("LANPULSE_HIGH_LATENCY_MS", "200"))
MAX_DEVICES = 250
ALLOWED_TYPES = {"Router", "Switch", "Server", "Workstation", "Printer", "Access Point", "Firewall", "Other"}
ALLOWED_METHODS = {"icmp", "tcp", "both"}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def db_connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


@contextmanager
def db_session():
    conn = db_connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def ping_device(ip_address: str, timeout_ms: int = PING_TIMEOUT_MS) -> tuple[bool, float | None, str]:
    """Send one ping to a registered private IPv4 address. Never invokes a shell."""
    if platform.system().lower().startswith("win"):
        command = ["ping", "-n", "1", "-w", str(timeout_ms), ip_address]
    else:
        command = ["ping", "-c", "1", "-W", str(max(1, math.ceil(timeout_ms / 1000))), ip_address]
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=(timeout_ms / 1000) + 2, check=False)
        output = (result.stdout or "") + " " + (result.stderr or "")
        ok = result.returncode == 0
        match = re.search(r"time[=<]\s*([0-9.]+)\s*ms", output, re.IGNORECASE)
        latency = float(match.group(1)) if match else (1.0 if ok else None)
        return ok, latency, "ICMP reply received" if ok else "No ICMP reply"
    except FileNotFoundError:
        return False, None, "Ping utility not found on this host"
    except subprocess.TimeoutExpired:
        return False, None, "Ping timed out"
    except Exception as exc:
        return False, None, f"Ping error: {type(exc).__name__}"


def check_tcp_ports(ip_address: str, ports: list[int], timeout: float = 0.8) -> tuple[list[int], float | None]:
    def probe(port: int) -> tuple[int, float | None]:
        started = time.perf_counter()
        try:
            with socket.create_connection((ip_address, port), timeout=timeout):
                return port, (time.perf_counter() - started) * 1000
        except (OSError, TimeoutError):
            return port, None
    if not ports:
        return [], None
    # Bounded concurrency keeps the time for a multi-port check close to one timeout.
    with ThreadPoolExecutor(max_workers=min(5, len(ports))) as pool:
        results = list(pool.map(probe, ports))
    opened = [port for port, latency in results if latency is not None]
    timings = [latency for _, latency in results if latency is not None]
    return opened, (sum(timings) / len(timings) if timings else None)


def init_db() -> None:
    with db_session() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS devices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            ip_address TEXT NOT NULL UNIQUE,
            device_type TEXT NOT NULL DEFAULT 'Other',
            location TEXT NOT NULL DEFAULT '',
            parent_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
            check_method TEXT NOT NULL DEFAULT 'both',
            ports_json TEXT NOT NULL DEFAULT '[80,443]',
            is_sample INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS measurements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
            checked_at TEXT NOT NULL,
            status TEXT NOT NULL,
            latency_ms REAL,
            detail TEXT NOT NULL DEFAULT '',
            open_ports_json TEXT NOT NULL DEFAULT '[]'
        );
        CREATE INDEX IF NOT EXISTS idx_measurements_device_time ON measurements(device_id, checked_at);
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
            event_type TEXT NOT NULL,
            severity TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT NOT NULL,
            acknowledged INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);
        CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        """)
        device_columns = {row[1] for row in conn.execute("PRAGMA table_info(devices)").fetchall()}
        if "is_sample" not in device_columns:
            conn.execute("ALTER TABLE devices ADD COLUMN is_sample INTEGER NOT NULL DEFAULT 0")
        conn.execute("INSERT OR IGNORE INTO settings(key,value) VALUES('mode','demo')")
        if conn.execute("SELECT COUNT(*) FROM devices WHERE is_sample=1").fetchone()[0] == 0 and conn.execute("SELECT COUNT(*) FROM devices").fetchone()[0] == 0:
            seed_demo_data(conn)


def seed_demo_data(conn: sqlite3.Connection) -> None:
    sample = [
        ("HQ Edge Router", "192.0.2.1", "Router", "HQ / Server Room", None, "both", [22, 80, 443]),
        ("Core Switch 01", "192.0.2.2", "Switch", "HQ / Server Room", "192.0.2.1", "icmp", []),
        ("Distribution Switch 02", "192.0.2.3", "Switch", "HQ / Floor 2", "192.0.2.2", "icmp", []),
        ("Directory Server", "192.0.2.10", "Server", "HQ / Server Room", "192.0.2.2", "both", [53, 88, 389, 443]),
        ("ERP Application Server", "192.0.2.20", "Server", "HQ / Server Room", "192.0.2.2", "tcp", [443, 8443]),
        ("Backup Server", "192.0.2.30", "Server", "DR Room", "192.0.2.2", "both", [22, 443]),
        ("Finance Workstation", "192.0.2.41", "Workstation", "HQ / Finance", "192.0.2.3", "icmp", []),
        ("Wireless Access Point 03", "192.0.2.50", "Access Point", "HQ / Floor 2", "192.0.2.3", "both", [80, 443]),
    ]
    ids: dict[str, int] = {}
    for name, ip, kind, location, parent_ip, method, ports in sample:
        cur = conn.execute(
            "INSERT INTO devices(name,ip_address,device_type,location,parent_id,check_method,ports_json,is_sample,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
            (name, ip, kind, location, None, method, json.dumps(ports), 1, utc_now()),
        )
        ids[ip] = int(cur.lastrowid)
    for _, ip, _, _, parent_ip, _, _ in sample:
        if parent_ip:
            conn.execute("UPDATE devices SET parent_id=? WHERE id=?", (ids[parent_ip], ids[ip]))
    # Seed clearly simulated 24-hour history to make the initial demonstration useful.
    rng_seed = 20261031
    import random
    rng = random.Random(rng_seed)
    status_map = {"192.0.2.1": True, "192.0.2.2": True, "192.0.2.3": True, "192.0.2.10": True,
                  "192.0.2.20": True, "192.0.2.30": False, "192.0.2.41": True, "192.0.2.50": True}
    for ip, device_id in ids.items():
        for step in range(24):
            when = (datetime.now(timezone.utc) - timedelta(hours=23 - step)).isoformat(timespec="seconds")
            online = status_map[ip]
            if ip == "192.0.2.30" and step < 21:
                online = True
            if ip == "192.0.2.20" and step in (8, 9, 10):
                online = False
            latency = round(rng.uniform(5, 35), 1) if online else None
            if ip == "192.0.2.20" and step in (5, 6, 7):
                latency = round(rng.uniform(230, 310), 1)
            detail = "Simulated ICMP/TCP check" if online else "Simulated timeout — demonstration data"
            conn.execute("INSERT INTO measurements(device_id,checked_at,status,latency_ms,detail,open_ports_json) VALUES(?,?,?,?,?,?)",
                         (device_id, when, "online" if online else "offline", latency, detail, json.dumps([])))
    now = utc_now()
    conn.execute("INSERT INTO alerts(device_id,event_type,severity,message,created_at) VALUES(?,?,?,?,?)",
                 (ids["192.0.2.30"], "device_down", "critical", "Backup Server has not responded to monitoring checks.", now))
    conn.execute("INSERT INTO alerts(device_id,event_type,severity,message,created_at) VALUES(?,?,?,?,?)",
                 (ids["192.0.2.20"], "high_latency", "warning", "ERP Application Server recorded latency above the 200 ms threshold.",
                  (datetime.now(timezone.utc) - timedelta(minutes=34)).isoformat(timespec="seconds")))
    conn.execute("INSERT INTO alerts(device_id,event_type,severity,message,created_at) VALUES(?,?,?,?,?)",
                 (ids["192.0.2.41"], "recovered", "info", "Finance Workstation recovered after a simulated connectivity interruption.",
                  (datetime.now(timezone.utc) - timedelta(minutes=88)).isoformat(timespec="seconds")))


def current_mode(conn: sqlite3.Connection) -> str:
    row = conn.execute("SELECT value FROM settings WHERE key='mode'").fetchone()
    return row[0] if row else "demo"


def get_device_rows(conn: sqlite3.Connection, mode: str) -> list[dict[str, Any]]:
    rows = conn.execute("""
        SELECT d.*, m.checked_at AS last_checked, m.status, m.latency_ms, m.detail, m.open_ports_json
        FROM devices d
        LEFT JOIN measurements m ON m.id=(SELECT MAX(m2.id) FROM measurements m2 WHERE m2.device_id=d.id)
        WHERE (?='demo' OR d.is_sample=0)
        ORDER BY d.name COLLATE NOCASE
    """, (mode,)).fetchall()
    result = []
    for row in rows:
        item = dict(row)
        item["ports"] = json.loads(item.pop("ports_json"))
        item["open_ports"] = json.loads(item.pop("open_ports_json") or "[]")
        item["status"] = item["status"] or "unknown"
        result.append(item)
    return result


def record_measurement(device_id: int, status_ok: bool, latency: float | None, detail: str, open_ports: list[int]) -> None:
    with db_session() as conn:
        previous = conn.execute("SELECT status,latency_ms FROM measurements WHERE device_id=? ORDER BY id DESC LIMIT 1", (device_id,)).fetchone()
        status = "online" if status_ok else "offline"
        conn.execute("INSERT INTO measurements(device_id,checked_at,status,latency_ms,detail,open_ports_json) VALUES(?,?,?,?,?,?)",
                     (device_id, utc_now(), status, latency, detail, json.dumps(open_ports)))
        if previous is None:
            if not status_ok:
                add_alert(conn, device_id, "device_down", "critical", "Device did not respond to its first monitoring check.")
        elif previous["status"] != status:
            if status == "offline":
                add_alert(conn, device_id, "device_down", "critical", "Device became unreachable during monitoring.")
            else:
                add_alert(conn, device_id, "recovered", "info", "Device is responding again after a connectivity interruption.")
        was_high = previous is not None and previous["latency_ms"] is not None and previous["latency_ms"] >= HIGH_LATENCY_MS
        is_high = latency is not None and latency >= HIGH_LATENCY_MS and status_ok
        if is_high and not was_high:
            add_alert(conn, device_id, "high_latency", "warning", f"Response time rose to {latency:.1f} ms (threshold: {HIGH_LATENCY_MS:.0f} ms).")


def add_alert(conn: sqlite3.Connection, device_id: int, event_type: str, severity: str, message: str) -> None:
    conn.execute("INSERT INTO alerts(device_id,event_type,severity,message,created_at) VALUES(?,?,?,?,?)",
                 (device_id, event_type, severity, message, utc_now()))


def check_one(device: dict[str, Any], demo: bool = False) -> dict[str, Any]:
    if demo:
        # Reproducible-looking but clearly labelled sample outcomes; never presented as live data.
        n = int(device["id"])
        online = (n % 7) != 6
        latency = round(7 + (n * 13 % 47), 1) if online else None
        ports = device.get("ports", [])
        open_ports = ports[:1] if device.get("check_method") in ("tcp", "both") and online else []
        return {"online": online, "latency_ms": latency, "detail": "Simulated demonstration check", "open_ports": open_ports}
    ip = validate_private_ipv4(device["ip_address"])
    ports = device.get("ports", [])
    ping_ok, ping_latency, ping_detail = ping_device(ip)
    open_ports, tcp_latency = check_tcp_ports(ip, ports) if device.get("check_method") in ("tcp", "both") else ([], None)
    method = device.get("check_method", "both")
    online = evaluate_status(method, ping_ok, open_ports)
    latency = ping_latency if ping_ok else tcp_latency
    details = []
    if method in ("icmp", "both"):
        details.append(ping_detail)
    if method in ("tcp", "both"):
        details.append("Open TCP ports: " + (", ".join(map(str, open_ports)) if open_ports else "none"))
    return {"online": online, "latency_ms": latency, "detail": "; ".join(details), "open_ports": open_ports}


def check_device_id(device_id: int, demo: bool = False) -> None:
    with db_session() as conn:
        row = conn.execute("SELECT * FROM devices WHERE id=?", (device_id,)).fetchone()
    if row is None:
        return
    device = dict(row)
    device["ports"] = json.loads(device.pop("ports_json"))
    outcome = check_one(device, demo=demo)
    record_measurement(device_id, outcome["online"], outcome["latency_ms"], outcome["detail"], outcome["open_ports"])


def poll_all() -> None:
    with db_session() as conn:
        demo = current_mode(conn) == "demo"
        devices = [dict(row) for row in conn.execute("SELECT * FROM devices WHERE (?='demo' OR is_sample=0)", ("demo" if demo else "live",)).fetchall()]
    def run_one(device: dict[str, Any]) -> None:
        device["ports"] = json.loads(device.pop("ports_json"))
        try:
            outcome = check_one(device, demo=demo)
            record_measurement(device["id"], outcome["online"], outcome["latency_ms"], outcome["detail"], outcome["open_ports"])
        except Exception as exc:
            record_measurement(device["id"], False, None, f"Monitoring error: {type(exc).__name__}", [])
    with ThreadPoolExecutor(max_workers=min(16, max(1, len(devices)))) as pool:
        list(pool.map(run_one, devices))


def monitor_worker(stop_event: threading.Event) -> None:
    while not stop_event.is_set():
        try:
            with db_session() as conn:
                mode = current_mode(conn)
            if mode == "live":
                poll_all()
        except Exception:
            # Keep the monitor alive; details are intentionally not exposed to the browser.
            pass
        stop_event.wait(POLL_INTERVAL)


def dashboard_payload() -> dict[str, Any]:
    with db_session() as conn:
        mode = current_mode(conn)
        devices = get_device_rows(conn, mode)
        total = len(devices)
        online = sum(1 for d in devices if d["status"] == "online")
        offline = sum(1 for d in devices if d["status"] == "offline")
        known_latencies = [d["latency_ms"] for d in devices if d["latency_ms"] is not None]
        avg_latency = round(sum(known_latencies) / len(known_latencies), 1) if known_latencies else None
        alert_rows = conn.execute("""
            SELECT a.*, d.name AS device_name, d.ip_address
            FROM alerts a JOIN devices d ON d.id=a.device_id
            WHERE (?='demo' OR d.is_sample=0)
            ORDER BY a.acknowledged ASC, a.created_at DESC LIMIT 12
        """, (mode,)).fetchall()
        alerts = [dict(row) for row in alert_rows]
        history = conn.execute("""
            SELECT strftime('%Y-%m-%d %H:00', checked_at) AS hour,
                   ROUND(AVG(latency_ms),1) AS avg_latency,
                   SUM(CASE WHEN status='offline' THEN 1 ELSE 0 END) AS offline_checks
            FROM measurements m JOIN devices d ON d.id=m.device_id
            WHERE m.checked_at >= ? AND (?='demo' OR d.is_sample=0)
            GROUP BY hour ORDER BY hour
        """, ((datetime.now(timezone.utc) - timedelta(hours=24)).isoformat(timespec="seconds"), mode)).fetchall()
        history_data = [dict(row) for row in history]
        topology = [{"id": d["id"], "name": d["name"], "ip_address": d["ip_address"], "type": d["device_type"],
                     "parent_id": d["parent_id"], "status": d["status"]} for d in devices]
        unacked = conn.execute("SELECT COUNT(*) FROM alerts a JOIN devices d ON d.id=a.device_id WHERE a.acknowledged=0 AND (?='demo' OR d.is_sample=0)", (mode,)).fetchone()[0]
        return {"mode": mode, "overview": {"total": total, "online": online, "offline": offline,
                "unknown": total - online - offline, "avg_latency": avg_latency, "open_alerts": unacked},
                "devices": devices, "alerts": alerts, "history": history_data, "topology": topology,
                "poll_interval": POLL_INTERVAL, "threshold_ms": HIGH_LATENCY_MS}


def create_app() -> Flask:
    app = Flask(__name__, static_folder=str(PROJECT_ROOT / "assets"), static_url_path="/assets")
    app.config["JSON_SORT_KEYS"] = False
    init_db()

    @app.get("/")
    def index():
        return send_from_directory(PROJECT_ROOT, "index.html")

    @app.get("/api/dashboard")
    def api_dashboard():
        return jsonify(dashboard_payload())

    @app.post("/api/devices")
    def api_add_device():
        data = request.get_json(silent=True) or {}
        try:
            name = str(data.get("name", "")).strip()
            if not name or len(name) > 80:
                raise ValueError("Device name is required and must be 80 characters or fewer.")
            ip = validate_private_ipv4(data.get("ip_address", ""))
            device_type = str(data.get("device_type", "Other"))
            if device_type not in ALLOWED_TYPES:
                raise ValueError("Choose a supported device type.")
            method = str(data.get("check_method", "both"))
            if method not in ALLOWED_METHODS:
                raise ValueError("Choose ICMP, TCP or both.")
            ports = parse_ports(data.get("ports", "80,443")) if method in ("tcp", "both") else []
            location = str(data.get("location", "")).strip()[:100]
            parent_id = data.get("parent_id")
            parent_id = int(parent_id) if parent_id not in (None, "", "none") else None
            with db_session() as conn:
                if conn.execute("SELECT COUNT(*) FROM devices").fetchone()[0] >= MAX_DEVICES:
                    raise ValueError(f"The MVP limit is {MAX_DEVICES} registered devices.")
                if parent_id is not None:
                    parent = conn.execute("SELECT is_sample FROM devices WHERE id=?", (parent_id,)).fetchone()
                    if parent is None or (current_mode(conn) == "live" and parent["is_sample"]):
                        raise ValueError("Selected parent device does not exist in the current monitoring mode.")
                cur = conn.execute("INSERT INTO devices(name,ip_address,device_type,location,parent_id,check_method,ports_json,created_at) VALUES(?,?,?,?,?,?,?,?)",
                                   (name, ip, device_type, location, parent_id, method, json.dumps(ports), utc_now()))
                device_id = int(cur.lastrowid)
                mode = current_mode(conn)
            check_device_id(device_id, demo=(mode == "demo"))
            return jsonify({"ok": True, "id": device_id}), 201
        except sqlite3.IntegrityError:
            return jsonify({"error": "That IP address is already registered."}), 409
        except (ValueError, TypeError) as exc:
            return jsonify({"error": str(exc)}), 400

    @app.delete("/api/devices/<int:device_id>")
    def api_delete_device(device_id: int):
        with db_session() as conn:
            cur = conn.execute("DELETE FROM devices WHERE id=?", (device_id,))
            if cur.rowcount == 0:
                return jsonify({"error": "Device not found."}), 404
        return jsonify({"ok": True})

    @app.post("/api/devices/<int:device_id>/check")
    def api_check_device(device_id: int):
        with db_session() as conn:
            if conn.execute("SELECT 1 FROM devices WHERE id=?", (device_id,)).fetchone() is None:
                return jsonify({"error": "Device not found."}), 404
            demo = current_mode(conn) == "demo"
        check_device_id(device_id, demo=demo)
        return jsonify({"ok": True, "mode": "demo" if demo else "live"})

    @app.post("/api/check-all")
    def api_check_all():
        poll_all()
        return jsonify({"ok": True})

    @app.post("/api/mode")
    def api_mode():
        data = request.get_json(silent=True) or {}
        mode = data.get("mode")
        if mode not in ("demo", "live"):
            return jsonify({"error": "Mode must be demo or live."}), 400
        with db_session() as conn:
            conn.execute("UPDATE settings SET value=? WHERE key='mode'", (mode,))
        if mode == "live":
            poll_all()
        return jsonify({"ok": True, "mode": mode})

    @app.post("/api/alerts/<int:alert_id>/ack")
    def api_ack_alert(alert_id: int):
        with db_session() as conn:
            cur = conn.execute("UPDATE alerts SET acknowledged=1 WHERE id=?", (alert_id,))
            if cur.rowcount == 0:
                return jsonify({"error": "Alert not found."}), 404
        return jsonify({"ok": True})

    @app.get("/api/export.csv")
    def api_export():
        with db_session() as conn:
            mode = current_mode(conn)
            rows = conn.execute("""
                SELECT d.name,d.ip_address,d.device_type,d.location,m.status,m.latency_ms,m.checked_at,m.detail
                FROM devices d LEFT JOIN measurements m ON m.id=(SELECT MAX(m2.id) FROM measurements m2 WHERE m2.device_id=d.id)
                WHERE (?='demo' OR d.is_sample=0)
                ORDER BY d.name
            """, (mode,)).fetchall()
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Device", "IP address", "Type", "Location", "Status", "Latency (ms)", "Last checked (UTC)", "Check detail"])
        writer.writerows([tuple(row) for row in rows])
        return Response(output.getvalue(), mimetype="text/csv", headers={"Content-Disposition": "attachment; filename=lanpulse-device-report.csv"})

    @app.get("/api/health")
    def api_health():
        return jsonify({"ok": True, "application": "LANPulse", "version": "0.1.0"})

    return app


app = create_app()


if __name__ == "__main__":
    stop = threading.Event()
    worker = threading.Thread(target=monitor_worker, args=(stop,), daemon=True, name="lanpulse-monitor")
    worker.start()
    host = os.environ.get("LANPULSE_HOST", "127.0.0.1")
    port = int(os.environ.get("LANPULSE_PORT", "5000"))
    with db_session() as conn:
        mode = current_mode(conn)
    print(f"LANPulse running at http://{host}:{port} | mode: {mode} | monitor interval: {POLL_INTERVAL}s")
    print("Local-use MVP: do not expose this development server directly to the public internet.")
    try:
        app.run(host=host, port=port, debug=False, threaded=True, use_reloader=False)
    finally:
        stop.set()
