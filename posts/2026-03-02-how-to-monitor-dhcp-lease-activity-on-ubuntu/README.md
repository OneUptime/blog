# How to Monitor DHCP Lease Activity on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, DHCP, Monitoring, Networking, SysAdmin

Description: Monitor DHCP lease activity on Ubuntu servers using log analysis, lease file parsing, and the Kea REST API to track address assignments and detect anomalies.

---

Knowing what's happening with your DHCP server is important for network management, capacity planning, and security. Unexpected devices appearing on the network, pools running out of addresses, or a particular client cycling through DHCP leases rapidly are all things worth knowing about. This tutorial covers several approaches to monitoring DHCP lease activity on Ubuntu.

## Monitoring ISC DHCP (dhcpd)

### Reading the Lease File

ISC DHCP stores all lease information in `/var/lib/dhcp/dhcpd.leases`. This file is a plain-text database updated whenever a lease is assigned, renewed, or expires.

```bash
# View the lease file
sudo cat /var/lib/dhcp/dhcpd.leases
```

A typical lease entry looks like:

```text
lease 192.168.1.105 {
  starts 1 2026/03/02 08:30:00;
  ends 1 2026/03/02 20:30:00;
  tstp 1 2026/03/02 20:30:00;
  cltt 1 2026/03/02 08:30:00;
  binding state active;
  next binding state free;
  rewind binding state free;
  hardware ethernet aa:bb:cc:dd:ee:01;
  client-hostname "server1";
}
```

### Parsing Active Leases

Extract only currently active leases:

```bash
#!/bin/bash
# Parse active DHCP leases from dhcpd.leases
# Save as /usr/local/bin/show-active-leases.sh

LEASE_FILE="/var/lib/dhcp/dhcpd.leases"

echo "Active DHCP Leases"
echo "=================="
printf "%-18s %-20s %-18s %-30s\n" "IP Address" "MAC Address" "Hostname" "Expires"
echo "------------------------------------------------------------------------"

# Parse leases using awk
awk '
/^lease / { ip = $2 }
/binding state active/ { active = 1 }
/hardware ethernet/ { mac = $3; sub(/;$/, "", mac) }
/client-hostname/ { hostname = $2; gsub(/[";]/, "", hostname) }
/ends / {
    sub(/;$/, "")
    expires = $3 " " $4
}
/^}/ {
    if (active) {
        printf "%-18s %-20s %-18s %-30s\n", ip, mac, hostname, expires
    }
    ip = ""; mac = ""; hostname = ""; expires = ""; active = 0
}
' "$LEASE_FILE"
```

```bash
chmod +x /usr/local/bin/show-active-leases.sh
sudo /usr/local/bin/show-active-leases.sh
```

### Counting Available Addresses

Track pool utilization to know when you're running low on available IPs:

```bash
#!/bin/bash
# Check DHCP pool utilization
# Assumes pool is 192.168.1.100 - 192.168.1.200 (101 addresses)

LEASE_FILE="/var/lib/dhcp/dhcpd.leases"
POOL_START="192.168.1.100"
POOL_END="192.168.1.200"
POOL_SIZE=101

ACTIVE=$(awk '/binding state active/ {count++} END {print count}' "$LEASE_FILE")
AVAILABLE=$((POOL_SIZE - ACTIVE))
UTILIZATION=$((ACTIVE * 100 / POOL_SIZE))

echo "DHCP Pool Utilization"
echo "Pool: $POOL_START - $POOL_END"
echo "Total: $POOL_SIZE | Active: $ACTIVE | Available: $AVAILABLE"
echo "Utilization: $UTILIZATION%"

# Alert if over 80% utilized
if [ "$UTILIZATION" -gt 80 ]; then
    echo "WARNING: Pool is over 80% utilized!"
fi
```

## Monitoring via System Logs

### Viewing DHCP Logs

ISC DHCP logs via syslog. On Ubuntu, these logs appear in `/var/log/syslog`:

```bash
# Watch DHCP activity in real time
sudo tail -f /var/log/syslog | grep dhcpd

# Or use journalctl
sudo journalctl -u isc-dhcp-server -f
```

Typical log entries:

```text
Mar  2 09:15:23 server dhcpd: DHCPDISCOVER from aa:bb:cc:dd:ee:05 via eth0
Mar  2 09:15:23 server dhcpd: DHCPOFFER on 192.168.1.130 to aa:bb:cc:dd:ee:05 via eth0
Mar  2 09:15:23 server dhcpd: DHCPREQUEST for 192.168.1.130 from aa:bb:cc:dd:ee:05 via eth0
Mar  2 09:15:23 server dhcpd: DHCPACK to 192.168.1.130 (aa:bb:cc:dd:ee:05) via eth0
```

### Parsing Logs for New Devices

Detecting new (previously unseen) devices is useful for security monitoring:

```bash
#!/bin/bash
# Find new DHCP clients (not seen before)
# Save as /usr/local/bin/find-new-dhcp-clients.sh

KNOWN_CLIENTS="/var/lib/dhcp/known-clients.txt"
LEASE_FILE="/var/lib/dhcp/dhcpd.leases"

# Create known clients file if it doesn't exist
touch "$KNOWN_CLIENTS"

# Extract all MAC addresses from lease file
CURRENT_MACS=$(awk '/hardware ethernet/ {print $3}' "$LEASE_FILE" | tr -d ';' | sort -u)

# Find new MACs not in known clients file
NEW_CLIENTS=$(comm -23 <(echo "$CURRENT_MACS") <(sort "$KNOWN_CLIENTS"))

if [ -n "$NEW_CLIENTS" ]; then
    echo "New DHCP clients detected:"
    echo "$NEW_CLIENTS"

    # Add to known clients
    echo "$NEW_CLIENTS" >> "$KNOWN_CLIENTS"
    sort -u "$KNOWN_CLIENTS" -o "$KNOWN_CLIENTS"
else
    echo "No new clients detected"
fi
```

### Counting DHCP Requests per Client

Identify clients that are cycling through DHCP abnormally fast:

```bash
# Count DHCPDISCOVER messages per MAC in the last hour
sudo journalctl -u isc-dhcp-server --since "1 hour ago" \
    | grep DHCPDISCOVER \
    | awk '{print $9}' \
    | sort | uniq -c | sort -rn \
    | head -20
```

## Monitoring Kea DHCP Server

Kea provides a much richer monitoring interface through its REST API.

### Checking Active Leases via API

```bash
# Get all active leases
curl -s -X POST http://127.0.0.1:8000/ \
  -H "Content-Type: application/json" \
  -d '{"command": "lease4-get-all", "service": ["dhcp4"]}' \
  | python3 -m json.tool

# Get lease count per subnet
curl -s -X POST http://127.0.0.1:8000/ \
  -H "Content-Type: application/json" \
  -d '{"command": "stat-lease4-get", "service": ["dhcp4"]}' \
  | python3 -m json.tool
```

### Getting Statistics from Kea

```bash
# Get all statistics
curl -s -X POST http://127.0.0.1:8000/ \
  -H "Content-Type: application/json" \
  -d '{"command": "statistic-get-all", "service": ["dhcp4"]}' \
  | python3 -m json.tool
```

Key statistics to watch:
- `subnet[1].assigned-addresses`: Currently assigned addresses in subnet 1
- `subnet[1].total-addresses`: Total address pool size
- `pkt4-received`: Total DHCP packets received
- `pkt4-ack-sent`: ACK packets sent (successful assignments)
- `pkt4-nak-sent`: NAK packets sent (failed requests)

### Building a Utilization Report

```bash
#!/usr/bin/env python3
# DHCP pool utilization report for Kea
# Save as /usr/local/bin/kea-utilization.py

import json
import urllib.request

API_URL = "http://127.0.0.1:8000/"

def kea_command(command, service="dhcp4", args=None):
    payload = {"command": command, "service": [service]}
    if args:
        payload["arguments"] = args

    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        API_URL,
        data=data,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

# Get lease statistics
stats = kea_command("stat-lease4-get")

print("DHCP Pool Utilization Report")
print("=" * 50)

for entry in stats[0].get("arguments", {}).get("result-set", {}).get("rows", []):
    subnet_id = entry[0]
    total = entry[1]
    assigned = entry[2]

    if total > 0:
        utilization = (assigned / total) * 100
        status = "WARNING" if utilization > 80 else "OK"
        print(f"Subnet {subnet_id}: {assigned}/{total} ({utilization:.1f}%) [{status}]")
```

```bash
chmod +x /usr/local/bin/kea-utilization.py
python3 /usr/local/bin/kea-utilization.py
```

## Setting Up Automated Monitoring

### Cron-based Lease Monitoring

```bash
sudo nano /etc/cron.d/dhcp-monitoring
```

```text
# Run DHCP monitoring checks every 15 minutes
*/15 * * * * root /usr/local/bin/show-active-leases.sh > /var/log/dhcp-leases-current.txt
*/15 * * * * root /usr/local/bin/find-new-dhcp-clients.sh >> /var/log/dhcp-new-clients.log

# Daily utilization report
0 8 * * * root python3 /usr/local/bin/kea-utilization.py | mail -s "DHCP Utilization Report" admin@example.com
```

### Using dhcpdump for Real-Time Monitoring

`dhcpdump` is a tool specifically designed for parsing DHCP traffic:

```bash
sudo apt install -y dhcpdump

# Watch DHCP traffic on eth0
sudo dhcpdump -i eth0
```

This shows a formatted view of DHCP packets in real time - useful for debugging client problems.

## Log Rotation for DHCP Logs

Configure logrotate to manage the DHCP log files:

```bash
sudo nano /etc/logrotate.d/isc-dhcp-server
```

```text
/var/log/dhcp-leases-current.txt
/var/log/dhcp-new-clients.log
{
    rotate 30
    daily
    compress
    missingok
    notifempty
    sharedscripts
}
```

Keeping a good record of DHCP activity serves double duty: it helps with troubleshooting connectivity issues and provides an audit trail for security investigations when you need to determine which device had a particular IP address at a given time.
