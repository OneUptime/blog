# How to Configure GLBP for IPv4 Load Balanced Gateways on Cisco

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cisco, GLBP, IPv4, Load Balancing, Gateway Redundancy, IOS

Description: Configure Gateway Load Balancing Protocol (GLBP) on Cisco IOS to distribute IPv4 traffic across multiple active gateways while providing automatic failover.

## Introduction

GLBP differs from HSRP and VRRP by allowing multiple routers to actively forward traffic simultaneously. One router is elected Active Virtual Gateway (AVG); it assigns different virtual MAC addresses to each Active Virtual Forwarder (AVF), distributing client ARP replies in a round-robin, weighted, or host-dependent fashion.

## Basic GLBP Configuration

```cisco
! === Router 1 ===
interface GigabitEthernet0/0
 description LAN
 ip address 10.1.10.2 255.255.255.0
 !
 glbp 1 ip 10.1.10.1              ! Virtual IP
 glbp 1 priority 120              ! Highest becomes AVG
 glbp 1 preempt                   ! Reclaim AVG after recovery
 glbp 1 load-balancing round-robin
 glbp 1 authentication md5 key-string GLBPsecret

! === Router 2 ===
interface GigabitEthernet0/0
 ip address 10.1.10.3 255.255.255.0
 !
 glbp 1 ip 10.1.10.1
 glbp 1 priority 90
 glbp 1 preempt
 glbp 1 authentication md5 key-string GLBPsecret

! === Router 3 (optional third forwarder) ===
interface GigabitEthernet0/0
 ip address 10.1.10.4 255.255.255.0
 glbp 1 ip 10.1.10.1
 glbp 1 priority 80
 glbp 1 authentication md5 key-string GLBPsecret
```

## Load Balancing Methods

```cisco
! Round-robin (default) - each ARP reply uses next virtual MAC
glbp 1 load-balancing round-robin

! Weighted - distribute based on configured weights
glbp 1 load-balancing weighted

! Host-dependent - same host always gets same virtual MAC
glbp 1 load-balancing host-dependent
```

## Weighted Load Balancing

```cisco
! On Router 1 (more powerful)
interface GigabitEthernet0/0
 glbp 1 weighting 200 lower 150 upper 180
 glbp 1 weighting track 1 decrement 60

! On Router 2
interface GigabitEthernet0/0
 glbp 1 weighting 100
```

## Verify GLBP

```cisco
show glbp
show glbp brief

! Example output from show glbp:
! GigabitEthernet0/0 - Group 1
!   State is Active
!   Virtual IP address is 10.1.10.1
!   Hello time 3 sec, hold time 10 sec
!   Redirect time 600 sec, forwarder time-out 14400 sec
!   Priority 120
!   Load balancing: round-robin
!   There are 2 forwarders (2 active)
```

## Object Tracking

```cisco
track 1 interface GigabitEthernet0/1 line-protocol

interface GigabitEthernet0/0
 glbp 1 weighting 200 lower 150 upper 180
 glbp 1 weighting track 1 decrement 60
 ! If WAN goes down, weight drops below the lower threshold and this router stops acting as an AVF
```

## GLBP vs HSRP vs VRRP

| Feature | GLBP | HSRP | VRRP |
|---------|------|------|------|
| Multiple active gateways | Yes | No | No |
| Load balancing | Yes | No | No |
| Standard | Cisco proprietary | Cisco proprietary | IETF RFC 9568 |
| Max active forwarders | 4 | 1 | 1 |

## Conclusion

GLBP is the only Cisco first-hop redundancy protocol that achieves true active-active load balancing. Use round-robin for equal-cost gateways, weighted mode when router capacities differ, and object tracking to remove a forwarder from rotation when its uplink fails.
