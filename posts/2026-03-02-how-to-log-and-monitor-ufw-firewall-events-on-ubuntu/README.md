# How to Log and Monitor UFW Firewall Events on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, UFW, Firewall, Logging, Security

Description: Enable and configure UFW logging on Ubuntu, analyze firewall events from system logs, parse blocked connections, and set up alerts for suspicious traffic patterns.

---

UFW's logging capability tells you what's being blocked and allowed on your server. Without it, you're flying blind - you won't know if someone is probing for open ports, if a service is trying to make unexpected outbound connections, or whether a firewall rule change had the intended effect.

This guide covers enabling UFW logging, understanding log format, filtering relevant entries, and setting up basic monitoring.

## Enabling UFW Logging

UFW logging is off by default. Enable it with:

```bash
# Enable logging
sudo ufw logging on

# Check logging status
sudo ufw status verbose
```

Output shows the logging level:

```text
Status: active
Logging: on (low)
Default: deny (incoming), allow (outgoing), deny (forwarded)
```

### Log Levels

UFW has five log levels:

```bash
# Low - logs only blocked packets (most commonly used)
sudo ufw logging low

# Medium - adds all allowed packets that aren't matching application profiles
sudo ufw logging medium

# High - adds rate-limited packets
sudo ufw logging high

# Full - logs everything including application profile matches
sudo ufw logging full

# Off - disables logging
sudo ufw logging off
```

For most servers, `low` or `medium` is appropriate. `full` generates enormous log volume and is only useful for debugging specific issues.

## Where UFW Logs Go

UFW log entries appear in two places:

```bash
# Primary location - UFW-specific log file (Ubuntu 20.04+)
sudo tail -f /var/log/ufw.log

# Also appears in syslog
sudo tail -f /var/log/syslog | grep UFW

# And in the kernel log
sudo tail -f /var/log/kern.log | grep UFW

# Via journalctl
sudo journalctl -f -k | grep UFW
```

## Understanding the Log Format

UFW log entries are kernel log messages with a specific format:

```text
Mar  2 14:35:22 hostname kernel: [UFW BLOCK] IN=eth0 OUT= MAC=aa:bb:cc:00:11:22:33:44:... SRC=203.0.113.100 DST=192.168.1.10 LEN=44 TOS=0x00 PREC=0x00 TTL=54 ID=12345 PROTO=TCP SPT=54321 DPT=22 WINDOW=65535 RES=0x00 SYN URGP=0
```

Breaking down the fields:

| Field | Description |
|-------|-------------|
| `[UFW BLOCK]` | The UFW action (BLOCK, ALLOW, LIMIT BLOCK) |
| `IN=eth0` | Interface the packet arrived on |
| `OUT=` | Interface the packet would leave on (empty for input) |
| `SRC=203.0.113.100` | Source IP address |
| `DST=192.168.1.10` | Destination IP address |
| `LEN=44` | Packet length in bytes |
| `PROTO=TCP` | Protocol (TCP, UDP, ICMP) |
| `SPT=54321` | Source port |
| `DPT=22` | Destination port |
| `SYN` | TCP flags (SYN = new connection attempt) |

## Filtering and Analyzing Logs

### Basic Filtering

```bash
# Show all blocked packets
sudo grep "UFW BLOCK" /var/log/ufw.log | tail -50

# Show all rate-limited connections
sudo grep "LIMIT BLOCK" /var/log/ufw.log | tail -20

# Show all allowed packets (requires medium or higher logging)
sudo grep "UFW ALLOW" /var/log/ufw.log | tail -20

# Filter by destination port (e.g., all SSH block attempts)
sudo grep "UFW BLOCK" /var/log/ufw.log | grep "DPT=22" | tail -20

# Filter by source IP
sudo grep "SRC=203.0.113.100" /var/log/ufw.log | tail -20
```

### Finding Top Attackers

```bash
# Top source IPs being blocked
sudo grep "UFW BLOCK" /var/log/ufw.log \
    | grep -oP 'SRC=\K[0-9.]+' \
    | sort | uniq -c | sort -rn \
    | head -20

# Top ports being targeted
sudo grep "UFW BLOCK" /var/log/ufw.log \
    | grep -oP 'DPT=\K[0-9]+' \
    | sort | uniq -c | sort -rn \
    | head -20
```

### Today's Activity Summary

```bash
#!/bin/bash
# UFW daily activity summary
# Save as /usr/local/bin/ufw-summary.sh

LOG_FILE="/var/log/ufw.log"
TODAY=$(date "+%b %e")

echo "UFW Activity Summary for $TODAY"
echo "================================="

echo ""
echo "Blocked packets: $(grep "$TODAY" "$LOG_FILE" | grep -c "UFW BLOCK")"
echo "Allowed packets: $(grep "$TODAY" "$LOG_FILE" | grep -c "UFW ALLOW")"
echo "Rate limited: $(grep "$TODAY" "$LOG_FILE" | grep -c "LIMIT BLOCK")"

echo ""
echo "Top 10 blocked source IPs:"
grep "$TODAY" "$LOG_FILE" | grep "UFW BLOCK" \
    | grep -oP 'SRC=\K[0-9.]+' \
    | sort | uniq -c | sort -rn | head -10

echo ""
echo "Top 10 targeted ports:"
grep "$TODAY" "$LOG_FILE" | grep "UFW BLOCK" \
    | grep -oP 'DPT=\K[0-9]+' \
    | sort | uniq -c | sort -rn | head -10

echo ""
echo "Top 10 blocked protocols:"
grep "$TODAY" "$LOG_FILE" | grep "UFW BLOCK" \
    | grep -oP 'PROTO=\K[A-Z]+' \
    | sort | uniq -c | sort -rn | head -10
```

```bash
chmod +x /usr/local/bin/ufw-summary.sh
sudo /usr/local/bin/ufw-summary.sh
```

## Setting Up Log Rotation

UFW log files can grow large quickly. Configure logrotate:

```bash
# Check if logrotate is configured for UFW
cat /etc/logrotate.d/ufw
```

If not present, create it:

```bash
sudo nano /etc/logrotate.d/ufw
```

```text
/var/log/ufw.log
{
    rotate 14
    daily
    compress
    delaycompress
    missingok
    notifempty
    postrotate
        # Signal rsyslog to reopen the log file after rotation
        invoke-rc.d rsyslog rotate > /dev/null 2>&1 || true
    endscript
}
```

## Centralizing UFW Logs with rsyslog

For servers sending logs to a central SIEM or log management system, configure rsyslog to forward UFW messages:

```bash
sudo nano /etc/rsyslog.d/20-ufw.conf
```

```text
# Forward UFW kernel messages to a separate file
:msg, contains, "UFW" /var/log/ufw.log
:msg, contains, "UFW" stop

# Forward to remote syslog server
*.kern @logserver.example.com:514
```

```bash
sudo systemctl restart rsyslog
```

## Setting Up Alerts for Suspicious Activity

A simple alerting script that emails when an IP exceeds a block threshold:

```bash
#!/bin/bash
# Alert on high-volume attackers
# Save as /usr/local/bin/ufw-alert.sh

LOG_FILE="/var/log/ufw.log"
THRESHOLD=100  # Blocks within the last hour to trigger alert
ALERT_EMAIL="admin@example.com"

# Check each unique IP blocked in the last hour
HOUR_AGO=$(date -d "1 hour ago" "+%b %e %H")

HIGH_ACTIVITY=$(grep "UFW BLOCK" "$LOG_FILE" \
    | grep "$(date '+%b %e')" \
    | grep -oP 'SRC=\K[0-9.]+' \
    | sort | uniq -c | sort -rn \
    | awk -v thresh="$THRESHOLD" '$1 >= thresh {print $0}')

if [ -n "$HIGH_ACTIVITY" ]; then
    echo -e "High-activity IPs blocked in the last hour:\n\n$HIGH_ACTIVITY" \
        | mail -s "UFW Alert: High blocked connection rate" "$ALERT_EMAIL"
    echo "Alert sent for: $HIGH_ACTIVITY"
fi
```

```bash
chmod +x /usr/local/bin/ufw-alert.sh

# Run every 30 minutes
echo "*/30 * * * * root /usr/local/bin/ufw-alert.sh" | sudo tee /etc/cron.d/ufw-alerts
```

## Identifying Firewall Rule Gaps

Use logging to find traffic that shouldn't be getting through (if any passes) or to verify rules are working:

```bash
# Check if any suspicious traffic is being allowed
# (Requires 'medium' or higher logging level)
sudo grep "UFW ALLOW" /var/log/ufw.log \
    | grep -v "DPT=22\|DPT=80\|DPT=443" \
    | tail -30
```

This shows allowed traffic on ports other than SSH, HTTP, and HTTPS - worth investigating if unexpected ports appear.

## Integrating with fail2ban

UFW logs are useful for fail2ban, which can read them and create persistent bans. Configure a fail2ban jail that reads UFW logs:

```bash
sudo nano /etc/fail2ban/jail.local
```

```ini
[ufw-port-scan]
enabled = true
filter = ufw-port-scan
logpath = /var/log/ufw.log
maxretry = 10
findtime = 60
bantime = 3600
action = ufw
```

Create the filter:

```bash
sudo nano /etc/fail2ban/filter.d/ufw-port-scan.conf
```

```ini
[Definition]
failregex = \[UFW BLOCK\] .* SRC=<HOST> .*
ignoreregex =
```

## Parsing Logs with Python

For more advanced analysis:

```python
#!/usr/bin/env python3
"""
Parse UFW logs and generate a connection report
Save as /usr/local/bin/parse-ufw-logs.py
"""

import re
import sys
from collections import defaultdict
from datetime import datetime

LOG_FILE = "/var/log/ufw.log"

def parse_ufw_line(line):
    """Extract fields from a UFW log line"""
    if "UFW BLOCK" not in line and "UFW ALLOW" not in line:
        return None

    fields = {}

    # Extract action
    if "UFW BLOCK" in line:
        fields["action"] = "BLOCK"
    elif "UFW ALLOW" in line:
        fields["action"] = "ALLOW"
    elif "LIMIT BLOCK" in line:
        fields["action"] = "LIMIT"

    # Extract key fields using regex
    for field in ["SRC", "DST", "DPT", "SPT", "PROTO"]:
        match = re.search(rf'{field}=(\S+)', line)
        if match:
            fields[field] = match.group(1)

    return fields

# Parse the log file
stats = defaultdict(lambda: defaultdict(int))
top_sources = defaultdict(int)
top_ports = defaultdict(int)

with open(LOG_FILE) as f:
    for line in f:
        parsed = parse_ufw_line(line)
        if parsed:
            action = parsed.get("action", "UNKNOWN")
            stats["actions"][action] += 1

            if action == "BLOCK":
                src = parsed.get("SRC", "unknown")
                top_sources[src] += 1
                dpt = parsed.get("DPT", "unknown")
                top_ports[dpt] += 1

# Print report
print("UFW Log Analysis Report")
print("=" * 50)
print(f"\nTotal events by action:")
for action, count in sorted(stats["actions"].items()):
    print(f"  {action}: {count}")

print(f"\nTop 10 blocked source IPs:")
for ip, count in sorted(top_sources.items(), key=lambda x: x[1], reverse=True)[:10]:
    print(f"  {count:6d}  {ip}")

print(f"\nTop 10 targeted ports:")
for port, count in sorted(top_ports.items(), key=lambda x: x[1], reverse=True)[:10]:
    print(f"  {count:6d}  port {port}")
```

```bash
chmod +x /usr/local/bin/parse-ufw-logs.py
sudo python3 /usr/local/bin/parse-ufw-logs.py
```

UFW logging is straightforward to enable but the real value comes from actually reviewing the logs regularly. Even a quick daily look at the top blocked IPs and targeted ports gives you a picture of what threats your server is facing and whether your firewall rules are appropriately configured.
