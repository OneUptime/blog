# How to Troubleshoot OSPF Neighbor Adjacency Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSPF, Troubleshooting, Cisco IOS, Adjacency, Networking

Description: Learn how to systematically diagnose and fix OSPF neighbor adjacency failures by checking timers, area IDs, authentication, MTU, and network type settings.

## OSPF Adjacency States

OSPF neighbors progress through these states:

```mermaid
stateDiagram-v2
    Down --> Init: Hello received
    Init --> 2-Way: My RID in neighbor's Hello
    2-Way --> ExStart: DR/BDR elected (or P2P)
    ExStart --> Exchange: DBD exchange begins
    Exchange --> Loading: LSR/LSU in progress
    Loading --> Full: All LSAs received
```

Problems can occur at any stage. The `show ip ospf neighbor` command shows the current state.

## Step 1: Check Current Neighbor State

```text
Router# show ip ospf neighbor

Neighbor ID     Pri   State       Dead Time   Address       Interface
2.2.2.2           1   FULL/DR     00:00:35    10.0.0.2      Gig0/0
3.3.3.3           1   2WAY/DROTHER 00:00:40   10.0.0.3      Gig0/0
```

- `FULL`: Adjacency established (desired state)
- `2WAY`: Seen each other, but both are DROTHER-normal for non-DR/BDR routers on multiaccess
- `INIT`: Hello received but our Router ID not in the neighbor's Hello
- `EXSTART/EXCHANGE`: MTU mismatch or DBD sequence number issue

## Step 2: Check Hello and Dead Timer Mismatches

Timer mismatches prevent OSPF neighbors from forming. Both sides must match:

```text
! Check timers on the interface
Router# show ip ospf interface GigabitEthernet0/0

! Look for:
! Timer intervals configured, Hello 10, Dead 40
! Wait 40, Retransmit 5

! If mismatched, fix on both sides:
Router(config-if)# ip ospf hello-interval 10
Router(config-if)# ip ospf dead-interval 40
```

## Step 3: Verify Area ID Matches

Both neighbors on the same link must be in the same OSPF area:

```text
! Check area assignments
Router# show ip ospf interface GigabitEthernet0/0 | include Area

! Output: Area 0 (process ID 1)
! If mismatch, one side shows Area 0 and the other shows Area 1

! Fix on the router with the wrong area:
router ospf 1
 no network 10.0.0.0 0.0.0.255 area 1
 network 10.0.0.0 0.0.0.255 area 0
```

## Step 4: Check Authentication Mismatch

If one side has OSPF authentication and the other doesn't:

```text
! Check authentication type
Router# show ip ospf interface GigabitEthernet0/0 | include auth

! "Simple password authentication enabled" - area-level plain text
! "Cryptographic authentication enabled" - MD5

! Verify both sides have matching auth type and key
Router# show run | section ospf | include auth
```

## Step 5: Check MTU Mismatch (EXSTART/EXCHANGE Stuck)

MTU mismatch causes the OSPF exchange to fail after reaching EXSTART. Both sides send DBD packets but can't complete:

```text
! Check interface MTU
Router# show interface GigabitEthernet0/0 | include MTU

! If MTUs differ, either fix the MTU:
Router(config-if)# ip mtu 1500

! Or ignore MTU mismatches (workaround, not best practice):
Router(config-if)# ip ospf mtu-ignore
```

## Step 6: Verify Subnet Mask Matches

OSPF neighbors on the same link must share the same subnet. A mask mismatch prevents Hello acceptance:

```text
! Check IP address and mask
Router# show ip interface brief | include GigabitEthernet0/0

! Verify both ends are in the same subnet
! 10.0.0.1/24 and 10.0.0.2/24 = correct
! 10.0.0.1/24 and 10.0.0.2/30 = wrong (subnet mismatch)
```

## Step 7: Check OSPF Network Type

Network type mismatches (e.g., one side Point-to-Point, other side Broadcast) cause issues:

```text
! Check network type on both sides of a link
Router# show ip ospf interface GigabitEthernet0/0 | include Network Type

! Both sides must match: BROADCAST, POINT-TO-POINT, POINT-TO-MULTIPOINT, NON-BROADCAST

! Fix a mismatch:
Router(config-if)# ip ospf network point-to-point
```

## Step 8: Use Debug for Real-Time Troubleshooting

```text
! Debug OSPF Hello packets for a specific interface
Router# debug ip ospf hello

! Debug OSPF adjacency events
Router# debug ip ospf adj

! Stop all debugging
Router# no debug all
```

## Quick Troubleshooting Checklist

| Check | Command |
|---|---|
| Neighbor state | `show ip ospf neighbor` |
| Timers | `show ip ospf interface` |
| Area ID | `show ip ospf interface` |
| Authentication | `show run \| section ospf` |
| MTU | `show interface` |
| Network type | `show ip ospf interface` |
| Subnet mask | `show ip interface brief` |

## Conclusion

OSPF neighbor adjacency failures most commonly stem from mismatched Hello/Dead timers, wrong area IDs, authentication differences, or MTU mismatches. Use `show ip ospf interface` and `show ip ospf neighbor` as your primary diagnostics, then debug OSPF hello and adjacency events when the root cause isn't immediately apparent.
