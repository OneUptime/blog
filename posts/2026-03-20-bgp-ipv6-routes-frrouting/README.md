# How to Verify BGP IPv6 Routes on FRRouting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, IPv6, FRRouting, Routing Table, Linux

Description: Learn the essential FRRouting vtysh commands to verify BGP IPv6 route installation, neighbor status, and prefix exchange on Linux.

## Overview

FRRouting provides a comprehensive set of `show bgp` commands via `vtysh` for verifying BGP IPv6 routes. Additionally, Linux `ip` commands confirm what has been installed in the kernel routing table.

## Primary Verification Commands

```bash
# BGP summary - all neighbors and prefix counts

vtysh -c "show bgp ipv6 unicast summary"

# Full BGP IPv6 table
vtysh -c "show bgp ipv6 unicast"

# BGP routes in the Linux kernel
ip -6 route show proto bgp
```

## show bgp ipv6 unicast summary

```text
Router# show bgp ipv6 unicast summary

BGP router identifier 1.1.1.1, local AS number 65001

Neighbor        V  AS     MsgRcvd  MsgSent  TblVer  InQ  OutQ  Up/Down  State/PfxRcd
2001:db8::peer  4  65002    3421     3418      15     0    0   1d02h    12
fe80::2%eth0    4  65003     100       98       8     0    0   0d01h    3
```

Sessions in `Active` or `Idle` state indicate session-establishment problems. Sessions showing a number in `State/PfxRcd` are established. FRR may also show `(Policy)` for an established eBGP session when default eBGP policy is enabled but filters are missing.

## show bgp ipv6 unicast (Full Table)

```text
Router# show bgp ipv6 unicast

BGP table version is 15, local router ID is 1.1.1.1
Status codes: s suppressed, d damped, h history, * valid, > best, = multipath,
              i internal, r RIB-failure, S Stale, R Removed

   Network                    Next Hop             Metric  LocPrf  Weight  Path
*> 2001:db8:mynet::/48        ::                        0           32768  i
*> 2001:db8:peer::/48         2001:db8::peer            0    100        0  65002 i
*i 2001:db8:ibgp::/48         2001:db8::ibgp            0    100        0  65004 i
```

Route codes:
- `*` = Valid
- `>` = Best path
- leading `i` = Internal/iBGP path
- `=` = ECMP multipath
- trailing `i` in the `Path` column = IGP origin

## Checking a Specific Prefix

```bash
# Show all paths for a specific prefix
vtysh -c "show bgp ipv6 unicast 2001:db8:peer::/48"

# Output:
# BGP routing table entry for 2001:db8:peer::/48
# Paths: (1 available, best #1, table default)
#   Advertised to non peer-group peers:
#   2001:db8:ibgp::2
#   65002
#     2001:db8::peer from 2001:db8::peer (2.2.2.2)
#       Origin IGP, metric 0, localpref 100, valid, external, best
#       Community: 65002:100
#       Last update: Fri Mar 20 10:00:00 2026
```

## Routes Advertised and Received

```bash
# Show routes advertised to a specific peer
vtysh -c "show bgp ipv6 unicast neighbor 2001:db8::peer advertised-routes"

# Show routes accepted from a specific peer after inbound policy
vtysh -c "show bgp ipv6 unicast neighbor 2001:db8::peer routes"

# Show received-routes before inbound policy (requires soft-reconfiguration inbound)
vtysh -c "show bgp ipv6 unicast neighbor 2001:db8::peer received-routes"
```

## Verifying Kernel Installation

```bash
# Check routes installed in the Linux kernel
ip -6 route show proto bgp

# Output:
# 2001:db8:peer::/48 via 2001:db8::peer dev eth0 proto bgp metric 20
# 2001:db8:remote::/48 via 2001:db8::ibgp dev eth1 proto bgp metric 200

# If a route is in FRR BGP table but not here, check for:
# - RIB failure (r flag in show bgp output)
# - Route preference conflict with static or kernel route
```

## RIB Failures

```bash
# FRR marks RIB failures with an "r" in the status-code field
vtysh -c "show bgp ipv6 unicast"
```

## Summary

FRRouting BGP IPv6 verification uses `show bgp ipv6 unicast summary` for session health and `show bgp ipv6 unicast` for the full route table. Combine with `ip -6 route show proto bgp` to confirm kernel installation. Watch for `r` (RIB failure) and a leading `i` on internal/iBGP paths, and use `advertised-routes`, `routes`, and `received-routes` per neighbor to debug specific exchange issues.
