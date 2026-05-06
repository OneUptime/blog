# How to Build IPv6 Monitoring Tools in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, IPv6, Monitoring, Prometheus, Alerting, Network

Description: Build IPv6 network monitoring tools in Python that check reachability, measure latency, and expose metrics via Prometheus.

## Building an IPv6 Ping Monitor

```python
import subprocess
import time
import re
from dataclasses import dataclass
from typing import Optional

@dataclass
class PingResult:
    host: str
    reachable: bool
    rtt_ms: Optional[float]
    packet_loss_pct: float

def ping6(host: str, count: int = 3) -> PingResult:
    """Ping an IPv6 host and return structured results."""
    result = subprocess.run(
        ["ping", "-6", "-c", str(count), "-W", "2", host],
        capture_output=True, text=True
    )

    # Parse packet loss
    loss_match = re.search(r"(\d+(?:\.\d+)?)% packet loss", result.stdout)
    packet_loss = float(loss_match.group(1)) if loss_match else 100.0

    # Parse RTT
    rtt_match = re.search(r"rtt min/avg/max.*= [\d.]+/([\d.]+)/", result.stdout)
    rtt_ms = float(rtt_match.group(1)) if rtt_match else None

    return PingResult(
        host=host,
        reachable=result.returncode == 0,
        rtt_ms=rtt_ms,
        packet_loss_pct=packet_loss
    )

# Monitor a list of IPv6 hosts

targets = [
    "2001:4860:4860::8888",   # Google DNS
    "2606:4700:4700::1111",   # Cloudflare DNS
    "2001:db8::1",            # Replace with your IPv6 gateway
]

for target in targets:
    result = ping6(target)
    status = "UP" if result.reachable else "DOWN"
    rtt = f"{result.rtt_ms:.1f}ms" if result.rtt_ms is not None else "N/A"
    print(f"[{status}] {target} RTT={rtt} Loss={result.packet_loss_pct:.0f}%")
```

## Prometheus Metrics for IPv6 Monitoring

Export IPv6 metrics in Prometheus format:

```python
from prometheus_client import Gauge, Counter, start_http_server
import threading
import time

# Define metrics
ipv6_reachability = Gauge(
    "ipv6_host_reachable",
    "IPv6 host reachability (1=up, 0=down)",
    ["host"]
)

ipv6_rtt_ms = Gauge(
    "ipv6_host_rtt_milliseconds",
    "IPv6 round-trip time in milliseconds",
    ["host"]
)

ipv6_packet_loss = Gauge(
    "ipv6_packet_loss_percent",
    "IPv6 packet loss percentage",
    ["host"]
)

def monitor_loop(targets: list[str], interval: int = 30):
    """Continuously monitor IPv6 hosts and update metrics."""
    while True:
        for target in targets:
            result = ping6(target)

            ipv6_reachability.labels(host=target).set(
                1 if result.reachable else 0
            )
            ipv6_packet_loss.labels(host=target).set(result.packet_loss_pct)

            if result.rtt_ms is not None:
                ipv6_rtt_ms.labels(host=target).set(result.rtt_ms)
            else:
                ipv6_rtt_ms.remove(target)

        time.sleep(interval)

# Start Prometheus metrics endpoint
start_http_server(9100)

# Start monitoring in background
targets = ["2001:4860:4860::8888", "2606:4700:4700::1111"]
monitor_thread = threading.Thread(
    target=monitor_loop,
    args=(targets,)
)
monitor_thread.start()

print("Metrics available at http://127.0.0.1:9100/metrics")
monitor_thread.join()
```

## IPv6 BGP Route Monitor

Monitor IPv6 BGP route announcements using subprocess:

```python
import subprocess
import re
import json
from datetime import datetime

def get_ipv6_bgp_routes() -> list[dict]:
    """Fetch IPv6 BGP routes from FRRouting via vtysh."""
    result = subprocess.run(
        ["vtysh", "-c", "show bgp ipv6 unicast json"],
        capture_output=True, text=True
    )

    if result.returncode != 0:
        return []

    bgp_data = json.loads(result.stdout)
    routes = []

    for prefix, data in bgp_data.get("routes", {}).items():
        for path in data:
            as_path = path.get("aspath", "")
            routes.append({
                "prefix": prefix,
                "nexthop": path.get("nexthops", [{}])[0].get("ip", ""),
                "as_path": as_path.get("string", "") if isinstance(as_path, dict) else as_path,
                "valid": path.get("valid", False),
                "best": path.get("bestpath", {}).get("overall", False)
            })

    return routes

def alert_on_route_change(previous: set, current: set):
    """Alert when IPv6 routes appear or disappear."""
    added = current - previous
    removed = previous - current

    for prefix in added:
        print(f"ALERT: New IPv6 prefix announced: {prefix}")

    for prefix in removed:
        print(f"ALERT: IPv6 prefix withdrawn: {prefix}")
```

## HTTP Endpoint Monitor

Check IPv6 HTTP/HTTPS endpoints:

```python
import requests
import time
from dataclasses import dataclass

@dataclass
class HTTPCheckResult:
    url: str
    status_code: int
    response_time_ms: float
    error: str | None = None

def check_ipv6_http(url: str, timeout: int = 10) -> HTTPCheckResult:
    """Check an HTTP endpoint over IPv6."""
    start = time.monotonic()
    try:
        response = requests.get(url, timeout=timeout)
        elapsed_ms = (time.monotonic() - start) * 1000
        return HTTPCheckResult(url, response.status_code, elapsed_ms)
    except requests.exceptions.RequestException as e:
        elapsed_ms = (time.monotonic() - start) * 1000
        return HTTPCheckResult(url, 0, elapsed_ms, str(e))

# Monitor IPv6 HTTP endpoints
endpoints = [
    "https://[2001:db8::10]/health",
    "http://[2001:db8::20]:8080/status",
]

for endpoint in endpoints:
    result = check_ipv6_http(endpoint)
    if result.status_code == 200:
        print(f"OK  {result.url} ({result.response_time_ms:.0f}ms)")
    else:
        print(f"ERR {result.url} status={result.status_code} err={result.error}")
```

## Conclusion

Python is well-suited for building IPv6 monitoring tools. Combine `ping -6` subprocess calls for ICMP monitoring, Prometheus client for metrics export, and requests for HTTP health checks. Expose metrics via Prometheus and visualize with Grafana for a complete IPv6 monitoring stack that integrates with OneUptime or other alerting platforms.
