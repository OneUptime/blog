# How to Monitor SRv6 Paths and Performance - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SRv6, Monitoring, Performance, Telemetry, BFD, Networking

Description: Monitor SRv6 paths, SID reachability, and performance using BFD, telemetry streaming, and custom probes to detect failures and degradation in production networks.

## Introduction

SRv6 paths require active monitoring because a SID becoming unreachable silently breaks all traffic that traverses it. Unlike MPLS, there is no LDP to signal failures. Use BFD for fast failure detection, telemetry streaming for continuous visibility, and synthetic probing to validate end-to-end path health.

## BFD for SRv6 SID Monitoring

```bash
# FRR BFD for SRv6 path monitoring

# /etc/frr/frr.conf

bfd
  peer 5f00:2:: multihop local-address 5f00:1::
    receive-interval 300
    transmit-interval 300
    detect-multiplier 3
  !
!

# IS-IS with BFD enabled on SRv6-capable interfaces
interface eth0
  ipv6 router isis CORE
  isis bfd
!
```

## SID Reachability Probing

```python
#!/usr/bin/env python3
"""Monitor SRv6 SID reachability via ICMP6 probes."""
import subprocess
import json
import time
from datetime import datetime, timezone

SIDS = [
    {"node": "R1", "sid": "5f00:1::"},
    {"node": "R2", "sid": "5f00:2::"},
    {"node": "R3", "sid": "5f00:3::"},
]

def probe_sid(sid: str) -> dict:
    result = subprocess.run(
        ["ping6", "-c", "3", "-W", "1", sid],
        capture_output=True, text=True
    )
    success = result.returncode == 0
    rtt = None
    if success:
        import re
        m = re.search(r'rtt min/avg/max.*= [\d.]+/([\d.]+)/', result.stdout)
        if m:
            rtt = float(m.group(1))
    return {"reachable": success, "avg_rtt_ms": rtt}

def monitor_loop(interval: int = 30):
    while True:
        results = []
        for entry in SIDS:
            probe = probe_sid(entry["sid"])
            results.append({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "node": entry["node"],
                "sid": entry["sid"],
                **probe
            })
            status = "UP" if probe["reachable"] else "DOWN"
            rtt_str = f"{probe['avg_rtt_ms']:.1f}ms" if probe["avg_rtt_ms"] else "N/A"
            print(f"[{entry['node']}] {entry['sid']}: {status} ({rtt_str})")

        with open("/tmp/srv6_health.json", "w") as f:
            json.dump(results, f, indent=2)

        time.sleep(interval)

if __name__ == "__main__":
    monitor_loop()
```

## Streaming Telemetry for SRv6

```bash
# gRPC telemetry subscription (Cisco IOS-XR)
# Subscribe to SRv6 SID table
grpc-telemetry-client \
  --server [5f00:1::]:57500 \
  --path "Cisco-IOS-XR-segment-routing-srv6-oper:srv6/active/locators/locator/sids/sid"

# Sensor path for SRv6 TE policy stats
# Cisco-IOS-XR-infra-xtc-agent-oper:xtc/policy-forwardings/policy-forwarding

# gnmic alternative (open source)
gnmic subscribe \
  --address "[5f00:1::]:57500" \
  --path "/network-instances/network-instance[name=default]/protocols/protocol[name=SRv6]/segment-routing/sids" \
  --mode stream \
  --stream-mode sample \
  --sample-interval 10s
```

## Path Trace with SRv6

```bash
# Traceroute through an SRv6 path
# Using Linux sr-traceroute (if available)
sr-traceroute --segments 5f00:2:0:e001::,5f00:3:0:e000:: --dest fd00:99::1

# Manual traceroute with SRv6 encapsulation
# Add a host route via SRv6 and traceroute to it
ip -6 route add fd00:99::1/128 \
  encap seg6 mode encap \
  segs 5f00:2:0:e001::,5f00:3:0:e000:: dev eth0

traceroute6 fd00:99::1
# Shows each hop's IPv6 address as packets traverse SRv6 path
```

## Alerting on SID Failures

```bash
#!/bin/bash
# Check SID reachability and alert
ALERT_WEBHOOK="https://oneuptime.example.com/webhook/alert"

for SID in "5f00:1::" "5f00:2::" "5f00:3::"; do
  if ! ping6 -c 2 -W 1 "$SID" >/dev/null 2>&1; then
    curl -s -X POST "$ALERT_WEBHOOK" \
      -H "Content-Type: application/json" \
      -d "{\"alert\": \"SRv6 SID unreachable\", \"sid\": \"$SID\"}"
  fi
done
```

## Conclusion

SRv6 path monitoring requires proactive SID probing, BFD for fast failure detection, and telemetry streaming for continuous visibility. Combine ping-based availability checks with RTT trending to detect both hard failures and gradual degradation. Integrate the SID health monitoring script with OneUptime to centralize alerts and track SRv6 path SLA compliance.
