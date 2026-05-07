# How to Audit IPv6 Address Usage Across Your Network

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPAM, Audit, Network Security, NDP Scanning

Description: Audit IPv6 address usage by scanning NDP tables, comparing against IPAM records, and identifying untracked addresses, stale records, and unauthorized devices.

## Introduction

IPv6 address auditing discovers the gap between what your IPAM says is assigned and what is actually active on the network. Regular audits catch shadow IT devices, stale records, and unauthorized SLAAC addresses. The NDP table on gateway routers is a high-signal view of IPv6 neighbors recently active on directly connected subnets, but because it is a cache, it is not a complete inventory by itself.

## Step 1: Collect NDP Table from Gateway Routers

```bash
#!/bin/bash
# collect_ndp.sh - Collect NDP tables from all gateway routers

OUTPUT_DIR="/var/audit/ipv6-ndp/$(date +%Y%m%d)"
mkdir -p "$OUTPUT_DIR"

GATEWAYS=(
    "router-hq-01.example.com"
    "router-dc-east.example.com"
    "router-dc-west.example.com"
)

for router in "${GATEWAYS[@]}"; do
    echo "Collecting NDP from $router..."
    # SSH to router and collect NDP (Linux gateway)
    ssh -o StrictHostKeyChecking=no "$router" \
        "ip -6 neigh show" > "${OUTPUT_DIR}/${router}-ndp.txt" 2>/dev/null

    # For Cisco IOS:
    # ssh "$router" "show ipv6 neighbors" > "${OUTPUT_DIR}/${router}-ndp.txt"

    # For Juniper:
    # ssh "$router" "show ipv6 neighbors" > "${OUTPUT_DIR}/${router}-ndp.txt"
done

echo "NDP tables saved to $OUTPUT_DIR"
wc -l "${OUTPUT_DIR}"/*.txt
```

## Step 2: Parse and Normalize NDP Data

```python
#!/usr/bin/env python3
# parse_ndp.py

import re
import sys
import ipaddress
from pathlib import Path

def parse_linux_ndp(content: str) -> list:
    """Parse 'ip -6 neigh show' output."""
    NDP_RE = re.compile(
        r'(?P<addr>[0-9a-fA-F:]+)\s+dev\s+(?P<iface>\S+)'
        r'(?:\s+lladdr\s+(?P<mac>[0-9a-fA-F:]+))?'
        r'(?:\s+\S+)*?\s+(?P<state>REACHABLE|STALE|DELAY|PROBE|PERMANENT|FAILED|INCOMPLETE|NOARP|NONE)\b',
        re.IGNORECASE,
    )
    entries = []
    for line in content.splitlines():
        m = NDP_RE.match(line)
        if m:
            try:
                addr = str(ipaddress.ip_address(m.group("addr")))
                # Skip link-local addresses
                if not ipaddress.ip_address(addr).is_link_local:
                    entries.append({
                        "address": addr,
                        "interface": m.group("iface"),
                        "mac": m.group("mac") or "unknown",
                        "state": m.group("state").upper()
                    })
            except ValueError:
                pass
    return entries

# Load one audit snapshot at a time to avoid mixing historical runs.
BASE_DIR = Path("/var/audit/ipv6-ndp")
snapshot_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else max(
    (p for p in BASE_DIR.iterdir() if p.is_dir()),
    key=lambda p: p.name,
)

all_entries = {}
for ndp_file in snapshot_dir.glob("*.txt"):
    router = ndp_file.stem.replace("-ndp", "")
    content = ndp_file.read_text()
    entries = parse_linux_ndp(content)
    for e in entries:
        all_entries[e["address"]] = {**e, "router": router}

print(f"Loaded NDP snapshot: {snapshot_dir}")
print(f"Total active IPv6 addresses: {len(all_entries)}")
```

## Step 3: Compare Against IPAM

```python
#!/usr/bin/env python3
# audit_ipam_vs_network.py

import pynetbox
from parse_ndp import all_entries  # from Step 2

nb = pynetbox.api("http://netbox.internal", token="your-token")

# Get all IPAM-tracked addresses
ipam_addresses = {}
for ip in nb.ipam.ip_addresses.filter(family=6):
    addr = str(ip.address).split('/')[0]
    ipam_addresses[addr] = {
        "status": ip.status.value,
        "description": ip.description,
        "dns_name": str(ip.dns_name) if ip.dns_name else ""
    }

# Find discrepancies
on_network = set(all_entries.keys())
in_ipam = set(ipam_addresses.keys())

# Active on network but not in IPAM - potential unauthorized or SLAAC
untracked = on_network - in_ipam
# In IPAM as active but not seen on network - potentially stale
stale = {a for a, d in ipam_addresses.items()
         if d["status"] == "active" and a not in on_network}

print(f"\n{'='*60}")
print(f"IPv6 Address Audit Report")
print(f"{'='*60}")
print(f"Addresses on network:      {len(on_network):>6}")
print(f"Addresses in IPAM:         {len(in_ipam):>6}")
print(f"Untracked (network only):  {len(untracked):>6}")
print(f"Stale (IPAM only):         {len(stale):>6}")

if untracked:
    print(f"\nUntracked addresses (potential shadow IT or SLAAC):")
    for addr in sorted(untracked):
        ndp = all_entries[addr]
        print(f"  {addr:<40} MAC: {ndp['mac']:<20} Router: {ndp['router']}")

if stale:
    print(f"\nPotentially stale IPAM records (not seen in the current NDP snapshot):")
    for addr in sorted(stale):
        ipam = ipam_addresses[addr]
        print(f"  {addr:<40} {ipam['description'] or ipam['dns_name']}")
```

## Step 4: Generate Audit Report

```python
#!/usr/bin/env python3
# generate_audit_report.py

from datetime import datetime
import json

AUDIT_DATA = {
    "date": datetime.now().isoformat(),
    "summary": {
        "total_active": 0,
        "tracked": 0,
        "untracked": 0,
        "stale": 0
    },
    "findings": {
        "untracked": [],
        "stale": [],
        "conflicts": []
    }
}

# Run audit (using functions from steps above)
# ... populate AUDIT_DATA.findings ...

# Save report
with open(f"ipv6_audit_{datetime.now().strftime('%Y%m%d')}.json", "w") as f:
    json.dump(AUDIT_DATA, f, indent=2)

# Also output Markdown summary
print(f"""
# IPv6 Address Audit Report
**Date:** {AUDIT_DATA['date']}

## Summary
- Total active addresses: {AUDIT_DATA['summary']['total_active']}
- Tracked in IPAM: {AUDIT_DATA['summary']['tracked']}
- Untracked (require investigation): {AUDIT_DATA['summary']['untracked']}
- Stale IPAM records (require cleanup): {AUDIT_DATA['summary']['stale']}

## Recommended Actions
1. Investigate {AUDIT_DATA['summary']['untracked']} untracked addresses
2. Mark {AUDIT_DATA['summary']['stale']} stale records as deprecated
""")
```

## Conclusion

IPv6 address auditing requires collecting NDP tables from all gateway routers, normalizing and deduplicating the results, and comparing against IPAM records. Those NDP tables provide a useful view of neighbors recently seen on directly connected links, but because neighbor cache entries age out they are not a complete inventory on their own. Untracked addresses indicate SLAAC-assigned temporary addresses, unauthorized devices, or gaps in IPAM workflows. Stale IPAM records represent addresses that are still marked active in IPAM but were not seen in the current audit snapshot. Run audits weekly and automate the comparison to generate actionable reports. Privacy extension addresses (temporary addresses) are generated by SLAAC rather than DHCPv6 and will often appear as untracked unless your IPAM or asset inventory workflow also tracks observed SLAAC addresses.
