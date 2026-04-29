# How to Monitor IPv6 Address Utilization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPAM, Utilization Monitoring, Prometheus, NetBox

Description: Monitor IPv6 address and prefix utilization using IPAM APIs, Prometheus metrics, and alerting to detect pool exhaustion and over-allocation before they cause issues.

## Introduction

While IPv6's vast address space makes host-level exhaustion unlikely, DHCPv6 pools, prefix delegation ranges, and organizational allocations can still exhaust. Monitoring utilization at the pool and prefix level ensures you catch impending exhaustion and reclaim unused allocations.

## Prometheus Exporter for NetBox IPv6 Utilization

```python
#!/usr/bin/env python3
# netbox_ipv6_utilization_exporter.py

from prometheus_client import start_http_server, Gauge, Info
import pynetbox
import time
import ipaddress

nb = pynetbox.api("http://netbox.internal", token="your-token")

# Metrics

PREFIX_UTILIZATION = Gauge(
    'netbox_prefix_utilization_percent',
    'IPv6 prefix utilization percentage',
    ['prefix', 'description', 'site']
)

PREFIX_TOTAL_ADDRESSES = Gauge(
    'netbox_prefix_total_addresses',
    'Total addresses in prefix',
    ['prefix']
)

PREFIX_USED_ADDRESSES = Gauge(
    'netbox_prefix_used_addresses',
    'Used addresses in prefix',
    ['prefix']
)

def collect_prefix_utilization():
    """Collect utilization for all IPv6 /64 prefixes."""
    prefixes = nb.ipam.prefixes.filter(family=6, mask_length=64)

    for prefix in prefixes:
        prefix_str = str(prefix.prefix)
        site_name = str(prefix.site) if prefix.site else "unassigned"
        description = prefix.description or ""

        # Count used addresses in this prefix
        used = nb.ipam.ip_addresses.filter(parent=prefix_str)
        used_count = len(list(used))

        # Total usable addresses in /64 (not counting network/broadcast equivalents)
        total = 2 ** 64  # Effectively unlimited for /64

        # For reporting purposes, use a practical pool size
        # In practice, track against your actual DHCPv6 pool range
        PRACTICAL_POOL = 10000  # Or get this from DHCPv6 server

        utilization = (used_count / PRACTICAL_POOL * 100) if PRACTICAL_POOL > 0 else 0

        PREFIX_UTILIZATION.labels(
            prefix=prefix_str,
            description=description,
            site=site_name
        ).set(utilization)

        PREFIX_USED_ADDRESSES.labels(prefix=prefix_str).set(used_count)

def collect_dhcpv6_pool_utilization():
    """Collect DHCPv6 pool utilization from Kea."""
    import urllib.request, json

    try:
        data = json.dumps({"command": "statistic-get-all", "service": ["dhcp6"]}).encode()
        req = urllib.request.Request(
            "http://[::1]:8000",
            data=data,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            stats = json.load(resp)

        # Kea Control Agent always wraps responses in a JSON array
        if isinstance(stats, list):
            stats = stats[0] if stats else {}

        # Parse pool statistics from Kea response
        arguments = stats.get("arguments", {})
        for key, value in arguments.items():
            if "assigned-nas" in key or "assigned-pds" in key:
                subnet_id = key.split("[")[1].split("]")[0] if "[" in key else "0"
                GAUGE_NAME = key.replace("[", "_").replace("]", "").replace("-", "_")
                # Create gauge dynamically
    except Exception as e:
        print(f"Kea collection error: {e}")

if __name__ == "__main__":
    start_http_server(9477, addr="::")
    print("IPv6 utilization exporter listening on [::]:9477")
    while True:
        collect_prefix_utilization()
        time.sleep(60)
```

## DHCPv6 Pool Utilization Query (Kea REST API)

```bash
#!/bin/bash
# check_dhcpv6_utilization.sh

KEA_CTRL="http://[::1]:8000"

# Get all DHCPv6 subnet statistics
STATS=$(curl -s -X POST "$KEA_CTRL" \
    -H "Content-Type: application/json" \
    -d '{"command":"statistic-get-all","service":["dhcp6"]}')

echo "$STATS" | python3 << 'EOF'
import json, sys

data = json.load(sys.stdin)
# Kea Control Agent always wraps responses in a JSON array
if isinstance(data, list):
    data = data[0] if data else {}
args = data.get("arguments", {})

print(f"{'Subnet':<15} {'Assigned':>10} {'Declined':>10} {'Total Pool':>12}")
print("-" * 55)

# Group by subnet ID
subnets = {}
for key, value in args.items():
    if key.startswith("subnet["):
        subnet_id = key.split("[")[1].split("]")[0]
        stat_name = key.split(".")[1] if "." in key else key
        if subnet_id not in subnets:
            subnets[subnet_id] = {}
        subnets[subnet_id][stat_name] = value[0][0] if value else 0

for subnet_id, stats in sorted(subnets.items()):
    assigned = stats.get("assigned-nas", 0)
    declined = stats.get("declined-addresses", 0)
    total = stats.get("total-nas", 0)
    pct = f"{assigned/total*100:.1f}%" if total > 0 else "N/A"
    print(f"  subnet {subnet_id:<10} {assigned:>10} {declined:>10} {total:>12} ({pct})")
EOF
```

## Grafana Alerts for Pool Exhaustion

```yaml
# Prometheus alert rules
groups:
  - name: ipv6-ipam
    rules:
      - alert: DHCPv6PoolNearExhaustion
        expr: |
          (
            kea_dhcp6_assigned_addresses / kea_dhcp6_total_addresses
          ) > 0.80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "DHCPv6 pool {{ $labels.subnet }} at {{ $value | humanizePercentage }}"

      - alert: IPv6PrefixHighUtilization
        expr: netbox_prefix_utilization_percent > 80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "IPv6 prefix {{ $labels.prefix }} utilization high"
```

## Utilization Report Script

```python
#!/usr/bin/env python3
# ipv6_utilization_report.py

import pynetbox
from datetime import datetime

nb = pynetbox.api("http://netbox.internal", token="your-token")

print(f"IPv6 Utilization Report - {datetime.now().strftime('%Y-%m-%d')}")
print("=" * 70)

# Check /48 prefix coverage (of the /32 organization block)
org_prefix = nb.ipam.prefixes.get(prefix="2001:db8::/32")
site_prefixes = list(nb.ipam.prefixes.filter(
    within="2001:db8::/32", mask_length=48))

max_48s = 2 ** (48 - 32)  # 65,536
allocated = len(site_prefixes)
print(f"\n/48 Allocations: {allocated}/{max_48s} ({allocated/max_48s*100:.2f}%)")

# Check /64 utilization per site
for site_prefix in sorted(site_prefixes, key=lambda p: str(p.prefix)):
    vlans = list(nb.ipam.prefixes.filter(
        within=str(site_prefix.prefix), mask_length=64))
    max_64s = 2 ** (64 - 48)  # 65,536
    print(f"  {str(site_prefix.prefix):<35} /64s: {len(vlans):>5}/{max_64s} "
          f"({len(vlans)/max_64s*100:.3f}%)")
```

## Conclusion

IPv6 utilization monitoring focuses on DHCPv6 pool exhaustion (track assigned vs total pool addresses), prefix allocation density at /48 and /64 levels (track against planned maximums), and IPAM record freshness (stale records indicate reclamation opportunities). Prometheus with Kea's built-in statistics endpoint provides the most accurate DHCPv6 pool metrics. Alert at 80% pool utilization to allow time for expansion before exhaustion. For SLAAC-enabled /64 subnets, pool utilization metrics from IPAM are less meaningful since addresses are not centrally tracked - monitor NDP table size on the gateway instead.
