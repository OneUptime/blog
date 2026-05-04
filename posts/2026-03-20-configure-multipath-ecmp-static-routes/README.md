# How to Configure Multi-Path (ECMP) Static Routes on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, ECMP, Multipath Routing, Static Routes, Load Balancing, iproute2, Networking

Description: Configure Equal-Cost Multi-Path (ECMP) static routes on Linux to distribute traffic across multiple gateways simultaneously for load balancing.

## Introduction

ECMP (Equal-Cost Multi-Path) routing sends traffic across multiple paths with equal cost simultaneously. Unlike failover (where one path is backup), ECMP actively distributes load. Linux supports ECMP through multi-path routes using `ip route add` with the `nexthop` directive.

## Add a Multi-Path Route (Two Gateways)

```bash
# Route 192.168.2.0/24 through two gateways equally

ip route add 192.168.2.0/24 \
    nexthop via 10.0.0.1 dev eth0 weight 1 \
    nexthop via 10.0.1.1 dev eth1 weight 1
```

## Weighted Multi-Path

Use weights to distribute traffic unevenly (e.g., 2:1 ratio):

```bash
# Send twice as much traffic through eth0 as eth1
ip route add 192.168.2.0/24 \
    nexthop via 10.0.0.1 dev eth0 weight 2 \
    nexthop via 10.0.1.1 dev eth1 weight 1
```

## ECMP Default Route (Multi-WAN)

```bash
# Balance all outbound internet traffic across two ISPs
ip route add default \
    nexthop via 10.0.0.1 dev eth0 weight 1 \
    nexthop via 10.1.0.1 dev eth1 weight 1
```

## Verify ECMP Routes

```bash
# Show the multi-path route
ip route show 192.168.2.0/24

# Output should show:
# 192.168.2.0/24
#     nexthop via 10.0.0.1 dev eth0 weight 1
#     nexthop via 10.0.1.1 dev eth1 weight 1

# Test routing decisions (hash-based)
ip route get 192.168.2.100 from 10.0.0.5
ip route get 192.168.2.100 from 10.0.0.6
# Different sources may use different nexthops
```

## Configure ECMP Hashing

The kernel hash policy for ECMP can be configured:

```bash
# View current ECMP hash policy
sysctl net.ipv4.fib_multipath_hash_policy

# 0 = L3 only (source/destination IP)
# 1 = L3 + L4 (includes source/destination ports) - recommended
# 2 = Layer 3 or inner layer 3 for encapsulated traffic
sysctl -w net.ipv4.fib_multipath_hash_policy=1
```

## Persistent ECMP with systemd-networkd

```ini
# /etc/systemd/network/10-eth0.network
[Route]
Destination=192.168.2.0/24
Gateway=10.0.0.1
Metric=100
MultiPathRoute=10.0.1.1
```

`MultiPathRoute=` accepts an optional interface and weight as `address[@name] [weight]`, and may be repeated to add more nexthops:

```ini
[Route]
Destination=192.168.2.0/24
Gateway=10.0.0.1
MultiPathRoute=10.0.1.1@eth1 1
```

## Monitor ECMP Traffic Distribution

```bash
# Check interface statistics to verify distribution
ip -s link show eth0
ip -s link show eth1

# They should show similar TX packet counts for ECMP traffic
```

## Conclusion

Linux ECMP routes use the `nexthop` keyword to specify multiple gateways for the same destination. Traffic is distributed using a hash of source/destination IPs (and optionally ports). Set `net.ipv4.fib_multipath_hash_policy=1` for better distribution using Layer 4 information. ECMP is ideal for multi-WAN load balancing and high-bandwidth routing scenarios.
