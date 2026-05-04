# How to Configure SRv6 on Cisco IOS-XR - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SRv6, Cisco, IOS-XR, Segment Routing, Configuration, Networking

Description: Configure Segment Routing over IPv6 (SRv6) on Cisco IOS-XR routers including locator assignment, IS-IS advertisement, and End/End.DT6 SID definitions.

## Introduction

Cisco IOS-XR supports SRv6 from release 7.0.x onward. Configuration involves defining locators, enabling SRv6 in the routing protocols, and associating SIDs with specific behaviors.

## Step 1: Enable SRv6 and Define a Locator

```javascript
! Enable SRv6 globally
segment-routing srv6
 encapsulation
  source-address 5f00:1:1::1   ! Source address for encapsulated packets
 !
 locators
  locator MyLocator
   prefix 5f00:1:1::/48        ! Assign a 48-bit locator prefix (default f3216 format: 32-bit block, 16-bit node, 16-bit function)
  !
 !
!
```

## Step 2: Enable SRv6 in IS-IS

```text
router isis CORE
 address-family ipv6 unicast
  segment-routing srv6
   locator MyLocator
  !
 !
!
```

This causes IS-IS to advertise the locator prefix and the node's SID mappings to all IS-IS routers.

## Step 3: Define SIDs for Services

```bash
! Define SIDs for L3VPN (End.DT6 for IPv6 VPN table)
vrf CUSTOMER_A
 address-family ipv6 unicast
  import route-target 65000:100
  export route-target 65000:100
 !
!

! Associate SRv6 SIDs with the VRF
router bgp 65000
 vrf CUSTOMER_A
  address-family ipv6 unicast
   segment-routing srv6
    locator MyLocator
    alloc mode per-vrf          ! One SID per VRF
   !
  !
 !
!
```

IOS-XR automatically allocates a SID for the VRF using the End.DT6 function.

## Step 4: Traffic Engineering with SRv6

```text
! Configure an SRv6 TE policy
segment-routing
 traffic-eng
  policy TO-CORE-2
   color 100 end-point ipv6 5f00:2:1::1
   candidate-paths
    preference 100
     explicit segment-list EXPLICIT-PATH-1
     !
    !
   !
  !
  segment-list EXPLICIT-PATH-1
   index 10 srv6 sid 5f00:1:2:0:e001::  ! Waypoint 1
   index 20 srv6 sid 5f00:2:1:0:e001::  ! Waypoint 2
  !
 !
!
```

## Step 5: Verify SRv6 Configuration

```javascript
! Show all configured locators
show segment-routing srv6 locator

! Show all active SIDs
show segment-routing srv6 sid

! Example output:
! SID                       Function   Context            State
! 5f00:1:1:0:e000::         End        N/A                Active
! 5f00:1:1:0:e001::         End.DT6    vrf:CUSTOMER_A     Active

! Show IS-IS SRv6 advertisements
show isis srv6 locators detail

! Test SRv6 forwarding
traceroute ipv6 5f00:2:1::1 source 5f00:1:1::1
```

## Step 6: Monitor SRv6 Forwarding

```text
! Show SRv6 forwarding table
show segment-routing srv6 forwarding

! Show SRH encapsulation statistics
show segment-routing srv6 stats

! Verify uSID compression (if enabled)
show segment-routing srv6 locator MyLocator detail
```

## uSID Configuration (Optional Compression)

```text
! Enable micro-SID (uSID) compression
segment-routing srv6
 locators
  locator MyLocator
   micro-segment
    behavior unode psp-usd
   !
  !
 !
!
```

## Conclusion

Cisco IOS-XR SRv6 configuration centers on locator definition, IS-IS advertisement, and SID-to-service binding. The `show segment-routing srv6` command family provides comprehensive status visibility. Use OneUptime to monitor the reachability of locator prefixes and SRv6 TE policy endpoint addresses.
