# How to Configure BGP IPv6 Unicast Address Family on Cisco

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, IPv6, Cisco, Address Family, Routing

Description: Step-by-step guide to configuring BGP IPv6 unicast address family on Cisco IOS and IOS-XE routers to exchange IPv6 routing information.

## Overview

Cisco IOS supports IPv6 BGP through the `address-family ipv6 unicast` configuration block within the BGP router process. This enables exchange of IPv6 prefixes with eBGP and iBGP peers.

## Prerequisites

```text
! Enable IPv6 unicast routing (required)
Router(config)# ipv6 unicast-routing

! Verify
Router# show running-config | include ipv6 unicast-routing
```

## Basic IPv6 BGP Configuration

```text
! Configure BGP with IPv4 and IPv6 support
Router(config)# router bgp 65001
Router(config-router)# bgp router-id 1.1.1.1

! Configure eBGP neighbor using IPv6 address
Router(config-router)# neighbor 2001:db8:12::2 remote-as 65002

! Activate the IPv6 address family
Router(config-router)# address-family ipv6 unicast
Router(config-router-af)# neighbor 2001:db8:12::2 activate
Router(config-router-af)# neighbor 2001:db8:12::2 send-community
Router(config-router-af)# exit-address-family
```

## Advertising IPv6 Networks

```text
! Method 1: Advertise a specific prefix from the routing table
Router(config)# router bgp 65001
Router(config-router)# address-family ipv6 unicast
Router(config-router-af)# network 2001:db8:1::/48

! The /48 must exist in the routing table for this to work
! Add a null route if needed:
Router(config)# ipv6 route 2001:db8:1::/48 Null0
```

## Configuring IPv6 BGP for iBGP

```text
! iBGP peer using IPv6 loopback address
Router(config)# interface Loopback0
Router(config-if)# ipv6 address 2001:db8::1/128

Router(config)# router bgp 65001
Router(config-router)# neighbor 2001:db8::2 remote-as 65001
Router(config-router)# neighbor 2001:db8::2 update-source Loopback0

Router(config-router)# address-family ipv6 unicast
Router(config-router-af)# neighbor 2001:db8::2 activate
Router(config-router-af)# exit-address-family
```

## Redistribute Routes into BGP

```text
! Redistribute OSPFv3 routes into BGP IPv6
Router(config)# router bgp 65001
Router(config-router)# address-family ipv6 unicast
Router(config-router-af)# redistribute ospf 1 include-connected
Router(config-router-af)# exit-address-family
```

## Verification Commands

```text
! Show BGP IPv6 summary (all neighbors and prefix counts)
Router# show bgp ipv6 unicast summary

! Show all IPv6 BGP routes
Router# show bgp ipv6 unicast

! Show routes advertised to a specific peer
Router# show bgp ipv6 unicast neighbors 2001:db8:12::2 advertised-routes

! Show routes learned from a peer in the BGP table
Router# show bgp ipv6 unicast neighbors 2001:db8:12::2 routes

! Show BGP neighbor details including capabilities
Router# show bgp ipv6 unicast neighbors 2001:db8:12::2
```

## Sample show bgp ipv6 unicast Output

```text
Router# show bgp ipv6 unicast

BGP table version is 5, local router ID is 1.1.1.1
Status codes: s suppressed, d damped, h history, * valid, > best
Origin codes: i - IGP, e - EGP, ? - incomplete

   Network                    Next Hop             Metric  LocPrf  Weight  Path
*> 2001:db8:1::/48            ::                        0           32768  i
*> 2001:db8:2::/48            2001:db8:12::2             0              0  65002 i
```

## Summary

Cisco BGP IPv6 is configured in `address-family ipv6 unicast` under the BGP router process. Neighbors must be explicitly activated in the IPv6 AF. Use `network` to advertise prefixes, `neighbor activate` to enable IPv6 exchange, and verify with `show bgp ipv6 unicast summary`. Always ensure `ipv6 unicast-routing` is enabled first.
