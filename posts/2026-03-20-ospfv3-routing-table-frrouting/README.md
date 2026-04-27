# How to Verify OSPFv3 Routing Table on FRRouting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSPFv3, FRRouting, IPv6, Routing Table, Linux

Description: Learn how to verify OSPFv3 routes on Linux with FRRouting using vtysh commands and confirm correct installation in the Linux kernel routing table.

## Overview

On FRRouting, OSPFv3 verification happens at two levels: the FRR routing daemon's internal table (via `vtysh`) and the Linux kernel routing table (via `ip -6 route`). Both must be checked to confirm routes are properly installed.

## Checking OSPFv3 Routes in vtysh

```bash
# Connect to the FRR CLI

vtysh

# Show all IPv6 routes including OSPFv3
show ipv6 route

# Show only OSPFv3 routes
show ipv6 route ospf

# Show OSPFv3 internal route table
show ipv6 ospf route
```

## Sample Output

```text
Router# show ipv6 route ospf

Codes: K - kernel route, C - connected, S - static, R - RIPng, O - OSPFv3,
       I - IS-IS, B - BGP, N - NHRP, T - Table, v - VNC, V - VNC-Direct

O>* 2001:db8:1::/48 [110/20] via fe80::2, eth0, 00:05:32
O>* 2001:db8:2::/48 [110/30] via fe80::3, eth1, 00:08:10
O>  2001:db8:3::/48 [110/50] via fe80::2, eth0, 00:02:15
```

Code meanings:
- `O` = OSPFv3 route
- `>` = Best path (selected for forwarding)
- `*` = Route installed in the kernel

The `>*` combination means the route is both selected by FRR and installed in the Linux kernel.

## Verifying Routes in the Kernel

```bash
# Exit vtysh and check the kernel routing table
ip -6 route show proto ospf

# Output:
# 2001:db8:1::/48 via fe80::2 dev eth0 proto ospf metric 20
# 2001:db8:2::/48 via fe80::3 dev eth1 proto ospf metric 30
```

If a route appears in `show ipv6 route ospf` in vtysh but not in `ip -6 route`, there may be a Zebra (FRR's RIB manager) issue.

## Detailed Route Information

```bash
# Show detail for a specific prefix
vtysh -c "show ipv6 route 2001:db8:1::/48"

# Sample output:
# Routing entry for 2001:db8:1::/48
#   Known via "ospf6", distance 110, metric 20, best
#   Last update 00:05:32 ago
#   * fe80::2, via eth0

# Show OSPFv3 route database detail
vtysh -c "show ipv6 ospf route detail"
```

## Intra-Area vs Inter-Area Routes

```bash
# FRRouting distinguishes route types in the OSPFv3 route table
vtysh -c "show ipv6 ospf route"

# Route types (destination type N = network, followed by path-type code):
# N IA - Intra-area network route (within the same area)
# N IE - Inter-area network route (from another area via ABR)
# N E1 / N E2 - External type 1 or type 2 (redistributed routes)
```

## Checking ECMP Installation

```bash
# If multiple ECMP paths exist
vtysh -c "show ipv6 route 2001:db8:1::/48"
# Should show multiple nexthops

# Kernel ECMP check
ip -6 route show 2001:db8:1::/48
# 2001:db8:1::/48 metric 20
#     nexthop via fe80::2 dev eth0 weight 1
#     nexthop via fe80::3 dev eth1 weight 1
```

## Debugging Route Installation

```bash
# Enable route installation debugging in FRR
vtysh
configure terminal
 log stdout debugging
end

# Watch Zebra route install messages
journalctl -u frr -f | grep "zebra\|ospf6\|route"

# Restart Zebra if routes are not being installed
systemctl restart frr
```

## Summary

Verify FRRouting OSPFv3 routes with `show ipv6 route ospf` in vtysh (look for `>*` indicating best path and kernel installation) and confirm with `ip -6 route show proto ospf` in the shell. Routes showing `>` but not `*` indicate kernel installation failure - check Zebra logs and kernel forwarding settings.
