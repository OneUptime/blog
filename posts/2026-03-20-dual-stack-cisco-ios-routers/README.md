# How to Configure Dual-Stack on Cisco IOS Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cisco IOS, Dual-Stack, IPv4, IPv6, Router, Configuration

Description: Configure dual-stack IPv4 and IPv6 on Cisco IOS routers, enable IPv6 routing, assign addresses to interfaces, configure static and dynamic routing for both protocols.

## Introduction

Cisco IOS routers support dual-stack by running IPv4 and IPv6 simultaneously on each interface. You must explicitly enable IPv6 unicast routing with `ipv6 unicast-routing`. Each interface then accepts both IPv4 and IPv6 addresses independently.

## Enable IPv6 Unicast Routing

```text
Router# configure terminal
Router(config)# ipv6 unicast-routing
Router(config)# end
```

## Configure Dual-Stack Interfaces

```text
Router# configure terminal

! Configure GigabitEthernet0/0 (LAN interface)
Router(config)# interface GigabitEthernet0/0
Router(config-if)# description LAN Interface
Router(config-if)# ip address 10.0.0.1 255.255.255.0
Router(config-if)# ipv6 address 2001:db8:1234:1::1/64
Router(config-if)# ipv6 address fe80::1 link-local
Router(config-if)# no shutdown
Router(config-if)# exit

! Configure GigabitEthernet0/1 (WAN interface)
Router(config)# interface GigabitEthernet0/1
Router(config-if)# description WAN Interface
Router(config-if)# ip address 203.0.113.1 255.255.255.0
Router(config-if)# ipv6 address 2001:db8:5678:1::1/64
Router(config-if)# no shutdown
Router(config-if)# exit
```

## IPv4 Default Route and IPv6 Default Route

```text
! IPv4 default route
Router(config)# ip route 0.0.0.0 0.0.0.0 203.0.113.254

! IPv6 default route
Router(config)# ipv6 route ::/0 2001:db8:5678:1::254
```

## Verify Configuration

```text
! Verify IPv4 interfaces
Router# show ip interface brief
! Expected: GigabitEthernet0/0  10.0.0.1  YES  up  up

! Verify IPv6 interfaces
Router# show ipv6 interface brief
! Expected: GigabitEthernet0/0 [up/up]
!                FE80::1
!                2001:DB8:1234:1::1

! Verify IPv4 routing
Router# show ip route

! Verify IPv6 routing
Router# show ipv6 route

! Ping test
Router# ping 203.0.113.254           ! IPv4
Router# ping 2001:db8:5678:1::254    ! IPv6
```

## Configuring OSPFv2 (IPv4) and OSPFv3 (IPv6)

```text
! IPv4 OSPF
Router(config)# router ospf 1
Router(config-router)# network 10.0.0.0 0.0.0.255 area 0
Router(config-router)# network 203.0.113.0 0.0.0.255 area 0
Router(config-router)# exit

! IPv6 OSPF (OSPFv3)
Router(config)# ipv6 router ospf 1
Router(config-rtr)# router-id 1.1.1.1
Router(config-rtr)# exit

! Enable OSPFv3 on interfaces
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ipv6 ospf 1 area 0
Router(config-if)# exit
Router(config)# interface GigabitEthernet0/1
Router(config-if)# ipv6 ospf 1 area 0
Router(config-if)# exit
```

## DHCPv4 and DHCPv6 Server

```text
! DHCPv4 pool
Router(config)# ip dhcp pool LAN_V4
Router(dhcp-config)# network 10.0.0.0 255.255.255.0
Router(dhcp-config)# default-router 10.0.0.1
Router(dhcp-config)# dns-server 8.8.8.8
Router(dhcp-config)# exit

Router(config)# ip dhcp excluded-address 10.0.0.1 10.0.0.20

! DHCPv6 pool
Router(config)# ipv6 dhcp pool LAN_V6
Router(config-dhcpv6)# address prefix 2001:db8:1234:1::/64
Router(config-dhcpv6)# dns-server 2001:4860:4860::8888
Router(config-dhcpv6)# exit

! Apply DHCPv6 to interface
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ipv6 dhcp server LAN_V6
Router(config-if)# ipv6 nd managed-config-flag  ! RA for stateful DHCPv6 addressing
Router(config-if)# exit
```

## Access Control Lists for Both Protocols

```text
! IPv4 ACL
Router(config)# ip access-list extended ALLOW_WEB
Router(config-ext-nacl)# permit tcp any host 10.0.0.10 eq 80
Router(config-ext-nacl)# permit tcp any host 10.0.0.10 eq 443
Router(config-ext-nacl)# deny ip any any log

! IPv6 ACL
Router(config)# ipv6 access-list ALLOW_WEB_V6
Router(config-ipv6-acl)# permit tcp any host 2001:db8:1234:1::10 eq 80
Router(config-ipv6-acl)# permit tcp any host 2001:db8:1234:1::10 eq 443
Router(config-ipv6-acl)# deny ipv6 any any log
```

## Conclusion

Cisco IOS dual-stack requires `ipv6 unicast-routing` globally, then both `ip address` and `ipv6 address` on each interface. Separate routing protocols handle each family: OSPFv2 for IPv4, OSPFv3 for IPv6. ACLs are also separate (`ip access-list` vs `ipv6 access-list`). Verify both stacks with `show ip interface brief` and `show ipv6 interface brief`. Connected hosts can use both stacks when the LAN provides IPv4 gateway information (for example, via DHCPv4 or static configuration) and IPv6 router advertisements.
