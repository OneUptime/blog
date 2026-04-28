# How to Understand Null Routes and Blackhole Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Routing, Blackhole, Security, DDoS, Linux

Description: Learn how null routes and blackhole routing work, when to use them for security and loop prevention, and how to configure them on Linux.

## Introduction

A null route (also called a blackhole route) silently discards all traffic destined for a specific prefix. Unlike a firewall DROP rule, a null route works at the routing level - the kernel discards packets before any network processing. Null routes are used for DDoS mitigation, loop prevention with route summarization, and blocking unwanted traffic efficiently.

## Creating Null Routes on Linux

```bash
# Add a blackhole route - packets to 192.0.2.0/24 are silently dropped

ip route add blackhole 192.0.2.0/24

# Verify the blackhole route
ip route show 192.0.2.0/24
# blackhole 192.0.2.0/24

# Test - packets to this range are silently dropped
ping -c 3 192.0.2.1
# No response, and no ICMP unreachable sent to the source
```

## Blackhole vs Unreachable vs Prohibit

Linux offers three discard types:

```bash
# blackhole: silently drop (no ICMP response)
ip route add blackhole 10.5.0.0/24

# unreachable: drop and send ICMP Host Unreachable
ip route add unreachable 10.6.0.0/24

# prohibit: drop and send ICMP Communication Prohibited
ip route add prohibit 10.7.0.0/24
```

## Use Case 1: Loop Prevention with Route Summarization

When summarizing routes, add a blackhole for the aggregate prefix to prevent loops if component routes disappear:

```bash
# You're summarizing 10.1.0.0/24 through 10.1.3.0/24 as 10.1.0.0/22
# Without a blackhole, traffic for missing subnets (e.g., 10.1.4.0/24)
# could match the aggregate and loop or get forwarded incorrectly

# Add blackhole at lower priority than the specific routes
ip route add blackhole 10.1.0.0/22 metric 200
# Specific /24 routes (metric 10) win; blackhole catches the rest
```

## Use Case 2: DDoS Mitigation (RTBH)

Remote Triggered Blackhole (RTBH) uses BGP to propagate null routes to all routers, dropping attack traffic at the network edge:

```bash
# On the triggering router: add a blackhole for the attacked IP
ip route add blackhole 203.0.113.50/32

# Redistribute into BGP to propagate to all border routers
router bgp 65001
  address-family ipv4 unicast
    redistribute static route-map BLACKHOLE-ONLY

route-map BLACKHOLE-ONLY permit 10
  match ip address prefix-list BLACKHOLES
  set community blackhole  # RFC 7999 community

ip prefix-list BLACKHOLES seq 10 permit 203.0.113.50/32
```

## Removing a Null Route

```bash
# Remove a blackhole route
ip route del blackhole 192.0.2.0/24

# Or remove by destination
ip route del 192.0.2.0/24
```

## Conclusion

Null routes are a lightweight, high-performance traffic discard mechanism. Use blackhole routes for summarization loop prevention, use unreachable routes when you want senders to know traffic was rejected, and use RTBH to distribute DDoS mitigation across your entire network infrastructure via BGP.
