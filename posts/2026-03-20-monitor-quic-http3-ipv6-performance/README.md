# How to Monitor QUIC/HTTP3 Performance over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: QUIC, HTTP/3, IPv6, Monitoring, Performance

Description: Monitor QUIC and HTTP/3 performance metrics over IPv6 including connection times, packet loss, and protocol fallback rates.

## Key Metrics to Monitor

For QUIC/HTTP3 over IPv6, track these key performance indicators:

| Metric | Why It Matters |
|--------|---------------|
| QUIC handshake time | Measures 0-RTT/1-RTT efficiency |
| Connection migration success | IPv6 mobility performance |
| Packet loss rate | QUIC's loss recovery effectiveness |
| Protocol downgrade rate | Frequency of HTTP/3 → HTTP/2 fallback |
| Stream concurrency | Multiplexing utilization |

## Collecting Metrics with curl

```bash
#!/bin/bash
# quic-perf-monitor.sh

URL="https://example.com"
OUTPUT_FILE="/var/log/quic-metrics.log"

# Collect HTTP/3 timing over IPv6

collect_quic_metrics() {
    local result
    result=$(curl -6 --http3 "$URL" \
      --silent --output /dev/null \
      --write-out '%{time_namelookup},%{time_connect},%{time_appconnect},%{time_pretransfer},%{time_total},%{http_version},%{http_code}' \
      --max-time 30 2>&1)

    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    echo "$timestamp,$result" >> "$OUTPUT_FILE"
}

# Collect HTTP/2 for comparison
collect_http2_metrics() {
    local result
    result=$(curl -6 --http2 "$URL" \
      --silent --output /dev/null \
      --write-out '%{time_appconnect},%{time_total},%{http_version}' \
      --max-time 30 2>&1)
    echo "http2_baseline: $result"
}

collect_quic_metrics
collect_http2_metrics
```

## Prometheus Exporter for QUIC Metrics

```python
from prometheus_client import Gauge, Counter, Histogram, start_http_server
import subprocess
import time
import re

# Define metrics
quic_handshake_duration = Histogram(
    'quic_handshake_duration_seconds',
    'Time to complete QUIC handshake',
    ['endpoint', 'protocol']
)
quic_total_duration = Histogram(
    'quic_request_duration_seconds',
    'Total HTTP/3 request duration',
    ['endpoint']
)
quic_downgrade_total = Counter(
    'quic_protocol_downgrade_total',
    'Number of times HTTP/3 fell back to HTTP/2',
    ['endpoint']
)

ENDPOINTS = ["https://example.com", "https://api.example.com"]

def measure_endpoint(url):
    """Measure HTTP/3 performance metrics for an endpoint."""
    cmd = [
        "curl", "-6", "--http3",
        "--silent", "--output", "/dev/null",
        "--write-out", "%{time_appconnect} %{time_total} %{http_version}",
        "--max-time", "30", url
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=35)
    if result.returncode == 0:
        parts = result.stdout.strip().split()
        handshake = float(parts[0])
        total = float(parts[1])
        version = parts[2]

        quic_handshake_duration.labels(endpoint=url, protocol=f"HTTP/{version}").observe(handshake)
        quic_total_duration.labels(endpoint=url).observe(total)

        # Detect if HTTP/3 was not used (downgrade)
        if version != "3":
            quic_downgrade_total.labels(endpoint=url).inc()

if __name__ == "__main__":
    start_http_server(8000, addr="::")
    while True:
        for endpoint in ENDPOINTS:
            try:
                measure_endpoint(endpoint)
            except Exception as e:
                print(f"Error measuring {endpoint}: {e}")
        time.sleep(60)
```

## Nginx QUIC Statistics

```bash
# Enable Nginx status module for QUIC stats
# In nginx.conf:
# location /nginx-status {
#   stub_status;
#   allow ::1;
#   deny all;
# }

# Query QUIC-specific stats (Nginx Plus or custom build)
curl http://[::1]/nginx-status

# Parse with awk for monitoring
curl -s http://[::1]/nginx-status | awk '/Active/ {print "active_connections:", $3}'
```

## Grafana Dashboard Panels

```json
{
  "panels": [
    {
      "title": "HTTP/3 Handshake Time (IPv6)",
      "type": "timeseries",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, quic_handshake_duration_seconds_bucket)",
          "legendFormat": "p95 handshake"
        }
      ]
    },
    {
      "title": "Protocol Downgrade Rate",
      "type": "stat",
      "targets": [
        {
          "expr": "rate(quic_protocol_downgrade_total[5m])",
          "legendFormat": "Downgrades/sec"
        }
      ]
    }
  ]
}
```

## Network-Level QUIC Monitoring

```bash
# Monitor QUIC UDP traffic on IPv6 interface
sudo tcpdump -i eth0 -n "ip6 and udp port 443" -c 100

# Count QUIC connections per second
sudo tcpdump -i eth0 -n "ip6 and udp port 443" 2>/dev/null | \
  awk '{print $1}' | cut -d. -f1 | uniq -c

# Monitor with nload for bandwidth
nload -u m eth0
```

## Monitoring with OneUptime

[OneUptime](https://oneuptime.com) provides HTTP monitors that can test your QUIC/HTTP3 endpoints over IPv6 at regular intervals. Configure response time thresholds and alert when QUIC performance degrades below expected baselines compared to HTTP/2.

## Conclusion

Monitoring QUIC/HTTP3 over IPv6 requires tracking handshake times, total request duration, and protocol downgrade rates. Use Prometheus exporters with curl-based measurements, and set up alerting for performance regressions. Compare metrics against HTTP/2 baselines to quantify QUIC's benefit.
