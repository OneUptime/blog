# How to Configure OSPF Priority to Control DR/BDR Election

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSPF, DR, BDR, Priority, Cisco IOS, Multi-Access Networks

Description: Learn how to use OSPF interface priority to control which router becomes the Designated Router and Backup Designated Router on multi-access networks.

## Why DR/BDR Election Matters

On multi-access networks (Ethernet), OSPF elects a Designated Router (DR) and Backup DR (BDR) to reduce OSPF traffic. Instead of every router forming a full adjacency with every other router (N*(N-1)/2 adjacencies), all routers only form full adjacencies with the DR and BDR. The DR is responsible for generating Network LSAs for the segment.

If the wrong router becomes DR (e.g., a low-powered access switch), OSPF performance suffers.

## How DR/BDR Election Works

1. Routers exchange Hello packets on the segment
2. The router with the **highest OSPF priority** becomes DR (default priority: 1)
3. The router with the **second-highest priority** becomes BDR
4. If priorities are equal, the router with the **highest Router ID** wins
5. A priority of **0** means the router will **never** become DR or BDR

**Critical:** OSPF DR/BDR election is non-preemptive. If a higher-priority router comes online after election, it does NOT take over the DR role until the current DR fails.

## Step 1: Check Current DR/BDR on a Segment

```text
Router# show ip ospf interface GigabitEthernet0/0

GigabitEthernet0/0 is up, line protocol is up
  ...
  Network Type BROADCAST, Cost: 1
  Transmit Delay is 1 sec, State BDR, Priority 1
  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  Designated Router (ID) 2.2.2.2, Interface address 10.0.0.2
  Backup Designated Router (ID) 1.1.1.1, Interface address 10.0.0.1
  Neighbor Count is 2, Adjacent neighbor count is 2
```

## Step 2: Set Priority to Ensure a Specific Router Becomes DR

Set the priority to 200 on the router you want to be DR, and 100 on the BDR:

```text
! On the intended DR - high priority
DR_Router(config)# interface GigabitEthernet0/0
DR_Router(config-if)# ip ospf priority 200

! On the intended BDR - medium priority
BDR_Router(config)# interface GigabitEthernet0/0
BDR_Router(config-if)# ip ospf priority 100

! On all other routers - default (1) or lower
Other_Router(config)# interface GigabitEthernet0/0
Other_Router(config-if)# ip ospf priority 1
```

## Step 3: Prevent Routers from Becoming DR

Set priority to 0 on access switches and routers that should never be DR:

```text
! Access switch - never become DR
Switch(config)# interface GigabitEthernet0/0
Switch(config-if)# ip ospf priority 0
```

A router with priority 0 still forms adjacencies with the DR and BDR and participates in OSPF, but it never wins an election.

## Step 4: Force a New DR Election

Because DR election is non-preemptive, you must clear the OSPF process to trigger a new election:

```text
! Warning: this resets all OSPF adjacencies on the router briefly
Router# clear ip ospf process

! Alternatively, toggle the interface (if brief downtime is acceptable)
Router(config)# interface GigabitEthernet0/0
Router(config-if)# shutdown
Router(config-if)# no shutdown
```

## Step 5: Verify DR/BDR After Election

```text
! Confirm new DR/BDR roles
Router# show ip ospf neighbor

Neighbor ID     Pri   State       Dead Time   Address       Interface
2.2.2.2         200   FULL/DR     00:00:35    10.0.0.2      Gig0/0
1.1.1.1         100   FULL/BDR    00:00:39    10.0.0.1      Gig0/0
3.3.3.3           1   FULL/DROTHER 00:00:28   10.0.0.3      Gig0/0
```

The router with priority 200 is correctly elected DR.

## OSPF Priority on Redundant Data Center Segments

In a data center with two core switches as DR and BDR, and multiple access switches:

```text
! Core Switch 1 - Primary DR
CS1(config-if)# ip ospf priority 200

! Core Switch 2 - Backup DR
CS2(config-if)# ip ospf priority 100

! Access Switches - never DR
AS1(config-if)# ip ospf priority 0
AS2(config-if)# ip ospf priority 0
```

## Conclusion

OSPF interface priority controls DR/BDR election on multi-access networks. Set higher priorities on capable, stable routers that should be DR/BDR; set priority 0 on access-layer devices. Remember that OSPF election is non-preemptive-you must clear the OSPF process or bring interfaces down/up to trigger re-election after priority changes.
