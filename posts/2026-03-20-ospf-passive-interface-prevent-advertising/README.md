# How to Prevent OSPF from Advertising Specific Interfaces with Passive Interface

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSPF, Passive Interface, Cisco IOS, Security, Routing

Description: Learn how to use the OSPF passive interface feature to stop Hello packets on host-facing interfaces while still advertising those networks into OSPF.

## What Does Passive Interface Do?

When an OSPF interface is marked as passive:
- OSPF **does not send or receive Hello packets** on that interface
- OSPF **still advertises the subnet** configured on that interface into the routing domain
- No OSPF neighbor relationships can form on that interface

This prevents OSPF from wasting bandwidth and CPU on host-facing segments, and prevents unauthorized routers on those segments from forming unwanted adjacencies.

## When to Use Passive Interfaces

- Host-facing LAN segments (access ports facing workstations)
- Loopback interfaces (no neighbors possible)
- Management interfaces connected to out-of-band networks
- Stub interfaces connected to a single device

## Step 1: Configure a Single Passive Interface

Mark a specific interface as passive:

```text
router ospf 1
 router-id 1.1.1.1
 network 10.0.0.0 0.0.0.255 area 0   ! Router-to-router link (active)
 network 192.168.1.0 0.0.0.255 area 0 ! LAN facing hosts (passive below)

 ! Stop OSPF Hellos on LAN interface
 passive-interface GigabitEthernet1/0
```

The 192.168.1.0/24 network is still advertised-OSPF just won't send Hellos out Gig1/0.

## Step 2: Make All Interfaces Passive by Default

For routers with many host-facing interfaces, make passive the default and explicitly activate only router-to-router links:

```text
router ospf 1
 router-id 1.1.1.1
 network 0.0.0.0 255.255.255.255 area 0   ! Advertise all interfaces

 ! Make ALL interfaces passive by default
 passive-interface default

 ! Explicitly enable OSPF Hellos only on router-facing interfaces
 no passive-interface GigabitEthernet0/0   ! Uplink to core router
 no passive-interface GigabitEthernet0/1   ! Link to second router
```

This approach is safer for distribution and access layer routers-any new interface added is automatically passive unless explicitly activated.

## Step 3: Apply Passive to Loopback Interfaces

Loopback interfaces cannot form neighbors, but setting them passive is good practice and prevents unnecessary processing:

```text
router ospf 1
 passive-interface Loopback0
 passive-interface Loopback1
```

## Step 4: Verify Passive Interface Status

```text
! Check which interfaces are passive
Router# show ip ospf interface brief

Interface    PID   Area     IP Addr/Mask    Cost  State   Nbrs F/C
Gi0/0          1   0        10.0.0.1/24       1   BDR      1/1
Gi1/0          1   0        192.168.1.1/24    1   DR       0/0  <- 0/0 neighbors (passive)

! Detailed view shows passive status
Router# show ip ospf interface GigabitEthernet1/0

GigabitEthernet1/0 is up, line protocol is up
  ...
  No Hellos (Passive interface)
  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
```

The `No Hellos (Passive interface)` message confirms the interface is passive.

## Step 5: Security Benefit-Prevent Rogue Adjacencies

Without passive interfaces, a laptop with OSPF software plugged into a host port could form an OSPF adjacency and inject false routes. Passive interface prevents this:

```text
! On all access ports (host-facing)
router ospf 1
 passive-interface default
 no passive-interface GigabitEthernet0/0    ! Only uplinks are active
```

Combined with OSPF authentication, this provides strong protection against rogue OSPF participation.

## Step 6: Check That Subnet Is Still Advertised

Even with passive interface, the subnet should still appear in other routers' OSPF tables:

```text
! On a remote router - verify the passive subnet is learned via OSPF
RemoteRouter# show ip route ospf | include 192.168.1

O    192.168.1.0/24 [110/2] via 10.0.0.1, 00:01:23, GigabitEthernet0/0
                                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
! Subnet is advertised despite the passive interface on the originating router
```

## Conclusion

Passive interface in OSPF suppresses Hello packets on host-facing interfaces without removing those networks from OSPF advertisements. Use `passive-interface default` combined with `no passive-interface` on uplinks as a safer, more scalable approach than manually listing every host-facing port. This configuration also provides security by preventing unwanted OSPF adjacencies from user-facing segments.
