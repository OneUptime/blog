# How to Redistribute Routes Between Routing Protocols

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Routing, OSPF, BGP, Redistribution, FRR

Description: Learn how to safely redistribute routes between different routing protocols like OSPF, BGP, and static routes using FRR on Linux.

## Introduction

Route redistribution is the process of taking routes learned by one routing protocol (or source) and injecting them into another. This is necessary in networks that run multiple protocols - for example, redistributing static routes into OSPF so that remote routers learn about manually configured subnets, or importing OSPF routes into BGP for external advertisement.

## Why Redistribution is Risky

Without proper filtering, redistribution can cause:
- **Routing loops** - routes go into Protocol A, redistribute into Protocol B, then back into A
- **Suboptimal routing** - routes re-entered with wrong metrics
- **Route flapping** - instability caused by metric mismatches

Always apply route maps or prefix-list filters when redistributing.

## Redistributing Static Routes into OSPF (FRR)

Configure FRR to inject all static routes into OSPF:

```bash
# /etc/frr/frr.conf

router ospf
  redistribute static metric 10 metric-type 2
  # metric-type 2 = external type 2 (metric does not accumulate)
  # metric 10 = initial cost assigned to redistributed routes
```

For selective redistribution using a route map:

```bash
# Define prefix list to filter which statics are redistributed
ip prefix-list STATIC-TO-OSPF seq 10 permit 10.20.0.0/24
ip prefix-list STATIC-TO-OSPF seq 20 deny 0.0.0.0/0 le 32

# Create route map referencing the prefix list
route-map STATIC-TO-OSPF-MAP permit 10
  match ip address prefix-list STATIC-TO-OSPF

# Apply in OSPF
router ospf
  redistribute static route-map STATIC-TO-OSPF-MAP
```

## Redistributing OSPF Routes into BGP

Share OSPF-learned internal routes with BGP peers:

```bash
# /etc/frr/frr.conf
router bgp 65001
  address-family ipv4 unicast
    redistribute ospf route-map OSPF-TO-BGP-MAP

# Route map: only redistribute specific OSPF prefixes
route-map OSPF-TO-BGP-MAP permit 10
  match ip address prefix-list INTERNAL-SUBNETS
  set local-preference 100

ip prefix-list INTERNAL-SUBNETS seq 10 permit 10.0.0.0/8 le 24
```

## Redistributing BGP into OSPF (with caution)

This is the most dangerous direction. Internet BGP tables have hundreds of thousands of routes - redistributing all of them into OSPF will crash your network.

```bash
# ALWAYS use a prefix list to allow only specific prefixes
ip prefix-list BGP-TO-OSPF seq 10 permit 203.0.113.0/24
ip prefix-list BGP-TO-OSPF seq 20 deny 0.0.0.0/0 le 32

route-map BGP-TO-OSPF-MAP permit 10
  match ip address prefix-list BGP-TO-OSPF
  set metric 50

router ospf
  redistribute bgp route-map BGP-TO-OSPF-MAP
```

## Verifying Redistribution

```bash
# Check OSPF external routes (type E1/E2)
vtysh -c "show ip ospf route"

# Check the BGP table for redistributed prefixes
# Redistributed routes typically show origin "?"
vtysh -c "show ip bgp"

# Check FRR's routing table for routes learned via OSPF or BGP
vtysh -c "show ip route ospf"
vtysh -c "show ip route bgp"
```

## Conclusion

Route redistribution is a powerful but potentially dangerous operation. Always filter with prefix lists and route maps, and test in a staging environment before deploying to production. Monitor routing table sizes after redistribution to catch unexpected route injections early.
