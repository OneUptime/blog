# How to Verify IS-IS IPv6 Routes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IS-IS, IPv6, Routing Table, Verification, Networking

Description: Learn how to verify IS-IS IPv6 route installation on Cisco IOS, Juniper JunOS, and FRRouting, and interpret the routing table output.

## Cisco IOS Verification

```text
! Show installed IPv6 routes from IS-IS
Router# show ipv6 route isis

IPv6 Routing Table - default - 8 entries
Codes: C - Connected, L - Local, S - Static, U - Per-user Static route
       I1 - ISIS L1, I2 - ISIS L2, IA - ISIS interarea

I2  2001:db8:2::/64 [115/20]
     via FE80::2, GigabitEthernet0/0

I2  2001:db8:3::/48 [115/30]
     via FE80::2, GigabitEthernet0/0

! Route code meanings:
! I1 = IS-IS Level-1 route (intra-area)
! I2 = IS-IS Level-2 route (inter-area / backbone)
! IA = IS-IS interarea route
! [115/20] = [AD/metric]
```

## Checking a Specific Prefix

```text
Router# show ipv6 route 2001:db8:2::/64

Routing entry for 2001:DB8:2::/64
  Known via "isis", distance 115, metric 20, type level-2
  Route count is 1/1, share count 0
  Routing paths:
    FE80::2, via GigabitEthernet0/0
      Last updated 00:45:12 ago
```

## Juniper Junos OS Verification

```text
# Show IS-IS IPv6 routes

show route protocol isis table inet6.0

inet6.0: 8 destinations, 8 routes (8 active, 0 holddown, 0 hidden)
+ = Active Route, - = Last Active, * = Both

2001:db8:2::/64       *[IS-IS/18] 00:45:12, metric 20
                        > to 2001:db8:1::2 via ge-0/0/0.0
2001:db8:3::/48       *[IS-IS/18] 00:30:05, metric 30
                        > to 2001:db8:1::2 via ge-0/0/0.0

# IS-IS preference values on Juniper:
# L1 = 15, L2 = 18, L1 external = 160, L2 external = 165
```

## FRRouting Verification

```bash
# Show IS-IS IPv6 routes in vtysh
vtysh -c "show ipv6 route isis"

# Output:
# I>* 2001:db8:2::/64 [115/20] via fe80::2, eth0, weight 1, 00:45:12
# I>* 2001:db8:3::/48 [115/30] via fe80::2, eth0, weight 1, 00:30:05

# Verify routes are in the Linux kernel
ip -6 route show proto isis

# 2001:db8:2::/64 via fe80::2 dev eth0 proto isis metric 20
# 2001:db8:3::/48 via fe80::2 dev eth0 proto isis metric 20
# Note: The Linux kernel metric is not the IS-IS SPF cost shown in FRR.
```

## Checking IS-IS Topology

```text
! Cisco: Show the IS-IS IPv6 topology
Router# show isis ipv6 topology
```

```bash
# FRRouting: Show the IS-IS topology
vtysh -c "show isis topology"

# Juniper
show isis spf results topology ipv6-unicast
```

## Checking IS-IS Database for IPv6 Entries

```text
! Cisco: Show LSP database with IPv6 TLVs
Router# show isis database detail | include IPv6

! Output:
! Topology: IPv4 (0x0) IPv6 (0x2)
! IPv6 Address: 2001:db8:1::2
! Metric: 20   IPv6 (MT-IPv6) 2001:db8:2::/64
```

## Administrative Distance Comparison

| Platform | IS-IS IPv6 AD |
|----------|--------------|
| Cisco | 115 |
| Juniper | 15 (L1), 18 (L2) |
| FRRouting | 115 |

## Summary

IS-IS IPv6 routes show as `I1`/`I2`/`IA` on Cisco (AD=115), `IS-IS/15` or `IS-IS/18` on Juniper, and `I` with `>*` on FRRouting. Always check both the FRR routing table and the Linux kernel (`ip -6 route show proto isis`) to confirm full installation. Use `show isis database detail` to inspect the IPv6 reachability TLVs being advertised across the network.
