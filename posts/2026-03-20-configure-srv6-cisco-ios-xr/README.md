# How to Configure SRv6 on Cisco IOS-XR

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SRv6, Cisco, IOS-XR, Segment Routing, Traffic Engineering

Description: Configure SRv6 segment routing on Cisco IOS-XR routers, including locator setup, IS-IS advertisement, and Traffic Engineering policies.

## Introduction

Cisco IOS-XR supports SRv6 with native integration into IS-IS and BGP. This guide covers locator configuration, SID assignment, IS-IS advertisement, and verifying the forwarding plane.

## Global SRv6 Configuration

```text
! Enable SRv6
segment-routing srv6
 encapsulation
  source-address 5f00:1::
 !
 locators
  locator MAIN
   micro-segment behavior unode psp-usd
   prefix 5f00:1::/48
  !
 !
!
```

## Interface and Loopback SID Assignment

```text
! Assign loopback address within locator
interface Loopback0
 ipv6 address 5f00:1::/128
!

! Enable SRv6 on data-plane interface
interface GigabitEthernet0/0/0/0
 ipv6 address fd00:12::1/64
 ipv6 enable
!
```

## IS-IS Advertisement of SRv6 Locators

```text
! IS-IS configuration with SRv6
router isis CORE
 is-type level-2-only
 net 49.0001.0000.0000.0001.00
 address-family ipv6 unicast
  metric-style wide
  segment-routing srv6
   locator MAIN
   !
  !
 !
 interface GigabitEthernet0/0/0/0
  address-family ipv6 unicast
   metric 10
  !
 !
!
```

## Verification Commands

```bash
# Show SRv6 locators

show segment-routing srv6 locator

# Show all SRv6 SIDs
show segment-routing srv6 sid

# Show IS-IS SRv6 locator advertisements
show isis segment-routing srv6 locators

# Show SRv6 forwarding table
show segment-routing srv6 forwarding

# Verify a specific SID
show segment-routing srv6 sid 5f00:1:0:e001::
# Output shows: prefix, function, interface, next-hop

# Traceroute using SRv6
traceroute srv6-te policy POLICY-TO-R3
```

## SRv6 Traffic Engineering Policy

```text
! Create an SRv6 TE policy to steer traffic via R2
segment-routing
 traffic-eng
  policy POLICY-VIA-R2
   srv6
    locator MAIN
    binding-sid dynamic behavior ub6-insert-reduced
   !
   color 100 end-point ipv6 5f00:3::
   candidate-paths
    preference 100
     explicit segment-list R1-R2-R3
     !
    !
   !
  !
  segment-list R1-R2-R3
   srv6
   !
   index 10 address ipv6 5f00:2:0:e001::
   index 20 address ipv6 5f00:3:0:e000::
  !
 !
!
```

## BGP with SRv6 for L3VPN

```text
! BGP L3VPN over SRv6
router bgp 65001
 bgp router-id 1.1.1.1
 address-family vpnv6 unicast
  !
 !
 neighbor 5f00:3::
  remote-as 65001
  update-source Loopback0
  address-family vpnv6 unicast
   !
  !
 !
 vrf CUSTOMER-A
  rd 65001:100
  address-family ipv6 unicast
   segment-routing srv6
    locator MAIN
    alloc mode per-vrf
   !
  !
 !
!
```

## Conclusion

Cisco IOS-XR's SRv6 implementation integrates cleanly with IS-IS and BGP. Configure locators under `segment-routing srv6`, advertise via IS-IS, and build TE policies for traffic steering. Use `show segment-routing srv6 sid` to verify SID instantiation. Monitor SRv6 policy status and SID reachability with OneUptime in production environments.
