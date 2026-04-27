# How to Redistribute Routes into OSPFv3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSPFv3, IPv6, Route Redistribution, OSPF, Routing

Description: Learn how to redistribute IPv6 static, connected, and BGP routes into OSPFv3, with metric control and filtering using route maps.

## Overview

Route redistribution allows OSPFv3 to advertise routes learned from other sources (static, connected, BGP, RIPng) to its neighbors. Redistributed routes appear as Type 5 (AS External) LSAs in regular areas or Type 7 LSAs in NSSA areas.

## Redistributing Static Routes

```text
! Cisco IOS - Redistribute static IPv6 routes into OSPFv3
router ospfv3 1
 address-family ipv6 unicast
  redistribute static metric 20 metric-type 1
```

```bash
# FRRouting - Redistribute static routes into OSPFv3

vtysh
configure terminal

router ospf6
 redistribute static metric 20 metric-type 1

end
write memory
```

## Metric Types

| Type | Behavior |
|------|---------|
| **Type 1 (E1)** | External metric + internal OSPF cost to ASBR. Grows as packet travels further from ASBR. |
| **Type 2 (E2)** | External metric only. Does not change regardless of distance. Default. |

Use Type 1 for better path selection when multiple ASBRs exist. Use Type 2 (default) when all exits are equivalent.

## Redistributing Connected Routes

```text
! Cisco
router ospfv3 1
 address-family ipv6 unicast
  redistribute connected

! FRRouting
router ospf6
 redistribute connected
```

## Redistributing from BGP

```text
! Cisco - Redistribute BGP IPv6 into OSPFv3
router ospfv3 1
 address-family ipv6 unicast
  redistribute bgp metric 100 metric-type 2
```

```bash
# FRRouting
router ospf6
 redistribute bgp metric 100 metric-type 2
```

## Using Route Maps for Selective Redistribution

Route maps allow granular control over which routes are redistributed and what metric they receive:

```bash
! Cisco - Redistribute only specific static routes
ipv6 prefix-list OSPF_EXPORT seq 10 permit 2001:db8:1::/48 le 64

route-map STATIC_TO_OSPF permit 10
 match ipv6 address prefix-list OSPF_EXPORT
 set metric 50
 set metric-type type-1

router ospfv3 1
 address-family ipv6 unicast
  redistribute static route-map STATIC_TO_OSPF
```

```bash
# FRRouting - Selective redistribution with route map
vtysh
configure terminal

ipv6 prefix-list OSPF_EXPORT seq 10 permit 2001:db8:1::/48 le 64

route-map STATIC_TO_OSPF permit 10
 match ipv6 address prefix-list OSPF_EXPORT
 set metric 50

router ospf6
 redistribute static route-map STATIC_TO_OSPF

end
write memory
```

## Generating a Default Route

To make OSPFv3 advertise a default route to all areas:

```text
! Cisco
router ospfv3 1
 address-family ipv6 unicast
  default-information originate always   ! 'always' = advertise even if no default in RIB

! FRRouting
router ospf6
 default-information originate always
```

## Verifying Redistribution

```text
! Cisco - Check for Type 5 (external) LSAs
Router# show ospfv3 database external

! Check redistributed routes in the routing table on a neighbor
Router-Neighbor# show ipv6 route ospf | include OE
! OE1 = External Type 1
! OE2 = External Type 2
```

```bash
# FRRouting - Verify redistributed routes
vtysh -c "show ipv6 ospf database as-external"

# Check on a neighbor
vtysh -c "show ipv6 route ospf" | grep "E1\|E2"
```

## Summary

Route redistribution into OSPFv3 is configured with `redistribute <protocol>` in the OSPFv3 router process. Use Type 1 metric for cost-aware external path selection and Type 2 (default) for fixed-cost external routes. Always use route maps in production to control which routes are redistributed and avoid routing loops or information leakage.
