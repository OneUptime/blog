# How to Understand IPv6 Link-Local Addresses as Next Hops

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Link-Local, Routing, Fe80, Networking

Description: Understand why IPv6 routing uses link-local addresses as next hops, how to work with them correctly, and why you must always specify the interface.

## Overview

In IPv6, router next hops on a directly connected link are often **link-local addresses** (fe80::/10) rather than global unicast addresses. This is intentional by design and is fundamental to how IPv6 Neighbor Discovery and protocols such as OSPFv3 work, but it also means you must specify the interface when configuring link-local next hops.

## Why Link-Local Addresses Are Used as Next Hops

Link-local addresses are:
1. **Automatically assigned** to every IPv6-capable interface - they exist even before global addresses are configured
2. **Not route-dependent** - they don't require a routing entry to be reachable on the local link
3. **Independent of global address assignment** - renumbering global prefixes doesn't affect router-to-router communication

This means routers can establish adjacencies and exchange routing information using fe80:: addresses, and the global prefix can be changed without breaking routing protocols.

## The Interface Ambiguity Problem

Link-local addresses are only unique **within a single link**. The address `fe80::1` on `eth0` is a completely different destination than `fe80::1` on `eth1`. Therefore, you must always specify which interface to use when referencing a link-local next hop.

```bash
# WRONG: Linux cannot infer the outbound interface for a link-local next hop
sudo ip -6 route add 2001:db8:1::/48 via fe80::1

# CORRECT: Specify the interface
sudo ip -6 route add 2001:db8:1::/48 via fe80::1 dev eth0
```

## Viewing Link-Local Next Hops in the Routing Table

```bash
# Show IPv6 routes with link-local next hops
ip -6 route show | grep "fe80"

# Example output:
# default via fe80::1 dev eth0 proto ra metric 1024
# 2001:db8:1::/48 via fe80::2 dev eth1 proto ospf metric 100
```

## Using Percent Notation for Link-Local Addresses

The `%interface` notation is used in many tools and commands to disambiguate link-local addresses:

```bash
# Ping a link-local next hop (% specifies the interface)
ping6 fe80::1%eth0

# Traceroute to a link-local neighbor on the local link
traceroute6 fe80::1%eth0

# SSH to a device via its link-local address
ssh root@fe80::1%eth0
```

## How Router Advertisements Use Link-Local Addresses

When a router sends a Router Advertisement, the source address is always its link-local address. The Router Lifetime field tells hosts whether to use that router as a default router, and clients use the link-local source of the RA as their default route next hop:

```bash
# Watch incoming Router Advertisements to see link-local source addresses
sudo tcpdump -i eth0 -n "icmp6 and ip6[40] == 134"

# Output:
# IP6 fe80::1 > ff02::1: ICMP6 router advertisement, length 56
# The source fe80::1 becomes the default route next hop
```

## Dynamic Routing Protocol Adjacencies

OSPFv3 uses link-local addresses for adjacency, and BGP can peer over link-local addresses on a shared link:

```bash
# FRRouting: Show OSPFv3 neighbors using link-local addresses
vtysh -c "show ipv6 ospf6 neighbor"

# BGP peering over IPv6 link-local in FRRouting
# neighbor eth0 interface v6only remote-as 65001
```

## Summary

IPv6 often uses link-local addresses as next hops on directly connected links because they are always available, scoped to a single link, and independent of global address assignment. When configuring static routes or troubleshooting, always append the `dev <interface>` parameter to any route using a link-local gateway, and use `%interface` notation in tools like ping6 and SSH.
