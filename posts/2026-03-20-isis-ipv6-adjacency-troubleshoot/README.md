# How to Troubleshoot IS-IS IPv6 Adjacency Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IS-IS, IPv6, Troubleshooting, Adjacency, Networking

Description: Learn how to diagnose and resolve IS-IS adjacency failures in IPv6 environments, covering NET mismatches, authentication issues, and TLV problems.

## Overview

IS-IS adjacency failures prevent IPv6 routes from being exchanged. Common causes include: NET address area mismatch, IS-IS level mismatch, authentication issues, MTU mismatch, and missing `family iso` on interfaces (Juniper).

## Step 1: Check Neighbor State

```text
! Cisco
Router# show isis neighbors

System Id      Type Interface   IP Address    State  Holdtime Circuit Id
R2             L2   Gi0/0       10.0.0.2      UP        22     R2.01

! State should be "UP" - "Init" means one-way Hello, "DOWN" means no contact
```

```bash
# FRRouting

vtysh -c "show isis neighbor"

# State values:
# UP = Adjacency formed
# Initial = Received Hellos but not established
# Down = No adjacency
```

## Step 2: Verify IS-IS is Enabled on the Interface

```text
! Cisco
Router# show clns interface GigabitEthernet0/0
! Verify the interface is participating in IS-IS
! In Cisco single-topology deployments, also verify `ipv6 router isis <tag>` is present on both sides

! If IPv6 IS-IS is missing on the interface:
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ipv6 router isis area2    ! Enable IPv6 IS-IS
```

## Step 3: Check IS-IS Level Compatibility

Both sides must share at least one common IS-IS level:

```text
! Cisco: Check configured level
Router# show clns protocol
! Routers can form adjacency if they share a common level
! Example: L1-L2 can peer with L1-only or L2-only

! Mismatch example:
! Router A: is-type level-2-only
! Router B: is-type level-1-only
! → These will NOT form adjacency (different levels)
```

## Step 4: Verify NET Address (Area Match for L1)

For Level-1 adjacency, both routers must be in the same area:

```text
! Router A NET: 49.0001.0000.0000.0001.00 → Area 49.0001
! Router B NET: 49.0002.0000.0000.0002.00 → Area 49.0002
! These cannot form a Level-1 adjacency (different areas)
! For Level-2 only: area difference is acceptable
```

## Step 5: Check Authentication

```text
! Cisco: Verify authentication settings on the interface
Router# show clns interface GigabitEthernet0/0
! If authentication is configured on one side but not the other → adjacency fails

! Check the configured password or key chain on both sides
Router# show running-config interface GigabitEthernet0/0
```

## Step 6: Check MTU

IS-IS Hellos and LSPs must fit within the real path MTU:

```text
! Cisco: Check interface MTU
Router# show clns interface GigabitEthernet0/0 | include MTU
! On many platforms, IS-IS Hellos are padded to the interface MTU by default
! If padded Hellos exceed the real path MTU, adjacency can fail

! Fix: increase MTU or disable Hello padding if appropriate
Router(config-if)# no isis hello padding always
```

## Step 7: Verify family iso on Juniper

Juniper requires `family iso` on interfaces for IS-IS:

```text
# Check if family iso is configured
show configuration interfaces ge-0/0/0 unit 0 | display set | match "family iso"

# If missing:
set interfaces ge-0/0/0 unit 0 family iso
```

## Step 8: Capture IS-IS Hellos

```bash
# Capture IS-IS PDUs (direct Layer 2, not IP)
sudo tcpdump -i eth0 -n "isis"

# With verbose IS-IS decode
sudo tshark -i eth0 -Y "isis" -V | grep -A 5 "Hello"

# Look for:
# - Hello PDUs from neighbor
# - Source MAC and System ID in PDU
# - Area address in PDU (must match for L1)
```

## IS-IS Adjacency Troubleshooting Matrix

| Symptom | Cause | Fix |
|---------|-------|-----|
| No IS-IS PDUs | Interface not participating in IS-IS | Enable IS-IS on the interface; for Cisco single-topology IPv6 use `ipv6 router isis <tag>` |
| Init state only | One-way Hello | Check authentication, MTU, area address |
| Level mismatch | Different is-type config | Match is-type on both sides |
| Area mismatch (L1) | Different area in NET | Change NET to same area for L1 peers |
| Auth failure | Password or key-chain mismatch | Verify authentication mode and secret match on both sides |
| family iso missing | Juniper only | Add `family iso` to interface unit |

## Summary

IS-IS IPv6 adjacency failures are usually caused by: level mismatch, area address mismatch for L1 adjacencies, authentication mismatch, MTU and Hello-padding issues, or (on Juniper) missing `family iso` on the interface. Use `show isis neighbors` or `show isis neighbor` for state, tcpdump with `isis` for raw PDU capture, and check authentication and level settings match on both sides.
