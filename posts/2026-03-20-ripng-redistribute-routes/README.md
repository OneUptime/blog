# How to Redistribute Routes into RIPng

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RIPng, IPv6, Route Redistribution, Routing, Networking

Description: Learn how to redistribute IPv6 static, connected, and OSPFv3 routes into RIPng with metric control and route maps.

## Overview

Route redistribution allows RIPng to advertise routes learned from other sources (static, connected, OSPFv3, BGP) to its RIPng neighbors. Care must be taken with metric values since RIPng only allows 1-15 hops.

## Redistributing Static Routes

```bash
# FRRouting

vtysh
configure terminal

router ripng
 ! Redistribute static routes with metric 3
 redistribute static metric 3

end
write memory
```

```text
! Cisco
Router(config)# ipv6 router rip RIPNG_PROCESS
Router(config-rtr)# redistribute static metric 3
```

## Redistributing Connected Routes

```bash
# FRRouting
router ripng
 redistribute connected metric 1

# Cisco
ipv6 router rip RIPNG_PROCESS
 redistribute connected
```

## Redistributing from OSPFv3

```bash
# FRRouting: redistribute OSPFv3 routes into RIPng
router ripng
 redistribute ospf6 metric 5

# Cisco
ipv6 router rip RIPNG_PROCESS
 redistribute ospf 1 metric 5
```

## Redistributing from BGP

```bash
# FRRouting
router ripng
 redistribute bgp metric 8

# Cisco
ipv6 router rip RIPNG_PROCESS
 redistribute bgp 65001 metric 8
```

## Using Route Maps for Selective Redistribution

Route maps allow filtering which routes are redistributed and setting different metrics per route:

```bash
# FRRouting: selective redistribution
vtysh
configure terminal

! Create a prefix list to match specific static routes
ipv6 prefix-list REDISTRIBUTE_STATIC seq 10 permit 2001:db8:branch::/48
ipv6 prefix-list REDISTRIBUTE_STATIC seq 99 deny ::/0 le 128

! Create a route map
route-map STATIC_TO_RIPNG permit 10
 match ipv6 address prefix-list REDISTRIBUTE_STATIC
 set metric 4

router ripng
 redistribute static route-map STATIC_TO_RIPNG

end
write memory
```

```text
! Cisco: selective redistribution with route map
Router(config)# ipv6 prefix-list STATIC_LIST seq 10 permit 2001:db8:branch::/48

Router(config)# route-map STATIC_TO_RIP permit 10
Router(config-route-map)#  match ipv6 address prefix-list STATIC_LIST
Router(config-route-map)#  set metric 4

Router(config)# ipv6 router rip RIPNG_PROCESS
Router(config-rtr)# redistribute static route-map STATIC_TO_RIP
```

## Metric Considerations

The redistributed metric must stay within 1-15. Common practices:
- Connected routes: metric 1 (they are locally connected)
- Static routes: metric 2-3 (one step removed)
- OSPFv3 routes: metric 5-8 (converted from cost-based metric)
- BGP routes: metric 8-10 (external routes, treat as distant)

**Warning**: If a redistributed route has metric ≥ 16, it will be treated as unreachable by RIPng.

## Preventing Redistribution Loops

When redistributing between two protocols (e.g., OSPFv3 ↔ RIPng), ensure routes don't loop:

```bash
# Use route maps to tag and filter routes to prevent loops
route-map OSPF_TO_RIPNG permit 10
 match ipv6 address prefix-list OSPF_PREFIXES
 ! Tag routes from OSPF
 set tag 100

router ripng
 redistribute ospf6 route-map OSPF_TO_RIPNG

! In OSPFv3, deny routes with tag 100 from being re-redistributed
route-map RIPNG_TO_OSPF deny 5
 ! Block routes that came from OSPF originally
 match tag 100

route-map RIPNG_TO_OSPF permit 10

router ospf6
 redistribute ripng route-map RIPNG_TO_OSPF
```

## Verifying Redistribution

```bash
# FRRouting: check redistributed routes in RIPng table
vtysh -c "show ipv6 ripng"

# Cisco: verify redistributed routes appear in the named RIPng process database
show ipv6 rip RIPNG_PROCESS database
```

## Summary

Route redistribution into RIPng is configured with `redistribute <protocol> metric <value>` on FRRouting and `redistribute <protocol> [process-id] metric <value>` where Cisco IOS requires a process ID, such as BGP. Keep metric values between 1 and 15. Use route maps to selectively redistribute specific prefixes and prevent routing loops when redistributing between two protocols bidirectionally. Verify redistributed routes with `show ipv6 ripng` on FRRouting or `show ipv6 rip RIPNG_PROCESS database` on Cisco IOS.
