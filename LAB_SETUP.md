# Windows + Kali local monitoring lab

## Objective

Run LANPulse on Windows and monitor a Kali Linux VM on a private, isolated or otherwise authorised lab network.

## 1. Configure the virtual network

For VirtualBox, create a Host-only network (or use another private virtual network that allows the Windows host and Kali VM to communicate). Give both endpoints addresses in the same private subnet, for example:

- Windows host-only adapter: `192.168.56.1/24`
- Kali VM: `192.168.56.10/24`

These are example lab addresses. Use the actual addresses assigned in your own environment. Do not change a working campus or company network configuration without permission.

In Kali, inspect the address:

```bash
ip -4 addr
ip route
```

From Windows PowerShell, test reachability:

```powershell
ping 192.168.56.10
```

If ping does not respond, check the VM network adapter mode, subnet, routes and host firewall. Some firewalls intentionally block ICMP.

## 2. Start LANPulse

Run `run_windows.bat` on Windows, then open `http://127.0.0.1:5000` in the Windows browser.

## 3. Register the Kali VM

In LANPulse:

1. Open Settings → Monitoring and select Live monitoring.
2. Open Devices → Add device.
3. Name: `Kali Lab VM`.
4. IP address: use the actual Kali host-only IPv4 address.
5. Device type: `Workstation` or `Other`.
6. Monitoring method: `ICMP` initially.
7. Save, then run a check.

If Kali blocks ping, allow ICMP only in your isolated lab firewall policy or test an enabled TCP service instead. Do not disable firewalls broadly.

## 4. Test service availability

On Kali, a temporary HTTP service can be started for a controlled test:

```bash
python3 -m http.server 8080 --bind 0.0.0.0
```

Register TCP port `8080` on the Kali device (choose TCP monitoring). LANPulse should detect the port while the service is running. Stop it with `Ctrl+C` and run another check; the TCP check should no longer connect.

This tests TCP reachability, not the security of the service. Stop the test server when finished.

## Troubleshooting

- **Flask not found:** run `python -m pip install -r backend/requirements.txt` inside the backend virtual environment.
- **Ping utility missing on Kali:** `sudo apt install iputils-ping`.
- **Device offline:** verify the exact IP, VM adapter, route, firewall and whether the chosen service is listening.
- **TCP port closed:** confirm the service is running and listening on the VM's network interface, not only `127.0.0.1`.
- **Live mode shows no sample devices:** this is expected; synthetic demonstration devices are hidden in Live mode. Register actual authorised devices.
