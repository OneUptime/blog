# How to Debug IPv6 Issues on Cisco with debug Commands

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cisco, IPv6, Debug Commands, Troubleshooting, IOS

Description: Use Cisco IOS debug commands to troubleshoot IPv6 connectivity, routing, and NDP issues on Cisco routers.

## Overview

Use Cisco IOS debug commands to troubleshoot IPv6 connectivity, routing, and NDP issues on Cisco routers.

## Prerequisites

- Cisco IOS 12.4(6)T or later
- If the router must forward IPv6 traffic, enable global IPv6 routing: `ipv6 unicast-routing`
- Console or SSH access to the router

## Configuration

### Basic IPv6 Setup

```text
! Enable IPv6 routing globally when the router must forward IPv6 traffic
Router(config)# ipv6 unicast-routing

! Configure interface with IPv6
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ipv6 address 2001:db8::1/64
Router(config-if)# no shutdown
```

### Feature-Specific Configuration

```text
! Static route example
Router(config)# ipv6 route 2001:db8:2::/48 2001:db8::254

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
Router(config-if)# ipv6 address 2001:db8:1::1/64
Router(config-if)# ipv6 nd managed-config-flag
Router(config-if)# ipv6 dhcp server IPV6-POOL
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
Router# ping ipv6 2001:db8:2::1

! Traceroute over IPv6
Router# traceroute ipv6 2001:db8:2::1
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

How to Debug IPv6 Issues on Cisco with debug Commands follows standard Cisco IOS configuration patterns. Remember to enable `ipv6 unicast-routing` globally when the router needs to forward IPv6 traffic; interface IPv6 addressing itself is configured with `ipv6 address`. Always verify with `show ipv6` commands after making changes.
