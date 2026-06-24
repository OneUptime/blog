# How to Configure Dynamic ARP Inspection on Cisco Switches

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cisco, Dynamic ARP Inspection, DAI, IPv4, Security, ARP Spoofing, IOS

Description: Configure Dynamic ARP Inspection (DAI) on Cisco IOS switches to prevent ARP spoofing and poisoning attacks by validating ARP packets against the DHCP snooping binding table.

## Introduction

Dynamic ARP Inspection intercepts ARP requests and replies on untrusted ports and validates them against the DHCP snooping binding table or configured ARP ACLs. An ARP message claiming an IP-to-MAC mapping that does not match the binding table or an ARP ACL is dropped, preventing ARP spoofing and man-in-the-middle attacks.

## Prerequisites

In DHCP environments, DHCP snooping must be enabled and have a populated binding table before DAI can validate DHCP-learned hosts.

## Enable DAI

```cisco
! Enable DHCP snooping (prerequisite)
ip dhcp snooping
ip dhcp snooping vlan 10,20

! Enable DAI per VLAN
ip arp inspection vlan 10,20

! Trust the uplink for DHCP snooping and DAI
interface GigabitEthernet0/24
 description Uplink-to-Distribution
 ip dhcp snooping trust
 ip arp inspection trust

! Access ports are untrusted by default
```

## DAI Rate Limiting

```cisco
! Limit ARP packets on untrusted ports
interface range GigabitEthernet0/1 - 20
 ip arp inspection limit rate 100 burst interval 1
 ! 100 ARP packets per second; port goes err-disabled if exceeded
```

## ARP ACL for Static IP Hosts (Servers without DHCP)

```cisco
! Servers with static IPs won't have a DHCP snooping binding
! Use an ARP ACL to explicitly permit their ARP messages

arp access-list STATIC-SERVERS
 permit ip host 10.1.20.10 mac host 001a.2b3c.4d5e
 permit ip host 10.1.20.11 mac host 00aa.bbcc.ddee

ip arp inspection filter STATIC-SERVERS vlan 20
```

## Additional Validation Checks

```cisco
! Enable extra validation (optional but recommended)
ip arp inspection validate src-mac dst-mac ip

! src-mac: sender MAC in ARP must match Ethernet source MAC
! dst-mac: target MAC in ARP reply must match Ethernet dest MAC
! ip:      block ARP with invalid IP (0.0.0.0, broadcast, multicast)
```

## Verify DAI

```cisco
! Show DAI status per VLAN
show ip arp inspection vlan 10

! Show interfaces and trust state
show ip arp inspection interfaces

! Show statistics (forwarded/dropped counts)
show ip arp inspection statistics

! Example output:
! Vlan  Forwarded  Dropped  DHCP Drops  ACL Drops  ...
! ----  ---------  -------  ----------  ---------
!   10       1523       12           4          8
```

## Recover err-disabled Ports

```cisco
! Automatic recovery for DAI violations
errdisable recovery cause arp-inspection
errdisable recovery interval 300

! Manual recovery
interface GigabitEthernet0/5
 shutdown
 no shutdown
```

## Conclusion

Dynamic ARP Inspection stops ARP spoofing by cross-referencing ARP messages against the DHCP snooping binding table or ARP ACLs for statically addressed hosts. Trust uplink ports, rate-limit access ports to prevent ARP floods, and add static ARP ACLs for hosts with manual IP configurations. Enable `ip arp inspection validate src-mac dst-mac ip` for the most thorough validation.
