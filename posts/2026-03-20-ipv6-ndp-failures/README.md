# How to Troubleshoot IPv6 NDP Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, NDP, Neighbor Discovery, Troubleshooting, Network Diagnostics, ICMPv6

Description: Diagnose and fix IPv6 Neighbor Discovery Protocol (NDP) failures that prevent Layer 2 address resolution and on-link communication.

## Introduction

The Neighbor Discovery Protocol (NDP) is IPv6's replacement for ARP. It handles Layer 2 address resolution (mapping IPv6 addresses to MAC addresses), router discovery, and prefix discovery. When NDP fails, even hosts on the same subnet cannot communicate. NDP failures manifest as ping timeouts, "no route to host" errors, or stale neighbor cache entries.

## Step 1: Check Neighbor Cache

```bash
# Show IPv6 neighbor (NDP) cache

ip -6 neigh show

# Show cache for specific interface
ip -6 neigh show dev eth0

# Show only reachable neighbors
ip -6 neigh show nud reachable

# Neighbor states:
# REACHABLE  - recently confirmed reachable
# STALE      - not confirmed recently, but may still work
# DELAY      - checking reachability after STALE timeout
# PROBE      - actively sending Neighbor Solicitations
# FAILED     - NDP probes failed, host unreachable
# NOARP      - no NDP needed (e.g., loopback)
# PERMANENT  - static entry
```

## Step 2: Test NDP Resolution

```bash
# Use ndisc6 to manually probe a neighbor
ndisc6 2001:db8::1 eth0

# For link-local addresses
ndisc6 fe80::1 eth0

# Multiple probes
ndisc6 -r 3 2001:db8::1 eth0

# If timeout: host may be down, filtering ICMPv6, or not on this link
# If it returns a link-layer address: NDP working correctly
```

## Step 3: Capture NDP Traffic

```bash
# Capture all NDP traffic
sudo tcpdump -i eth0 -v "ip6 proto 58 and \
    (ip6[40] == 135 or ip6[40] == 136)"

# Capture Neighbor Solicitations only
sudo tcpdump -i eth0 "ip6 proto 58 and ip6[40] == 135"

# Capture Neighbor Advertisements only
sudo tcpdump -i eth0 "ip6 proto 58 and ip6[40] == 136"

# Expected NS/NA exchange:
# 1. Host sends NS: ip6 src > ff02::1:ffXX:XXXX: NS who has 2001:db8::1
# 2. Target replies: ip6 2001:db8::1 > src: NA tgt is 2001:db8::1
```

## Step 4: Check ICMPv6 Firewall Rules

```bash
# NDP requires ICMPv6 to be allowed
# Check if firewall blocks NDP traffic
sudo ip6tables -L INPUT -n | grep -i "icmp"
sudo ip6tables -L OUTPUT -n | grep -i "icmp"
sudo ip6tables -L FORWARD -n | grep -i "icmp"

# Essential ICMPv6 types for NDP:
# Type 135: Neighbor Solicitation
# Type 136: Neighbor Advertisement
# Type 133: Router Solicitation
# Type 134: Router Advertisement

# Allow NDP types (critical on all nodes)
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type 135 -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type 136 -j ACCEPT
sudo ip6tables -A OUTPUT -p icmpv6 --icmpv6-type 135 -j ACCEPT
sudo ip6tables -A OUTPUT -p icmpv6 --icmpv6-type 136 -j ACCEPT
```

## Step 5: Fix Stale or Failed Cache Entries

```bash
# Remove specific stale entry
sudo ip -6 neigh del 2001:db8::1 dev eth0

# Flush all neighbor cache entries on an interface
sudo ip -6 neigh flush dev eth0

# Flush all failed entries
sudo ip -6 neigh flush nud failed dev eth0

# After flush, trigger re-resolution
ping -6 -c 1 2001:db8::1

# Set neighbor cache timeout (seconds)
sudo sysctl -w net.ipv6.neigh.eth0.gc_stale_time=60
```

## Step 6: Check for NDP Spoofing/Proxy Issues

```bash
# Check if NDP proxy is enabled (can cause confusion)
cat /proc/sys/net/ipv6/conf/eth0/proxy_ndp

# Show NDP proxy entries
ip -6 neigh show proxy

# Disable NDP proxy if causing issues
sudo sysctl -w net.ipv6.conf.eth0.proxy_ndp=0

# Check for rogue NDP advertisements
sudo tcpdump -i eth0 -v "ip6 proto 58 and ip6[40] == 136" | \
    grep "tgt"
```

## Diagnostic Script

```bash
#!/bin/bash
# diagnose-ndp.sh

IFACE="${1:-eth0}"
TARGET="${2}"

echo "=== NDP Diagnostics for $IFACE ==="

echo ""
echo "Neighbor cache:"
ip -6 neigh show dev "$IFACE"

echo ""
echo "Failed entries:"
ip -6 neigh show dev "$IFACE" nud failed

if [ -n "$TARGET" ]; then
    echo ""
    echo "Testing NDP to $TARGET:"
    result=$(ndisc6 -q -r 2 -w 2000 "$TARGET" "$IFACE" 2>/dev/null)
    if [ -n "$result" ]; then
        echo "[OK] $result"
    else
        echo "[FAIL] No NDP response from $TARGET"
        echo "  Possible causes:"
        echo "  - Target host is down"
        echo "  - Firewall blocking ICMPv6"
        echo "  - Wrong interface specified"
        echo "  - Address not on this link"
    fi
fi

echo ""
echo "ICMPv6 rules (ip6tables):"
sudo ip6tables -L INPUT -n 2>/dev/null | grep -Ei "icmp|neighbor" || echo "  (no rules found or not root)"
```

## Conclusion

NDP failures prevent IPv6 communication even between hosts on the same subnet. Diagnose with `ip -6 neigh show` to see cache states, use `ndisc6` to manually probe specific neighbors, and capture traffic with `tcpdump` filtering on ICMPv6 types 135/136. A common cause of NDP failure is a firewall blocking ICMPv6 - ensure types 135 (Neighbor Solicitation) and 136 (Neighbor Advertisement) are allowed on all interfaces. Flush stale/failed cache entries with `ip -6 neigh flush dev eth0` to force re-resolution.
