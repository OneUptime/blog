# How to Understand IPv6 Route Types (Connected, Static, Dynamic)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Routing, Connected Routes, Static Routes, Dynamic Routing

Description: Learn the three main IPv6 route types - connected, static, and dynamic - how each is created, and when to use each type in network design.

## Overview

This guide focuses on three common IPv6 forwarding route sources in Linux: they are automatically created when addresses are assigned to interfaces (connected), manually configured by an administrator (static), or learned from routing protocols (dynamic). Understanding each type helps you design resilient and manageable IPv6 networks.

## Connected Routes

By default, connected routes are automatically added by the kernel when an IPv6 address is assigned to an interface. They represent directly attached networks that require no gateway.

```bash
# Assign an address to create a connected route

sudo ip -6 addr add 2001:db8:1::1/64 dev eth0

ip -6 route show | grep "proto kernel"
# Typical output includes:
# 2001:db8:1::/64 dev eth0 proto kernel scope link src 2001:db8:1::1
```

Connected routes usually have `proto kernel` and `scope link` - meaning no gateway is needed, the destination is directly reachable.

## Static Routes

Static routes are manually configured by an administrator and remain until explicitly removed (or the system reboots if not persisted):

```bash
# Add a static route - appears as 'proto static'
sudo ip -6 route add 2001:db8:2::/48 via fe80::1 dev eth0

ip -6 route show | grep "proto static"
# 2001:db8:2::/48 via fe80::1 dev eth0 proto static
```

Use cases for static routes:
- Small networks with stable topology
- Routes that must never change
- Stub networks with a single exit point
- Floating routes (high metric backup routes)

## Dynamic Routes

Dynamic routes are learned from routing protocols (OSPFv3, BGP, RIPng, IS-IS, EIGRP). They adapt automatically to topology changes:

```bash
# Routes installed by routing software
ip -6 route show | grep -E "proto (ospf|bgp|rip|isis|eigrp|zebra)"
# 2001:db8:3::/48 via fe80::2 dev eth1 proto ospf
# 2001:db8:4::/48 via fe80::3 dev eth2 proto bgp
```

Routing software can install routes with protocol identifiers such as `proto ospf`, `proto bgp`, `proto rip`, or implementation-specific values such as `proto zebra`, depending on the software and `/etc/iproute2/rt_protos`.

## Route Protocol Numbers

```bash
# View protocol number to name mappings
cat /etc/iproute2/rt_protos

# Common Linux protocol values:
# 0    = unspec
# 2    = kernel
# 4    = static
# 9    = ra
# 11   = zebra
# 186  = bgp
# 187  = isis
# 188  = ospf
# 189  = rip
# 192  = eigrp
```

## Route Selection and Administrative Distance

When multiple routes exist, Linux first uses the longest-prefix match. For routes to the same prefix, the lower route metric is preferred.

Administrative distance is a routing-software concept (for example in Cisco and FRRouting), not a built-in Linux kernel route-selection field. In Linux route listings, `proto kernel`, `proto static`, and `proto bgp` identify the route source; the kernel still chooses among installed same-prefix routes by metric.

| Route Source | Linux Kernel Behavior | Cisco AD |
|-------------|-----------------------|----------|
| Connected | Longest-prefix match first; lower metric wins among equal-prefix routes | 0 |
| Static | Longest-prefix match first; lower metric wins among equal-prefix routes | 1 |
| OSPFv3 | Installed by routing software; lower kernel metric wins among installed equal-prefix routes | 110 |
| BGP | Installed by routing software; lower kernel metric wins among installed equal-prefix routes | 20 (eBGP) / 200 (iBGP) |
| RIPng | Installed by routing software; lower kernel metric wins among installed equal-prefix routes | 120 |

## Floating Static Routes (Backup)

A static route with a high metric acts as a backup to a dynamic route:

```bash
# Main route via OSPF already installed with a lower metric
# Backup static route with higher metric (only used if the dynamic route disappears)
sudo ip -6 route add 2001:db8:5::/48 via fe80::2 dev eth2 metric 2000
```

If the lower-metric dynamic route is removed, the static backup at metric 2000 becomes active.

## Viewing Route Sources Together

```bash
# Show all routes with their protocol sources
ip -6 route show
# ::1 dev lo proto kernel scope host
# 2001:db8:1::/64 dev eth0 proto kernel scope link src 2001:db8:1::1  (connected)
# 2001:db8:2::/48 via fe80::1 dev eth0 proto static                    (static)
# 2001:db8:3::/48 via fe80::2 dev eth1 proto ospf                      (dynamic)
# ::/0 via fe80::1 dev eth0 proto ra                                   (RA-learned default)
```

## Summary

In Linux IPv6 route listings, the three main forwarding route sources covered here are **connected** (proto kernel, usually created by assigning addresses), **static** (proto static, manually configured), and **dynamic** (installed by routing software, often with labels such as proto ospf, proto bgp, or proto zebra). Each serves a different purpose. In practice, most networks use all three together - connected for local subnets, static for simple stub sites, and dynamic protocols for scalable multi-router topologies.
