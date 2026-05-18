# How to Set Up Maltrail for Malicious Traffic Detection on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Maltrail, Network Monitoring, Threat Detection

Description: A practical guide to deploying Maltrail on Ubuntu for detecting malicious network traffic using threat intelligence feeds and behavioral analysis.

---

Maltrail is a malicious traffic detection system that works by monitoring network traffic and comparing it against threat intelligence feeds. It checks DNS queries, HTTP requests, and IP addresses against lists of known malicious domains, IPs, and URLs from sources like EmergingThreats, MalwareDomainList, and OpenPhish. When a match is found, it generates an alert that you can review through its built-in web interface. It is lightweight, easy to deploy, and does not require a complex SIEM backend to get value from it.

## How Maltrail Works

Maltrail runs two components:

- **Sensor** - captures network traffic and compares it against threat feeds, runs on the monitoring node
- **Server** - collects reports from sensors and provides the web dashboard

For a single-node setup, both run on the same machine. For distributed monitoring across multiple network segments, you run sensors on each segment and have them report to a central server.

## Prerequisites

Maltrail is a Python application. Install dependencies:

```bash
sudo apt update
sudo apt install -y git python3 python3-pip python-is-python3 libpcap-dev \
    python3-dev build-essential procps schedtool

# Install Python dependencies (use pcapy-ng; the older pcapy is deprecated)

sudo pip3 install pcapy-ng
```

## Installing Maltrail

```bash
# Clone the repository
sudo git clone https://github.com/stamparm/maltrail.git /opt/maltrail
cd /opt/maltrail

# Test that it runs
python3 sensor.py --help
python3 server.py --help
```

## Configuring Maltrail

The main configuration file controls both sensor and server behavior:

```bash
sudo nano /opt/maltrail/maltrail.conf
```

Maltrail's config format is whitespace-separated `KEY VALUE` pairs (not INI-style `key = value`). The `# [Sensor]` and `# [Server]` markers in the file are just comments that group related directives. Key settings to configure:

```sh
# /opt/maltrail/maltrail.conf - essential settings

# [Server]
# Listen address of (reporting) HTTP server
HTTP_ADDRESS 0.0.0.0

# Listen port of (reporting) HTTP server
HTTP_PORT 8338

# User entries (format: username:sha256(password):UID:filter_netmask(s))
# Generate hash: echo -n 'yourpassword' | sha256sum | cut -d " " -f 1
# UID 0 = admin; UID >= 1000 = read-only
USERS
    admin:8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918:0:

# Listen address/port of the (log collecting) UDP server (uncomment for distributed setup)
#UDP_ADDRESS 0.0.0.0
#UDP_PORT 8337

# [Sensor]
# Network interface to monitor (use "any" for all interfaces)
MONITOR_INTERFACE any

# Network capture filter (BPF)
CAPTURE_FILTER udp or icmp or (tcp and (tcp[tcpflags] == tcp-syn or port 80 or port 1080 or port 3128 or port 8000 or port 8080 or port 8118))

# Remote Maltrail server to send log entries (only for distributed setup)
#LOG_SERVER 192.168.2.107:8337

# How often to update trails (in seconds)
UPDATE_PERIOD 86400

# [All]
# Directory used for log storage
LOG_DIR /var/log/maltrail
```

Create the required log directory:

```bash
sudo mkdir -p /var/log/maltrail
```

## Setting Up the Threat Feeds

Maltrail aggregates many threat intelligence feeds. The sensor pulls/refreshes them automatically on startup and then every `UPDATE_PERIOD` seconds (default 86400 = 24h); the consolidated set is written to `~/.maltrail/trails.csv` (override with the `TRAILS_FILE` directive). To skip the online pull on a particular run, start the sensor with `--offline`.

The `/opt/maltrail/trails/` directory contains:
- `static/` - hard-coded indicators bundled with Maltrail
- `feeds/` - Python modules that fetch each external feed
- `custom/` - drop-in directory for your own indicator files (configurable via `CUSTOM_TRAILS_DIR`)

You can add custom indicators by creating files in `/opt/maltrail/trails/custom/`:

```bash
sudo nano /opt/maltrail/trails/custom/custom.txt
```

```text
# Custom threat intel entries (one per line, optionally followed by a comment)
malicious-domain.com  # Internal Threat Intel
192.168.100.50        # Compromised Host
```

## Running as a Service

Create systemd service files for both components:

```bash
# Server service
sudo nano /etc/systemd/system/maltrail-server.service
```

```ini
[Unit]
Description=Maltrail Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/maltrail
ExecStart=/usr/bin/python3 /opt/maltrail/server.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
# Sensor service
sudo nano /etc/systemd/system/maltrail-sensor.service
```

```ini
[Unit]
Description=Maltrail Sensor
After=network.target maltrail-server.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/maltrail
ExecStart=/usr/bin/python3 /opt/maltrail/sensor.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start the services:

```bash
sudo systemctl daemon-reload
sudo systemctl enable maltrail-server maltrail-sensor
sudo systemctl start maltrail-server maltrail-sensor

# Check status
sudo systemctl status maltrail-server
sudo systemctl status maltrail-sensor
```

## Accessing the Dashboard

Open a browser and navigate to `http://your-server-ip:8338`. Log in with the credentials you configured. The dashboard shows:

- Timeline of detected events
- Top source IPs generating alerts
- Breakdown by threat category
- Geographic distribution of suspicious connections

The dashboard auto-refreshes every 30 seconds by default.

## Reviewing Alerts

From the command line, check the log files directly:

```bash
# View today's sensor log
tail -f /var/log/maltrail/$(date +%Y-%m-%d).log

# Filter for high severity events
grep "critical" /var/log/maltrail/$(date +%Y-%m-%d).log

# Count alerts by type
awk '{print $9}' /var/log/maltrail/$(date +%Y-%m-%d).log | sort | uniq -c | sort -rn
```

Log entries look like:

```text
2026-03-02 14:23:01 192.168.1.55 -> 45.33.32.156:443 (malware.domain.com) [trojan, malware feed: EmergingThreats]
```

## Scheduled Updates

The sensor refreshes trails on its own every `UPDATE_PERIOD` seconds, so no cron job is needed. To update more or less often, change the value in `maltrail.conf` and restart the sensor:

```ini
# Refresh trails every 12 hours instead of the default 24
UPDATE_PERIOD 43200
```

## Tuning False Positives

New deployments tend to have false positives, especially for ad networks and analytics domains that appear on some threat lists. Maltrail ships with `misc/whitelist.txt` as a starting point; copy it (or create your own) and add your entries:

```bash
sudo cp /opt/maltrail/misc/whitelist.txt /opt/maltrail/misc/whitelist.local.txt
sudo nano /opt/maltrail/misc/whitelist.local.txt
```

```text
# Whitelisted entries - these will never trigger alerts
analytics.google.com
content.googleapis.com
```

Point Maltrail at the file via the `USER_WHITELIST` directive:

```sh
# In maltrail.conf
USER_WHITELIST /opt/maltrail/misc/whitelist.local.txt
```

Restart the sensor after making changes:

```bash
sudo systemctl restart maltrail-sensor
```

Maltrail gives you immediate visibility into hosts on your network making connections to known malicious infrastructure. Combined with Zeek's protocol analysis, you get layered network security monitoring without needing a full commercial SIEM platform.
