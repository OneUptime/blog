# How to Understand Routing Metrics and Cost

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Routing, IPv4, OSPF, Metric

Description: Learn what routing metrics are, how different protocols calculate cost, and how metrics influence path selection within a routing protocol.

## What Is a Routing Metric?

A routing metric is a value assigned to a route that indicates the **cost** of using that path. When a routing protocol has multiple paths to the same destination, the path with the **lowest metric** is preferred.

Metrics are only compared **within the same protocol** - for cross-protocol comparison, use Administrative Distance.

## Metrics by Protocol

| Protocol | Metric | Calculation |
|----------|--------|-------------|
| Static Routes | Metric or administrative distance (platform-specific) | You choose; Cisco static routes default to administrative distance 1, while Linux route metrics are optional and lower values are preferred |
| RIP | Hop count | Count of router hops (max 15) |
| OSPF | Cost | Reference bandwidth / interface bandwidth |
| BGP | Multiple attributes | Weight, local preference, AS path length, MED |
| EIGRP (Cisco) | Composite | Bandwidth, delay, reliability, load, and K values |

## RIP Metric: Hop Count

RIP counts the number of routers between source and destination:

```text
Destination: 10.0.0.0/24

Path A: R1 → R2 → R3 → 10.0.0.0  (hop count = 3)
Path B: R1 → R4 → 10.0.0.0        (hop count = 2)

RIP chooses Path B (lower hop count = preferred)
```

Problem: RIP doesn't consider bandwidth. A 3-hop path over gigabit may be better than a 2-hop path over a 56K modem.

## OSPF Metric: Cost

OSPF uses interface cost based on bandwidth:

```text
Cost = Reference Bandwidth / Interface Bandwidth

Default reference bandwidth: 100 Mbps (100,000 Kbps)

1 Gbps:  100,000 / 1,000,000 = 0.1 → minimum cost 1
100 Mbps: 100,000 / 100,000 = 1
10 Mbps:  100,000 / 10,000 = 10
1 Mbps:   100,000 / 1,000 = 100
```

Path cost = sum of all interface costs along the path.

### OSPF Cost on FRRouting

```text
! Manually set cost on an interface
interface eth1
 ip ospf cost 10
exit

! Change reference bandwidth (recommended for 10Gbps+ networks)
router ospf
 ! 100 Gbps reference
 auto-cost reference-bandwidth 100000
exit
```

## Linux Static Route Metric

On Linux, metrics for static routes are set manually:

```bash
# Add route with metric

ip route add 10.0.0.0/24 via 192.168.1.254 metric 100

# Multiple routes with different metrics (backup route)
ip route add 10.0.0.0/24 via 192.168.1.1 metric 100  # Primary
ip route add 10.0.0.0/24 via 192.168.2.1 metric 200  # Secondary
```

## BGP Path Selection (Simplified)

BGP uses multiple attributes in order:

```text
1. Highest Weight (Cisco-specific)
2. Highest Local Preference
3. Locally originated routes
4. Shortest AS path
5. Lowest Origin type (i < e < ?)
6. Lowest MED (Multi-Exit Discriminator, usually compared only between paths from the same neighboring AS)
7. eBGP over iBGP
8. Lowest IGP metric to next-hop
9. Oldest eBGP path (where applicable)
10. Lowest router ID
```

## Viewing Metrics in the Routing Table

```bash
# Linux: show metrics for all routes
ip route show | awk '{print $0}' | grep metric

# FRRouting OSPF: show path costs
vtysh -c "show ip ospf route"
# O    10.0.0.0/24  [10] via 192.168.1.2, eth1
#                    ↑ OSPF cost

# FRRouting RIP
vtysh -c "show ip rip"
# R(n) 10.0.0.0/24    via 10.0.0.2    metric 2
```

## Manipulating Metrics

### OSPF: Change Interface Cost

```bash
vtysh
configure terminal
interface eth1
 ip ospf cost 50
exit
```

### Linux: Change Route Metric

```bash
# Replace route with new metric
ip route replace 10.0.0.0/24 via 192.168.1.254 metric 50
```

### RIP: Offset Metric

```text
! Match routes to offset
access-list RIP_OFFSET permit any

router rip
 ! Add 3 to all routes received on eth1
 offset-list RIP_OFFSET in 3 eth1
exit
```

## Python: Calculate OSPF Cost

```python
def ospf_cost(interface_bw_mbps, reference_bw_mbps=100):
    """Calculate OSPF interface cost."""
    cost = reference_bw_mbps / interface_bw_mbps
    return max(1, int(cost))  # Minimum cost is 1

interfaces = [
    ('eth0', 1000),    # 1 Gbps
    ('eth1', 100),     # 100 Mbps
    ('eth2', 10),      # 10 Mbps
    ('eth3', 1),       # 1 Mbps
]

print("Interface  BW       Cost")
for iface, bw in interfaces:
    cost = ospf_cost(bw)
    print(f"{iface:<10} {bw:>5} Mbps  {cost}")
```

Output:
```text
Interface  BW       Cost
eth0        1000 Mbps  1
eth1         100 Mbps  1
eth2          10 Mbps  10
eth3           1 Mbps  100
```

## Key Takeaways

- Metrics are compared **within a protocol** to choose the best path.
- RIP uses hop count; OSPF uses cost based on bandwidth.
- Linux static routes use numeric metrics (lower = preferred).
- Increase OSPF reference bandwidth for 10Gbps+ networks to get meaningful cost differentiation.

**Related Reading:**

- [How to Understand Administrative Distance in Routing](https://oneuptime.com/blog/post/2026-03-20-administrative-distance-routing/view)
- [How to Configure OSPF on Linux Using FRRouting](https://oneuptime.com/blog/post/2026-03-20-ospf-linux-frrouting/view)
- [How to Understand How IPv4 Routing Decisions Are Made](https://oneuptime.com/blog/post/2026-03-20-ipv4-routing-decisions/view)
