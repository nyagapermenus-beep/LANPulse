# LANPulse demo walkthrough

Use this script for a 3–5 minute demonstration. All sample addresses and statuses shown in Demo mode are synthetic.

1. **Open the overview.** Point out total devices, online/offline counts, average latency, latency trend and the recent alerts list.
2. **Open Devices.** Search for `Backup Server`, filter offline devices, and open the detail panel. Explain the difference between reachability, latency and a TCP service-port check.
3. **Open Topology.** Show the configured parent-child relationships between the edge router, switches, servers and endpoints. Explain that these relationships are entered by the administrator; the MVP does not discover physical cabling automatically.
4. **Open Alerts & events.** Show the simulated backup-server outage and high-latency warning. Acknowledge an alert and show its state change.
5. **Add a demonstration device.** Add a device using a private test address such as `192.168.10.25`, set its type and parent, and show it in the device list and topology.
6. **Export a report.** Download the CSV device report.
7. **Explain Live mode.** With the Flask backend running, switch to Settings → Monitoring → Live monitoring. Register only a computer or VM that the presenter is authorised to monitor. Run a check and show the actual result.

Be transparent: Demo mode is simulated. The live check feature uses ICMP and configured TCP port connection tests. The MVP does not yet include SNMP bandwidth collection or automatic network discovery.
