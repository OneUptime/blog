# How to Configure RA Guard on Cisco Switches

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RA Guard, Cisco, IPv6 Security, NDP Security, IOS, Catalyst

Description: Configure IPv6 RA Guard on Cisco Catalyst switches using IOS commands to protect host ports from rogue Router Advertisement attacks.

## Introduction

Cisco Catalyst switches support RA Guard as part of the IPv6 First Hop Security (FHS) feature set. RA Guard policies are created and then attached to interfaces or VLANs. Host-facing ports use a policy that drops RA messages, while uplink and router-facing ports use a policy that permits them. This guide covers configuration for Cisco IOS and IOS-XE.

## Basic RA Guard Configuration

Create policies for router ports and host ports, then apply them to interfaces.

```text
! Step 1: Create policy for host-facing ports (blocks RA)
ipv6 nd raguard policy HOST_POLICY
 device-role host

! Step 2: Create policy for router-facing ports (allows RA)
ipv6 nd raguard policy ROUTER_POLICY
 device-role router
 trusted-port

! Step 3: Apply to host-facing access ports
interface range GigabitEthernet1/0/1 - 23
 description Access ports - hosts connected
 ipv6 nd raguard attach-policy HOST_POLICY

! Step 4: Apply to uplink/router-facing ports
interface GigabitEthernet1/0/24
 description Uplink to distribution/router
 ipv6 nd raguard attach-policy ROUTER_POLICY

! Step 5: Apply to GigabitEthernet1/0/0 (if it connects to router)
interface GigabitEthernet1/0/0
 description Router port
 ipv6 nd raguard attach-policy ROUTER_POLICY
```

## Enhanced RA Guard Policy with Validation

Enhanced RA Guard policies can validate RA content in addition to port role.

```text
! Enhanced policy: validate RA content on router ports
ipv6 nd raguard policy ROUTER_VALIDATED
 device-role router
 trusted-port
 match ra prefix-list ALLOWED_PREFIXES
 match ipv6 access-list ROUTER_SOURCES

! Define allowed prefixes (what routers are allowed to advertise)
ipv6 prefix-list ALLOWED_PREFIXES permit 2001:db8::/64
ipv6 prefix-list ALLOWED_PREFIXES permit 2001:db8:1::/64

! Define allowed RA source addresses (router link-locals)
ipv6 access-list ROUTER_SOURCES
 permit ipv6 host fe80::1 any
 permit ipv6 host fe80::2 any

! Apply enhanced policy to uplink
interface GigabitEthernet1/0/24
 ipv6 nd raguard attach-policy ROUTER_VALIDATED
```

## VLAN-Based RA Guard Configuration

For switches with multiple VLANs, apply RA Guard at the VLAN level.

```text
! Apply RA Guard policy per VLAN (affects all ports in that VLAN)
vlan configuration 10
 ipv6 nd raguard attach-policy HOST_POLICY

vlan configuration 20
 ipv6 nd raguard attach-policy HOST_POLICY

! For VLAN that contains router connections:
vlan configuration 100
 ipv6 nd raguard attach-policy ROUTER_POLICY

! Note: Interface-level policy overrides VLAN-level policy
! If both are set, interface policy takes precedence
```

## Enabling IPv6 Snooping (Required for FHS)

RA Guard works best with IPv6 snooping enabled to build the binding table.

```text
! Enable IPv6 snooping globally (required for full FHS)
ipv6 snooping policy SNOOP_HOST
 security-level guard
 tracking enable

! Apply snooping to VLANs
vlan configuration 10
 ipv6 snooping attach-policy SNOOP_HOST

! Or apply snooping to interfaces
interface GigabitEthernet1/0/1
 ipv6 snooping attach-policy SNOOP_HOST

! IPv6 snooping builds the binding table:
! show ipv6 neighbor binding
```

## Verification Commands

Use these commands to confirm RA Guard is active and blocking correctly.

```text
! Show all RA Guard policies defined and where they are attached
show ipv6 nd raguard policy

! Show details for a specific policy (lists attached interfaces and VLANs)
show ipv6 nd raguard policy HOST_POLICY

! Show RA Guard counters (received, bridged, dropped per interface)
show ipv6 nd raguard counters

! Show binding table (built by IPv6 snooping)
show ipv6 neighbor binding

! Show snooping features and policies attached to interfaces/VLANs
show ipv6 snooping features
show ipv6 snooping policies

! Example output for host port:
! GigabitEthernet1/0/1
!   RA Guard policy: HOST_POLICY
!   Device role: HOST
!   RA messages received: 5
!   RA messages dropped: 5   ← All RAs blocked on host port
```

## Troubleshooting RA Guard

```text
! Enable RA Guard debug (use carefully in production)
debug ipv6 snooping raguard

! Check if RA is being dropped due to policy
show ipv6 nd raguard counters interface GigabitEthernet1/0/1

! Common issues:
!
! Issue 1: RA Guard not dropping RAs on host port
!   Check: Is policy attached to interface?
!   show run interface GigabitEthernet1/0/1 | include raguard
!
! Issue 2: Legitimate RA being blocked on uplink
!   Check: Is ROUTER_POLICY applied to uplink port?
!   Fix: Apply ROUTER_POLICY to uplink interface
!
! Issue 3: Extension header bypass (older IOS)
!   Symptom: Attacker uses fragmented RA to bypass guard
!   Fix: Upgrade IOS to version with deep inspection support
!   Workaround: ipv6 nd raguard attach-policy HOST_POLICY
!               with "drop-unsecured" keyword if supported

! Verify IOS version supports RA Guard
show version | include IOS
! IOS 15.0(1)SE or later recommended for full FHS support
```

## Complete Configuration Example

```text
! Complete RA Guard deployment for a Cisco access switch

! Global: enable IPv6 routing and FHS
ipv6 unicast-routing

! Define policies
ipv6 nd raguard policy HOST_RA_GUARD
 device-role host

ipv6 nd raguard policy ROUTER_RA_GUARD
 device-role router
 trusted-port

! Apply to all host-facing access ports
interface range GigabitEthernet1/0/1 - 23
 switchport mode access
 switchport access vlan 10
 ipv6 nd raguard attach-policy HOST_RA_GUARD
 spanning-tree portfast

! Apply to uplink port
interface GigabitEthernet1/0/24
 switchport mode trunk
 ipv6 nd raguard attach-policy ROUTER_RA_GUARD

! Enable snooping on access VLAN
vlan configuration 10
 ipv6 snooping attach-policy SNOOP_HOST
```

## Conclusion

Cisco RA Guard is configured through named policies with device roles (host or router) attached to switch interfaces. Host-facing ports block all RA messages while router-facing ports allow them through. Enhanced policies can validate RA content including source address and advertised prefixes. Always verify the configuration with `show ipv6 nd raguard policy` and confirm RAs are being dropped on host ports using statistics counters.
