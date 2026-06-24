# How to Redistribute IPv6 Routes into IS-IS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IS-IS, IPv6, Route Redistribution, Routing, Networking

Description: Learn how to redistribute IPv6 static, connected, OSPFv3, and BGP routes into IS-IS on Cisco, Juniper, and FRRouting.

## Overview

IS-IS route redistribution advertises routes from other sources into the IS-IS link-state database. Operational output often distinguishes redistributed prefixes from internal IS-IS routes; on Cisco IOS XE, use `metric-type external` if you want redistributed IPv6 routes to use the external IS-IS metric type, because the default is `internal`.

## Cisco IOS Redistribution

```text
! Enter IPv6 IS-IS address-family configuration
Router(config)# router isis
Router(config-router)# address-family ipv6

! Redistribute static IPv6 routes into IS-IS
Router(config-router-af)# redistribute static metric 10 metric-type external

! Connected IPv6 prefixes are advertised from IS-IS-enabled or passive interfaces.
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ipv6 router isis

! Redistribute OSPFv3 routes
Router(config)# router isis
Router(config-router)# address-family ipv6
Router(config-router-af)# redistribute ospf 1 metric 20 metric-type external

! Redistribute BGP routes
Router(config-router-af)# redistribute bgp 65001 metric 30 metric-type external
```

## Cisco: Using Route Maps for Selective Redistribution

```text
! Create prefix list for filtering
Router(config)# ipv6 prefix-list ISIS_IMPORT seq 10 permit 2001:db8:100::/48

! Create route map
Router(config)# route-map TO_ISIS permit 10
Router(config-route-map)#  match ipv6 address prefix-list ISIS_IMPORT
Router(config-route-map)#  set metric 15

! Apply to redistribution
Router(config)# router isis
Router(config-router)# address-family ipv6
Router(config-router-af)# redistribute static route-map TO_ISIS
```

## Juniper Junos Redistribution

```bash
# Redistribution uses export policies in Juniper

# Policy to redistribute static IPv6 into IS-IS

set policy-options policy-statement STATIC_TO_ISIS term 1 from protocol static
set policy-options policy-statement STATIC_TO_ISIS term 1 from family inet6
set policy-options policy-statement STATIC_TO_ISIS term 1 then accept

# Policy for connected routes
set policy-options policy-statement CONNECTED_TO_ISIS term 1 from protocol direct
set policy-options policy-statement CONNECTED_TO_ISIS term 1 from family inet6
set policy-options policy-statement CONNECTED_TO_ISIS term 1 then accept

# Apply export policy to IS-IS
set protocols isis export STATIC_TO_ISIS
set protocols isis export CONNECTED_TO_ISIS
```

## FRRouting Redistribution

```bash
vtysh
configure terminal

router isis CORE
 metric-style wide

 ! Current FRRouting IS-IS documentation uses table-based redistribution.
 ! Redistribute IPv6 routes from Linux routing table 200 into IS-IS Level 2.
 redistribute ipv6 table 200 level-2 metric 30

end
write memory
```

## Advertising a Default IPv6 Route

```bash
# FRRouting
router isis CORE
 metric-style wide
 default-information originate ipv6 level-2 always metric 100

# Cisco
Router(config)# router isis
Router(config-router)# address-family ipv6
Router(config-router-af)# default-information originate
```

## Verifying Redistributed Routes

```text
! Cisco: Check the IPv6 IS-IS local RIB
Router# show isis ipv6 rib

* 2001:DB8:100::/48
    via FE80::A8BB:CCFF:FE00:C800/Ethernet0/0, type L2  metric 15 tag 0 LSP [3/3]
```

```bash
# FRRouting: Check the IS-IS route table
vtysh -c "show isis route level-2"

# Juniper
show isis route inet6
# External routes show Type ext
```

## Preventing Route Loops

When redistributing between two protocols bidirectionally, use route tags to prevent loops:

```text
! Cisco: Tag routes from OSPF before injecting into IS-IS
Router(config)# route-map OSPF_TO_ISIS permit 10
Router(config-route-map)#  match ipv6 address prefix-list OSPF_PREFIXES
Router(config-route-map)#  set tag 100

! In OSPFv3, block routes tagged with 100 from being redistributed back
Router(config)# route-map ISIS_TO_OSPF deny 5
Router(config-route-map)#  match tag 100

Router(config)# route-map ISIS_TO_OSPF permit 10
```

## Summary

On Cisco IOS XE, configure IPv6 redistribution under `router isis` and `address-family ipv6` with `redistribute <protocol> ...`; connected IPv6 prefixes are advertised from IS-IS-enabled or passive interfaces instead of `redistribute connected`. On Junos, use export policies. Current FRRouting IS-IS documentation uses `redistribute ipv6 table <table-id> <level>` and `default-information originate ipv6 <level>` rather than per-protocol redistribution commands. Always use route maps or policies for selective redistribution and route tags to prevent bidirectional redistribution loops.
