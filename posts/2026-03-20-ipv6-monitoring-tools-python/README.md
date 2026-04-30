# How to Build IPv6 Monitoring Tools in Python - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Python, Monitoring, Prometheus, Network Management

Description: Build IPv6 network monitoring tools in Python including availability monitors, prefix utilization trackers, BGP session monitors, and Prometheus metrics exporters.

## IPv6 Availability Monitor

```python
import asyncio
import socket
import ipaddress
from datetime import UTC, datetime

class IPv6Monitor:
    """Monitor IPv6 service availability with async TCP checks."""

    def __init__(self, targets: list[str], port: int = 53, interval: int = 60):
        self.targets = targets
        self.port = port
        self.interval = interval
        self.results = {}

    async def check_host(self, host: str) -> dict:
        """Check if an IPv6 service is reachable via TCP connect."""
        loop = asyncio.get_running_loop()
        start = loop.time()
        try:
            addr = ipaddress.ip_address(host)
            if addr.version != 6:
                raise ValueError(f"{host} is not an IPv6 address")

            # TCP connect to a known IPv6 service port.
            conn = asyncio.open_connection(host, self.port,
                                           family=socket.AF_INET6)
            reader, writer = await asyncio.wait_for(conn, timeout=5.0)
            latency = (loop.time() - start) * 1000
            writer.close()
            await writer.wait_closed()
            return {"host": host, "up": True, "latency_ms": round(latency, 2),
                    "timestamp": datetime.now(UTC).isoformat()}
        except (ValueError, asyncio.TimeoutError, ConnectionRefusedError, OSError) as e:
            return {"host": host, "up": False, "error": str(e),
                    "timestamp": datetime.now(UTC).isoformat()}

    async def run_once(self) -> dict[str, dict]:
        """Check all targets concurrently."""
        tasks = [self.check_host(h) for h in self.targets]
        results = await asyncio.gather(*tasks)
        return {r["host"]: r for r in results}

    async def run_forever(self):
        """Monitor continuously."""
        while True:
            self.results = await self.run_once()
            for host, result in self.results.items():
                status = "UP" if result["up"] else "DOWN"
                latency = result.get("latency_ms", "N/A")
                print(f"[{result['timestamp']}] {host:40s} {status} ({latency}ms)")
            await asyncio.sleep(self.interval)

# Run monitor

targets = ["2001:4860:4860::8888", "2606:4700:4700::1111", "2620:fe::9"]
monitor = IPv6Monitor(targets, port=53, interval=30)
asyncio.run(monitor.run_forever())
```

## NDP Neighbor Table Monitor

```python
import subprocess
import time
import json
from collections import defaultdict

def get_ndp_stats(interface: str | None = None) -> dict[str, int]:
    """Collect NDP neighbor statistics."""
    cmd = ["ip", "-6", "-j", "neigh", "show"]
    if interface:
        cmd += ["dev", interface]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        neighbors = json.loads(result.stdout or "[]")
    except (OSError, subprocess.CalledProcessError, json.JSONDecodeError) as e:
        print(f"Error querying NDP: {e}")
        return {
            "total": 0,
            "reachable": 0,
            "stale": 0,
            "failed": 0,
            "incomplete": 0,
            "noarp": 0,
        }

    stats = defaultdict(int)
    for n in neighbors:
        state = n.get("state", ["UNKNOWN"])
        if isinstance(state, list):
            state = state[0]
        stats[state] += 1

    return {
        "total": len(neighbors),
        "reachable": stats.get("REACHABLE", 0),
        "stale": stats.get("STALE", 0),
        "failed": stats.get("FAILED", 0),
        "incomplete": stats.get("INCOMPLETE", 0),
        "noarp": stats.get("NOARP", 0),
    }

# Monitor NDP table changes
prev_stats = {}
while True:
    current = get_ndp_stats("eth0")
    for metric, value in current.items():
        prev_val = prev_stats.get(metric, value)
        if value != prev_val:
            print(f"NDP {metric}: {prev_val} → {value}")
    prev_stats = current
    time.sleep(30)
```

## BGP IPv6 Session Monitor

```python
import subprocess
import json

def _prefix_count(value: object) -> int:
    return value if isinstance(value, int) else 0

def get_frr_bgp_ipv6_sessions() -> list[dict]:
    """Monitor BGP IPv6 sessions using FRR vtysh."""
    try:
        result = subprocess.run(
            ["vtysh", "-c", "show bgp ipv6 unicast summary json"],
            capture_output=True, text=True, timeout=10, check=True
        )
        data = json.loads(result.stdout)
    except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired, json.JSONDecodeError) as e:
        print(f"Error querying BGP: {e}")
        return []

    sessions = []
    for peer_ip, peer_data in data.get("peers", {}).items():
        sessions.append({
            "peer": peer_ip,
            "as": peer_data.get("remoteAs"),
            "state": peer_data.get("bgpState"),
            "established_since_epoch": peer_data.get("bgpTimerUpEstablishedEpoch"),
            "prefixes_received": _prefix_count(peer_data.get("pfxRcd")),
            "prefixes_sent": _prefix_count(peer_data.get("pfxSnt")),
        })

    return sessions

# Check and alert on down sessions
sessions = get_frr_bgp_ipv6_sessions()
for s in sessions:
    status = "UP" if s["state"] == "Established" else "DOWN"
    remote_as = str(s["as"]) if s["as"] is not None else "?"
    print(f"BGP peer {s['peer']:40s} AS{remote_as:>10s} {status} "
          f"prefixes_rx={s['prefixes_received']}")

# Alert on non-established sessions
down = [s for s in sessions if s["state"] != "Established"]
if down:
    print(f"\nALERT: {len(down)} BGP IPv6 sessions down!")
    for s in down:
        print(f"  {s['peer']} (AS{s['as']}) state={s['state']}")
```

## Prometheus IPv6 Metrics Exporter

```python
import json
import subprocess
import time
from collections import defaultdict

from prometheus_client import Gauge, start_http_server

def get_ndp_stats(interface: str | None = None) -> dict[str, int]:
    """Collect NDP neighbor statistics."""
    cmd = ["ip", "-6", "-j", "neigh", "show"]
    if interface:
        cmd += ["dev", interface]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        neighbors = json.loads(result.stdout or "[]")
    except (OSError, subprocess.CalledProcessError, json.JSONDecodeError) as e:
        print(f"Error querying NDP: {e}")
        return {
            "total": 0,
            "reachable": 0,
            "stale": 0,
            "failed": 0,
            "incomplete": 0,
            "noarp": 0,
        }

    stats = defaultdict(int)
    for n in neighbors:
        state = n.get("state", ["UNKNOWN"])
        if isinstance(state, list):
            state = state[0]
        stats[state] += 1

    return {
        "total": len(neighbors),
        "reachable": stats.get("REACHABLE", 0),
        "stale": stats.get("STALE", 0),
        "failed": stats.get("FAILED", 0),
        "incomplete": stats.get("INCOMPLETE", 0),
        "noarp": stats.get("NOARP", 0),
    }

def _prefix_count(value: object) -> int:
    return value if isinstance(value, int) else 0

def get_frr_bgp_ipv6_sessions() -> list[dict]:
    """Monitor BGP IPv6 sessions using FRR vtysh."""
    try:
        result = subprocess.run(
            ["vtysh", "-c", "show bgp ipv6 unicast summary json"],
            capture_output=True, text=True, timeout=10, check=True
        )
        data = json.loads(result.stdout)
    except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired, json.JSONDecodeError) as e:
        print(f"Error querying BGP: {e}")
        return []

    sessions = []
    for peer_ip, peer_data in data.get("peers", {}).items():
        sessions.append({
            "peer": peer_ip,
            "as": peer_data.get("remoteAs"),
            "state": peer_data.get("bgpState"),
            "prefixes_received": _prefix_count(peer_data.get("pfxRcd")),
        })

    return sessions

# Define metrics
ndp_neighbors = Gauge("ipv6_ndp_neighbors_total",
                       "Number of IPv6 NDP neighbors", ["interface", "state"])
bgp_sessions = Gauge("ipv6_bgp_sessions_up",
                     "Number of established BGP IPv6 sessions")
bgp_prefixes_rx = Gauge("ipv6_bgp_prefixes_received",
                         "BGP IPv6 prefixes received", ["peer", "peer_as"])

def collect_ndp_metrics():
    """Collect and export NDP metrics."""
    for iface in ["eth0", "eth1"]:
        stats = get_ndp_stats(iface)
        for state, count in stats.items():
            if state != "total":
                ndp_neighbors.labels(interface=iface, state=state).set(count)

def collect_bgp_metrics():
    """Collect and export BGP metrics."""
    sessions = get_frr_bgp_ipv6_sessions()
    established = sum(1 for s in sessions if s["state"] == "Established")
    bgp_sessions.set(established)
    bgp_prefixes_rx.clear()

    for s in sessions:
        if s["state"] == "Established":
            bgp_prefixes_rx.labels(peer=s["peer"], peer_as=str(s["as"])).set(
                s["prefixes_received"]
            )

# Start Prometheus exporter on port 9100
start_http_server(9100)
print("IPv6 Prometheus exporter on :9100/metrics")

while True:
    collect_ndp_metrics()
    collect_bgp_metrics()
    time.sleep(30)
```

## Conclusion

Build IPv6 monitoring tools in Python using: `asyncio.open_connection()` with `family=socket.AF_INET6` for async IPv6 service availability checking over TCP, `subprocess` with `ip -6 -j neigh show` (JSON output) for NDP neighbor table monitoring, and `vtysh` JSON output for BGP session state. Export metrics to Prometheus using `prometheus_client` library with `Gauge` metrics for NDP neighbor counts by state and BGP session counts. Set alert thresholds on failed NDP neighbors (indicates routing problems), BGP sessions going non-Established, and prefix count drops greater than 10% from baseline. Use `asyncio.gather()` to check hundreds of IPv6 hosts concurrently without blocking.
