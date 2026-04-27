# How to Set OSPF Cost to Control Path Selection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSPF, Cost, Path Selection, Cisco IOS, Traffic Engineering

Description: Learn how to manipulate OSPF interface cost values to control which paths traffic takes, and how to correctly set the reference bandwidth for modern high-speed networks.

## How OSPF Cost Works

OSPF selects the path with the lowest cumulative cost from source to destination. Each interface has a cost, and the total path cost is the sum of all outgoing interface costs along the path. By default, cost is calculated as:

```text
Cost = Reference Bandwidth / Interface Bandwidth
```

Default reference bandwidth: **100 Mbps (100,000,000 bps)**

| Interface Speed | Default Cost |
|---|---|
| 10 Mbps | 10 |
| 100 Mbps (Fast Ethernet) | 1 |
| 1 Gbps (GigE) | 1 |
| 10 Gbps | 1 |

The problem: everything faster than 100 Mbps has cost 1, making OSPF unable to differentiate between a 100 Mbps and a 100 Gbps link.

## Step 1: Set the Auto-Cost Reference Bandwidth

Fix the cost calculation for modern networks by increasing the reference bandwidth:

```text
! Set reference bandwidth to 10 Gbps (10,000 Mbps) on ALL routers
router ospf 1
 auto-cost reference-bandwidth 10000

! This gives:
! 1 Gbps = cost 10
! 10 Gbps = cost 1
! 100 Mbps = cost 100
! 1 Mbps = cost 10000
```

**This must be set identically on every router in the OSPF domain.** Otherwise, path cost calculations will be inconsistent.

## Step 2: Manually Set Interface Cost

For precise control, set the cost directly on an interface:

```text
! Set a high cost on the slow backup link
Router(config)# interface Serial0/0
Router(config-if)# ip ospf cost 1000

! Set a low cost on the fast primary link
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ip ospf cost 1
```

Manual cost overrides the auto-cost calculation. Valid range: 1–65535.

## Step 3: Make a Link a Primary/Backup Path

Suppose you have two paths: a primary GigE link and a backup Serial link:

```text
! Primary path - low cost (preferred)
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ip ospf cost 10

! Backup path - high cost (only used if GigE fails)
Router(config)# interface Serial0/1
Router(config-if)# ip ospf cost 1000
```

OSPF installs only the GigE path in the routing table. When GigE goes down, OSPF reconverges and installs the Serial path.

## Step 4: Configure ECMP (Equal Cost Load Balancing)

If you want traffic load-balanced across two parallel links, make their costs equal:

```text
! Both links get the same cost for ECMP
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ip ospf cost 10

Router(config)# interface GigabitEthernet0/1
Router(config-if)# ip ospf cost 10
```

OSPF installs both routes at equal cost, and Cisco IOS performs per-flow ECMP load balancing. The maximum number of ECMP paths is controlled by:

```text
router ospf 1
 maximum-paths 4   ! Allow up to 4 equal-cost paths
```

## Step 5: Verify Current OSPF Costs

```text
! Check cost on all OSPF interfaces
Router# show ip ospf interface brief

Interface    PID   Area     IP Addr/Mask    Cost  State  Nbrs F/C
Gi0/0          1   0        10.0.0.1/24       10   BDR     1/1
Se0/1          1   0        192.168.1.1/30  1000   P2P     1/1

! Check path cost to a specific destination
Router# show ip route 172.16.0.0

! [110/20] = AD of 110, total OSPF cost of 20
```

## Step 6: Verify Path Selection After Cost Change

```text
! Trigger SPF recalculation after cost change
! OSPF automatically detects interface cost changes and runs SPF

! Verify new best path and total OSPF cost
Router# show ip route ospf
```

## Conclusion

OSPF cost is the primary tool for traffic engineering within OSPF. Always configure `auto-cost reference-bandwidth` to a value appropriate for your fastest links (10000 for 10G networks), and ensure it's consistent across all routers. Use manual `ip ospf cost` for precise control, and match costs across parallel links to enable ECMP load balancing.
