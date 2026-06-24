# How to Redistribute Static Routes into OSPF

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSPF, Static Routes, Redistribution, Cisco IOS, Routing

Description: Learn how to redistribute static routes into OSPF so that non-dynamic network segments can be reached by OSPF routers throughout your network.

## When to Redistribute Static Routes

Static routes handle networks that aren't directly connected or learned via a dynamic routing protocol-such as stub networks, default routes, or networks behind a third-party device. By redistributing them into OSPF, other OSPF routers learn about these destinations.

## Types of External OSPF Routes

When you redistribute into OSPF, routes become Type-5 (or Type-7 in NSSA) External LSAs:
- **E1 (External Type 1):** Cost = redistributed metric + internal OSPF cost (grows as it travels)
- **E2 (External Type 2, default):** Cost = redistributed metric only (doesn't grow)

E1 is more accurate for selecting optimal exit points; E2 is simpler and the default.

## Step 1: Add Static Routes to the Routing Table

Static routes must exist in the routing table before redistribution:

```text
! Static route to a stub network
Router(config)# ip route 172.20.0.0 255.255.0.0 10.0.0.5

! Static default route pointing to the ISP
Router(config)# ip route 0.0.0.0 0.0.0.0 203.0.113.1
```

## Step 2: Redistribute Static Routes into OSPF

```text
router ospf 1
 ! Redistribute static routes into OSPF (except the default route)
 ! 'subnets' is required to redistribute classless (non-classful) routes
 redistribute static subnets

 ! Redistribute with a specific metric
 redistribute static metric 100 subnets

 ! Redistribute as E1 (better for multi-exit scenarios)
 redistribute static metric 100 metric-type 1 subnets
```

Without `subnets`, OSPF only redistributes classful routes (e.g., /8, /16, /24 exactly). A default route still requires `default-information originate`.

## Step 3: Redistribute the Default Route

The default route is not injected by `redistribute static`, so it requires special handling:

```text
router ospf 1
 ! Advertise a default route into OSPF (only if 0.0.0.0/0 exists in the RIB)
 default-information originate

 ! Always originate a default route even without a static default
 default-information originate always

 ! Set metric for the default route
 default-information originate always metric 10 metric-type 1
```

## Step 4: Use Route Maps to Filter Which Static Routes Are Redistributed

Avoid redistributing all static routes blindly-use a route map to select only specific ones:

```text
! Define which static routes to redistribute
ip prefix-list STATIC_ALLOW seq 10 permit 172.20.0.0/16
ip prefix-list STATIC_ALLOW seq 20 permit 172.21.0.0/16

! Create a route map matching these prefixes
route-map STATICS_TO_OSPF permit 10
 match ip address prefix-list STATIC_ALLOW

! Redistribute with the filter
router ospf 1
 redistribute static route-map STATICS_TO_OSPF subnets
```

This prevents accidentally redistributing management routes, tunnel endpoints, or other infrastructure statics.

## Step 5: Verify Redistributed Routes in OSPF

```text
! Check OSPF database for external LSAs in a normal area
Router# show ip ospf database external

! Look for the redistributed static routes:
!   LS Type: AS External Link
!   Link State ID: 172.20.0.0
!   Advertising Router: 1.1.1.1    <- ASBR

! Verify on a remote router
Remote# show ip route ospf

! External routes appear with 'O E2' or 'O E1'
! O E2  172.20.0.0/16 [110/100] via 10.0.0.1
!                              ^^^^^ metric = redistributed metric
```

## Step 6: Redistribute Connected Networks

To advertise directly connected networks that aren't covered by the `network` command:

```text
router ospf 1
 ! Redistribute connected networks
 redistribute connected metric 10 subnets

 ! Or use route map for selective redistribution
 redistribute connected route-map CONNECTED_FILTER subnets
```

## Conclusion

Redistributing static routes into OSPF uses the `redistribute static subnets` command on the ASBR for non-default static routes. Always include `subnets` to handle classless routes, use a route map to filter which statics are redistributed, and verify with `show ip ospf database external` in normal areas that the routes appear as Type-5 LSAs. Use `default-information originate always` to distribute a default route regardless of whether one exists in the local routing table.
