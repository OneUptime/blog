# How to Set Up CrowdSec as a Fail2Ban Alternative on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, CrowdSec, Security, Intrusion Detection, Firewall

Description: Guide to installing and configuring CrowdSec on Ubuntu as a modern, community-powered alternative to fail2ban, including parsers, scenarios, bouncers, and dashboard setup.

---

CrowdSec is a modern intrusion detection and prevention system that improves on fail2ban in several key ways. Like fail2ban, it parses logs and bans IPs causing trouble. Unlike fail2ban, it operates collaboratively: when your instance detects an attack, it can report that IP to CrowdSec's community threat intelligence network. In return, you get a continuously updated blocklist of known malicious IPs. This guide covers installation, configuration, and the core concepts.

## How CrowdSec Differs from Fail2Ban

- **Collaborative intelligence**: Shared blocklist of IPs across the CrowdSec network
- **Scenarios instead of filters**: Higher-level behavioral detection (not just regex)
- **Bouncers**: Separate components that enforce bans (allows enforcement at different layers - firewall, nginx, Cloudflare, etc.)
- **Collections**: Curated packages of parsers + scenarios for specific services
- **REST API**: Can be managed via API and integrated with other tools
- **LAPI (Local API)**: Separate service that multiple CrowdSec agents can report to

## Installation

```bash
# Add the CrowdSec repository
curl -s https://packagecloud.io/install/repositories/crowdsec/crowdsec/script.deb.sh | sudo bash

# Install CrowdSec
sudo apt-get install -y crowdsec

# Verify installation
sudo systemctl status crowdsec

# Check version
cscli version
```

## Understanding the Architecture

```
Log Files
    |
CrowdSec Agent (reads logs, parses events, detects attacks)
    |
LAPI (Local API - stores decisions)
    |
Bouncer (enforces bans - firewall, nginx, etc.)
```

The agent and LAPI are bundled in the same package on a single machine. Bouncers are installed separately.

## Installing Collections for Your Services

Collections are curated packages that include the parsers and scenarios needed to monitor specific services:

```bash
# List available collections
cscli collections list -a

# Install common collections
# SSH
cscli collections install crowdsecurity/sshd

# Nginx
cscli collections install crowdsecurity/nginx

# Apache
cscli collections install crowdsecurity/apache2

# Linux base (required for most other collections)
cscli collections install crowdsecurity/linux

# MySQL/MariaDB
cscli collections install crowdsecurity/mysql

# WordPress
cscli collections install crowdsecurity/wordpress

# Update all installed collections
cscli collections upgrade --all

# Restart CrowdSec after installing collections
sudo systemctl restart crowdsec
```

## Configuring Log Sources

CrowdSec needs to know where your log files are. Check the auto-detected configuration:

```bash
# Show acquisition configurations
cat /etc/crowdsec/acquis.yaml
```

Add any missing log sources:

```bash
sudo tee -a /etc/crowdsec/acquis.yaml << 'EOF'
---
# SSH logs
filenames:
  - /var/log/auth.log
labels:
  type: syslog

---
# Nginx logs
filenames:
  - /var/log/nginx/access.log
  - /var/log/nginx/error.log
labels:
  type: nginx

---
# Apache logs
filenames:
  - /var/log/apache2/access.log
  - /var/log/apache2/error.log
labels:
  type: apache2
EOF

sudo systemctl restart crowdsec
```

## Installing the Firewall Bouncer

The bouncer enforces bans at the firewall level. The `crowdsec-firewall-bouncer` supports both `iptables` and `nftables`:

```bash
sudo apt-get install -y crowdsec-firewall-bouncer-iptables
# Or for nftables:
# sudo apt-get install -y crowdsec-firewall-bouncer-nftables

# The bouncer is auto-registered with LAPI during installation
# Verify it registered
cscli bouncers list

# Check bouncer status
sudo systemctl status crowdsec-firewall-bouncer
```

### Nginx Bouncer (Optional)

For application-level enforcement that returns 403 responses instead of dropping connections:

```bash
sudo apt-get install -y crowdsec-nginx-bouncer

# Configure the bouncer
sudo nano /etc/nginx/conf.d/crowdsec.conf
```

Add to your Nginx configuration:

```nginx
# In your server block
lua_package_path "/usr/lib/x86_64-linux-gnu/crowdsec/lua/?.lua;;";
lua_shared_dict crowdsec_cache 50m;

access_by_lua_file /usr/lib/x86_64-linux-gnu/crowdsec/nginx/access.lua;
```

## Monitoring CrowdSec Activity

```bash
# View recent alerts
cscli alerts list

# View detailed alert information
cscli alerts inspect 1  # alert ID

# View current active bans (decisions)
cscli decisions list

# Filter decisions by type
cscli decisions list --type ban

# View statistics
cscli metrics

# Real-time log of CrowdSec activity
sudo journalctl -u crowdsec -f
```

## Understanding Decisions

Decisions are what CrowdSec does in response to detected attacks:

```bash
# Ban types:
# ban: block all traffic from IP
# captcha: show CAPTCHA (requires bouncer support)
# throttle: rate limit connections

# View ban durations and sources
cscli decisions list --output json | jq '.[] | {ip: .value, duration: .duration, origin: .origin}'

# CrowdSec decisions come from two origins:
# - "crowdsec": locally detected
# - "CAPI": community blocklist from CrowdSec network
```

## Manual Decisions

```bash
# Manually ban an IP
cscli decisions add --ip 10.0.0.50 --reason "manual ban" --duration 24h

# Ban a subnet
cscli decisions add --range 192.168.100.0/24 --reason "suspicious range" --duration 48h

# Remove a specific ban
cscli decisions delete --ip 10.0.0.50

# Remove all bans for a range
cscli decisions delete --range 192.168.100.0/24
```

## Whitelisting

Prevent specific IPs from being banned:

```bash
# Create a whitelist configuration
sudo tee /etc/crowdsec/parsers/s02-enrich/whitelist.yaml << 'EOF'
name: crowdsecurity/whitelists
description: "Whitelist my management IPs"
whitelist:
  reason: "my trusted IPs"
  ip:
    - "192.168.1.100"
    - "10.0.0.5"
  cidr:
    - "10.100.0.0/16"
EOF

sudo systemctl restart crowdsec
```

## Integrating with CrowdSec's Community Intelligence

When you install CrowdSec, it can enroll with the central API to share and receive threat intelligence:

```bash
# Check if enrolled in CAPI
cat /etc/crowdsec/online_api_credentials.yaml

# Enroll in the CrowdSec console (optional, provides web UI)
# Get your enrollment key from app.crowdsec.net
cscli console enroll YOUR_ENROLLMENT_KEY

# Check CAPI status
cscli capi status

# The community blocklist is pulled automatically
# View CAPI-sourced bans
cscli decisions list --origin CAPI | head -20
```

## Scenarios and Parsers

Understanding what's detecting threats:

```bash
# List installed scenarios (detection rules)
cscli scenarios list

# List installed parsers (log format parsers)
cscli parsers list

# Show details of a specific scenario
cscli scenarios inspect crowdsecurity/ssh-bf

# Test a parser against a log line
cscli explain --log "Mar  2 10:15:23 server sshd[1234]: Failed password for root from 10.0.0.5 port 55123 ssh2" --type syslog
```

## Creating a Custom Scenario

Write a custom detection scenario for application-specific attacks:

```bash
sudo tee /etc/crowdsec/scenarios/custom-wp-scan.yaml << 'EOF'
type: leaky
name: custom/wordpress-scanner
description: "Detect WordPress directory scanners"
filter: "evt.Meta.service == 'http' && evt.Meta.http_status in ['404', '403'] && evt.Meta.http_path startsWith '/wp-'"
leakspeed: "10s"
capacity: 20
labels:
  service: http
  type: scan
  remediation: true
blackhole: 5m
EOF

sudo systemctl restart crowdsec
```

## Dashboard Access

The CrowdSec console at https://app.crowdsec.net provides a web dashboard when enrolled:

```bash
# Or run a local dashboard with Metabase
sudo apt-get install -y crowdsec-dashboard

# Initialize Metabase
sudo crowdsec-setup-metabase

# Access at http://localhost:3000
```

## Integrating with Prometheus

```bash
# CrowdSec exposes Prometheus metrics
curl http://localhost:6060/metrics | head -30

# Configure Prometheus scrape:
# prometheus.yml:
# - job_name: crowdsec
#   static_configs:
#     - targets: ['localhost:6060']
```

## Comparing with Fail2Ban

| Feature | fail2ban | CrowdSec |
|---------|----------|----------|
| Installation | Simple | Moderate |
| Configuration | ini/regex | YAML/parsers |
| Community blocklist | No | Yes |
| Multiple enforcer types | Limited | Many (nginx, CF, etc.) |
| REST API | No | Yes |
| Multi-server | Limited | Yes (LAPI) |

CrowdSec's community threat intelligence is its biggest practical advantage. You benefit from attack patterns detected across the entire CrowdSec network, not just your own server's logs.

## Troubleshooting

### Bouncer not banning IPs

```bash
# Check bouncer is connected to LAPI
cscli bouncers list

# Check bouncer service
sudo systemctl status crowdsec-firewall-bouncer

# Verify iptables chains created
sudo iptables -L crowdsec-blacklists -n | head -20
```

### CrowdSec not detecting attacks

```bash
# Test parser with a known-bad log line
cscli explain --log "your log line here" --type nginx

# Check if the scenario is installed
cscli scenarios list | grep sshd

# View CrowdSec debug output
sudo journalctl -u crowdsec --since "5 minutes ago" | grep -i "error\|warn"
```
