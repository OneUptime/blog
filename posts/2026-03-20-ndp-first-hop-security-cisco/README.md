# How to Configure IPv6 First Hop Security on Cisco IOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: First Hop Security, Cisco, IPv6 Security, IOS, Catalyst, RA Guard

Description: Deploy the complete IPv6 First Hop Security suite on Cisco IOS switches, including RA Guard, DHCPv6 Guard, IPv6 Snooping, and IPv6 Source Guard with step-by-step configuration.

## Introduction

Cisco IOS implements IPv6 First Hop Security (FHS) as a coordinated set of features built on the IPv6 Snooping binding table. The four components - RA Guard, DHCPv6 Guard, IPv6 Snooping, and IPv6 Source Guard - work together to protect IPv6 networks from first-hop attacks. This guide provides a complete, production-ready configuration for Cisco Catalyst switches running IOS 15.0 or later.

## Prerequisites and Requirements

```text
Cisco FHS Requirements:

Hardware:
  - Cisco Catalyst 2960-S/X, 3560/3750, 3850, 9xxx series
  - Hardware support for FHS (most modern Catalyst platforms)

Software:
  - IOS 15.0(1)SE or later for basic FHS
  - IOS 15.2(1)E or later for complete Source Guard support
  - IOS-XE 3.x or later (Catalyst 3850/9xxx)

Requirements:
  - IPv6 must be enabled: ipv6 unicast-routing
  - SDM template must include IPv6: sdm prefer dual-ipv4-and-ipv6 default
  - Reload may be required after SDM change
```

## Step 1: Enable IPv6 and Verify SDM Template

```text
! Check current SDM template
show sdm prefer

! If not IPv6-capable, change SDM template:
sdm prefer dual-ipv4-and-ipv6 default
! Save and reload:
write memory
reload

! After reload: enable IPv6 routing
ipv6 unicast-routing

! Verify
show ipv6 general-prefix
```

## Step 2: Configure RA Guard

```text
! RA Guard policies
ipv6 nd raguard policy FHS_HOST_RA
 device-role host
!
ipv6 nd raguard policy FHS_ROUTER_RA
 device-role router
 trusted-port
```

## Step 3: Configure DHCPv6 Guard

```text
! DHCPv6 Guard policies
ipv6 dhcp guard policy FHS_HOST_DHCP
 device-role client
!
ipv6 dhcp guard policy FHS_SERVER_DHCP
 device-role server
```

## Step 4: Configure IPv6 Snooping

```text
! IPv6 Snooping policy (ND Inspection + binding table)
ipv6 snooping policy FHS_SNOOP
 security-level guard
 tracking enable
 limit address-count 10
!
! Trusted snooping policy for uplink/router ports
ipv6 snooping policy FHS_SNOOP_TRUSTED
 trusted-port
 device-role node
!
! Snooping for VLAN 10
vlan configuration 10
 ipv6 snooping attach-policy FHS_SNOOP
!
vlan configuration 20
 ipv6 snooping attach-policy FHS_SNOOP
```

## Step 5: Configure IPv6 Source Guard

```text
! IPv6 Source Guard policy
ipv6 source-guard policy FHS_SRC_GUARD
 deny global-autoconf
!
! Note: Source Guard must be applied AFTER binding table is populated
! See Step 7 for deployment order
```

## Step 6: Apply Policies to Interfaces

```text
! Apply all FHS policies to access (host) ports
interface range GigabitEthernet1/0/1 - 23
 description Access ports - FHS protected
 switchport mode access
 switchport access vlan 10
 ! Apply RA Guard (host role)
 ipv6 nd raguard attach-policy FHS_HOST_RA
 ! Apply DHCPv6 Guard (client role)
 ipv6 dhcp guard attach-policy FHS_HOST_DHCP
 ! Apply snooping (already on VLAN, interface override if needed)
 ! Apply Source Guard (add after binding table built)
 ! ipv6 source-guard attach-policy FHS_SRC_GUARD  ← Add last
 spanning-tree portfast
!
! Apply policies to uplink/router port
interface GigabitEthernet1/0/24
 description Uplink - FHS trusted
 switchport mode trunk
 ipv6 nd raguard attach-policy FHS_ROUTER_RA
 ipv6 dhcp guard attach-policy FHS_SERVER_DHCP
 ipv6 snooping attach-policy FHS_SNOOP_TRUSTED
```

## Step 7: Deploy Source Guard After Binding Table Populated

```text
! Wait for binding table to populate (allow 30+ minutes for hosts to connect)
show ipv6 neighbor binding

! Verify all active hosts have binding table entries
! Expected: Each active host has entries for link-local + global addresses

! Add static entries for any hosts not auto-learned
ipv6 neighbor binding vlan 10 2001:db8::1 \
  interface GigabitEthernet1/0/5 0011.2233.4455

! Only after binding table is complete, enable Source Guard
interface range GigabitEthernet1/0/1 - 23
 ipv6 source-guard attach-policy FHS_SRC_GUARD
```

## Verification Commands

```text
! List active FHS features and all attached snooping policies
show ipv6 snooping features
show ipv6 snooping policies

! Verify RA Guard policy and where it is attached
show ipv6 nd raguard policy FHS_HOST_RA
show ipv6 nd raguard policy FHS_ROUTER_RA
show ipv6 nd raguard counters interface GigabitEthernet1/0/1

! Verify DHCPv6 Guard policy
show ipv6 dhcp guard policy FHS_HOST_DHCP
show ipv6 dhcp guard policy FHS_SERVER_DHCP

! Verify snooping policy and binding table
show ipv6 snooping policy FHS_SNOOP
show ipv6 snooping counters interface GigabitEthernet1/0/1
show ipv6 neighbor binding
show ipv6 neighbor binding count

! Verify Source Guard policy
show ipv6 source-guard policy FHS_SRC_GUARD
show ipv6 snooping policies interface GigabitEthernet1/0/1

! Example output summary:
! FHS Features Active:
!   RA Guard:       Applied to 23 interfaces (host role)
!                   Applied to 1 interface (router role)
!   DHCPv6 Guard:   Applied to 23 interfaces (client role)
!                   Applied to 1 interface (server role)
!   IPv6 Snooping:  Applied to VLANs 10, 20
!   Source Guard:   Applied to 23 interfaces
!   Binding Table:  47 entries
```

## Troubleshooting

```text
! Problem: Hosts lose connectivity after enabling Source Guard
! Cause: Binding table incomplete when Source Guard was enabled
! Fix:
!   1. Remove Source Guard from affected interfaces temporarily
!      no ipv6 source-guard attach-policy FHS_SRC_GUARD
!   2. Let hosts reconnect and populate binding table
!   3. Verify: show ipv6 neighbor binding
!   4. Re-add Source Guard

! Problem: Legitimate RA being dropped
! Check: show ipv6 nd raguard policy FHS_ROUTER_RA
!        show ipv6 snooping counters interface GigabitEthernet1/0/24
! Fix: Ensure ROUTER policy is applied to uplink port, not HOST policy

! Problem: DHCPv6 clients not getting addresses
! Check: show ipv6 dhcp guard policy FHS_SERVER_DHCP
!        show ipv6 snooping counters interface GigabitEthernet1/0/24
! Fix: Apply SERVER_DHCP policy to DHCP server/relay port

! Enable debug (use carefully in production)
debug ipv6 snooping raguard
debug ipv6 snooping
```

## Conclusion

Complete Cisco IPv6 First Hop Security deployment requires all four components: RA Guard, DHCPv6 Guard, IPv6 Snooping, and IPv6 Source Guard. Deploy in order - RA Guard and DHCPv6 Guard first (immediate benefit, no risk), then Snooping (builds binding table), then Source Guard (only after binding table is populated). Use `show ipv6 snooping features` and `show ipv6 snooping policies` to verify all features are active, and `show ipv6 neighbor binding` plus `show ipv6 snooping counters` to confirm the protection is functioning.
