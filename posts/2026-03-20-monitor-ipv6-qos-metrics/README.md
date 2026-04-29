# How to Monitor IPv6 QoS Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, QoS, Monitoring, Metric, Prometheus, Grafana, Network Performance

Description: Monitor IPv6 QoS performance metrics including queue depths, DSCP class statistics, latency, and jitter using command-line tools, Prometheus, and Grafana dashboards.

---

Monitoring IPv6 QoS metrics ensures QoS policies are working correctly and identifies when traffic exceeds bandwidth allocations or when latency and jitter impact application performance.

## Command-Line QoS Monitoring

```bash
# View tc queue statistics

sudo tc -s qdisc show dev eth0

# Sample output:
# qdisc htb 1: root refcnt 9 r2q 10 default 0x30 direct_packets_stat 0
#  Sent 1234567 bytes 9876 pkt (dropped 12, overlimits 456 requeues 0)
#  rate 0bit 0pps backlog 0b 0p requeues 0

# Per-class statistics
sudo tc -s class show dev eth0

# Watch statistics in real-time
watch -n 2 'sudo tc -s class show dev eth0 | grep -E "class|Sent|drop"'

# Monitor DSCP-marked IPv6 packets
sudo tcpdump -i eth0 -nn ip6 -v -c 100 | \
  awk '/class/ {print $0}' | sort | uniq -c
```

## Python QoS Monitoring Script

```python
#!/usr/bin/env python3
# monitor_ipv6_qos.py - Monitor IPv6 QoS metrics

import subprocess
import re
import time
from datetime import datetime

def get_tc_stats(interface):
    """Get tc class statistics."""
    result = subprocess.run(
        ['tc', '-s', 'class', 'show', 'dev', interface],
        capture_output=True, text=True
    )
    return result.stdout

def parse_tc_stats(stats_output):
    """Parse tc statistics output."""
    classes = {}
    current_class = None

    for line in stats_output.split('\n'):
        class_match = re.search(r'class \w+ (\d+:\d+)', line)
        if class_match:
            current_class = class_match.group(1)
            classes[current_class] = {}

        if current_class:
            # Parse sent bytes/packets
            sent_match = re.search(
                r'Sent (\d+) bytes (\d+) pkt.*dropped (\d+)', line
            )
            if sent_match:
                classes[current_class]['bytes'] = int(sent_match.group(1))
                classes[current_class]['packets'] = int(sent_match.group(2))
                classes[current_class]['dropped'] = int(sent_match.group(3))

    return classes

def monitor_qos(interface, interval=5):
    """Monitor QoS metrics continuously."""
    prev_stats = None

    while True:
        stats = parse_tc_stats(get_tc_stats(interface))
        ts = datetime.now().strftime('%H:%M:%S')

        if prev_stats:
            print(f"\n=== {ts} QoS Stats for {interface} ===")
            for class_id, data in stats.items():
                if class_id in prev_stats:
                    prev = prev_stats[class_id]
                    bps = (data.get('bytes', 0) - prev.get('bytes', 0)) * 8 / interval
                    pps = (data.get('packets', 0) - prev.get('packets', 0)) / interval
                    drops = data.get('dropped', 0) - prev.get('dropped', 0)
                    print(f"Class {class_id}: {bps/1e6:.2f} Mbps, "
                          f"{pps:.1f} pps, drops={drops}")

        prev_stats = stats
        time.sleep(interval)

if __name__ == '__main__':
    monitor_qos('eth0')
```

## Prometheus Metrics for IPv6 QoS

```yaml
# /etc/prometheus/prometheus.yml - node_exporter collects tc stats

# node_exporter --collector.qdisc

# Custom tc stats collector script
# /usr/local/bin/tc_stats_collector.sh
#!/bin/bash
# Output Prometheus format tc statistics

echo "# HELP tc_class_bytes_total Bytes sent per tc class"
echo "# TYPE tc_class_bytes_total counter"

IFACE="eth0"
sudo tc -s class show dev $IFACE | while read line; do
    if [[ $line =~ class\ [a-z]+\ ([0-9]+:[0-9]+) ]]; then
        CLASS="${BASH_REMATCH[1]//:/_}"
    fi
    if [[ $line =~ Sent\ ([0-9]+)\ bytes\ ([0-9]+)\ pkt.*dropped\ ([0-9]+) ]]; then
        BYTES="${BASH_REMATCH[1]}"
        PKTS="${BASH_REMATCH[2]}"
        DROPS="${BASH_REMATCH[3]}"
        echo "tc_class_bytes_total{interface=\"$IFACE\",class=\"$CLASS\"} $BYTES"
        echo "tc_class_pkts_total{interface=\"$IFACE\",class=\"$CLASS\"} $PKTS"
        echo "tc_class_drops_total{interface=\"$IFACE\",class=\"$CLASS\"} $DROPS"
    fi
done
```

## Monitoring IPv6 Latency and Jitter

```bash
# Monitor latency to IPv6 destinations
#!/bin/bash
# ping_monitor.sh

TARGETS=(
    "2001:db8::1"
    "2001:db8::2"
    "2001:db8::3"
)

for target in "${TARGETS[@]}"; do
    result=$(ping6 -c 10 -q $target 2>/dev/null | tail -1)
    if [ -n "$result" ]; then
        min=$(echo $result | awk -F/ '{print $4}' | awk '{print $NF}')
        avg=$(echo $result | awk -F/ '{print $5}')
        max=$(echo $result | awk -F/ '{print $6}')
        mdev=$(echo $result | awk -F/ '{print $7}' | cut -d' ' -f1)
        echo "$target: min=${min}ms avg=${avg}ms max=${max}ms jitter=${mdev}ms"
    fi
done
```

## Grafana Dashboard Queries for IPv6 QoS

```text
Prometheus queries for IPv6 QoS dashboard:

# IPv6 throughput by class
rate(tc_class_bytes_total{class="1_10"}[1m]) * 8  # VoIP class bps
rate(tc_class_bytes_total{class="1_20"}[1m]) * 8  # Video class bps

# Drop rate per class
rate(tc_class_drops_total[5m])  # Drops per second

# Network interface IPv6 traffic (from node_exporter)
rate(node_network_transmit_bytes_total{device="eth0"}[5m]) * 8

# IPv6 vs IPv4 ratio
sum(rate(node_network_transmit_packets_total[5m])) by (device)
```

Effective IPv6 QoS monitoring combines `tc -s` statistics for queue performance, ping6-based latency measurement for per-destination tracking, and Prometheus/Grafana integration for trend analysis and alerting when QoS class drops indicate bandwidth saturation or misconfigured policies.
