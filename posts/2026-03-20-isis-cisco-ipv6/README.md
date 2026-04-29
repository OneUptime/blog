# How to Configure IS-IS on Cisco for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IS-IS, Cisco, IPv6, Routing, IOS

Description: Step-by-step guide to configuring IS-IS for IPv6 routing on Cisco IOS, including NSAP addressing, interface activation, and multi-topology support.

## Overview

IS-IS on Cisco IOS requires a NET (Network Entity Title) address, IS-IS enabled on interfaces, and explicit IPv6 forwarding and interface activation. When adding IPv6 to an existing IPv4 IS-IS deployment and you want separate IPv4/IPv6 topologies, enable Multi-Topology.

## Cisco IS-IS Configuration for IPv6

```text
! Step 1: Enable IPv6 forwarding, create the IS-IS process, and set the NET address
Router(config)# ipv6 unicast-routing
Router(config)# router isis
Router(config-router)# net 49.0001.0000.0000.0001.00
! NET format: Area ID + System ID + SEL (00)
! Area: 49.0001 (private area)
! System ID: 0000.0000.0001 (usually from loopback)
! SEL: always 00

Router(config-router)# is-type level-2-only   ! or level-1, or level-1-2
Router(config-router)# metric-style wide      ! Required for IPv6 TLVs

! Step 2: Enable the IPv6 address family with Multi-Topology
Router(config-router)# address-family ipv6
Router(config-router-af)# multi-topology   ! Use for a separate IPv6 topology

! Step 3: Enable IS-IS on interfaces
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ip address 10.0.0.1 255.255.255.0
Router(config-if)# ipv6 address 2001:db8:1::1/64
Router(config-if)# ip router isis       ! IPv4 IS-IS
Router(config-if)# ipv6 router isis     ! IPv6 IS-IS

! Step 4: Set interface metrics
Router(config-if)# isis metric 10        ! IPv4 metric
Router(config-if)# isis ipv6 metric 10  ! IPv6 metric

! Step 5: Enable on loopback for stable prefix advertisement
Router(config)# interface Loopback0
Router(config-if)# ip address 1.1.1.1 255.255.255.255
Router(config-if)# ipv6 address 2001:db8::1/128
Router(config-if)# ip router isis
Router(config-if)# ipv6 router isis
Router(config)# router isis
Router(config-router)# passive-interface Loopback0   ! No Hello on loopback
```

## NET Address Format

```yaml
NET: 49.0001.0000.0000.0001.00
     --------  ^^^^^^^^^^^^^^  --
     Area ID   System ID       SEL (always 00)

Area: Variable length (1-13 bytes)
System ID: 6 bytes (must be unique; often written using a padded loopback-based convention)
  Loopback 1.1.1.1 = 0001.0001.0001
  Loopback 10.0.0.1 = 0100.0000.0001
```

## IS-IS Interface Types

```text
! Point-to-point interface (no DIS election)
Router(config-if)# isis network point-to-point

! Broadcast interface (DR election = DIS in IS-IS)
! Default for Ethernet - no change needed
```

## Verification Commands

```text
! Show IS-IS neighbors
Router# show isis neighbors

! Show IS-IS database
Router# show isis database verbose

! Show IPv6 routes from IS-IS
Router# show ipv6 route isis

! Show IS-IS IPv6 topology
Router# show isis ipv6 topology

! Show IS-IS interface metrics
Router# show clns interface GigabitEthernet0/0
```

## Sample Output

```text
Router# show isis neighbors

System Id      Type Interface   IP Address      State Holdtime Circuit Id
R2             L2   Gi0/0       10.0.0.2        UP    25       R2.01

Router# show ipv6 route isis

I2  2001:db8:2::/64 [115/20]
     via FE80::2, GigabitEthernet0/0

I2  2001:db8:3::/48 [115/30]
     via FE80::2, GigabitEthernet0/0
```

- `[115/20]` = [AD/metric] - IS-IS has AD 115 for IPv6

## Summary

Cisco IS-IS for IPv6 requires: setting a NET address, enabling `ipv6 unicast-routing`, entering `address-family ipv6`, and activating IS-IS on each interface with `ipv6 router isis`. Use `multi-topology` together with `metric-style wide` when you want separate IPv4/IPv6 topologies, and use `isis ipv6 metric` for distinct IPv6 path engineering in multitopology mode. Verify with `show isis neighbors`, `show isis database`, `show isis ipv6 topology`, and `show ipv6 route isis`.
