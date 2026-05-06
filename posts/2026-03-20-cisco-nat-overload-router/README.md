# How to Configure NAT Overload on a Cisco Router

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cisco, NAT, PAT, IPv4, IOS, Internet Access, Networking

Description: Configure NAT overload (PAT) on a Cisco IOS router to allow multiple internal IPv4 hosts to share a single public IP address for internet access.

---

## Introduction

NAT overload, also called Port Address Translation (PAT), maps many internal IPv4 addresses to a single public IP by differentiating connections using port numbers. This is the most common form of NAT used in small and medium networks.

## Basic NAT Overload Configuration

```cisco
! Define which inside addresses to translate
ip access-list standard NAT-INSIDE
 permit 10.1.0.0 0.0.255.255

! Create the overload translation
ip nat inside source list NAT-INSIDE interface GigabitEthernet0/0 overload

! Mark the WAN interface as outside
interface GigabitEthernet0/0
 description WAN-Internet
 ip address 203.0.113.2 255.255.255.252
 ip nat outside

! Mark LAN interfaces as inside
interface GigabitEthernet0/1
 description LAN
 ip address 10.1.0.1 255.255.0.0
 ip nat inside
```

## NAT Overload with a Static Public IP Pool

```cisco
! Use a pool instead of an interface (when you have multiple public IPs)
ip nat pool PUBLIC-POOL 203.0.113.10 203.0.113.20 netmask 255.255.255.0

ip nat inside source list NAT-INSIDE pool PUBLIC-POOL overload
```

## Static NAT for Server (DMZ)

```cisco
! 1:1 static NAT for a specific server (use this or the port-forwarding example below)
ip nat inside source static 10.1.10.100 203.0.113.5

! Port forwarding (static port translation) for specific services
ip nat inside source static tcp 10.1.10.100 80 203.0.113.5 80
ip nat inside source static tcp 10.1.10.100 443 203.0.113.5 443
```

## Verify NAT

```cisco
! Show active NAT translations
show ip nat translations

! Show NAT statistics
show ip nat statistics

! Example translations:
! Pro Inside global        Inside local         Outside local        Outside global
! tcp 203.0.113.2:1024     10.1.0.10:45678      8.8.8.8:53           8.8.8.8:53
! tcp 203.0.113.2:1025     10.1.0.11:51234      93.184.216.34:80     93.184.216.34:80
```

## Clear NAT Table

```cisco
! Clear all dynamic translations
clear ip nat translation *

! Clear specific translation
clear ip nat translation inside 203.0.113.2 10.1.0.10 outside 8.8.8.8 8.8.8.8
```

## NAT with Multiple Inside VLANs

```cisco
ip access-list standard ALL-PRIVATE
 permit 10.0.0.0 0.255.255.255
 permit 172.16.0.0 0.15.255.255
 permit 192.168.0.0 0.0.255.255

ip nat inside source list ALL-PRIVATE interface GigabitEthernet0/0 overload

interface Vlan10
 ip address 10.1.10.1 255.255.255.0
 ip nat inside

interface Vlan20
 ip address 10.1.20.1 255.255.255.0
 ip nat inside
```

## Conclusion

NAT overload is the standard way to give many private IPv4 hosts internet access through a single public IP. Define an ACL matching inside addresses, apply `ip nat inside source list <ACL> interface <WAN> overload`, and mark LAN interfaces as `ip nat inside`. Add static NAT entries for servers needing inbound connectivity.
