# How to Monitor IPv6 Address Allocation Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DHCPv6, IPAM, Monitoring, Log Analysis

Description: Monitor IPv6 address allocation events from DHCPv6 servers and SLAAC, parse allocation logs, detect pool exhaustion, and alert on unusual allocation patterns.

## Introduction

IPv6 address allocation monitoring tracks DHCPv6 lease events, SLAAC address assignments, and prefix delegation events. Unlike IPv4 with limited pools, IPv6 subnets are enormous, but DHCPv6 pools and prefix delegation ranges can still exhaust. Monitoring allocation logs ensures you detect pool exhaustion, unauthorized devices, and allocation anomalies.

## Step 1: Parse Kea DHCPv6 Lease Logs

```python
#!/usr/bin/env python3
# parse_kea_dhcpv6_logs.py

import re
import json
from datetime import datetime
from collections import Counter

# Kea log format for address assignment

# INFO  [kea-dhcp6.leases] DHCP6_LEASE_ALLOC duid=[00:01:00:01:...], tid=0x123456: lease for address 2001:db8::1 and iaid=1 has been allocated for 3600 seconds
LEASE_ALLOC_RE = re.compile(
    r'DHCP6_LEASE_ALLOC duid=\[(?P<duid>[^\]]+)\].*'
    r'lease for address (?P<address>[0-9a-fA-F:]+) '
    r'and iaid=(?P<iaid>\d+) has been allocated for (?P<lft>\d+) seconds'
)

LEASE_RECLAIM_RE = re.compile(
    r'ALLOC_ENGINE_V6_LEASE_RECLAIMED.*address (?P<address>[0-9a-fA-F:]+)'
)

LEASE_RENEW_RE = re.compile(
    r'DHCP6_LEASE_RENEW.*address (?P<address>[0-9a-fA-F:]+)'
)

def parse_kea_log(log_file: str) -> dict:
    stats = {
        "allocations": Counter(),
        "expirations": 0,
        "renewals": 0,
        "active_leases": {},
    }

    with open(log_file) as f:
        for line in f:
            if "DHCP6_LEASE_ALLOC" in line:
                m = LEASE_ALLOC_RE.search(line)
                if m:
                    addr = m.group("address")
                    stats["allocations"][addr[:9]] += 1  # Group by /32 prefix
                    stats["active_leases"][addr] = {
                        "duid": m.group("duid"),
                        "iaid": m.group("iaid"),
                        "lft": int(m.group("lft"))
                    }

            elif "ALLOC_ENGINE_V6_LEASE_RECLAIMED" in line:
                m = LEASE_RECLAIM_RE.search(line)
                if m:
                    addr = m.group("address")
                    stats["expirations"] += 1
                    stats["active_leases"].pop(addr, None)

            elif "DHCP6_LEASE_RENEW" in line:
                stats["renewals"] += 1

    return stats

stats = parse_kea_log("/var/log/kea/kea-dhcp6.log")
print(f"Active leases: {len(stats['active_leases'])}")
print(f"Expirations: {stats['expirations']}")
print(f"Renewals: {stats['renewals']}")
print(f"\nAllocations by /32 prefix:")
for prefix, count in stats["allocations"].most_common(10):
    print(f"  {prefix}::  {count}")
```

## Step 2: Monitor DHCPv6 Pool Utilization

```bash
#!/bin/bash
# check_dhcpv6_pool.sh - alert on pool exhaustion

# Query Kea DHCP statistics via REST API
KEA_API="http://[::1]:8000"

POOL_STATS=$(curl -s -X POST "$KEA_API" \
    -H "Content-Type: application/json" \
    -d '{"command":"statistic-get","service":["dhcp6"],"arguments":{"name":"subnet[1].assigned-nas"}}')

ASSIGNED=$(echo "$POOL_STATS" | python3 -c "
import json,sys
data = json.load(sys.stdin)
print(data[0]['arguments']['subnet[1].assigned-nas'][0][0])
")

TOTAL_POOL=1000  # Expected pool size
UTILIZATION=$((ASSIGNED * 100 / TOTAL_POOL))

echo "DHCPv6 Pool Utilization: ${UTILIZATION}% (${ASSIGNED}/${TOTAL_POOL})"

if [ "$UTILIZATION" -gt 80 ]; then
    echo "WARNING: Pool utilization above 80%!"
    # Send alert via webhook
    curl -s -X POST "$ALERT_WEBHOOK" \
        -d "{\"text\": \"DHCPv6 pool at ${UTILIZATION}% capacity\"}"
fi
```

## Step 3: Prometheus Metrics for DHCPv6

```python
#!/usr/bin/env python3
# dhcpv6_exporter.py - Prometheus exporter for DHCPv6 stats

from prometheus_client import start_http_server, Gauge, Counter
import subprocess
import time
import re

# Prometheus metrics
ACTIVE_LEASES = Gauge('dhcpv6_active_leases', 'Active DHCPv6 leases',
                      ['subnet'])
ALLOCATIONS_TOTAL = Counter('dhcpv6_allocations_total', 'Total allocations',
                             ['subnet'])
POOL_UTILIZATION = Gauge('dhcpv6_pool_utilization', 'Pool utilization %',
                          ['subnet'])

def collect_kea_stats():
    """Collect stats from Kea DHCPv6 via REST API."""
    import urllib.request
    import json

    url = "http://[::1]:8000"
    data = json.dumps({
        "command": "stat-lease6-get",
        "service": ["dhcp6"]
    }).encode()

    req = urllib.request.Request(url, data=data,
                                  headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            # Control Agent wraps per-service replies in a JSON list
            result = json.load(resp)[0]
            # Columns: subnet-id, total-nas, cumulative-assigned-nas,
            # assigned-nas, declined-addresses, total-pds,
            # cumulative-assigned-pds, assigned-pds
            for entry in result.get("arguments", {}).get("result-set", {}).get("rows", []):
                subnet = entry[0]
                total = entry[1]
                assigned = entry[3]
                ACTIVE_LEASES.labels(subnet=subnet).set(assigned)
                if total > 0:
                    POOL_UTILIZATION.labels(subnet=subnet).set(assigned / total * 100)
    except Exception as e:
        print(f"Error collecting Kea stats: {e}")

if __name__ == "__main__":
    start_http_server(9477, addr="::")  # IPv6 bind
    while True:
        collect_kea_stats()
        time.sleep(30)
```

## Step 4: Alert on New Devices

```bash
#!/bin/bash
# detect_new_ipv6_devices.sh

# Load known devices database
KNOWN_DEVICES_FILE="/etc/network/known_ipv6_devices.txt"

# Extract DUIDs from today's Kea log
NEW_DUIDS=$(grep "DHCP6_LEASE_ALLOC" /var/log/kea/kea-dhcp6.log | \
    grep "$(date +%Y-%m-%d)" | \
    grep -oP 'duid=\[\K[^\]]+' | sort -u)

# Compare against known list
while IFS= read -r duid; do
    if ! grep -qF "$duid" "$KNOWN_DEVICES_FILE"; then
        echo "NEW DEVICE DETECTED: DUID=$duid"
        # Alert on new, unknown device
    fi
done <<< "$NEW_DUIDS"
```

## Conclusion

IPv6 address allocation monitoring combines log parsing for DHCPv6 events (DHCP6_LEASE_ALLOC, ALLOC_ENGINE_V6_LEASE_RECLAIMED, DHCP6_LEASE_RENEW) with REST API queries to the DHCP server for pool utilization metrics. Export these metrics to Prometheus and alert when pool utilization exceeds 80%. Track device DUIDs in allocation logs to detect new or unauthorized devices - unlike MAC-based tracking, DUIDs persist across network changes making them reliable device identifiers. Monitor prefix delegation logs separately to ensure customer/site prefixes are being correctly distributed.
