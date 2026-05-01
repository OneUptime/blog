# How to Verify EIGRPv6 Routes on Cisco

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: EIGRPv6, Cisco, IPv6, Routing Table, Verification

Description: Learn the Cisco IOS commands to verify EIGRPv6 route installation, topology table entries, and successor/feasible successor information.

## Overview

EIGRPv6 verification involves checking three data structures: the neighbor table, the topology table, and the routing table. Each reveals different information about the routing state.

## Primary Verification Commands

```text
! Show IPv6 routing protocol processes (including EIGRPv6)
Router# show ipv6 protocols

! Show neighbor table
Router# show ipv6 eigrp neighbors

! Show topology table (feasible successors by default; use all-links for non-feasible paths)
Router# show ipv6 eigrp topology

! Show EIGRPv6 routes in the IPv6 routing table
Router# show ipv6 route eigrp
```

## Interpreting show ipv6 eigrp neighbors

```text
Router# show ipv6 eigrp neighbors

IPv6-EIGRP neighbors for process 1
H   Address               Interface   Hold  Uptime   SRTT  RTO  Q  Seq Num
0   Link-local address:               14  01:23:45   8    200  0  42
    FE80::2               Gi0/0
1   Link-local address:               11  00:45:12   12   200  0  35
    FE80::3               Gi0/1
```

- **H** = Neighbor handle number
- **Hold** = Seconds remaining before neighbor is declared dead
- **SRTT** = Smooth Round-Trip Time in ms
- **RTO** = Retransmission Timeout in ms
- **Q** = Queue count (should be 0 in stable state)

## Interpreting show ipv6 eigrp topology

```text
Router# show ipv6 eigrp topology

IPv6-EIGRP Topology Table for AS(1)/ID(1.1.1.1)

Codes: P - Passive, A - Active, U - Update, Q - Query, R - Reply,
       r - reply Status, s - sia Status

P 2001:DB8:1::/48, 1 successors, FD is 28160
        via FE80::2 (28160/25600), Gi0/0       ← Successor
        via FE80::3 (30720/25600), Gi0/1       ← Feasible Successor

P 2001:DB8:2::/48, 1 successors, FD is 30720
        via FE80::3 (30720/28160), Gi0/1       ← Only Successor (no FS)
```

- **P** = Passive (route is stable, not in DUAL query)
- **A** = Active (DUAL is computing the route - should resolve quickly)
- **FD** = Feasible Distance (best metric to reach this destination)
- **via FE80::2 (28160/25600)** = (Metric through this neighbor / neighbor's metric)
- A route is a **Feasible Successor** if its RD (reported distance) < FD of the Successor

## Interpreting show ipv6 route eigrp

```text
Router# show ipv6 route eigrp

D   2001:DB8:1::/48 [90/28160]
     via FE80::2, GigabitEthernet0/0   ← Best path (Successor)
D   2001:DB8:2::/48 [90/30720]
     via FE80::3, GigabitEthernet0/1
EX  2001:DB8:E::/48 [170/30720]        ← External EIGRP route
     via FE80::2, GigabitEthernet0/0
```

- **D** = EIGRP internal route (AD = 90)
- **EX** = EIGRP external route (AD = 170)
- **[90/28160]** = [Administrative distance / composite metric]

## Verifying Feasible Successors (Fast Failover)

```text
Router# show ipv6 eigrp topology 2001:DB8:1::/48

IPv6-EIGRP (AS 1): Topology entry for 2001:DB8:1::/48
  State is Passive, Query origin flag is 1, 1 Successor(s), FD is 28160

  Routing Descriptor Blocks:
  FE80::2 (GigabitEthernet0/0), from FE80::2, Send flag is 0x0
      Composite metric is (28160/25600), Route is Internal
      Minimum bandwidth in path is 1000000 Kbit, Total delay is 25 microseconds

  FE80::3 (GigabitEthernet0/1), from FE80::3, Send flag is 0x0
      Composite metric is (30720/25600), Route is Internal
      Feasible Successor. FD is 28160
      ↑ This is a Feasible Successor - will be used immediately if primary fails
```

## Summary

EIGRPv6 verification uses three tables: `show ipv6 eigrp neighbors` for adjacency state, `show ipv6 eigrp topology` for successor and Feasible Successor paths by default, and `show ipv6 route eigrp` for installed routes. Use `show ipv6 eigrp topology all-links` when you need to inspect non-feasible alternatives as well. Always check the topology table to confirm Feasible Successors exist for critical routes - their presence enables instant failover without DUAL queries.
