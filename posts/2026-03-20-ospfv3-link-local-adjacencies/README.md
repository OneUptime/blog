# How to Understand OSPFv3 Link-Local Address Adjacencies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSPFv3, IPv6, Link-Local, Adjacency, Fe80

Description: Understand why OSPFv3 uses IPv6 link-local addresses for neighbor adjacencies and the implications for routing and troubleshooting.

## Overview

One of the most significant design changes in OSPFv3 is that all neighbor adjacencies are formed using **IPv6 link-local addresses** (fe80::/10) rather than global unicast addresses. This is not a limitation - it is an intentional architectural decision with important benefits.

## Why Link-Local Adjacencies?

Link-local addresses provide:
1. **Automatic availability** - Every IPv6-capable interface has a link-local address, even before global addresses are assigned
2. **Topology independence** - OSPFv3 adjacencies survive global address renumbering
3. **Protocol cleanliness** - OSPF topology discovery is separated from address configuration
4. **Bootstrap capability** - Two routers can establish OSPFv3 adjacency before any global addresses are configured

## How OSPFv3 Hello Packets Use Link-Local Addresses

```bash
# Capture OSPFv3 Hello messages to see the link-local source addresses

sudo tcpdump -i eth0 -n "ip6 proto 89"

# Expected output:
# IP6 fe80::1 > ff02::5: OSPFv3 Hello
# IP6 fe80::2 > ff02::5: OSPFv3 Hello
```

The source is always a link-local address (fe80::), and the destination is the OSPFv3 all-routers multicast address (ff02::5).

## Impact on Routing Table

Because OSPFv3 adjacencies use link-local addresses, routes installed by OSPFv3 also use link-local next hops:

```bash
# Show OSPFv3-installed routes - notice link-local next hops
ip -6 route show proto ospf
# 2001:db8:1::/48 via fe80::2 dev eth0 proto ospf metric 20
# 2001:db8:2::/48 via fe80::3 dev eth1 proto ospf metric 30
```

This is why you must always specify the outgoing interface (dev eth0) when using link-local next hops.

## Verifying Link-Local Adjacencies

```bash
# FRRouting: show OSPFv3 neighbors with their link-local addresses
vtysh -c "show ipv6 ospf6 neighbor"

# Output includes link-local addresses of neighbors:
# Neighbor ID     State    DeadTime   Interface    Address
# 2.2.2.2         Full     35s        eth0         fe80::2
# 3.3.3.3         Full     38s        eth1         fe80::3
```

## Configuring Link-Local Addresses on Linux

For predictable OSPFv3 adjacency, consider setting static link-local addresses:

```bash
# Replace the EUI-64 generated link-local with a predictable one
sudo ip -6 addr del $(ip -6 addr show dev eth0 scope link | awk '/inet6/{print $2}') dev eth0
sudo ip -6 addr add fe80::1/64 dev eth0 scope link

# Verify
ip -6 addr show dev eth0
```

## Troubleshooting Link-Local Adjacency Issues

```bash
# Check if the interface has a link-local address
ip -6 addr show dev eth0 | grep "scope link"
# Must show fe80:: address - if missing, OSPFv3 cannot form adjacency

# Verify OSPFv3 multicast subscription
ip -6 maddr show dev eth0 | grep "ff02::5\|ff02::6"
# Should show both ff02::5 (all OSPF routers) and ff02::6 (all DR/BDR)

# Check for firewall blocking OSPFv3 (protocol 89)
sudo ip6tables -L INPUT -n | grep "89\|ospf"
# Must allow protocol 89 for OSPFv3 to work
```

## Firewall Rules for OSPFv3

```bash
# Allow OSPFv3 (IP protocol 89) on the interface
sudo ip6tables -A INPUT -i eth0 -p 89 -j ACCEPT
sudo ip6tables -A OUTPUT -o eth0 -p 89 -j ACCEPT

# nftables equivalent
# table ip6 filter {
#     chain input {
#         ip6 nexthdr 89 accept
#     }
# }
```

## Summary

OSPFv3 uses IPv6 link-local addresses for all neighbor adjacencies, not global unicast addresses. This provides automatic availability and protocol independence from global addressing. Routes installed by OSPFv3 use link-local next hops with explicit interface references. Always ensure link-local addresses are present and OSPFv3 traffic (protocol 89) is allowed by the firewall.
