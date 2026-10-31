"""Pure network-input validation and monitoring decision helpers."""
from __future__ import annotations

import ipaddress
from typing import Any


def validate_private_ipv4(value: str) -> str:
    try:
        address = ipaddress.ip_address(str(value).strip())
    except ValueError as exc:
        raise ValueError("Enter a valid IPv4 address.") from exc
    if not isinstance(address, ipaddress.IPv4Address):
        raise ValueError("Version 1 supports IPv4 addresses only.")
    permitted = (
        ipaddress.ip_network("10.0.0.0/8"),
        ipaddress.ip_network("172.16.0.0/12"),
        ipaddress.ip_network("192.168.0.0/16"),
        ipaddress.ip_network("127.0.0.0/8"),
    )
    if not any(address in network for network in permitted):
        raise ValueError("For safety, register only RFC1918 private or loopback IPv4 addresses that you are authorised to monitor.")
    return str(address)


def parse_ports(value: Any) -> list[int]:
    if value is None or str(value).strip() == "":
        return [80, 443]
    raw_items = value if isinstance(value, list) else str(value).split(",")
    if len(raw_items) > 20:
        raise ValueError("A maximum of 20 TCP ports can be configured per device.")
    ports: list[int] = []
    for item in raw_items:
        try:
            port = int(str(item).strip())
        except (TypeError, ValueError) as exc:
            raise ValueError(f"Invalid TCP port: {item}") from exc
        if not 1 <= port <= 65535:
            raise ValueError("TCP ports must be between 1 and 65535.")
        if port not in ports:
            ports.append(port)
    return ports


def evaluate_status(method: str, ping_ok: bool, tcp_open: list[int]) -> bool:
    if method == "icmp":
        return ping_ok
    if method == "tcp":
        return bool(tcp_open)
    if method == "both":
        return ping_ok or bool(tcp_open)
    raise ValueError("Unsupported monitoring method.")
