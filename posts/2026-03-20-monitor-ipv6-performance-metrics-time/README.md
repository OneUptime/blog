# How to Monitor IPv6 Performance Metrics Over Time - Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Monitoring, Prometheus, Grafana, Metric, Time Series

Description: Build a time-series monitoring pipeline for IPv6 network performance metrics using Prometheus node exporters, custom collectors, and Grafana dashboards.

## Introduction

Point-in-time benchmarks are useful, but continuous time-series monitoring reveals trends, regressions, and anomalies that snapshots miss. This guide builds an IPv6 metrics pipeline using Prometheus and Grafana.

## Step 1: Collect IPv6 Metrics with Prometheus Node Exporter

The Prometheus node exporter automatically exposes IPv6 network interface statistics.

```bash
# Install node exporter

sudo apt-get install prometheus-node-exporter

# Verify IPv6 metrics are exported
curl http://localhost:9100/metrics | grep -E "node_network.*ipv6|node_netstat_Ip6"

# Key IPv6 metrics available:
# node_netstat_Ip6_InOctets - incoming IPv6 bytes (default-exposed)
# node_netstat_Ip6_OutOctets - outgoing IPv6 bytes (default-exposed)
# node_netstat_Tcp_RetransSegs - total TCP segments retransmitted (default-exposed)
# node_netstat_TcpExt_TCPSynRetrans - TCP SYN retransmissions (default-exposed)

# Additional /proc/net/snmp6 counters such as Ip6_InReceives, Ip6_OutRequests,
# and Ip6_InDiscards exist but are filtered out by node_exporter's default regex.
# To expose them, override the netstat fields filter, e.g.:
# node_exporter --collector.netstat.fields='^(.*_(InErrors|InErrs)|Ip6_(InReceives|OutRequests|InDiscards|InOctets|OutOctets)|...)$'
```

## Step 2: Custom IPv6 Latency Exporter

```python
#!/usr/bin/env python3
# ipv6_latency_exporter.py - Prometheus exporter for IPv6 ping latency

import subprocess
import re
import time
from prometheus_client import start_http_server, Gauge, Counter

# Define metrics
ipv6_rtt_avg = Gauge(
    "ipv6_ping_rtt_avg_ms",
    "Average IPv6 ping RTT in milliseconds",
    ["target"]
)
ipv6_rtt_max = Gauge(
    "ipv6_ping_rtt_max_ms",
    "Maximum IPv6 ping RTT in milliseconds",
    ["target"]
)
ipv6_packet_loss = Gauge(
    "ipv6_ping_packet_loss_percent",
    "IPv6 ping packet loss percentage",
    ["target"]
)

TARGETS = [
    "2001:db8::1",
    "2001:4860:4860::8888",  # Google DNS IPv6
    "2606:4700:4700::1111",  # Cloudflare DNS IPv6
]

def probe_target(target: str):
    """Run ping6 and parse results."""
    result = subprocess.run(
        ["ping6", "-c", "10", "-i", "0.2", "-q", target],
        capture_output=True,
        text=True,
        timeout=15
    )

    output = result.stdout + result.stderr

    # Parse packet loss
    loss_match = re.search(r"(\d+(?:\.\d+)?)% packet loss", output)
    loss = float(loss_match.group(1)) if loss_match else 100.0

    # Parse RTT statistics
    rtt_match = re.search(
        r"rtt min/avg/max/mdev = [\d.]+/([\d.]+)/([\d.]+)/[\d.]+ ms",
        output
    )
    avg_rtt = float(rtt_match.group(1)) if rtt_match else 0.0
    max_rtt = float(rtt_match.group(2)) if rtt_match else 0.0

    ipv6_packet_loss.labels(target=target).set(loss)
    ipv6_rtt_avg.labels(target=target).set(avg_rtt)
    ipv6_rtt_max.labels(target=target).set(max_rtt)

if __name__ == "__main__":
    # Start HTTP server for Prometheus scraping
    start_http_server(9200)
    print("IPv6 latency exporter running on :9200")

    while True:
        for target in TARGETS:
            try:
                probe_target(target)
            except Exception as e:
                print(f"Error probing {target}: {e}")
        time.sleep(60)
```

## Step 3: Prometheus Configuration

```yaml
# prometheus.yml - scrape configuration

global:
  scrape_interval: 60s

scrape_configs:
  - job_name: "node"
    static_configs:
      - targets:
          - "[::1]:9100"           # Node exporter over IPv6 loopback
          - "[2001:db8::10]:9100"  # Remote node

  - job_name: "ipv6-latency"
    static_configs:
      - targets:
          - "[::1]:9200"  # Custom latency exporter
```

## Step 4: Grafana Dashboard Panels

```promql
# Panel 1: IPv6 incoming traffic rate (Mbps)
rate(node_netstat_Ip6_InOctets[5m]) * 8 / 1e6

# Panel 2: IPv6 packet drop rate
# (requires Ip6_InDiscards to be enabled via --collector.netstat.fields)
rate(node_netstat_Ip6_InDiscards[5m])

# Panel 3: IPv6 ping latency to Google DNS
ipv6_ping_rtt_avg_ms{target="2001:4860:4860::8888"}

# Panel 4: IPv6 packet loss heatmap
ipv6_ping_packet_loss_percent

# Panel 5: TCP retransmission rate
rate(node_netstat_Tcp_RetransSegs[5m])
```

## Step 5: Alerting Rules

```yaml
# ipv6-alerts.yml
groups:
  - name: ipv6-performance
    rules:
      - alert: IPv6HighPacketLoss
        expr: ipv6_ping_packet_loss_percent > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "IPv6 packet loss above 2% to {{ $labels.target }}"

      - alert: IPv6HighLatency
        expr: ipv6_ping_rtt_avg_ms > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "IPv6 latency above 100ms to {{ $labels.target }}"
```

## Conclusion

A time-series monitoring pipeline for IPv6 performance combines node exporter interface statistics with custom latency probes. Grafana dashboards visualize trends, and Prometheus alerts notify on regressions. Complement this infrastructure monitoring with OneUptime's application-level synthetic checks for end-to-end visibility.
