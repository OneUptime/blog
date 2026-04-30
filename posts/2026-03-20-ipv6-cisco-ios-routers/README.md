# How to Configure IPv6 on Cisco IOS Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Cisco, IOS, Router, Networking, Configuration

Description: Configure IPv6 addressing, routing, and basic security on Cisco IOS routers including static addresses, SLAAC, OSPFv3, and access control lists.

## Introduction

Cisco IOS has long provided production IPv6 support. This guide covers the essential IPv6 configuration tasks on Cisco IOS routers: enabling IPv6, assigning addresses, configuring routing, and applying basic security.

## Step 1: Enable IPv6 Unicast Routing

```text
! Enable IPv6 routing globally (disabled by default)
Router(config)# ipv6 unicast-routing

! Optionally enable CEF for IPv6 (recommended for performance)
Router(config)# ip cef
Router(config)# ipv6 cef
```

## Step 2: Assign IPv6 Addresses to Interfaces

```text
! Assign a static IPv6 address
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ipv6 address 2001:db8:1:1::1/64
Router(config-if)# ipv6 address FE80::1 link-local  ! Optional: set link-local explicitly
Router(config-if)# no shutdown

! Use SLAAC to autoconfigure from Router Advertisement
Router(config)# interface GigabitEthernet0/1
Router(config-if)# ipv6 address autoconfig
Router(config-if)# no shutdown

! Assign a full 128-bit loopback address
Router(config)# interface Loopback0
Router(config-if)# ipv6 address 2001:db8::1/128
```

## Step 3: Configure Static IPv6 Routes

```text
! Add a static route to a specific destination
Router(config)# ipv6 route 2001:db8:2::/48 GigabitEthernet0/1 2001:db8:0:1::2

! Add a default route via a next-hop address
Router(config)# ipv6 route ::/0 GigabitEthernet0/1 2001:db8:0:1::1

! Floating static route with higher administrative distance for backup
Router(config)# ipv6 route ::/0 GigabitEthernet0/2 2001:db8:0:2::1 200
```

## Step 4: Configure OSPFv3

```text
! Enable OSPFv3 on the router
Router(config)# ipv6 router ospf 1
Router(config-rtr)# router-id 1.1.1.1

! Enable OSPFv3 on interfaces
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ipv6 ospf 1 area 0

Router(config)# interface GigabitEthernet0/1
Router(config-if)# ipv6 ospf 1 area 0

! Passive interface (don't send OSPFv3 hellos out this interface)
Router(config)# ipv6 router ospf 1
Router(config-rtr)# passive-interface Loopback0
```

## Step 5: Configure IPv6 ACLs

```text
! IPv6 ACLs use named lists (not numbered like IPv4)
Router(config)# ipv6 access-list BLOCK-INBOUND

! Permit common ICMPv6 control traffic explicitly
Router(config-ipv6-acl)# permit icmp any any nd-na
Router(config-ipv6-acl)# permit icmp any any nd-ns
Router(config-ipv6-acl)# permit icmp any any router-advertisement
Router(config-ipv6-acl)# permit icmp any any router-solicitation

! Block specific traffic
Router(config-ipv6-acl)# deny tcp any host 2001:db8:1:1::10 eq 22

! Permit all other IPv6 traffic
Router(config-ipv6-acl)# permit ipv6 any any

! Apply ACL to interface
Router(config)# interface GigabitEthernet0/1
Router(config-if)# ipv6 traffic-filter BLOCK-INBOUND in
```

## Step 6: Configure DHCPv6 Server

```text
! Create a DHCPv6 pool
Router(config)# ipv6 dhcp pool LAN-POOL
Router(config-dhcpv6)# address prefix 2001:db8:1:1::/64 lifetime 86400 14400
Router(config-dhcpv6)# dns-server 2001:db8:1:1::53
Router(config-dhcpv6)# domain-name example.com

! Apply pool to interface
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ipv6 nd managed-config-flag
Router(config-if)# ipv6 dhcp server LAN-POOL
```

## Verification Commands

```text
! Show IPv6 interface details
Router# show ipv6 interface GigabitEthernet0/0

! Show IPv6 routing table
Router# show ipv6 route

! Show IPv6 neighbors (neighbor cache)
Router# show ipv6 neighbors

! Show OSPFv3 neighbor state
Router# show ipv6 ospf neighbor

! Show IPv6 ACL matches
Router# show ipv6 access-list BLOCK-INBOUND

! Show DHCPv6 bindings
Router# show ipv6 dhcp binding

! Ping test to verify connectivity
Router# ping ipv6 2001:db8:2::1 source GigabitEthernet0/0
```

## Saving the Configuration

```text
! Save running config to startup config
Router# copy running-config startup-config
! or:
Router# write memory
```

## Conclusion

Cisco IOS IPv6 configuration follows a logical progression: enable unicast routing globally, assign addresses to interfaces, configure routing (static or dynamic with OSPFv3), apply security with IPv6 ACLs, and verify with the `show ipv6` command family. When restricting IPv6 with ACLs, make sure the policy still allows required ICMPv6 traffic such as Neighbor Discovery and Path MTU Discovery.
