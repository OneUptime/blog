# How to Configure OSPF Network Types (Broadcast, Point-to-Point, NBMA)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSPF, Network Types, Broadcast, Point-to-Point, NBMA, Cisco IOS

Description: Learn how OSPF network types affect DR/BDR election and Hello intervals, and how to configure the correct network type for Ethernet, serial, and Frame Relay interfaces.

## OSPF Network Types Overview

The OSPF network type determines how OSPF behaves on an interface:

| Network Type | DR/BDR | Hello | Dead | Use Case |
|---|---|---|---|---|
| Broadcast | Yes | 10s | 40s | Ethernet, Token Ring |
| Non-Broadcast (NBMA) | Yes | 30s | 120s | Frame Relay, ATM hub |
| Point-to-Point | No | 10s | 40s | Serial, GRE tunnels |
| Point-to-Multipoint | No | 30s | 120s | Frame Relay partial mesh |
| Point-to-Multipoint Non-Broadcast | No | 30s | 120s | Frame Relay, manual neighbors |
| Loopback | No | N/A | N/A | Loopback interface |

## Why Network Type Matters

If two routers have different network types on the same link, their Hello intervals won't match and the adjacency will fail. Also, using Broadcast type on a link where no DR is needed wastes election time.

## Step 1: Check the Current Network Type

```text
Router# show ip ospf interface GigabitEthernet0/0

GigabitEthernet0/0 is up, line protocol is up
  ...
  Process ID 1, Router ID 1.1.1.1, Network Type BROADCAST, Cost: 1
                                   ^^^^^^^^^^^^^^^^^^^^^^^^
  Timer intervals configured, Hello 10, Dead 40
```

## Step 2: Change to Point-to-Point (for GRE Tunnels or Serial Links)

On point-to-point links (e.g., GRE tunnels, serial links), disable DR election to speed up convergence:

```text
Router(config)# interface Tunnel0
! Change from default broadcast to point-to-point
Router(config-if)# ip ospf network point-to-point
```

With Point-to-Point, there's no DR/BDR election, and OSPF forms a full adjacency directly (routers don't stop at 2-way state like DROthers do on broadcast networks).

## Step 3: Configure NBMA for Frame Relay Hub-and-Spoke

Frame Relay does not broadcast-it's non-broadcast multi-access. Configure NBMA on the hub and manually specify neighbors:

```text
! On the hub router
Hub(config)# interface Serial0/0
Hub(config-if)# ip ospf network non-broadcast
Hub(config-if)# ip ospf priority 200    ! Ensure hub is always DR

! Manually specify each spoke as a neighbor (NBMA requires this)
Hub(config)# router ospf 1
Hub(config-router)# neighbor 10.0.0.2   ! Spoke 1
Hub(config-router)# neighbor 10.0.0.3   ! Spoke 2

! On each spoke router
Spoke(config)# interface Serial0/0
Spoke(config-if)# ip ospf network non-broadcast
Spoke(config-if)# ip ospf priority 0    ! Prevent spokes from becoming DR
```

## Step 4: Use Point-to-Multipoint for Easier Frame Relay Configuration

Point-to-Multipoint is often simpler than NBMA for partial-mesh Frame Relay-no manual neighbors needed:

```text
! On hub
Hub(config-if)# ip ospf network point-to-multipoint

! On spoke
Spoke(config-if)# ip ospf network point-to-multipoint
```

With Point-to-Multipoint, OSPF treats each spoke as a separate point-to-point connection. No DR election, no manual neighbors. The hub automatically creates /32 routes to each spoke.

## Step 5: Loopback Interface Behavior

OSPF treats loopback interfaces as stub hosts (/32) by default, even if the address is configured as /24:

```text
! Loopback is always advertised as /32 unless you change the network type
Router# show ip ospf interface Loopback0
! Network Type LOOPBACK, Cost: 1

! To advertise the actual subnet (e.g., /24) instead of /32:
Router(config)# interface Loopback0
Router(config-if)# ip ospf network point-to-point
```

## Step 6: Verify After Changing Network Type

After changing network type, reset the OSPF process to force re-election and re-adjacency:

```text
! Clear OSPF process to force re-election (brief disruption)
Router# clear ip ospf process

! Verify the new network type
Router# show ip ospf interface GigabitEthernet0/0 | include Network Type
```

## Conclusion

OSPF network types control DR/BDR election and Hello timer defaults. Use Point-to-Point on GRE tunnels and serial links for faster convergence, NBMA or Point-to-Multipoint for Frame Relay, and ensure matching network types on both ends of every link. Mismatched network types cause Hello interval mismatches and prevent adjacency formation.
