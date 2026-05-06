# How to Verify BGP IPv6 Routes on Cisco

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, IPv6, Cisco, Routing Table, Verification

Description: Learn the essential Cisco IOS commands to verify BGP IPv6 route installation, neighbor state, and prefix advertisement.

## Overview

Verifying BGP IPv6 routes on Cisco IOS involves checking the BGP table, the IPv6 routing table, neighbor state, and route advertisements. This guide covers the key commands and how to interpret their output.

## Primary Verification Commands

```text
! Overview of all BGP IPv6 neighbors and prefix counts
Router# show bgp ipv6 unicast summary

! Show all prefixes in the BGP IPv6 table
Router# show bgp ipv6 unicast

! Show the IPv6 routing table filtered to BGP routes
Router# show ipv6 route bgp

! Show BGP IPv6 neighbor details
Router# show bgp ipv6 unicast neighbors <peer-address>
```

## Interpreting show bgp ipv6 unicast summary

```text
Router# show bgp ipv6 unicast summary

BGP router identifier 1.1.1.1, local AS number 65001
BGP table version is 15, main routing table version 15

Neighbor        V   AS     MsgRcvd  MsgSent  TblVer  InQ  OutQ  Up/Down  State/PfxRcd
2001:db8::2     4   65002   3421     3418      15     0    0   1d02h    12
2001:db8::3     4   65001   2100     2098      15     0    0   5d10h    8
```

- **TblVer** = last BGP table version sent to that neighbor; if it lags the main BGP table version, updates may still be pending
- **PfxRcd** = prefixes received from this neighbor; `Idle` or `Active` = session not established

## Interpreting show bgp ipv6 unicast

```text
Router# show bgp ipv6 unicast

   Network                    Next Hop             Metric  LocPrf  Weight  Path
*> 2001:db8:1::/48            ::                         0          32768  i
*> 2001:db8:100::/48          2001:db8::2                0              0  65002 i
*  2001:db8:200::/48          2001:db8::4                0    100       0  65003 i
*> 2001:db8:200::/48          2001:db8::2                0    200       0  65002 65003 i
```

Route codes:
- `*` = Valid route
- `>` = Best path selected by BGP
- Leading `i` = iBGP learned
- Path `i` at end = IGP origin

## Checking a Specific Prefix

```text
Router# show bgp ipv6 unicast 2001:db8:100::/48

BGP routing table entry for 2001:DB8:100::/48, version 8
Paths: (1 available, best #1, table default)
  Not advertised to any peer
  65002
    2001:db8::2 from 2001:db8::2 (2.2.2.2)
      Origin IGP, metric 0, localpref 100, valid, external, best
      Community: 65002:100
      Last update: 01:23:45
```

## Routes Advertised to a Specific Peer

```text
Router# show bgp ipv6 unicast neighbors 2001:db8::2 advertised-routes

   Network                    Next Hop             Metric  LocPrf  Weight  Path
*> 2001:db8:1::/48            2001:db8:0:1::1          0          32768  i
*> 2001:db8:2::/48            2001:db8:0:1::1          0          32768  i

Total number of prefixes 2
```

## Accepted Routes from a Peer

```text
Router# show bgp ipv6 unicast neighbors 2001:db8::2 routes

   Network                    Next Hop             Metric  LocPrf  Weight  Path
*> 2001:db8:100::/48          2001:db8::2                0    100       0  65002 i
```

## BGP IPv6 in the Routing Table

```text
Router# show ipv6 route bgp

B   2001:db8:100::/48 [20/0]
     via 2001:db8::2, GigabitEthernet0/0, 01:23:45
B   2001:db8:300::/48 [200/0]
     via 2001:db8::3, updated 05:10:22
```

- `[20/0]` = Administrative distance 20 (eBGP) / metric 0
- `[200/0]` = Administrative distance 200 (iBGP) / metric 0

## Summary

On Cisco, `show bgp ipv6 unicast summary` gives a quick health check. `show bgp ipv6 unicast` shows the full BGP table with best-path selection. `show ipv6 route bgp` confirms which routes are installed in the IPv6 routing table. Use `advertised-routes` and `routes` per-neighbor to debug specific advertisement issues.
