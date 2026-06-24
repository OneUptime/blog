# How to Troubleshoot IPv6 Routing Loops

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Routing, Troubleshooting, Traceroute6, Network Diagnostics, BGP

Description: Diagnose IPv6 routing loops using traceroute6, analyze TTL-exceeded messages, and identify misconfigured static routes or dynamic routing protocol issues causing loops.

## Introduction

IPv6 routing loops occur when packets cycle between two or more routers indefinitely. The IPv6 hop limit (equivalent to IPv4 TTL) decrements at each hop and the packet is dropped when it reaches 0, generating an ICMPv6 "Time Exceeded" message. Routing loops waste bandwidth, cause high latency, and prevent traffic from reaching its destination.

## Step 1: Detect a Routing Loop with traceroute6

```bash
# Run traceroute6 to detect loops

traceroute6 2001:db8::1

# A routing loop shows the same hops repeating:
# 1  2001:db8::fe01   1.234ms
# 2  2001:db8::fe02   2.345ms
# 3  2001:db8::fe01   3.456ms  ← same as hop 1 (LOOP!)
# 4  2001:db8::fe02   4.567ms
# ... continues until hop limit exhausted

# Use mtr for continuous loop detection
mtr -6 2001:db8::1

# Set high hop limit to see full loop cycle
traceroute6 -m 50 2001:db8::1
```

## Step 2: Check Local Routing Table

```bash
# Show the full IPv6 routing table
ip -6 route show

# Check the local default route before comparing it with upstream routers
ip -6 route show | grep default

# Example of a loop-causing configuration:
# Router A: default via 2001:db8:0:12::2 dev eth0
# Router B: default via 2001:db8:0:12::1 dev eth0

# Check route for specific destination
ip -6 route get 2001:db8:ffff::1

# Show all routes sorted by destination
ip -6 route show | sort
```

## Step 3: Check for Static Route Loops

```bash
# List all static routes
ip -6 route show proto static

# Check for routes to the same destination prefix pointing at each other:
# Router A: ip -6 route add 2001:db8:dead::/48 via 2001:db8:0:12::2 dev eth1
# Router B: ip -6 route add 2001:db8:dead::/48 via 2001:db8:0:12::1 dev eth0
# If both routers install the same destination prefix via each other, packets loop

# Verify the route and next-hop neighbor resolution
ip -6 route get 2001:db8:dead::1
ip neigh get 2001:db8:0:12::2 dev eth1
```

## Step 4: Check Dynamic Routing (OSPFv3/BGP)

```bash
# Check OSPFv3 routes with FRRouting
vtysh -c "show ipv6 route"
vtysh -c "show ipv6 ospf6 route"

# Check BGP routes
vtysh -c "show bgp ipv6 unicast"
vtysh -c "show bgp ipv6 unicast summary"

# Inspect a specific prefix to see which next-hop won
vtysh -c "show ipv6 route 2001:db8:dead::/48"

# For route reflectors, inspect ORIGINATOR_ID and CLUSTER_LIST on reflected routes
vtysh -c "show bgp ipv6 unicast neighbor 2001:db8:0:12::2 routes detail"
```

## Step 5: Fix a Routing Loop

```bash
# Scenario: default route loop between two routers

# Router A incorrectly has:
# default via 2001:db8:0:12::2 dev eth0

# Router B has:
# default via 2001:db8:0:12::1 dev eth0

# Fix: Router A should point upstream; Router B should point to Router A

# On Router A (correct gateway for external traffic):
ip -6 route del default via 2001:db8:0:12::2 dev eth0
ip -6 route add default via 2001:db8:0:ff::1 dev eth1

# On Router B (should use Router A for external):
ip -6 route replace default via 2001:db8:0:12::1 dev eth0

# Verify no loop
traceroute6 2001:4860:4860::8888
```

## Step 6: Monitor for Loops with Packet Analysis

```bash
# Capture ICMPv6 Time Exceeded (type 3, code 0) - hop limit expired in transit
sudo tcpdump -i eth0 -v "icmp6 and icmp6[icmp6type] == icmp6-timeexceeded and icmp6[icmp6code] == 0"

# High rate of Time Exceeded messages can indicate an active routing loop

# Check kernel and ICMPv6 counters
grep -E '^(Ip6(In|Out)Discards|Icmp6(In|Out)TimeExcds)[[:space:]]' /proc/net/snmp6

# Show the same counters through iproute2
nstat -az 'Icmp6*TimeExcds' 'Ip6*Discards'
```

## Prevention: Use Route Metrics and Preferences

```bash
# Use metrics to prefer direct routes over default
ip -6 route add 2001:db8:a::/64 dev eth0 metric 100
ip -6 route add default via fe80::1 dev eth0 metric 200

# For iBGP route reflectors: ORIGINATOR_ID and CLUSTER_LIST prevent reflection loops
# For OSPFv3: Ensure consistent costs and avoid bi-directional redistribution between protocols

# Enable ECMP (Equal-Cost Multi-Path) safely
# Ensure all ECMP paths lead to the same external destination
```

## Conclusion

IPv6 routing loops are detected by `traceroute6` showing repeated hops and diagnosed by comparing routing tables on all devices in the path. Static route loops occur when two routers point the same destination prefix at each other or point default routes at each other. Dynamic routing loops typically involve redistribution between protocols (BGP to OSPFv3 and back). Fix by ensuring each destination prefix resolves to a loop-free next hop - no mutual default routes, and careful redistribution policies. Monitor with ICMPv6 Time Exceeded capture to detect active loops in production.
