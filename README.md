# LANPulse — GitHub Pages Edition

LANPulse is a static, browser-based network-monitoring demonstration dashboard. It presents synthetic enterprise network devices, simulated availability checks, latency trends, topology, alerts and CSV reporting.

## Deploy to GitHub Pages

1. Create a new **public** GitHub repository, for example `lanpulse`.
2. Extract this ZIP file.
3. Upload **all contents** of the extracted folder to the repository root. Make sure `index.html` is at the top level, beside the `assets` folder.
4. On GitHub, open **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select branch `main` and folder `/ (root)`, then save.
7. Wait for GitHub Pages to publish the site. Your site URL will be shown on the Pages settings screen.

You can also use GitHub Desktop or `git` to push the files. No build command, Python installation, package manager or `.py` file is required.

## Run locally

Double-click `index.html`, or serve the folder with any static web server.

## What works in this GitHub Pages edition

- Enterprise-style overview dashboard and device status summary
- Add, remove, search and filter sample devices
- Simulated device checks and response-time changes
- Device detail panels and configurable parent relationships
- Network topology visualisation
- Alert filtering and acknowledgement
- Latency threshold setting and charts
- CSV export
- Browser-local persistence using `localStorage` (where permitted)

## Important limitation

GitHub Pages serves static files. A browser-hosted static site cannot run operating-system ICMP ping commands or perform general TCP socket checks against LAN devices. Therefore, **all monitoring results in this edition are simulated demonstration data**. Adding an IP address does not contact that device. For real network monitoring, a separate authorised monitoring agent or backend service is required.

## Project structure

```text
LANPulse/
├── index.html
├── assets/
│   ├── app.js
│   └── styles.css
├── docs/
│   └── DEMO_GUIDE.md
├── .nojekyll
├── LICENSE
└── README.md
```

## Licence

MIT. See `LICENSE`.
