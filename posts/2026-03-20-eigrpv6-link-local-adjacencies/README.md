# How to Understand EIGRPv6 Link-Local Address Adjacencies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: EIGRPv6, IPv6, Link-Local, Adjacency, Cisco

Description: Understand how EIGRPv6 uses IPv6 link-local addresses for neighbor adjacencies and what this means for routing table next hops.

## Overview

Like OSPFv3, EIGRPv6 uses IPv6 link-local addresses (fe80::/10) for all neighbor communication. This means EIGRPv6 adjacencies are independent of global IPv6 address assignment, providing stability during renumbering events.

## Why Link-Local Addresses in EIGRPv6

EIGRPv6 sends Hello packets to the ff02::a (All EIGRP routers) multicast address from the interface's link-local address. This has several advantages:
1. Adjacencies form even before global addresses are assigned
2. Renumbering the global prefix doesn't break existing adjacencies
3. Link-local addresses are always present on IPv6-enabled interfaces

## Verifying Link-Local Adjacencies

```text
! Show EIGRPv6 neighbors - link-local addresses are shown
Router# show ipv6 eigrp neighbors

IPv6-EIGRP neighbors for process 1
H   Address               Interface      Hold  Uptime   SRTT   RTO  Q  Seq Num
0   Link-local address:                  11  01:23:45   8     200  0  42
    FE80::2               Gi0/0
1   Link-local address:                  14  00:45:12   12    200  0  35
    FE80::3               Gi0/1
```

## Link-Local Addresses in the Routing Table

Routes installed by EIGRPv6 use link-local next hops:

```text
Router# show ipv6 route eigrp

D   2001:DB8:2::/48 [90/30720]
     via FE80::2, GigabitEthernet0/0   ← Link-local next hop
D   2001:DB8:3::/48 [90/35840]
     via FE80::3, GigabitEthernet0/1
```

The `via FE80::2` notation with the interface name `GigabitEthernet0/0` is the standard format for link-local next hops.

## Verifying Link-Local Address on Interface

```text
! Ensure the interface has a link-local address
Router# show ipv6 interface GigabitEthernet0/0 | include link-local
  IPv6 is enabled, link-local address is FE80::1

! If no link-local address:
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ipv6 enable   ! This forces link-local address assignment
```

## Static Link-Local Address (Predictable Adjacency)

For easier troubleshooting, assign a predictable link-local address:

```text
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ipv6 address FE80::1 link-local   ! Set specific link-local address
```

## Troubleshooting Link-Local Adjacency Failure

```text
! Step 1: Verify link-local address exists
Router# show ipv6 interface GigabitEthernet0/0 | include link-local

! Step 2: Verify multicast group membership for ff02::a
Router# show ipv6 interface GigabitEthernet0/0 | include ff02::a

! Step 3: Capture EIGRP Hellos
! In production, use SPAN/RSPAN to capture on the interface

! Step 4: Check for firewall blocking protocol 88
! EIGRPv6 uses IP protocol 88 - not TCP/UDP

! Step 5: Verify hello/hold timer settings
Router# show ipv6 eigrp interfaces detail
! Check: Hello/Hold timers do not have to match, but they should be set appropriately for the link
```

## EIGRPv6 Multicast Addresses

| Address | Purpose |
|---------|---------|
| `ff02::a` | All EIGRP routers (Hello packets and other multicast EIGRP packets sent on the link) |

EIGRPv6 also uses unicast for neighbor-specific packets such as Acknowledgments and Replies. Updates can be either unicast or multicast, depending on the event.

## Summary

EIGRPv6 uses link-local addresses for all neighbor adjacency communication, just like OSPFv3. Routes installed by EIGRPv6 include link-local next hops with explicit interface references. Always verify that interfaces have link-local addresses (`ipv6 enable`) and that IP protocol 88 is not blocked by ACLs or firewall rules.
