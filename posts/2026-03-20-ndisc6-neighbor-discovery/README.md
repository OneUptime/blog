# How to Use ndisc6 for Neighbor Discovery Diagnostics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Ndisc6, Neighbor Discovery, NDP, Network Diagnostics, Linux

Description: Use ndisc6 to send Neighbor Solicitation messages and discover the link-layer addresses of IPv6 neighbors for connectivity and NDP troubleshooting.

## Introduction

`ndisc6` is a command-line tool that sends IPv6 Neighbor Solicitation messages and waits for Neighbor Advertisement responses. It is the IPv6 equivalent of `arping` for IPv4 - it resolves an IPv6 address to its MAC address and verifies Layer 2 reachability. It is part of the `ndisc6` package which also includes `rdisc6` for router discovery.

## Installation

```bash
# Ubuntu/Debian

sudo apt install -y ndisc6

# RHEL/CentOS
sudo yum install -y ndisc6

# Verify
ndisc6 --version
```

## Basic Usage

```bash
# Resolve an IPv6 address to its MAC address on eth0
ndisc6 2001:db8::1 eth0

# For link-local neighbors
ndisc6 fe80::1 eth0

# Send up to 3 solicitations before giving up (default: 3)
ndisc6 -r 3 2001:db8::1 eth0

# Wait longer for slow links (default: 1000ms)
ndisc6 -w 3000 2001:db8::1 eth0  # 3000ms timeout
```

## Understanding the Output

```text
Soliciting 2001:db8::1 (2001:db8::1) on eth0...

Target link-layer address: 52:54:00:ab:cd:ef
from fe80::5054:ff:feab:cdef
```

- **Target link-layer address**: The MAC address of the IPv6 neighbor
- **from**: The IPv6 source address of the Neighbor Advertisement response
- If no output: host is unreachable or not on the same link

## Interpreting Results

```bash
# Success - host is reachable at Layer 2
ndisc6 2001:db8::1 eth0
# Output: Target link-layer address: 52:54:00:ab:cd:ef

# Timeout - host not responding
ndisc6 -r 2 -w 2000 2001:db8::2 eth0
# Timed out.

# Wrong interface - no route
ndisc6 2001:db8::1 eth1
# Error: No route to 2001:db8::1 on eth1
```

## Comparing ndisc6 to the Neighbor Cache

```bash
# Check if neighbor is in the kernel's NDP cache
ip -6 neigh show | grep "2001:db8::1"

# If not in cache, use ndisc6 to probe
ndisc6 2001:db8::1 eth0

# Verify the cache was populated
ip -6 neigh show | grep "2001:db8::1"
# Should now show the MAC address with state REACHABLE
```

## Discovering All Neighbors on a Link

```bash
#!/bin/bash
# discover-ipv6-neighbors.sh

INTERFACE="${1:-eth0}"
echo "=== Discovering IPv6 neighbors on $INTERFACE ==="

# Get all link-local addresses from Router Advertisements
echo "Known link-local neighbors from NDP cache:"
ip -6 neigh show dev "$INTERFACE" | while read addr via lladdr mac state; do
    if [[ "$addr" =~ ^fe80 ]]; then
        echo "  $addr → $mac ($state)"
        # Confirm with ndisc6
        result=$(ndisc6 -r 1 -w 500 "$addr" "$INTERFACE" 2>/dev/null)
        if [ -n "$result" ]; then
            echo "    ndisc6 confirmed: reachable"
        fi
    fi
done

# Probe multicast all-nodes address (ff02::1) to discover neighbors
echo ""
echo "Probing all-nodes multicast (may reveal additional hosts):"
sudo ping6 -c 2 -I "$INTERFACE" ff02::1 2>/dev/null >/dev/null

# Show updated neighbor cache
ip -6 neigh show dev "$INTERFACE" | grep -v "FAILED"
```

## Troubleshooting with ndisc6

```bash
# Scenario 1: IPv6 connectivity fails to a host on the same link
# First, check if Layer 2 resolution works
ndisc6 2001:db8::2 eth0
# If timeout: host may be down, wrong IP, or firewall blocking NDP

# Scenario 2: Verify NDP is working after a configuration change
ip -6 neigh flush dev eth0
ndisc6 2001:db8::1 eth0
# Should show MAC address of the neighbor

# Scenario 3: Check if a new IPv6 address is reachable
ndisc6 2001:db8::100 eth0
# Success = address is assigned to a host on this link

# Scenario 4: Multiple probes for intermittent issues
for i in {1..5}; do
    echo -n "Probe $i: "
    ndisc6 -r 1 -w 1000 2001:db8::1 eth0 2>/dev/null | \
        grep "link-layer\|Timed out"
    sleep 1
done
```

## ndisc6 vs Other Tools

```bash
# ndisc6 - sends Neighbor Solicitation, gets MAC address
ndisc6 2001:db8::1 eth0

# ip neigh show - reads existing kernel cache
ip -6 neigh show

# ping6 - tests ICMP reachability (higher level)
ping6 -c 1 2001:db8::1

# Workflow: ndisc6 first → confirms L2, then ping6 → confirms L3
```

## Using ndisc6 in Scripts

```python
import subprocess
import re

def get_ipv6_mac(ipv6_addr: str, interface: str) -> str | None:
    """Get the MAC address for an IPv6 neighbor using ndisc6."""
    try:
        result = subprocess.run(
            ['ndisc6', '-r', '2', '-w', '2000', ipv6_addr, interface],
            capture_output=True, text=True, timeout=10
        )
        match = re.search(r'link-layer address: ([0-9a-f:]{17})', result.stdout)
        if match:
            return match.group(1)
        return None
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return None

mac = get_ipv6_mac('2001:db8::1', 'eth0')
if mac:
    print(f"IPv6 2001:db8::1 is at MAC {mac}")
else:
    print("Host unreachable or not found")
```

## Conclusion

`ndisc6` is the essential tool for Layer 2 IPv6 neighbor resolution, equivalent to `arping` in IPv4. Use it to verify that an IPv6 address is reachable at the link layer before debugging higher-level connectivity issues. When `ping6` fails to a host on the same subnet, `ndisc6` quickly confirms whether the problem is Layer 2 (NDP failure) or Layer 3 (routing or firewall).
