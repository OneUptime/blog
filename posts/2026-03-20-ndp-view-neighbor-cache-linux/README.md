# How to View the IPv6 Neighbor Cache on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NDP, Neighbor Cache, Linux, ip command, Debugging

Description: View and interpret the IPv6 neighbor cache on Linux using the ip command, understand neighbor states, and use the cache for connectivity troubleshooting.

## Introduction

The IPv6 neighbor cache on Linux stores the mapping between IPv6 addresses and link-layer (MAC) addresses, along with the NUD state for each entry. It is the IPv6 equivalent of the ARP table. The `ip -6 neigh` command is the primary tool for viewing and managing the neighbor cache.

## Viewing the Neighbor Cache

```bash
# Show all IPv6 neighbor cache entries

ip -6 neigh show

# Example output:
# 2001:db8::1 dev eth0 lladdr 00:11:22:33:44:55 REACHABLE
# fe80::1     dev eth0 lladdr 00:11:22:33:44:55 STALE
# 2001:db8::2 dev eth0                          INCOMPLETE
# 2001:db8::3 dev eth0 lladdr 00:aa:bb:cc:dd:ee FAILED

# Show entries on a specific interface only
ip -6 neigh show dev eth0

# Show a specific address
ip -6 neigh show 2001:db8::1 dev eth0

# Show by NUD state
ip -6 neigh show nud reachable
ip -6 neigh show nud stale
ip -6 neigh show nud failed

# Show all entries including PERMANENT (static) entries
ip -6 neigh show nud all

# Resolve hostnames (numeric is the default)
ip -6 -r neigh show

# Show neighbor statistics
ip -6 -s neigh show
```

## Interpreting Neighbor Cache Entries

```bash
# Column explanation:
# 2001:db8::1  = IPv6 address of neighbor
# dev eth0     = Interface on which neighbor is reachable
# lladdr 00:11:22:33:44:55 = MAC address (absent for INCOMPLETE/FAILED)
# REACHABLE    = NUD state

# Count entries by state
ip -6 neigh show | awk '{print $NF}' | sort | uniq -c | sort -rn

# Find entries without MAC (INCOMPLETE or FAILED)
ip -6 neigh show | grep -v lladdr
# These represent neighbors that couldn't be resolved

# Find neighbors on specific subnet
ip -6 neigh show | grep "^2001:db8:1::"

# Find all router neighbors (entries with the 'router' flag)
ip -6 neigh show | grep router
```

## Monitoring Neighbor Cache Changes

```python
import subprocess
import time
import re

def get_neighbor_cache() -> dict:
    """Parse current IPv6 neighbor cache."""
    result = subprocess.run(
        ["ip", "-6", "neigh", "show"],
        capture_output=True, text=True
    )
    cache = {}
    for line in result.stdout.strip().split('\n'):
        if not line:
            continue
        parts = line.split()
        addr = parts[0]
        # Find interface, MAC, and state
        dev = None
        mac = None
        state = None
        for i, part in enumerate(parts):
            if part == 'dev' and i + 1 < len(parts):
                dev = parts[i + 1]
            if part == 'lladdr' and i + 1 < len(parts):
                mac = parts[i + 1]
            if part in ('REACHABLE', 'STALE', 'DELAY', 'PROBE',
                        'FAILED', 'INCOMPLETE', 'PERMANENT', 'NOARP'):
                state = part

        if addr and dev:
            cache[f"{addr}@{dev}"] = {
                "address": addr, "interface": dev,
                "mac": mac, "state": state
            }
    return cache

def monitor_neighbor_cache(interval: int = 5):
    """Monitor neighbor cache for changes."""
    prev_cache = {}
    while True:
        current_cache = get_neighbor_cache()

        # Detect changes
        for key, entry in current_cache.items():
            if key not in prev_cache:
                print(f"NEW: {entry['address']} ({entry['interface']}) "
                      f"mac={entry['mac']} state={entry['state']}")
            elif prev_cache[key]['state'] != entry['state']:
                print(f"STATE CHANGE: {entry['address']} "
                      f"{prev_cache[key]['state']} → {entry['state']}")

        for key in prev_cache:
            if key not in current_cache:
                print(f"REMOVED: {prev_cache[key]['address']}")

        prev_cache = current_cache
        time.sleep(interval)

# Run: monitor_neighbor_cache()
```

## Conclusion

The IPv6 neighbor cache on Linux (`ip -6 neigh show`) is the operational equivalent of `arp -n` for IPv4. It shows all known IPv6 neighbors with their MAC addresses and NUD states. REACHABLE entries have been recently confirmed, STALE entries have aged out but are still usable, and FAILED entries indicate unreachable neighbors. Monitoring the neighbor cache is essential for diagnosing connectivity issues: INCOMPLETE entries indicate ongoing resolution, FAILED entries indicate unreachable neighbors.
