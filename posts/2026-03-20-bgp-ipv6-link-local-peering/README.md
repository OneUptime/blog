# How to Peer BGP Over IPv6 Link-Local Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, IPv6, Link-Local, Fe80, Peering

Description: Learn how to configure BGP peering over IPv6 link-local addresses for direct connected peers, including the interface requirement and next-hop handling.

## Overview

BGP can peer using IPv6 link-local addresses (fe80::/10) when two routers are directly connected on the same link. This is common in data center fabrics (BGP unnumbered), IXP route servers, and lab environments. Link-local peering eliminates the need to assign global addresses to router interconnect links.

## Why Use Link-Local BGP Peering?

- **Simplified addressing** - No need to allocate global /64 or /126 for each router link
- **Automatic availability** - Link-local addresses are always present on IPv6 interfaces
- **Unnumbered interfaces** - Common in modern data center spine-leaf designs
- **Standard at IXPs** - Many IXPs support link-local BGP peering on route servers

## Configuration on FRRouting

```bash
vtysh
configure terminal

router bgp 65001
 bgp router-id 1.1.1.1

 ! Peer over the directly connected interface using IPv6 link-local addresses
 neighbor eth0 interface v6only remote-as 65002
 neighbor eth0 description "Link-local BGP peer on eth0"

 address-family ipv6 unicast
  neighbor eth0 activate
  network 2001:db8:1::/48
 exit-address-family

end
write memory
```

## Configuration on Cisco IOS-XE (BGP Unnumbered)

```text
! Enable BGP peering on an unnumbered interface
interface GigabitEthernet0/0
 ipv6 address fe80::1 link-local
 ipv6 enable

interface Loopback0
 ipv6 address 2001:db8:ffff::1/128

router bgp 65001
 bgp router-id 1.1.1.1

 ! Use the peer's link-local address with the interface name
 neighbor FE80::2%GigabitEthernet0/0 remote-as 65002

 address-family ipv6 unicast
  neighbor FE80::2%GigabitEthernet0/0 activate
  neighbor FE80::2%GigabitEthernet0/0 route-map LL-NH out
  network 2001:db8:1::/48
 exit-address-family

route-map LL-NH permit 10
 set ipv6 next-hop 2001:db8:ffff::1
```

## Next-Hop Handling

When BGP receives a route with a link-local next hop from a directly connected peer, the next hop is only valid on that link. This becomes a problem when advertising the route to iBGP peers on other links, including through a route reflector:

```bash
# FRRouting - rewrite the next hop before advertising reflected iBGP routes

router bgp 65001
 address-family ipv6 unicast
  neighbor 2001:db8::10 next-hop-self force    # Replace unreachable link-local NH
 exit-address-family
```

## Verifying Link-Local BGP Sessions

```bash
# FRRouting - check peer state
vtysh -c "show bgp ipv6 unicast summary"

# Show neighbor details
vtysh -c "show bgp ipv6 unicast neighbor eth0"
# Look for: BGP state = Established
```

## Troubleshooting Link-Local BGP

```bash
# Verify link-local address is configured on the interface
ip -6 addr show dev eth0 | grep "scope link"

# Verify the peer's link-local address is in the neighbor table
ip -6 neigh show dev eth0 | grep "fe80::2"

# If the neighbor is not discovered:
ping -6 fe80::2%eth0   # Test reachability first

# Capture BGP OPEN messages
sudo tcpdump -i eth0 -n "tcp port 179"
```

## Multi-Hop Link-Local BGP (Not Supported)

Link-local addresses are not routable beyond the local link. Therefore, **link-local BGP peering only works for directly connected (single-hop) peers**. For multi-hop eBGP, use global unicast addresses.

## Summary

BGP link-local peering uses fe80:: addresses and requires binding the peer to the directly connected interface. It is ideal for directly connected peers and BGP unnumbered data center deployments. When those routes are advertised to iBGP peers on other links, rewrite the next hop to a reachable address.
