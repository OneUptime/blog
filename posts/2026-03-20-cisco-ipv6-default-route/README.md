# How to Configure IPv6 Default Route on Cisco

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cisco, IPv6, Default Route, IOS, Routing

Description: Add IPv6 default routes on Cisco IOS using static routes, floating static routes, and via BGP or OSPF learning.

## Overview

Configure IPv6 default routes on Cisco IOS using static routes, floating static routes, and routing protocols such as BGP or OSPF.

## Prerequisites

- Cisco IOS with IPv6 routing support
- Global IPv6 routing enabled: `ipv6 unicast-routing`
- Console or SSH access to the router

## Configuration

### Basic IPv6 Setup

```text
! Always start by enabling IPv6 routing globally
Router(config)# ipv6 unicast-routing

! Configure the primary upstream-facing interface with IPv6
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ipv6 address 2001:db8:0:1::1/64
Router(config-if)# no shutdown

! Configure a secondary upstream-facing interface for backup routing
Router(config)# interface GigabitEthernet0/1
Router(config-if)# ipv6 address 2001:db8:0:2::1/64
Router(config-if)# no shutdown
```

### Feature-Specific Configuration

```text
! Static IPv6 default route using the primary upstream next hop
Router(config)# ipv6 route ::/0 2001:db8:0:1::2

! Floating static IPv6 default route with a higher administrative distance
Router(config)# ipv6 route ::/0 2001:db8:0:2::2 200

! Advertise an existing default route into OSPF for IPv6
Router(config)# ipv6 router ospf 10
Router(config-rtr)# default-information originate
```

## Verification Commands

```text
! Show IPv6 interface status
Router# show ipv6 interface brief

! Show configured IPv6 static routes
Router# show ipv6 static

! Show the installed default route
Router# show ipv6 route ::/0

! Show only IPv6 static routes in the routing table
Router# show ipv6 route static

! Show IPv6 routes learned from BGP or OSPF
Router# show ipv6 route bgp
Router# show ipv6 route ospf

! Show the full IPv6 routing table
Router# show ipv6 route

! Ping an IPv6 destination beyond the next hop
Router# ping ipv6 2001:db8:ffff::1

! Traceroute over IPv6
Router# traceroute ipv6 2001:db8:ffff::1
```

## Debug Commands

```text
! Debug IPv6 route installation and removal
Router# debug ipv6 routing

! Debug IPv6 packet forwarding
Router# debug ipv6 packet

! Always disable debug when done
Router# undebug all
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your Cisco router's IPv6 connectivity. Ping monitors targeting the router's IPv6 loopback or interface address provide early warning of configuration or connectivity issues.

## Conclusion

How to Configure IPv6 Default Route on Cisco follows standard Cisco IOS configuration patterns. Remember to enable `ipv6 unicast-routing` globally so the router can forward IPv6 traffic. Always verify that `::/0` appears in `show ipv6 route` after making changes.
