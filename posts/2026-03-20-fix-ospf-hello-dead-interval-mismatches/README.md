# How to Fix OSPF Hello and Dead Interval Mismatches

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSPF, Hello Interval, Dead Interval, Cisco IOS, Troubleshooting

Description: Learn how to identify and fix OSPF Hello and Dead interval mismatches that prevent neighbor adjacency formation, including verification and timer tuning.

## Why Hello and Dead Intervals Must Match

OSPF uses Hello packets to discover and maintain neighbor relationships. The **Hello interval** determines how often Hello packets are sent; the **Dead interval** determines how long to wait before declaring a neighbor down. If these values differ between two routers on the same link, the neighbor relationship never forms-OSPF rejects any Hello with non-matching timers.

**Default values by network type:**
| Network Type | Hello Interval | Dead Interval |
|---|---|---|
| Broadcast (Ethernet) | 10 seconds | 40 seconds |
| Non-Broadcast (Frame Relay) | 30 seconds | 120 seconds |
| Point-to-Point | 10 seconds | 40 seconds |
| Loopback | N/A (no Hellos) | N/A |

## Step 1: Identify a Timer Mismatch

When a mismatch exists, OSPF logs this message:

```text
%OSPF-4-BAD_HELLO: Mismatched hello parameters from 10.0.0.2
  Dead R 40 C 60, Hello R 10 C 20 Mask R 255.255.255.0 C 255.255.255.0
  (R = Received, C = Configured)
```

Alternatively, check the timers directly:

```text
! Check Hello and Dead intervals on the interface
Router# show ip ospf interface GigabitEthernet0/0

GigabitEthernet0/0 is up, line protocol is up
  Internet Address 10.0.0.1/24, Area 0
  Process ID 1, Router ID 1.1.1.1, Network Type BROADCAST, Cost: 1
  Transmit Delay is 1 sec, State DR, Priority 1
  Designated Router (ID) 1.1.1.1
  Timer intervals configured, Hello 10, Dead 40, Wait 40, Retransmit 5
                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  Hello due in 00:00:08
```

Run this on both routers and compare the Hello and Dead values.

## Step 2: Fix the Timer on the Mismatched Router

Set the Hello and Dead intervals to match. On Cisco IOS, the default Dead interval is 4x the Hello interval:

```text
! Change to match the other router (10s hello / 40s dead)
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ip ospf hello-interval 10
Router(config-if)# ip ospf dead-interval 40
```

**Important:** By default, Cisco IOS uses a Dead interval that is 4x the Hello interval. If you need a custom ratio, set both explicitly.

## Step 3: Verify After Fixing

After changing the timers, OSPF should automatically attempt to form a new adjacency:

```text
Router# show ip ospf neighbor

! Before fix: neighbor not listed (never got to 2WAY)
! After fix: neighbor appears in FULL state within seconds

Neighbor ID     Pri   State       Dead Time   Address       Interface
2.2.2.2           1   FULL/BDR    00:00:38    10.0.0.2      Gig0/0
```

## Step 4: Use Fast Hello (Sub-Second) for Quick Convergence

For critical links where you need sub-second OSPF convergence, use the fast Hello mechanism (Cisco proprietary):

```text
! Configure OSPF fast Hello - sends multiple Hellos per second
Router(config-if)# ip ospf dead-interval minimal hello-multiplier 4
! This sets:
! Dead interval = 1 second
! Hello interval = 250ms (1000ms / 4 multiplier)
```

Both routers on the link must use a consistent Dead interval for fast Hello to work. On Cisco IOS, the hello-multiplier itself does not have to match as long as at least one Hello is sent within the 1-second Dead interval.

## Step 5: Restore Default Timers

If you need to revert to default values:

```text
Router(config-if)# no ip ospf hello-interval
Router(config-if)# no ip ospf dead-interval
```

Without explicit configuration, OSPF uses the default for the network type (10/40 for Ethernet).

## Step 6: Check for Network Type Causing Timer Differences

Sometimes the root cause is a network type mismatch-one side is configured as Broadcast (10/40 defaults) and the other as Non-Broadcast (30/120 defaults):

```text
! Check network type
Router# show ip ospf interface Gig0/0 | include Network Type

! If mismatch: set matching network type on both
Router(config-if)# ip ospf network broadcast
```

## Summary Checklist

```text
1. Router# show ip ospf interface [int] <- Check both routers
2. Compare Hello and Dead timer values
3. Identify which router has the wrong values
4. Router(config-if)# ip ospf hello-interval X
5. Router(config-if)# ip ospf dead-interval Y
6. Router# show ip ospf neighbor <- Verify adjacency forms
```

## Conclusion

OSPF Hello and Dead interval mismatches silently prevent neighbor adjacency. Identify mismatches with `show ip ospf interface` and the syslog `BAD_HELLO` message. Fix by setting matching timer values on both sides with `ip ospf hello-interval` and `ip ospf dead-interval`. For fast convergence, consider sub-second Hello with `dead-interval minimal hello-multiplier`.
