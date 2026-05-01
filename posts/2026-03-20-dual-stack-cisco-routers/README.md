# How to Configure Dual-Stack on Cisco Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPv4, Dual-Stack, Cisco, Routing

Description: Learn how to configure dual-stack IPv4 and IPv6 routing on Cisco IOS routers, including interface addressing, static routing, OSPFv3, and BGP for both address families.

## Overview

Cisco IOS supports dual-stack on the same interface by assigning both IPv4 and IPv6 addresses. The two protocol stacks operate independently, each maintaining its own routing table. Routing protocols (OSPF, BGP) run as separate processes or address families.

## Enable IPv6 Routing

```text
! Required global command to enable IPv6 unicast routing
Router(config)# ipv6 unicast-routing
```

Without this command, IPv6 forwarding is disabled even if addresses are assigned.

## Interface Dual-Stack Configuration

```text
! Configure GigabitEthernet0/0 with both IPv4 and IPv6
Router(config)# interface GigabitEthernet0/0
Router(config-if)# description WAN Interface
Router(config-if)# ip address 192.0.2.1 255.255.255.0
Router(config-if)# ipv6 address 2001:db8:0:1::1/64
Router(config-if)# ipv6 address fe80::1 link-local
Router(config-if)# no shutdown

! LAN interface
Router(config)# interface GigabitEthernet0/1
Router(config-if)# ip address 10.0.0.1 255.255.255.0
Router(config-if)# ipv6 address 2001:db8:0:2::1/64
Router(config-if)# no shutdown
```

## Static Routes for Both Families

```text
! IPv4 default route
Router(config)# ip route 0.0.0.0 0.0.0.0 192.0.2.254

! IPv6 default route
Router(config)# ipv6 route ::/0 2001:db8:0:1::254

! Verify
Router# show ip route
Router# show ipv6 route
```

## OSPFv2 and OSPFv3 (Parallel Instances)

```text
! OSPFv2 for IPv4
Router(config)# router ospf 1
Router(config-router)# router-id 1.1.1.1
Router(config-router)# network 10.0.0.0 0.255.255.255 area 0
Router(config-router)# network 192.0.2.0 0.0.0.255 area 0

! OSPFv3 for IPv6 (configured on interface)
Router(config)# ipv6 router ospf 1
Router(config-rtr)# router-id 1.1.1.1

Router(config)# interface GigabitEthernet0/1
Router(config-if)# ipv6 ospf 1 area 0

! Verify
Router# show ip ospf neighbor
Router# show ipv6 ospf neighbor
```

## BGP Dual-Stack (mp-BGP)

```text
! mp-BGP with IPv4 and IPv6 address families
Router(config)# router bgp 65001
Router(config-router)# neighbor 192.0.2.2 remote-as 65002
Router(config-router)# neighbor 2001:db8:0:1::2 remote-as 65002

! IPv4 address family
Router(config-router)# address-family ipv4 unicast
Router(config-router-af)# neighbor 192.0.2.2 activate
Router(config-router-af)# network 10.0.0.0 mask 255.255.255.0
Router(config-router-af)# exit-address-family

! IPv6 address family
Router(config-router)# address-family ipv6 unicast
Router(config-router-af)# neighbor 2001:db8:0:1::2 activate
Router(config-router-af)# network 2001:db8:0:2::/64
Router(config-router-af)# exit-address-family

! Verify
Router# show bgp ipv4 unicast summary
Router# show bgp ipv6 unicast summary
```

## Router Advertisement Configuration

On LAN-facing interfaces, configure RA for hosts:

```text
! Configure RA on LAN interface
Router(config)# interface GigabitEthernet0/1
Router(config-if)# ipv6 address 2001:db8:0:2::1/64
Router(config-if)# ipv6 nd ra interval 60
Router(config-if)# ipv6 nd ra lifetime 180
Router(config-if)# ipv6 nd prefix 2001:db8:0:2::/64

! Send RA with managed flag (use DHCPv6 for address assignment)
Router(config-if)# ipv6 nd managed-config-flag

! Suppress RA on WAN-facing interfaces
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ipv6 nd ra suppress all
```

## ACLs for Dual-Stack

```text
! IPv4 ACL
Router(config)# ip access-list extended INBOUND-V4
Router(config-ext-nacl)# permit tcp any host 10.0.0.10 eq 443
Router(config-ext-nacl)# deny ip any any log

! IPv6 ACL
Router(config)# ipv6 access-list INBOUND-V6
Router(config-ipv6-acl)# permit tcp any host 2001:db8:0:2::10 eq 443
Router(config-ipv6-acl)# permit icmp any any destination-unreachable
Router(config-ipv6-acl)# permit icmp any any packet-too-big
Router(config-ipv6-acl)# permit icmp any any time-exceeded
Router(config-ipv6-acl)# permit icmp any any parameter-problem
Router(config-ipv6-acl)# permit icmp any any nd-na
Router(config-ipv6-acl)# permit icmp any any nd-ns
Router(config-ipv6-acl)# deny ipv6 any any log

! Apply to interface
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ip access-group INBOUND-V4 in
Router(config-if)# ipv6 traffic-filter INBOUND-V6 in
```

## Verification Commands

```text
! Interface summary
Router# show interfaces GigabitEthernet0/0
Router# show ipv6 interface GigabitEthernet0/0

! Routing tables
Router# show ip route
Router# show ipv6 route

! Neighbor Discovery cache
Router# show ipv6 neighbors

! ARP (IPv4) vs NDP (IPv6)
Router# show arp
Router# show ipv6 neighbors

! Ping both families
Router# ping 192.0.2.254
Router# ping ipv6 2001:db8:0:1::254

! Traceroute both families
Router# traceroute 8.8.8.8
Router# traceroute ipv6 2001:4860:4860::8888
```

## Summary

Cisco IOS dual-stack requires `ipv6 unicast-routing` globally and then assigning both `ip address` and `ipv6 address` on each interface. Run OSPFv2 and OSPFv3 as separate process instances; for BGP use mp-BGP with `address-family ipv4 unicast` and `address-family ipv6 unicast`. Create separate ACLs for each family using `ip access-list extended` for IPv4 and `ipv6 access-list` for IPv6, applying both with `ip access-group ... in` and `ipv6 traffic-filter ... in`. Suppress RA on WAN-facing interfaces with `ipv6 nd ra suppress all`.
