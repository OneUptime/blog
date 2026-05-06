# How to Configure HSRP for IPv4 Gateway Redundancy on Cisco

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cisco, HSRP, IPv4, Gateway Redundancy, IOS, High Availability

Description: Configure Hot Standby Router Protocol (HSRP) on Cisco IOS routers to provide transparent IPv4 default gateway redundancy with active/standby failover.

## Introduction

HSRP creates a virtual IP gateway shared between two or more routers. End hosts point to the virtual IP as their default gateway. If the active router fails, the standby takes over with the same virtual IP after HSRP detects the failure, providing transparent failover.

## Basic HSRP Configuration (Two Routers)

```cisco
! === Router 1 (becomes Active - higher priority) ===
interface GigabitEthernet0/0
 description LAN-Segment
 ip address 10.1.10.2 255.255.255.0
 !
 standby version 2
 standby 1 ip 10.1.10.1           ! Virtual IP (default gateway for hosts)
 standby 1 priority 110           ! Higher than default (100)
 standby 1 preempt                ! Reclaim Active role after recovery
 standby 1 authentication md5 key-string MyHSRPKey
 standby 1 track GigabitEthernet0/1 decrement 20  ! Decrement priority if WAN fails

! === Router 2 (Standby) ===
interface GigabitEthernet0/0
 ip address 10.1.10.3 255.255.255.0
 !
 standby version 2
 standby 1 ip 10.1.10.1
 standby 1 priority 90
 standby 1 preempt
 standby 1 authentication md5 key-string MyHSRPKey
```

## Verify HSRP State

```cisco
! Check active/standby roles
show standby

! Brief summary
show standby brief

! Output example:
!                          P indicates configured to preempt.
!                          |
! Interface   Grp  Pri P State    Active          Standby
! Gi0/0         1  110 P Active   local           10.1.10.3
```

## HSRP with Multiple Groups (per VLAN)

```cisco
! Use different groups for different VLANs
! Router 1 - Active for VLAN 10, Standby for VLAN 20
interface GigabitEthernet0/0.10
 encapsulation dot1Q 10
 ip address 10.1.10.2 255.255.255.0
 standby 10 ip 10.1.10.1
 standby 10 priority 110
 standby 10 preempt

interface GigabitEthernet0/0.20
 encapsulation dot1Q 20
 ip address 10.1.20.2 255.255.255.0
 standby 20 ip 10.1.20.1
 standby 20 priority 90       ! Standby for VLAN 20
 standby 20 preempt

! Router 2 - mirror priorities (Active for VLAN 20)
interface GigabitEthernet0/0.10
 encapsulation dot1Q 10
 ip address 10.1.10.3 255.255.255.0
 standby 10 ip 10.1.10.1
 standby 10 priority 90
 standby 10 preempt
interface GigabitEthernet0/0.20
 encapsulation dot1Q 20
 ip address 10.1.20.3 255.255.255.0
 standby 20 ip 10.1.20.1
 standby 20 priority 110
 standby 20 preempt
```

## HSRP Timers

```cisco
! Aggressive timers for faster failover (default: hello=3s, hold=10s)
standby 1 timers msec 200 msec 750

! With BFD configured on the router or interface, HSRP BFD peering is enabled by default.
! Use this command only if HSRP BFD peering was disabled on the interface.
standby bfd
```

## HSRP Version Differences

| Feature | HSRPv1 | HSRPv2 |
|---------|---------|---------|
| Group range | 0–255 | 0–4095 |
| Virtual MAC | 0000.0c07.acXX | 0000.0c9f.fXXX |
| IPv6 support | No | Yes |
| Multicast address | 224.0.0.2 | 224.0.0.102 |

## Conclusion

HSRP provides transparent IPv4 gateway redundancy by advertising a virtual IP shared between an active and standby router. Use `standby <group> preempt` so the higher-priority router reclaims active status after recovery, configure interface tracking to degrade priority when uplinks fail, and use HSRPv2 for new deployments.
