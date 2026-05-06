# How to Configure EtherChannel with IPv4 on Cisco Switches

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cisco, EtherChannel, LACP, IPv4, Switching, IOS, Link Aggregation

Description: Configure EtherChannel (LACP and PAgP) on Cisco IOS switches to bundle physical links into a logical port-channel for IPv4 traffic, with load balancing and verification.

## Introduction

EtherChannel bundles multiple physical links into a single logical interface, multiplying aggregate bandwidth and providing link-level redundancy. For IPv4 routed interfaces, an EtherChannel delivers deterministic hashing-based load balancing across member links.

## LACP EtherChannel (Recommended - IEEE 802.3ad)

```cisco
! === Switch A ===
interface range GigabitEthernet0/1 - 2
 description EtherChannel-to-SwitchB
 channel-group 1 mode active         ! LACP active
 no shutdown

interface Port-channel1
 description LAG-to-SwitchB
 switchport mode trunk
 switchport trunk allowed vlan 10,20,30

! === Switch B ===
interface range GigabitEthernet0/1 - 2
 channel-group 1 mode active
 no shutdown

interface Port-channel1
 switchport mode trunk
 switchport trunk allowed vlan 10,20,30
```

## Layer 3 EtherChannel for Routed Uplinks

```cisco
interface range GigabitEthernet0/1 - 2
 no ip address
 no switchport
 channel-group 2 mode active

interface Port-channel2
 description Routed-Uplink
 no switchport
 ip address 10.1.0.2 255.255.255.252
```

## PAgP EtherChannel (Cisco Proprietary)

```cisco
interface range GigabitEthernet0/3 - 4
 channel-group 3 mode desirable    ! PAgP desirable (actively negotiates)
 ! Peer should be: mode auto or desirable
```

## EtherChannel Load Balancing

```cisco
! Show current method
show etherchannel load-balance

! Change load balancing algorithm
port-channel load-balance src-dst-ip   ! Common choice for IP-routed traffic
port-channel load-balance src-dst-mac  ! Common choice for Layer 2 MAC-based forwarding

! Available options vary by platform and IOS release.
! Common options on IOS include:
! dst-ip, dst-mac, src-dst-ip, src-dst-mac, src-ip, src-mac
```

## Verify EtherChannel

```cisco
! Summary of all port-channels
show etherchannel summary

! Detailed status
show etherchannel 1 detail

! LACP neighbor info
show lacp neighbor

! Port-channel interface status
show interfaces Port-channel1

! Example show etherchannel summary:
! Number of channel-groups in use: 1
! Number of aggregators:           1
!
! Group  Port-channel  Protocol    Ports
! ------+-------------+-----------+-------
! 1      Po1(SU)         LACP      Gi0/1(P) Gi0/2(P)
! SU = Layer2 and in use, P = bundled in port-channel
```

## Troubleshooting

```cisco
! Check for configuration mismatches
show interfaces GigabitEthernet0/1 etherchannel

! Common issues:
! - Speed/duplex mismatch between member ports
! - Different native VLANs on trunk ports
! - One side set to mode on (static) while other uses LACP
! - STP placing port in discarding state
```

## Conclusion

EtherChannel can double or quadruple aggregate bandwidth between switches while providing automatic failover. Use LACP `active` mode on both sides for dynamic negotiation. For IPv4 routed uplinks, configure the Port-channel as a Layer 3 interface and `src-dst-ip` is a common load-balancing choice for routed flows.
