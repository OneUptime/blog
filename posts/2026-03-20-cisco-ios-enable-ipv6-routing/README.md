# How to Enable IPv6 Routing on Cisco IOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cisco, IPv6, Routing, IOS, Network Configuration

Description: Enable IPv6 routing and forwarding on Cisco IOS routers with essential global and interface-level configuration commands.

## Prerequisites

- Cisco IOS 12.4(6)T or later (for full IPv6 support)
- Access to the router CLI with privilege level 15
- Understanding of basic Cisco IOS configuration

## Step 1: Enable IPv6 Routing Globally

```text
! Enter global configuration mode
Router> enable
Router# configure terminal

! Enable IPv6 unicast routing (disabled by default!)
Router(config)# ipv6 unicast-routing

! Optional: Enable IPv6 CEF (Cisco Express Forwarding) for performance
Router(config)# ip cef
Router(config)# ipv6 cef

! Verify IPv6 routing is enabled
Router# show ipv6 route
! Should show at least the connected and local routes when interfaces are configured
```

## Step 2: Configure IPv6 on an Interface

```text
Router(config)# interface GigabitEthernet0/0

! Assign a static IPv6 address
Router(config-if)# ipv6 address 2001:db8:1::1/64

! Alternatively, derive the interface ID with EUI-64 (uses MAC address)
Router(config-if)# ipv6 address 2001:db8:1::/64 eui-64

! Instead of a global address, enable link-local only
Router(config-if)# ipv6 enable
! (This auto-generates the link-local address)

! Enable the interface
Router(config-if)# no shutdown
Router(config-if)# exit
```

## Step 3: Tune Router Advertisements

```text
! Router Advertisements are sent by default on Ethernet interfaces when IPv6 unicast routing is enabled
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ipv6 nd prefix 2001:db8:1::/64
Router(config-if)# ipv6 nd ra interval 200
Router(config-if)# ipv6 nd ra lifetime 1800

! For router-to-router links, you may want to suppress RAs
Router(config-if)# ipv6 nd ra suppress
```

## Step 4: Verify the Configuration

```text
! Show all IPv6 addresses on all interfaces
Router# show ipv6 interface brief

! Show IPv6 routing table
Router# show ipv6 route

! Show IPv6 neighbors (NDP cache)
Router# show ipv6 neighbors

! Show IPv6 interface details
Router# show ipv6 interface GigabitEthernet0/0

! Ping over IPv6
Router# ping ipv6 2001:db8:1::2

! Traceroute over IPv6
Router# traceroute ipv6 2001:db8:1::2
```

## Step 5: Save Configuration

```text
! Save the running configuration to NVRAM
Router# write memory
! Or:
Router# copy running-config startup-config
```

## Full Configuration Example

```nginx
! Complete router configuration for dual-stack
ipv6 unicast-routing
ip cef
ipv6 cef

interface GigabitEthernet0/0
 description WAN - Upstream Provider
 ip address 203.0.113.1 255.255.255.0
 ipv6 address 2001:db8:0:1::1/64
 ipv6 nd ra suppress
 no shutdown

interface GigabitEthernet0/1
 description LAN - Internal Network
 ip address 192.168.1.1 255.255.255.0
 ipv6 address 2001:db8:0:2::1/64
 no shutdown

! Default IPv6 route to upstream
ipv6 route ::/0 2001:db8:0:1::254
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your Cisco router's IPv6 interfaces via SNMP or by pinging the router's IPv6 address. Set up monitors for each critical IPv6 interface to detect configuration or connectivity issues.

## Conclusion

Enabling IPv6 routing on Cisco IOS requires `ipv6 unicast-routing` globally and `ipv6 address` on each interface. Unlike IPv4, IPv6 routing must be explicitly enabled. Always verify with `show ipv6 route` and `show ipv6 interface brief` after configuration changes.
