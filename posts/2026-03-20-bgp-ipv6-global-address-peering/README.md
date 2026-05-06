# How to Peer BGP Over IPv6 Global Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, IPv6, Global Unicast, Peering, Networking

Description: Learn how to configure BGP peering over IPv6 global unicast addresses for standard inter-AS and intra-AS routing sessions.

## Overview

BGP peering over IPv6 global unicast addresses (2000::/3) is the standard approach for eBGP between different autonomous systems and for iBGP using loopback addresses within an AS. Global addresses can be routed and are therefore suitable for multi-hop sessions.

## eBGP Peering Over Global Addresses

In eBGP, peers typically use the IPv6 address of the directly connected interface:

```bash
# FRRouting - eBGP over global IPv6 address

vtysh
configure terminal

router bgp 65001
 bgp router-id 1.1.1.1
 neighbor 2001:db8:0:12::2 remote-as 65002
 neighbor 2001:db8:0:12::2 description "eBGP Peer via global address"

 address-family ipv6 unicast
  neighbor 2001:db8:0:12::2 activate
  neighbor 2001:db8:0:12::2 soft-reconfiguration inbound
  network 2001:db8:100::/48
 exit-address-family

end
write memory
```

## iBGP Peering Over Loopback Addresses

For iBGP, use IPv6 loopback addresses for stability - sessions survive individual link failures if the loopback is reachable via OSPFv3 or another IGP:

```bash
vtysh
configure terminal

! First, configure a loopback IPv6 address
interface lo
 ipv6 address 2001:db8::1/128

router bgp 65001
 bgp router-id 1.1.1.1

 ! iBGP peer using remote loopback
 neighbor 2001:db8::2 remote-as 65001
 neighbor 2001:db8::2 update-source lo     ! Source from local loopback

 address-family ipv6 unicast
  neighbor 2001:db8::2 activate
  neighbor 2001:db8::2 next-hop-self
 exit-address-family

end
write memory
```

## Cisco IOS eBGP Over Global Address

```text
! Configure eBGP session using IPv6 global address
Router(config)# router bgp 65001
Router(config-router)# bgp router-id 1.1.1.1
Router(config-router)# neighbor 2001:db8:0:12::2 remote-as 65002

Router(config-router)# address-family ipv6 unicast
Router(config-router-af)# neighbor 2001:db8:0:12::2 activate
Router(config-router-af)# network 2001:db8:100::/48
Router(config-router-af)# exit-address-family
```

## Multi-Hop eBGP

When the BGP peer is not directly connected, use `ebgp-multihop`:

```bash
# FRRouting - multi-hop eBGP over global address
router bgp 65001
 neighbor 2001:db8:10::3 remote-as 65003
 neighbor 2001:db8:10::3 ebgp-multihop 5   ! Up to 5 hops away
 neighbor 2001:db8:10::3 update-source lo

 address-family ipv6 unicast
  neighbor 2001:db8:10::3 activate
 exit-address-family
```

## Next-Hop Propagation

In eBGP, the next hop in the BGP UPDATE is typically the advertising peer's global interface address. On a shared subnet, the UPDATE may also include a link-local next hop. In iBGP, the next hop is preserved from the original eBGP advertisement unless `next-hop-self` is configured:

```bash
# Check next-hop in BGP table
vtysh -c "show bgp ipv6 unicast 2001:db8:200::/48"

# Output:
# BGP routing table entry for 2001:db8:200::/48
#   ...
#   Nexthop: 2001:db8:0:12::2          ← Typical eBGP next hop
```

## Filtering Received Prefixes

```bash
# Accept only the peer's announced space
ipv6 prefix-list PEER_PREFIXES seq 10 permit 2001:db8:300::/48
ipv6 prefix-list PEER_PREFIXES seq 99 deny ::/0 le 128

router bgp 65001
 address-family ipv6 unicast
  neighbor 2001:db8:0:12::2 prefix-list PEER_PREFIXES in
 exit-address-family
```

## Summary

BGP over IPv6 global addresses is the standard for eBGP between ASes and iBGP using loopback addresses. eBGP sessions use directly connected interface addresses; iBGP sessions use loopback addresses with `update-source` for link redundancy. Always configure prefix filters on eBGP sessions to prevent route leaks.
