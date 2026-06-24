# How to Configure IPv6 Static Routes on Cisco

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cisco, IPv6, Static Routes, IOS, Routing

Description: Configure IPv6 static and summary routes on Cisco IOS routers including recursive and directly connected static routes.

## Overview

Configure IPv6 static routes on Cisco IOS routers and verify them with standard show and debug commands.

## Prerequisites

- Cisco IOS 12.4(24)T or later
- Global IPv6 routing enabled: `ipv6 unicast-routing`
- Console or SSH access to the router

## Configuration

### Basic IPv6 Setup

```text
! Always start with enabling IPv6 routing globally
Router(config)# ipv6 unicast-routing

! Configure interface with IPv6
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ipv6 address 2001:db8::1/64
Router(config-if)# no shutdown
```

### Feature-Specific Configuration

```text
! Static route example
Router(config)# ipv6 route 2001:db8:100::/48 2001:db8::254

! ACL example
Router(config)# ipv6 access-list BLOCK-BOGONS
Router(config-ipv6-acl)# deny ipv6 ::/8 any
Router(config-ipv6-acl)# deny ipv6 2001:db8::/32 any
Router(config-ipv6-acl)# permit ipv6 any any

! DHCPv6 server pool
Router(config)# ipv6 dhcp pool IPV6-POOL
Router(config-dhcpv6)# address prefix 2001:db8:1::/64
Router(config-dhcpv6)# dns-server 2001:4860:4860::8888
Router(config-dhcpv6)# domain-name example.com

! Apply DHCPv6 to interface
Router(config)# interface GigabitEthernet0/1
Router(config-if)# ipv6 dhcp server IPV6-POOL
Router(config-if)# ipv6 nd managed-config-flag
```

## Verification Commands

```text
! Show IPv6 addresses
Router# show ipv6 interface brief

! Show IPv6 routing table
Router# show ipv6 route

! Show NDP neighbor cache
Router# show ipv6 neighbors

! Show DHCP bindings
Router# show ipv6 dhcp binding

! Ping IPv6 address
Router# ping ipv6 2001:db8::1

! Traceroute over IPv6
Router# traceroute ipv6 2001:db8::1
```

## Debug Commands

```text
! Debug IPv6 packet processing
Router# debug ipv6 packet

! Debug NDP (Neighbor Discovery)
Router# debug ipv6 nd

! Debug DHCPv6
Router# debug ipv6 dhcp

! Always disable debug when done
Router# undebug all
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your Cisco router's IPv6 connectivity. Ping monitors targeting the router's IPv6 loopback or interface address provide early warning of configuration or connectivity issues.

## Conclusion

How to Configure IPv6 Static Routes on Cisco follows standard Cisco IOS configuration patterns. Remember to enable `ipv6 unicast-routing` globally before IPv6 forwarding will work. Always verify with `show ipv6` commands after making changes.
