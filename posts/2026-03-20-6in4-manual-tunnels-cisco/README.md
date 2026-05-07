# How to Configure 6in4 Manual Tunnels on Cisco

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, 6in4, Cisco, Tunneling, IOS

Description: Learn how to configure 6in4 (IPv6-in-IPv4) manual tunnels on Cisco IOS routers using the tunnel interface with mode ipv6ip for connecting to IPv6 tunnel brokers or remote sites.

## Overview

Cisco IOS implements 6in4 tunnels using a `tunnel` interface with `tunnel mode ipv6ip`. The tunnel interface carries IPv6 traffic encapsulated in IPv4 (protocol 41). This is the same mechanism used in SIT tunnels on Linux, and is compatible with Hurricane Electric and other tunnel brokers.

## Basic 6in4 Tunnel Configuration

```text
! Tunnel from Router-A (203.0.113.10) to Tunnel Broker (198.51.100.1)

Router(config)# ipv6 unicast-routing

Router(config)# interface Tunnel0
Router(config-if)# description 6in4 to Tunnel Broker
Router(config-if)# ipv6 address 2001:db8::2/64
Router(config-if)# tunnel source GigabitEthernet0/0
Router(config-if)# tunnel mode ipv6ip             ! Protocol 41
Router(config-if)# tunnel destination 198.51.100.1
Router(config-if)# ipv6 mtu 1480                  ! Account for IPv4 header overhead

! IPv6 default route through tunnel
Router(config)# ipv6 route ::/0 Tunnel0 2001:db8::1
```

## Physical Interface Configuration

```text
! WAN interface (provides tunnel source)
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ip address 203.0.113.10 255.255.255.0
Router(config-if)# no shutdown

! IPv4 default route (required for tunnel to reach broker)
Router(config)# ip route 0.0.0.0 0.0.0.0 203.0.113.1
```

## Verify Tunnel

```text
Router# show interface Tunnel0
Tunnel0 is up, line protocol is up
  Internet address is omitted
  IPv6 address: 2001:db8::2/64
  Tunnel source 203.0.113.10 (GigabitEthernet0/0), destination 198.51.100.1
  Tunnel protocol/transport IPv6/IP
  Tunnel TTL 255, Fast tunneling disabled
  Tunnel transport MTU 1480 bytes

Router# show ipv6 interface Tunnel0
Router# show ipv6 route

! Ping broker endpoint
Router# ping ipv6 2001:db8::1

! Ping external IPv6
Router# ping ipv6 2001:4860:4860::8888
```

## LAN Distribution Behind the Tunnel

```text
! LAN interface - provides IPv6 to hosts
Router(config)# interface GigabitEthernet0/1
Router(config-if)# ipv6 address 2001:db8:abcd:1::1/64
Router(config-if)# ipv6 nd ra interval 60        ! Send Router Advertisements
Router(config-if)# no shutdown

! Use subnets from the delegated /48 on LAN interfaces
! (Tunnel broker typically routes the /48 to your tunnel endpoint)

! Or use default route to send all IPv6 through tunnel
Router(config)# ipv6 route ::/0 Tunnel0 2001:db8::1
```

## Site-to-Site 6in4 (Two Cisco Routers)

```text
! ===== Router-A (left side) =====
Router-A(config)# ipv6 unicast-routing

Router-A(config)# interface Tunnel0
Router-A(config-if)# ipv6 address 2001:db8:0:1::1/64
Router-A(config-if)# tunnel source 203.0.113.10
Router-A(config-if)# tunnel mode ipv6ip
Router-A(config-if)# tunnel destination 198.51.100.20   ! Router-B's IPv4
Router-A(config-if)# ipv6 mtu 1480

Router-A(config)# ipv6 route 2001:db8:200::/48 Tunnel0 2001:db8:0:1::2

! ===== Router-B (right side) =====
Router-B(config)# ipv6 unicast-routing

Router-B(config)# interface Tunnel0
Router-B(config-if)# ipv6 address 2001:db8:0:1::2/64
Router-B(config-if)# tunnel source 198.51.100.20
Router-B(config-if)# tunnel mode ipv6ip
Router-B(config-if)# tunnel destination 203.0.113.10   ! Router-A's IPv4
Router-B(config-if)# ipv6 mtu 1480

Router-B(config)# ipv6 route 2001:db8:100::/48 Tunnel0 2001:db8:0:1::1
```

## MTU and PMTUD

6in4 adds a 20-byte IPv4 header, reducing effective IPv6 MTU from 1500 to 1480:

```text
! Set IPv6 MTU on tunnel to avoid fragmentation
Router(config-if)# ipv6 mtu 1480

! Alternatively, enable TCP MSS clamping
Router(config-if)# ipv6 tcp adjust-mss 1420

! Check effective MTU
Router# show interface Tunnel0 | include MTU
```

## ACL to Restrict Protocol 41

```text
! Allow only expected tunnel broker's protocol 41, block all others
Router(config)# ip access-list extended PROTECT-PROTO41
Router(config-ext-nacl)# permit 41 host 198.51.100.1 host 203.0.113.10  ! Broker → us
Router(config-ext-nacl)# deny 41 any any log              ! Block others
Router(config-ext-nacl)# permit ip any any                ! Pass other traffic

Router(config)# interface GigabitEthernet0/0
Router(config-if)# ip access-group PROTECT-PROTO41 in
```

## Troubleshooting

```text
! Check tunnel status
Router# show interface Tunnel0

! Check IPv6 routing
Router# show ipv6 route

! Check if IPv4 path to broker exists
Router# ping 198.51.100.1
Router# traceroute 198.51.100.1

! Common issues:
! 1. "Tunnel0 is down" → IPv4 source/destination unreachable
! 2. "no route to host" IPv6 → missing ipv6 route or tunnel down
! 3. Large packet drops → MTU/PMTUD mismatch

! Debug protocol 41 in software (verbose - use in lab only)
Router(config)# access-list 141 permit 41 host 198.51.100.1 host 203.0.113.10
Router# debug ip packet 141 detail
```

## Summary

Cisco IOS 6in4 uses `tunnel mode ipv6ip` on a tunnel interface with `tunnel source` (local IPv4) and `tunnel destination` (remote IPv4). Enable `ipv6 unicast-routing`, set `ipv6 mtu 1480` on the tunnel to account for the 20-byte IPv4 overhead, and add IPv6 routes pointing to the tunnel interface. For site-to-site tunnels, configure symmetrically on both routers. Restrict protocol 41 at the WAN interface using an ACL allowing only the authorized tunnel endpoint. Use `show interface Tunnel0` and `ping ipv6` to verify the tunnel is operational.
