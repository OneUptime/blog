# How to Understand Administrative Distance in Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Routing, IPv4, Cisco, FRRouting

Description: Learn what administrative distance is, how it determines which routing protocol's routes are installed in the routing table, and how to view and modify it.

## What Is Administrative Distance?

Administrative Distance (AD) is a value that indicates the **trustworthiness of a route source**. When the same prefix is learned from multiple sources, the route with the **lowest AD** is installed in the routing table.

Think of AD as the tiebreaker when multiple sources know about the same network.

## Default Administrative Distances (Cisco IOS)

| Route Source | Default AD |
|-------------|-----------|
| Connected interface | 0 |
| Static route | 1 |
| BGP (eBGP) | 20 |
| OSPF | 110 |
| IS-IS | 115 |
| RIP | 120 |
| BGP (iBGP) | 200 |
| Unknown | 255 |

**Lower AD = More trusted = Installed in routing table**

## FRRouting Administrative Distances

FRRouting uses similar defaults for these common route sources:

| Route Source | FRR Default AD |
|-------------|--------------|
| Connected | 0 |
| Static | 1 |
| eBGP | 20 |
| OSPF | 110 |
| RIP | 120 |
| iBGP | 200 |

## Why AD Matters

**Scenario**: A router learns 10.0.0.0/24 from both OSPF (AD 110) and RIP (AD 120):

```text
OSPF route: 10.0.0.0/24 via 192.168.1.2 [AD 110]
RIP route:  10.0.0.0/24 via 192.168.1.3 [AD 120]

→ OSPF route is installed (lower AD = more trusted)
→ RIP route remains available as a backup route
```

If OSPF fails, RIP's route can be installed.

## AD vs Metric

These are commonly confused:

| Concept | Scope | Purpose |
|---------|-------|---------|
| Administrative Distance | Between route sources | Which route source's route to install |
| Metric | Within a protocol | Which path within a protocol to use |

Metric is only compared **within the same protocol**. AD determines which route source wins.

## Floating Static Routes

A common use of AD: create a static route that only activates when the dynamic protocol fails:

```cisco
! OSPF learns 10.0.0.0/24 with AD 110
! This static route with AD 115 only activates if OSPF fails
ip route 10.0.0.0 255.255.255.0 192.168.1.254 115
```

In FRRouting:

```text
ip route 10.0.0.0/24 192.168.1.254 115
```

## Viewing AD on Cisco

```cisco
show ip route
! Output:
!   O    10.0.0.0 [110/20] via 192.168.1.2
!                  ↑   ↑
!                 AD  Metric
```

## Viewing Routes on Linux/FRRouting

```bash
# FRRouting shows AD in brackets

vtysh -c "show ip route"

# Sample output:
# O   10.0.0.0/24 [110/20] via 192.168.1.2, eth1, 00:30:10
# R   10.1.0.0/24 [120/2] via 192.168.2.1, eth2, 00:05:22
```

## Linux `ip route` and Distance

Linux routing uses metrics, not a separate administrative distance field by default:

```bash
# Static route with metric 50
ip route add 10.0.0.0/24 via 192.168.1.254 metric 50

# Use vtysh when you need the protocol distance view
vtysh -c "show ip route 10.0.0.0/24"
```

## Changing Administrative Distance in FRRouting

```text
! Change OSPF AD from 110 to 150
router ospf
 distance 150
exit

! Change RIP AD from 120 to 100
router rip
 distance 100
exit
```

## Key Takeaways

- Administrative Distance determines which route is installed when multiple sources know the same prefix.
- Lower AD = more trusted (connected=0, static=1, eBGP=20, OSPF=110, RIP=120).
- AD is compared **between route sources**; metric is compared **within a protocol**.
- Floating static routes (AD > dynamic protocol AD) serve as backup routes.

**Related Reading:**

- [How to Understand Routing Metrics and Cost](https://oneuptime.com/blog/post/2026-03-20-routing-metrics-cost/view)
- [How to Configure OSPF on Linux Using FRRouting](https://oneuptime.com/blog/post/2026-03-20-ospf-linux-frrouting/view)
- [How to Understand How IPv4 Routing Decisions Are Made](https://oneuptime.com/blog/post/2026-03-20-ipv4-routing-decisions/view)
