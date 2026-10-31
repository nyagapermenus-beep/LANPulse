# LANPulse Enterprise — Network Monitoring MVP

LANPulse is a browser-based network monitoring application for an authorised local network. It gives an ICT or network administrator one place to review registered devices, check reachability, inspect latency, test selected TCP services, track availability events and export a basic report.

## Important: two ways to run the project

### A. Open the web demo (no Python required)

1. Extract the ZIP file.
2. Open the extracted `LANPulse_Enterprise_v3` folder.
3. Double-click **`index.html`**.
4. The dashboard opens in your browser in **Demonstration mode**.

This mode uses clearly labelled synthetic sample data. It is suitable for screenshots, a presentation or a static hosting preview. It does **not** ping real devices.

You can also publish the root `index.html` and `assets/` folder to GitHub Pages. GitHub Pages only hosts static files, so it will remain a demonstration and cannot run the Python monitoring backend.

### B. Run live device monitoring (Python backend required)

The live mode requires Python 3.10 or newer and an internet connection for the first-time Flask installation.

**Windows**

1. Extract the ZIP.
2. Double-click `run_windows.bat`.
3. Allow it to create a virtual environment and install Flask when needed.
4. Keep the terminal window open.
5. Visit <http://127.0.0.1:5000> in Chrome or another browser.

**Kali Linux**

Open a terminal in the extracted project folder and run:

```bash
chmod +x run_kali.sh
./run_kali.sh
```

Then visit <http://127.0.0.1:5000>.

If Kali reports that `venv` is unavailable, install the required system packages:

```bash
sudo apt update
sudo apt install python3 python3-venv python3-pip iputils-ping
```

Then run `./run_kali.sh` again.

## Using live mode

1. Open **Settings → Monitoring**.
2. Select **Live monitoring** and save.
3. Open **Devices → Add device**.
4. Register a device's private IPv4 address, type, location and monitoring method.
5. Use **Run checks** or wait for the automatic monitoring interval.
6. Review device status, response time, selected TCP ports and generated alerts.

Only devices you own or are authorised to monitor should be registered. The MVP accepts private IPv4 ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) and loopback. It does not perform automatic subnet discovery or scan the whole network.

### Monitoring methods

- **ICMP:** sends one ping to check host reachability and estimate round-trip time.
- **TCP:** attempts connections to the specific ports configured for that device. A successful TCP connection means that the selected service port accepted a connection; it is not a complete security or application-health test.
- **ICMP + TCP:** reports a device online when either the ping responds or at least one configured TCP port accepts a connection.

A failed ICMP check alone does not prove a device is powered off. Firewalls may block ping. For devices that block ICMP, choose TCP and configure a port for a service that should be listening.

## Features in this MVP

- Responsive dashboard with device health, availability and latency summaries.
- Device registration, filtering, detail view and removal.
- ICMP and selected TCP port checks in live mode.
- Configurable parent device relationships and a topology view.
- Offline, recovery and high-latency alerts.
- Acknowledgement of alerts.
- SQLite history and CSV export in backend mode.
- Standalone synthetic demo mode for GitHub Pages and presentations.
- Input validation that limits live targets to authorised private/loopback IPv4 addresses.

## Project structure

```text
LANPulse_Enterprise_v3/
├── index.html                 # Main page; also works as static demo
├── assets/
│   ├── app.js                 # Dashboard behaviour and demo/live API client
│   └── styles.css             # Responsive application styling
├── backend/
│   ├── app.py                 # Flask API and local monitoring service
│   ├── network_core.py        # IP/port validation and status logic
│   ├── requirements.txt       # Python dependencies
│   ├── instance/              # SQLite database created at runtime
│   └── tests/
│       └── test_network_core.py
├── docs/
├── run_windows.bat
├── run_kali.sh
├── LICENSE
└── README.md
```

## Tests

The pure network validation and decision logic can be tested without Flask:

```bash
python -m unittest discover -s backend/tests -v
```

To run the backend, install the dependency first:

```bash
python -m pip install -r backend/requirements.txt
python backend/app.py
```

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check service availability |
| GET | `/api/dashboard` | Return devices, alerts and monitoring history |
| POST | `/api/devices` | Register a device |
| DELETE | `/api/devices/<id>` | Remove a device |
| POST | `/api/devices/<id>/check` | Check one registered device |
| POST | `/api/check-all` | Check all devices in the current mode |
| POST | `/api/mode` | Switch between demo and live monitoring |
| POST | `/api/alerts/<id>/ack` | Acknowledge an alert |
| GET | `/api/export.csv` | Export current device status to CSV |

## Limitations and next development steps

This is a functional MVP, not a production network-management platform. The current live backend supports ICMP reachability and selected TCP port checks. SNMP interface counters, bandwidth utilisation, automatic discovery, user accounts/roles, email notifications, multi-site management and production deployment hardening are not implemented in this version.

The Flask development server binds to `127.0.0.1` by default. Do not expose it directly to the public internet. It does not include user authentication or HTTPS. Keep it local while evaluating the MVP. Production use would require authenticated access, HTTPS, hardened deployment, secret management, access logging, stronger data retention controls and a proper monitoring worker.

## Licence

MIT. See `LICENSE`.
