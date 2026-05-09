# How to Use NetFlow to Detect Anomalous IPv4 Traffic Patterns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NetFlow, Security, Anomaly Detection, Traffic Analysis, DDoS, Port Scan

Description: Learn how to analyze NetFlow data to detect DDoS attacks, port scans, data exfiltration, and other anomalous IPv4 traffic patterns using nfdump and Python.

## Why Use NetFlow for Security?

NetFlow provides flow-level visibility without requiring full packet capture. A flow record shows source/destination IPs, ports, protocols, byte/packet counts, and timing. This is enough to detect most attack patterns without the storage overhead of PCAP files.

## Common Anomalous Patterns to Detect

| Pattern | NetFlow Indicator |
|---|---|
| Port scan | Many destinations or ports, small packets |
| DDoS (volumetric) | Extremely high bytes/packets from one source |
| Data exfiltration | Large outbound transfers to unusual destinations |
| Brute force SSH | Many short TCP connections to port 22 |
| DNS amplification | High UDP 53 response traffic toward a victim |
| Botnet C2 | Periodic connections to unusual ports |

## Step 1: Detect Port Scans with nfdump

A port scan creates many flows with small packet counts to different destination ports.

The nfdump filter expression is passed as the **last positional argument** (there is no `-filter` flag), and `-t` accepts only absolute timestamps in `YYYY/MM/dd.hh:mm:ss` format, so we compute the window with `date`:

```bash
# Compute time window for the last 5 minutes (nfdump requires absolute timestamps)
TIME_RANGE="$(date -u -d '5 minutes ago' '+%Y/%m/%d.%H:%M:%S')-$(date -u '+%Y/%m/%d.%H:%M:%S')"

# Detect horizontal scan: one source to many destinations on same port
nfdump -R /var/log/netflow/ \
  -t "$TIME_RANGE" \
  -A srcip,dstport \
  -s record/flows \
  -n 20 \
  'proto tcp and flags S and not flags AFRPU'

# Detect vertical scan: one source scanning many ports on one destination
nfdump -R /var/log/netflow/ \
  -t "$TIME_RANGE" \
  -A srcip,dstip \
  -s dstport/flows \
  -n 20 \
  'proto tcp and flags S'
```

Flag combinations to watch:
- SYN only (`flags S and not flags AFRPU`): pure connection initiation, the canonical SYN-scan signature
- SYN-ACK (`flags SA`): response - useful to find victims, not scanners

## Step 2: Detect DDoS Attacks

A volumetric DDoS shows abnormally high traffic volume toward one destination:

```bash
# Find top destinations by packet rate (potential DDoS targets)
nfdump -R /var/log/netflow/ \
  -t "$TIME_RANGE" \
  -s dstip/packets \
  -n 10 \
  -o "fmt:%da %pkt %byt %fl"

# Find sources sending unusually high traffic (potential bots)
nfdump -R /var/log/netflow/ \
  -t "$TIME_RANGE" \
  -s srcip/bytes \
  -n 10

# UDP flood detection (small packets means low bytes-per-packet)
nfdump -R /var/log/netflow/ \
  -t "$TIME_RANGE" \
  -s dstip/packets \
  -n 10 \
  'proto udp and bpp < 100'
```

## Step 3: Detect Data Exfiltration

Exfiltration typically shows large outbound byte volumes to external IPs:

```bash
# Find large outbound transfers (>100MB in session)
nfdump -R /var/log/netflow/ \
  -s srcip/bytes \
  -n 10 \
  'src net 10.0.0.0/8 and not dst net 10.0.0.0/8 and bytes > 100000000'

# Find connections to unusual ports (not 80/443/22/25/53/123)
nfdump -R /var/log/netflow/ \
  -s dstport/flows \
  -n 20 \
  'src net 10.0.0.0/8 and not dst port in [80 443 22 25 53 123]'
```

## Step 4: Python Script for Automated Anomaly Detection

```python
#!/usr/bin/env python3
"""
netflow_anomaly_detector.py
Analyzes nfdump output for anomalous patterns
"""
import subprocess
import json
from datetime import datetime, timedelta, timezone

NETFLOW_DIR = '/var/log/netflow/'
ALERT_THRESHOLDS = {
    'port_scan_flows': 100,     # > 100 flows from one IP in 5 min = scan
    'ddos_pps': 100000,         # > 100K packets/sec = potential DDoS
    'exfil_bytes': 500_000_000, # > 500MB outbound = potential exfil
}

def time_window(minutes=5):
    """Build an absolute time-window string for nfdump's -t option."""
    fmt = '%Y/%m/%d.%H:%M:%S'
    end = datetime.now(timezone.utc)
    start = end - timedelta(minutes=minutes)
    return f'{start.strftime(fmt)}-{end.strftime(fmt)}'

def run_nfdump(args, filter_expr=None):
    """Run nfdump and return its stdout. The filter expression is positional."""
    cmd = ['nfdump', '-R', NETFLOW_DIR, '-t', time_window()] + args
    if filter_expr:
        cmd.append(filter_expr)
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.stdout

def detect_port_scans():
    """Detect hosts performing port scans."""
    output = run_nfdump(
        ['-A', 'srcip', '-s', 'record/flows', '-n', '20', '-o', 'csv'],
        filter_expr='proto tcp and flags S and not flags AFRPU',
    )
    alerts = []
    for line in output.strip().split('\n')[1:]:  # Skip header
        parts = line.split(',')
        if len(parts) >= 4:
            src_ip, flows = parts[0], int(parts[3])
            if flows > ALERT_THRESHOLDS['port_scan_flows']:
                alerts.append({
                    'type': 'PORT_SCAN',
                    'src_ip': src_ip,
                    'flows': flows,
                    'severity': 'HIGH'
                })
    return alerts

def detect_large_transfers():
    """Detect large outbound data transfers."""
    output = run_nfdump(
        ['-s', 'srcip/bytes', '-n', '10', '-o', 'csv'],
        filter_expr='src net 10.0.0.0/8 and not dst net 10.0.0.0/8',
    )
    alerts = []
    for line in output.strip().split('\n')[1:]:
        parts = line.split(',')
        if len(parts) >= 5:
            src_ip, total_bytes = parts[0], int(parts[4])
            if total_bytes > ALERT_THRESHOLDS['exfil_bytes']:
                alerts.append({
                    'type': 'POTENTIAL_EXFILTRATION',
                    'src_ip': src_ip,
                    'bytes': total_bytes,
                    'severity': 'CRITICAL'
                })
    return alerts

# Run detection
all_alerts = detect_port_scans() + detect_large_transfers()

if all_alerts:
    print(f"\n[{datetime.now().isoformat()}] ANOMALIES DETECTED:")
    for alert in all_alerts:
        print(json.dumps(alert, indent=2))
else:
    print(f"[{datetime.now().isoformat()}] No anomalies detected")
```

## Step 5: Schedule Automated Analysis

```bash
# Run every 5 minutes via cron
echo "*/5 * * * * /usr/bin/python3 /usr/local/bin/netflow_anomaly_detector.py >> /var/log/netflow_alerts.log 2>&1" | crontab -
```

## Conclusion

NetFlow is a powerful security tool for detecting attacks that generate distinctive traffic patterns. Use nfdump's aggregation and filtering capabilities for manual investigation, and automate detection with Python scripts that alert on thresholds. Pair NetFlow analysis with IP reputation feeds and SIEM integration for comprehensive network security monitoring.
