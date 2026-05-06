# How to Configure Basic OSPF on Cisco IOS Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSPF, Cisco IOS, Routing, IGP, Networking

Description: Learn how to configure OSPF on Cisco IOS routers from scratch, including enabling the process, advertising networks, and verifying neighbor adjacencies.

## What Is OSPF?

OSPF (Open Shortest Path First) is a link-state interior gateway protocol (IGP) that uses Dijkstra's shortest path algorithm to calculate routes. It converges faster than distance-vector protocols like RIP and scales to large enterprise networks. OSPF organizes routers into areas, with Area 0 (the backbone) at the center.

## Step 1: Enable OSPF on Cisco IOS

Start the OSPF process with a locally significant process ID (1–65535):

```text
Router(config)# router ospf 1
```

The process ID is local to the router and does not need to match between routers; by contrast, neighboring interfaces must agree on the OSPF area.

## Step 2: Configure the Router ID

Set an explicit Router ID to avoid ambiguity. If not set, OSPF uses the highest loopback IP address, or if no loopback exists, the highest active interface IP address:

```text
! Set explicit Router ID (recommended)
Router(config-router)# router-id 1.1.1.1
```

## Step 3: Advertise Networks into OSPF

The `network` command specifies which interfaces OSPF activates on and which networks are advertised. The wildcard mask is the inverse of the subnet mask:

```text
! Advertise the 10.0.0.0/24 network in Area 0
Router(config-router)# network 10.0.0.0 0.0.0.255 area 0

! Advertise a /30 point-to-point link in Area 0
Router(config-router)# network 192.168.12.0 0.0.0.3 area 0

! Advertise the loopback (exact match with 0.0.0.0 wildcard)
Router(config-router)# network 1.1.1.1 0.0.0.0 area 0
```

Alternatively, you can enable OSPF directly on the interface with the `ip ospf` command:

```text
! Activate OSPF directly on the interface
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ip ospf 1 area 0
```

## Step 4: Verify OSPF Neighbors

After both routers are configured, verify they've formed an adjacency:

```text
Router# show ip ospf neighbor

Neighbor ID     Pri   State       Dead Time   Address       Interface
2.2.2.2           1   FULL/DR     00:00:35    10.0.0.2      Gig0/0
3.3.3.3           1   FULL/BDR    00:00:39    10.0.0.3      Gig0/0
```

- `FULL`: Full adjacency established-routing information is synchronized
- `DR/BDR`: Designated Router and Backup DR roles on multi-access networks

## Step 5: Check the OSPF Database

```text
Router# show ip ospf database

! Lists all LSAs (Link State Advertisements) in the OSPF database
! Router LSA (Type 1) - advertised by each router
! Network LSA (Type 2) - advertised by the DR
! Summary LSA (Types 3/4) - advertised by ABRs
```

## Step 6: Verify OSPF Routes in the Routing Table

```text
Router# show ip route ospf

! OSPF routes appear with 'O' prefix
! O     10.1.0.0/24 [110/2] via 10.0.0.2, 00:05:00, GigabitEthernet0/0

! Administrative distance is 110, metric is the cost
```

## Step 7: Tune the Hello and Dead Timers (Optional)

The default Hello interval is 10 seconds on Ethernet; the Dead interval is 40 seconds. Reduce for faster convergence:

```text
Router(config)# interface GigabitEthernet0/0
! Reduce Hello to 5s, Dead to 20s for faster convergence
Router(config-if)# ip ospf hello-interval 5
Router(config-if)# ip ospf dead-interval 20
```

Both sides of a link must have matching Hello and Dead intervals.

## Step 8: Set Passive Interface

Prevent OSPF from sending Hellos out interfaces that connect to hosts (not routers):

```text
router ospf 1
 ! Stop sending OSPF Hellos on the LAN interface to hosts
 passive-interface GigabitEthernet1/0
```

The network is still advertised; OSPF just won't form neighbors on that interface.

## Conclusion

Basic OSPF configuration on Cisco IOS requires enabling the process, setting an explicit Router ID, and using the `network` command to activate OSPF on interfaces. Verify adjacencies with `show ip ospf neighbor` and check routes with `show ip route ospf`. Use passive interfaces on host-facing links and tune timers for faster convergence where needed.
