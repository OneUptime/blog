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
sudo apt install -y git python3 python3-pip python3-pcapy libpcap-dev \
    python3-dev build-essential

# Install Python dependencies
pip3 install pcapy-ng
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

Key settings to configure:

```ini
# /opt/maltrail/maltrail.conf - essential settings

[Sensor]
# Network interface to monitor
MONITOR_INTERFACE             = eth0

# Use "any" to monitor all interfaces
# MONITOR_INTERFACE           = any

# Address of the reporting server
SERVER_ADDR                   = 127.0.0.1
SERVER_PORT                   = 8337

# Update trails on startup
UPDATE_SERVER                 = True

# Log directory for sensor output
LOG_DIR                       = /var/log/maltrail

# BPF filter to exclude certain traffic from analysis
# PCAP_FILTER               = "not port 22"

[Server]
# Address to bind the web dashboard on
HTTP_ADDRESS                  = 0.0.0.0
HTTP_PORT                     = 8338

# Username and password for the web interface
ADMIN_USERNAME                = admin
# Generate hash: python3 -c "import hashlib; print(hashlib.sha256('yourpassword'.encode()).hexdigest())"
ADMIN_PASSWORD                = 8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918

# Maximum number of events to keep in memory
MAX_EVENTS                    = 100000

# Data directory for server storage
DATA_DIR                      = /var/maltrail
```

Create the required directories:

```bash
sudo mkdir -p /var/log/maltrail /var/maltrail
sudo chown -R $USER:$USER /var/log/maltrail /var/maltrail
```

## Setting Up the Threat Feeds

Maltrail aggregates many threat intelligence feeds. Update them before starting:

```bash
cd /opt/maltrail

# Update trail lists (downloads feeds from configured sources)
sudo python3 sensor.py --update

# Check what feeds are configured
grep -i "trail" maltrail.conf | head -20
```

The trail files are stored in `/opt/maltrail/trails/` and include:
- `static/` - hard-coded known bad indicators
- `dynamic/` - downloaded threat intel feeds

You can add custom indicators by creating files in `/opt/maltrail/trails/static/custom.txt`:

```
# Custom threat intel entries
# Format: indicator,type,info
malicious-domain.com,domain,Internal Threat Intel
192.168.100.50,ip,Compromised Host
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

```
2026-03-02 14:23:01 192.168.1.55 -> 45.33.32.156:443 (malware.domain.com) [trojan, malware feed: EmergingThreats]
```

## Setting Up Scheduled Updates

Threat feeds should update regularly. Add a cron job:

```bash
# Update trails daily at 2am
echo '0 2 * * * root cd /opt/maltrail && python3 sensor.py --update >> /var/log/maltrail/update.log 2>&1' | \
    sudo tee /etc/cron.d/maltrail-update
```

## Tuning False Positives

New deployments tend to have false positives, especially for ad networks and analytics domains that appear on some threat lists. You can whitelist indicators:

```bash
# Create a whitelist file
sudo nano /opt/maltrail/trails/static/whitelist.txt
```

```
# Whitelisted entries - these will never trigger alerts
analytics.google.com
content.googleapis.com
```

Add the whitelist to the configuration:

```ini
# In maltrail.conf
WHITELIST                     = /opt/maltrail/trails/static/whitelist.txt
```

Restart the sensor after making changes:

```bash
sudo systemctl restart maltrail-sensor
```

Maltrail gives you immediate visibility into hosts on your network making connections to known malicious infrastructure. Combined with Zeek's protocol analysis, you get layered network security monitoring without needing a full commercial SIEM platform.
