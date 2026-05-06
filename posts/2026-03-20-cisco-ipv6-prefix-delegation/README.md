# How to Configure IPv6 Prefix Delegation on Cisco

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cisco, IPv6, Prefix Delegation, DHCPv6-PD, IOS

Description: Configure Cisco IOS as a DHCPv6-PD client or server for delegating IPv6 prefixes to downstream routers and customers.

## Overview

Configure Cisco IOS as a DHCPv6-PD client or server for delegating IPv6 prefixes to downstream routers and customers.

## Prerequisites

- Cisco IOS with DHCPv6 Prefix Delegation support (for example, Cisco IOS 12.4T or later, depending on platform)
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
! On the delegating router (DHCPv6-PD server)
Router(config)# ipv6 dhcp pool PD-POOL
Router(config-dhcpv6)# prefix-delegation pool CUSTOMER-PREFIXES lifetime 1800 600
Router(config-dhcpv6)# dns-server 2001:4860:4860::8888
Router(config-dhcpv6)# domain-name example.com

! Local pool from which /48 prefixes are delegated
Router(config)# ipv6 local pool CUSTOMER-PREFIXES 2001:db8:1200::/40 48

! Apply the DHCPv6-PD server to the interface facing the requesting router
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ipv6 address 2001:db8:0:1::1/64
Router(config-if)# ipv6 dhcp server PD-POOL

! On the requesting router (DHCPv6-PD client)
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ipv6 address autoconfig default
Router(config-if)# ipv6 enable
Router(config-if)# ipv6 dhcp client pd WAN-PREFIX

! Use the delegated prefix on a downstream interface
Router(config)# interface GigabitEthernet0/1
Router(config-if)# ipv6 address WAN-PREFIX ::1/64
```

## Verification Commands

```text
! Show DHCPv6 process information and DUID
Router# show ipv6 dhcp

! Show DHCPv6 mode on each interface
Router# show ipv6 dhcp interface

! Show DHCPv6 pool details on the server
Router# show ipv6 dhcp pool

! Show delegated-prefix bindings on the server
Router# show ipv6 dhcp binding

! Show the delegated prefix learned by the client
Router# show ipv6 general-prefix

! Show IPv6 addresses
Router# show ipv6 interface brief

! Show IPv6 routing table
Router# show ipv6 route

! Ping an address from the delegated prefix
Router# ping ipv6 2001:db8:1200::1

! Traceroute over IPv6
Router# traceroute ipv6 2001:db8:1200::1
```

## Debug Commands

```text
! Debug IPv6 packet processing
Router# debug ipv6 packet

! Debug NDP (Neighbor Discovery)
Router# debug ipv6 nd

! Debug DHCPv6
Router# debug ipv6 dhcp detail

! Always disable debug when done
Router# undebug all
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your Cisco router's IPv6 connectivity. Ping monitors targeting the router's IPv6 loopback or interface address provide early warning of configuration or connectivity issues.

## Conclusion

How to Configure IPv6 Prefix Delegation on Cisco follows standard Cisco IOS DHCPv6-PD configuration patterns. Use `prefix-delegation pool` together with `ipv6 local pool` on the delegating router, and `ipv6 dhcp client pd` on the requesting router. Enable `ipv6 unicast-routing` globally so the router can forward IPv6 traffic and use delegated prefixes correctly. Always verify with `show ipv6 dhcp`, `show ipv6 general-prefix`, and related `show ipv6` commands after making changes.
