# How to Verify OSPFv3 Routing Table on Cisco

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSPFv3, Cisco, IPv6, Routing Table, IOS

Description: Learn the commands to verify OSPFv3 routes in the Cisco IOS routing table and interpret the output to confirm correct route installation.

## Overview

After configuring OSPFv3, verifying that routes are correctly installed in the routing table is critical. Cisco IOS provides several commands to inspect OSPFv3 learned routes and their associated metrics.

## Primary Verification Commands

```text
! Show all IPv6 routes learned via OSPFv3
Router# show ipv6 route ospf

! Show all IPv6 routes including OSPFv3
Router# show ipv6 route

! Show only OSPFv3 with detailed information
Router# show ospfv3 route
```

## Interpreting the show ipv6 route ospf Output

```text
Router# show ipv6 route ospf

IPv6 Routing Table - default - 6 entries
Codes: C - Connected, L - Local, S - Static, U - Per-user Static route
       O - OSPF Intra, OI - OSPF Inter, OE1 - OSPF ext 1, OE2 - OSPF ext 2

O   2001:db8:1::/48 [110/20]
     via FE80::2, GigabitEthernet0/0
O   2001:db8:2::/48 [110/30]
     via FE80::3, GigabitEthernet0/1
OI  2001:db8:3::/48 [110/50]
     via FE80::2, GigabitEthernet0/0
OE2 2001:db8:ext::/48 [110/20]
     via FE80::2, GigabitEthernet0/0
```

Code meanings:
- **O** = OSPF Intra-area route (same area as this router)
- **OI** = OSPF Inter-area route (from another area via ABR)
- **OE1** = OSPF External type 1 (metric adds OSPF internal cost)
- **OE2** = OSPF External type 2 (flat external metric, default)

## Understanding the Metric

The metric shown in brackets is `[AD/cost]`:
- `110` = Administrative distance for OSPF
- `20` = OSPFv3 path cost

Path cost is the sum of interface costs along the path. Default interface cost = `10^8 / bandwidth`. For 1 Gbps: cost = 1.

## Show OSPFv3 Route Detail

```text
! Show OSPFv3 internal route table (before kernel install)
Router# show ospfv3 route

OSPFv3 1 address-family ipv6 (router-id 1.1.1.1)

Codes: * - Best, > - Installed

*>  2001:db8:1::/48, Intra, cost 20, area 0
        via FE80::2, GigabitEthernet0/0
*>  2001:db8:2::/48, Intra, cost 30, area 0
        via FE80::3, GigabitEthernet0/1
```

## Verifying a Specific Route

```text
! Check if a specific prefix is in the routing table
Router# show ipv6 route 2001:db8:1::/48

Routing entry for 2001:DB8:1::/48
  Known via "ospf 1", distance 110, metric 20, type intra area
  Last update from FE80::2 on GigabitEthernet0/0, 00:05:32 ago
  Routing Descriptor Blocks:
  * FE80::2, from FE80::2, via GigabitEthernet0/0
      Route metric is 20, traffic share count is 1
```

## Checking ECMP Routes

```text
! Two ECMP OSPFv3 paths to same destination
Router# show ipv6 route ospf

O   2001:db8:1::/48 [110/20]
     via FE80::2, GigabitEthernet0/0
     via FE80::3, GigabitEthernet0/1  ← Both installed (ECMP)
```

## Debugging OSPFv3 Route Installation

```text
! Enable debugging for SPF calculation
Router# debug ospfv3 spf

! Debug route redistribution
Router# debug ospfv3 redistribute

! Clear OSPFv3 process and force route recalculation
Router# clear ipv6 ospf process
```

## Summary

On Cisco, `show ipv6 route ospf` is the primary command to verify OSPFv3 routes. Look for O (intra-area), OI (inter-area), and OE1/OE2 (external) route codes. The metric format is `[110/cost]` where 110 is the OSPF administrative distance. Use `show ospfv3 route` for the internal OSPF routing table before kernel installation.
