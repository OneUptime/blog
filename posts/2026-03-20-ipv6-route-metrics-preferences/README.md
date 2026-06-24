# How to Understand IPv6 Route Metrics and Preferences

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Routing, Metric, Administrative Distance, Linux

Description: Understand how IPv6 route metrics and administrative distances control which route is selected when multiple paths exist to the same destination.

## Overview

When multiple routes exist for the same IPv6 prefix, the router must choose one. On Linux, route selection first prefers the most specific prefix. If multiple routes still tie, the route **metric** helps rank them, where lower numbers are more preferred. IPv6 Router Advertisements can also carry a separate RFC 4191 route **preference**.

## Route Metrics in Linux

On Linux, routes can have a `metric` field. When multiple routes match a destination with the same prefix length, the one with the **lowest metric** wins.

```bash
# Show routes with their metrics

ip -6 route show
# 2001:db8:1::/48 via fe80::1 dev eth0 proto static metric 100
# 2001:db8:1::/48 via fe80::2 dev eth1 proto static metric 200
# The /48 via fe80::1 (metric 100) is preferred

# Verify which route is actually used
ip -6 route get 2001:db8:1::1
# 2001:db8:1::1 via fe80::1 dev eth0  ← Uses metric 100 route
```

## Setting Metrics When Adding Routes

```bash
# Add a primary route with low metric
sudo ip -6 route add 2001:db8:1::/48 via fe80::1 dev eth0 metric 100

# Add a backup (floating) route with high metric
sudo ip -6 route add 2001:db8:1::/48 via fe80::2 dev eth1 metric 500

# The backup only activates if the primary route is removed
# (e.g., if the interface eth0 goes down)
```

## Floating Static Routes (High-Availability)

A floating static route is a backup route with a deliberately high metric that only becomes active when the primary route disappears:

```bash
# Primary route via ISP1 (metric 100)
sudo ip -6 route add default via fe80::1 dev eth0 metric 100

# Backup route via ISP2 (metric 500 - floating static)
sudo ip -6 route add default via fe80::2 dev eth1 metric 500

# If eth0 goes down, kernel removes the metric-100 route
# The metric-500 backup becomes the active default route
```

## Administrative Distance vs Metric

In Cisco terminology, **administrative distance** determines preference between route sources (not within the same source), while **metric** ranks routes within the same protocol.

| Source | Cisco AD | Linux Equivalent |
|--------|----------|-----------------|
| Connected | 0 | `proto kernel`; no separate administrative distance field |
| Static | 1 | `proto static`; metric is separate |
| OSPF | 110 | installed by a routing daemon; kernel metric is separate |
| BGP iBGP | 200 | installed by a routing daemon; kernel metric is separate |
| RIPng | 120 | installed by a routing daemon; kernel metric is separate |

In Linux, the kernel routing table does **not** have a direct equivalent to Cisco administrative distance. Routing daemons such as FRRouting use administrative distance in their own RIB before installing a route into the kernel, and the kernel then uses its own route `metric`.

## Routing Protocol Metrics

Routing daemons also keep protocol-specific metrics before installing a winning route into the kernel:

```bash
# OSPFv3 routes in FRRouting carry an OSPF cost
vtysh -c "show ipv6 ospf6 route"

# BGP routes in FRRouting show a Metric column for MED, but best-path
# selection also considers attributes such as local preference and AS path
vtysh -c "show bgp ipv6 unicast"
```

## Modifying Interface Metrics

```bash
# Set the metric for default routes learned from Router Advertisements
sudo sysctl -w net.ipv6.conf.eth0.ra_defrtr_metric=2000

# Ensure RFC 4191 router preferences from RA are accepted
sudo sysctl -w net.ipv6.conf.eth0.accept_ra_rtr_pref=1

# Inspect the learned default route
ip -6 route show default
```

## Checking for Multiple Equal-Cost Routes (ECMP)

Linux can install ECMP routes when the paths are truly equal-cost. With `iproute2`, you normally create this as a single multipath route:

```bash
# Add a two-way ECMP route
sudo ip -6 route add 2001:db8:1::/48 metric 100 \
    nexthop via fe80::1 dev eth0 weight 1 \
    nexthop via fe80::2 dev eth1 weight 1

# Both appear in the routing table as ECMP
ip -6 route show 2001:db8:1::/48
# 2001:db8:1::/48 metric 100
#     nexthop via fe80::1 dev eth0 weight 1
#     nexthop via fe80::2 dev eth1 weight 1
```

## Summary

For routes to the same prefix on Linux, the lowest `metric` is preferred. IPv6 Router Advertisements can also carry a separate RFC 4191 `pref` value, and routing daemons such as FRRouting may use administrative distance internally before installing routes into the kernel. Use low metrics for primary paths and high metrics for floating static backup routes. When multiple equal-cost nexthops exist, Linux can install an ECMP route. Always verify route selection with `ip -6 route get <destination>`.
