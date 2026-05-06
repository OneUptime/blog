# How to Configure IPv6 DHCP Relay on Cisco IOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cisco, DHCPv6, Relay, IOS, DHCP

Description: Configure Cisco IOS as a DHCPv6 relay agent to forward DHCPv6 requests from clients to a remote DHCPv6 server.

## Overview

Configure Cisco IOS as a DHCPv6 relay agent to forward DHCPv6 requests from clients to a remote DHCPv6 server.

## Prerequisites

- Cisco IOS 12.3(11)T or later
- Global IPv6 routing enabled: `ipv6 unicast-routing`
- Console or SSH access to the router

## Configuration

### Basic IPv6 Setup

```text
! Always start with enabling IPv6 routing globally
Router(config)# ipv6 unicast-routing

! Configure the client-facing interface with IPv6
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ipv6 address 2001:db8:1::1/64
Router(config-if)# no shutdown
```

### Feature-Specific Configuration

```text
! Route to the remote DHCPv6 server if it is not directly connected
Router(config)# ipv6 route 2001:db8:200::/64 2001:db8:100::254

! Configure the server-facing interface
Router(config)# interface GigabitEthernet0/1
Router(config-if)# ipv6 address 2001:db8:100::1/64
Router(config-if)# no shutdown

! Enable DHCPv6 relay on the client-facing interface
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ipv6 nd managed-config-flag
Router(config-if)# ipv6 dhcp relay destination 2001:db8:200::10
```

## Verification Commands

```text
! Show IPv6 addresses
Router# show ipv6 interface brief

! Show IPv6 routing table
Router# show ipv6 route

! Show NDP neighbor cache
Router# show ipv6 neighbors

! Show DHCPv6 relay status
Router# show ipv6 dhcp interface

! Ping the remote DHCPv6 server
Router# ping ipv6 2001:db8:200::10

! Traceroute over IPv6
Router# traceroute ipv6 2001:db8:200::10
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

How to Configure IPv6 DHCP Relay on Cisco IOS follows standard Cisco IOS configuration patterns. Remember to enable `ipv6 unicast-routing` globally so the router can forward IPv6 traffic and relay DHCPv6 messages between clients and the remote server. Always verify with `show ipv6` commands after making changes.
