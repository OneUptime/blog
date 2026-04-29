# How to Manage IPv6 Address Conflicts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPAM, Address Conflicts, NDP, Network Troubleshooting

Description: Detect and resolve IPv6 address conflicts caused by duplicate address detection failures, SLAAC collisions, static assignment errors, and IPAM record divergence from actual usage.

## Introduction

IPv6 address conflicts are less common than IPv4 conflicts due to Duplicate Address Detection (DAD), but they still occur when DAD is bypassed, static addresses duplicate DHCPv6 assignments, or IPAM records diverge from actual deployment. This guide covers detection, prevention, and resolution.

## How IPv6 Conflicts Occur

| Scenario | Cause | Detection Method |
|----------|-------|-----------------|
| Static vs DHCPv6 overlap | Admin assigns static address already in DHCPv6 pool | IPAM check, DAD failure |
| SLAAC collision | Duplicate interface identifier (for example, cloned MAC/EUI-64 or manually reused IID) | DAD failure log |
| IPAM vs reality mismatch | IPAM shows address as available, but a same-link device is still using it | NDP scan on the segment or first-hop router |
| Duplicate static assignment | Two admins assign the same IPv6 address | IPAM workflow, NDP |
| Privacy extension confusion | Multiple temporary addresses remain valid at the same time, complicating attribution rather than creating a true duplicate | Address inventory, NDP table check |

## Step 1: Detect Conflicts via DAD Failures

```bash
# Monitor kernel for DAD failures (Linux)

# DAD failure message appears when another device has the same address
dmesg | grep -i "duplicate address"

# Real-time monitoring
journalctl -k -f | grep -Ei "duplicate address|dad"

# Detect DAD failures via syslog on the router
# On Cisco IOS:
# debug ipv6 nd
# Look for lines such as:
# ICMPv6-ND: DAD: duplicate link-local FE80::2 on Ethernet0/2, interface stalled
# %IPV6-4-DUPLICATE: Duplicate address FE80::2 on Ethernet0/2
```

## Step 2: Scan NDP Tables for Conflicts

A single NDP snapshot cannot prove a duplicate by itself; on a first-hop router or another node on the same L2 segment, repeated samples can still reveal suspicious MAC flapping for one IPv6 address.

```python
#!/usr/bin/env python3
# detect_ipv6_conflicts.py
# Sample the NDP table over time and look for one IPv6 address
# resolving to different MAC addresses.

import ipaddress
import subprocess
import time
from collections import defaultdict

NEIGH_STATES = {
    "REACHABLE", "STALE", "DELAY", "PROBE",
    "PERMANENT", "INCOMPLETE", "FAILED", "NONE", "NOARP"
}

def get_ndp_table() -> dict:
    """Get the IPv6 neighbor table from all interfaces."""
    result = subprocess.run(
        ["ip", "-6", "neigh", "show", "nud", "all"],
        capture_output=True, text=True, check=True
    )

    entries = defaultdict(list)
    for line in result.stdout.splitlines():
        parts = line.split()
        if len(parts) < 3 or parts[1] != "dev":
            continue

        try:
            addr = str(ipaddress.ip_address(parts[0]))
        except ValueError:
            continue

        iface = parts[2]
        mac = "unknown"
        for index, token in enumerate(parts):
            if token == "lladdr" and index + 1 < len(parts):
                mac = parts[index + 1].lower()
                break

        state = next(
            (token.upper() for token in reversed(parts)
             if token.upper() in NEIGH_STATES),
            None
        )
        if not state or state in ("FAILED", "NONE"):
            continue

        entries[addr].append({
            "interface": iface,
            "mac": mac,
            "state": state
        })

    return dict(entries)

def find_mac_flaps(samples: int = 5, interval: int = 5) -> list:
    """Find IPv6 addresses that resolve to different MACs over time."""
    history = defaultdict(set)

    for sample in range(samples):
        for addr, entries in get_ndp_table().items():
            for entry in entries:
                if entry["mac"] != "unknown":
                    history[addr].add(entry["mac"])
        if sample < samples - 1:
            time.sleep(interval)

    return [
        {
            "address": addr,
            "macs": sorted(macs)
        }
        for addr, macs in history.items()
        if len(macs) > 1
    ]

conflicts = find_mac_flaps()

if conflicts:
    print(f"SUSPECTED CONFLICTS: {len(conflicts)}")
    for c in conflicts:
        print(
            f"  {c['address']} resolved to multiple MACs over time: "
            f"{', '.join(c['macs'])}"
        )
else:
    print("No MAC flaps detected in the sampled NDP cache")
```

## Step 3: Compare IPAM vs NDP Reality

NDP only covers neighbors on the local link, so run this on the first-hop router for the target /64 (or another node on the same L2 segment) and treat the output as a reconciliation heuristic rather than proof that an address is unused.

```python
#!/usr/bin/env python3
# ipam_vs_ndp_reconcile.py
# Reuse get_ndp_table() from detect_ipv6_conflicts.py
import pynetbox
import ipaddress
from detect_ipv6_conflicts import get_ndp_table

nb = pynetbox.api(
    "http://netbox.internal",
    token="your-token",
    strict_filters=True
)
TARGET_PREFIX = ipaddress.ip_network("2001:db8:0001:0001::/64")

def get_ndp_active_addrs() -> set:
    """Get IPv6 addresses currently present in the local NDP cache."""
    return {
        addr for addr in get_ndp_table()
        if ipaddress.ip_address(addr) in TARGET_PREFIX
    }

# Get IPAM "active" addresses in our /64
ipam_addresses = {
    str(ipaddress.ip_interface(ip.address).ip)
    for ip in nb.ipam.ip_addresses.filter(status="active")
    if ipaddress.ip_interface(ip.address).ip in TARGET_PREFIX
}

ndp_addresses = get_ndp_active_addrs()

# Addresses in IPAM but not seen in the local NDP cache
# (may be stale, offline, or simply silent)
ipam_not_on_network = ipam_addresses - ndp_addresses
if ipam_not_on_network:
    print(
        f"In IPAM but not seen in local NDP cache "
        f"({len(ipam_not_on_network)}):"
    )
    for addr in sorted(ipam_not_on_network):
        print(f"  {addr}")

# Addresses seen on the local link but not in IPAM
ndp_not_in_ipam = ndp_addresses - ipam_addresses
if ndp_not_in_ipam:
    print(f"\nSeen in local NDP cache but not in IPAM ({len(ndp_not_in_ipam)}):")
    for addr in sorted(ndp_not_in_ipam):
        print(f"  {addr}  <- Investigate")
```

## Step 4: Prevent Conflicts with IPAM Workflows

```python
# Reuse nb, ipaddress, and get_ndp_table() from the earlier snippets.
def assign_static_ipv6(address: str, hostname: str) -> bool:
    """
    Best-effort static IPv6 reservation check using NetBox plus the
    local NDP cache on the target link.
    """
    normalized = str(ipaddress.ip_interface(address).ip)

    # Check IPAM first
    existing = next(
        (
            ip for ip in nb.ipam.ip_addresses.filter(status="active")
            if str(ipaddress.ip_interface(ip.address).ip) == normalized
        ),
        None
    )
    if existing:
        print(f"CONFLICT: {existing.address} already exists in IPAM")
        return False

    # Check NDP table (live local link)
    ndp = get_ndp_table()
    if normalized in ndp:
        print(f"CONFLICT: {normalized} found in local NDP cache")
        return False

    # Safe to assign
    nb.ipam.ip_addresses.create({
        "address": address,
        "description": hostname,
        "status": "active"
    })
    print(f"Assigned {address} to {hostname}")
    return True
```

## Conclusion

IPv6 address conflict management combines proactive prevention (IPAM-enforced allocation workflow, checking both IPAM records and the local NDP cache before static assignment) with reactive detection (DAD failure monitoring, NDP sampling for MAC flaps on the local link, and IPAM reconciliation). The key operational practice is ensuring all IPv6 addresses - both static and DHCPv6 - flow through the IPAM system before deployment. Regular reconciliation between IPAM records and NDP data on the affected segment identifies untracked neighbors and stale IPAM records that could cause future conflicts.
