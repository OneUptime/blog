# How to Monitor DHCPv6 Relay Statistics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCPv6, Relay, Statistics, Monitoring, Prometheus, Networking

Description: Monitor DHCPv6 relay statistics across platforms including message counters, error rates, and Prometheus metrics for observability.

## Statistics Available on Each Platform

| Platform | Command | Key Metrics |
|---|---|---|
| Linux dhcrelay | Logs / journald (no built-in stats command) | Custom log-derived counters |
| Cisco IOS XR | show dhcp ipv6 relay statistics | RX, TX, drops |
| Juniper | show dhcpv6 relay statistics | Messages, errors, drops |
| ISC Kea DHCPv6 | HTTP control API | Global pkt6 counters, per-subnet lease counters |

## Cisco IOS XR Statistics

```text
! Show relay message statistics
show dhcp ipv6 relay statistics

! Sample output:
!                   VRF                     |      RX       |      TX       |       DR      |
! -------------------------------------------------------------------------------------------
! default                                  |          241  |            5  |          236  |

! Show detailed statistics
show dhcp ipv6 relay statistics detail

! Reset counters
clear dhcp ipv6 relay statistics
```

## Juniper Relay Statistics

```text
# Show DHCPv6 relay statistics

show dhcpv6 relay statistics

# Output fields:
# DHCPv6 Packets dropped:
#   Total                       2
# Messages received:
#   DHCPV6_SOLICIT            400
#   DHCPV6_REQUEST            400
#   DHCPV6_RENEW              100
#   DHCPV6_RELAY_REPL         398
# Messages sent:
#   DHCPV6_RELAY_FORW         900
#   DHCPV6_RELAY_REPL         398
# Packets forwarded:
#   FWD REQUEST               400
#   FWD REPLY                 398

# Clear statistics
clear dhcpv6 relay statistics

# Per-routing-instance statistics
show dhcpv6 relay statistics routing-instance CLIENTS
```

## ISC Kea DHCPv6 Statistics via HTTP Control API

```python
#!/usr/bin/env python3
# kea-relay-stats.py - Query Kea DHCPv6 statistics via HTTP control API

import requests

KEA_API = "http://[2001:db8::1]:8000"

def get_kea_stats():
    resp = requests.post(
        f"{KEA_API}/",
        json={
            "command": "statistic-get-all",
            "arguments": {}
        },
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()

    if isinstance(data, list):
        data = data[0]

    stats = data.get("arguments", {})

    # DHCPv6 server-side counters relevant to relayed environments
    relay_stats = {
        "pkt6-received": stats.get("pkt6-received", [[0]])[0][0],
        "pkt6-solicit-received": stats.get("pkt6-solicit-received", [[0]])[0][0],
        "pkt6-request-received": stats.get("pkt6-request-received", [[0]])[0][0],
        "pkt6-reply-sent": stats.get("pkt6-reply-sent", [[0]])[0][0],
        "pkt6-advertise-sent": stats.get("pkt6-advertise-sent", [[0]])[0][0],
    }

    return relay_stats

if __name__ == "__main__":
    stats = get_kea_stats()
    for key, value in stats.items():
        print(f"{key}: {value}")
```

## Prometheus Metrics for DHCPv6 Relay

```python
#!/usr/bin/env python3
# dhcpv6-relay-exporter.py - Prometheus exporter for DHCPv6 relay stats

from prometheus_client import start_http_server, Counter
import subprocess
import time
import re
from datetime import datetime, timezone

DHCRELAY_UNIT = 'isc-dhcp-relay6'  # Adjust to match your distro's systemd unit name.

# Metrics
relay_received = Counter('dhcpv6_relay_received_total', 'Messages received from clients', ['message_type'])
relay_forwarded = Counter('dhcpv6_relay_forwarded_total', 'Messages forwarded to server')
relay_dropped = Counter('dhcpv6_relay_dropped_total', 'Messages dropped')
last_checked = None

def collect_dhcrelay_stats():
    """Parse DHCPv6 relay logs for custom counters."""
    global last_checked
    now = datetime.now(timezone.utc)
    since = last_checked.isoformat() if last_checked else '1 minute ago'

    # Example for deployments that log per-packet relay events.
    result = subprocess.run(
        ['journalctl', '-u', DHCRELAY_UNIT, '--since', since, '--no-pager'],
        capture_output=True, text=True
    )

    if result.returncode != 0:
        return

    solicit_count = len(re.findall(r'RELAY-FORW.*SOLICIT', result.stdout))
    request_count = len(re.findall(r'RELAY-FORW.*REQUEST', result.stdout))
    forwarded_count = solicit_count + request_count
    drop_count = len(re.findall(r'drop', result.stdout, re.IGNORECASE))

    if solicit_count > 0:
        relay_received.labels(message_type='solicit').inc(solicit_count)
    if request_count > 0:
        relay_received.labels(message_type='request').inc(request_count)
    if forwarded_count > 0:
        relay_forwarded.inc(forwarded_count)
    if drop_count > 0:
        relay_dropped.inc(drop_count)

    last_checked = now

def main():
    start_http_server(9200)
    print("DHCPv6 relay exporter on :9200/metrics")

    while True:
        collect_dhcrelay_stats()
        time.sleep(60)

if __name__ == '__main__':
    main()
```

## Grafana Dashboard Queries

```text
# Prometheus queries for DHCPv6 relay monitoring

# Message rate per type
sum by (message_type) (rate(dhcpv6_relay_received_total[5m]))

# Total forwarded rate
sum(rate(dhcpv6_relay_forwarded_total[5m]))

# Drop rate (alert if > 1%)
rate(dhcpv6_relay_dropped_total[5m]) /
sum(rate(dhcpv6_relay_received_total[5m])) * 100

# Drop events per second
rate(dhcpv6_relay_dropped_total[5m])
```

## Alerting on Relay Issues

```yaml
# Prometheus alerting rules
groups:
  - name: dhcpv6-relay
    rules:
      - alert: DHCPv6RelayDropsHigh
        expr: (rate(dhcpv6_relay_dropped_total[5m]) / sum(rate(dhcpv6_relay_received_total[5m])) * 100 > 1) and (sum(rate(dhcpv6_relay_received_total[5m])) > 0)
        for: 2m
        annotations:
          summary: "DHCPv6 relay drop rate is {{ $value }}%"

      - alert: DHCPv6RelayNoTraffic
        expr: sum(rate(dhcpv6_relay_received_total[15m])) == 0
        for: 10m
        annotations:
          summary: "DHCPv6 relay receiving no traffic - clients may not be getting addresses"
```

## Conclusion

DHCPv6 relay statistics reveal forwarding health at a glance. Cisco IOS XR and Juniper provide relay counters via CLI. ISC Kea exposes server-side DHCPv6 packet counters and per-subnet lease statistics via its HTTP control API. Export custom relay metrics to Prometheus for time-series monitoring and alerting. Key alert conditions: high drop rates (> 1%) and no traffic when traffic is expected. A healthy relay shows steady receive and forward counts with minimal drops.
