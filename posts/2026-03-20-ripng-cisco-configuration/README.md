# How to Configure RIPng on Cisco Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RIPng, Cisco, IPv6, Routing, IOS

Description: Step-by-step guide to configuring RIPng on Cisco IOS routers for IPv6 routing in small networks.

## Overview

Cisco IOS supports RIPng natively. Unlike RIPv2 where the network statement activates the protocol, RIPng is enabled per-interface using the `ipv6 rip <tag> enable` command.

## Prerequisites

```text
! Enable IPv6 unicast routing
Router(config)# ipv6 unicast-routing
```

## Basic RIPng Configuration

```text
! Create a RIPng process with a tag name
Router(config)# ipv6 router rip RIPNG_PROCESS

! Enable RIPng on each interface
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ipv6 address 2001:db8:1::1/64
Router(config-if)# ipv6 rip RIPNG_PROCESS enable

Router(config)# interface GigabitEthernet0/1
Router(config-if)# ipv6 address 2001:db8:2::1/64
Router(config-if)# ipv6 rip RIPNG_PROCESS enable
```

## Configuring a Passive Interface

Suppress RIPng updates on interfaces that connect to hosts (not routers):

```text
Router(config)# ipv6 router rip RIPNG_PROCESS
Router(config-rtr)# passive-interface GigabitEthernet0/2
```

## Configuring a Default Route

Advertise a default route (::/0) in RIPng updates sent from an interface:

```text
! Originate a default route into RIPng on an interface
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ipv6 rip RIPNG_PROCESS default-information originate

! Alternative: advertise only the default route on that interface
Router(config-if)# ipv6 rip RIPNG_PROCESS default-information only
```

## Adjusting Timers

```text
! Adjust RIPng timers (update, timeout, holddown, garbage collection - in seconds)
Router(config)# ipv6 router rip RIPNG_PROCESS
Router(config-rtr)# timers 30 180 120 240
```

## Configuring Split Horizon

Split horizon is enabled by default. Disable it for NBMA networks:

```text
! Disable split horizon for the RIPng process (for hub-and-spoke networks)
Router(config)# ipv6 router rip RIPNG_PROCESS
Router(config-rtr)# no split-horizon
```

## Verification Commands

```text
! Show RIPng process and configuration
Router# show ipv6 rip

! Show RIPng routing database
Router# show ipv6 rip database

! Show IPv6 routes learned via RIPng
Router# show ipv6 route rip

! Show RIPng interface status
Router# show ipv6 interface GigabitEthernet0/0 | include RIP
```

## Sample Output

```text
Router# show ipv6 rip

RIP process "RIPNG_PROCESS", port 521, multicast-group ff02::9, pid 312
      Administrative distance is 120. Maximum paths is 16
      Updates every 30 seconds, expire after 180
      Holddown lasts 120 seconds, garbage collect after 240
      Split horizon is on; poison reverse is off
      Default routes are not generated
      Interfaces:
        GigabitEthernet0/0
        GigabitEthernet0/1

Router# show ipv6 rip database

RIP process "RIPNG_PROCESS"
2001:db8:1::/64
    directly connected, GigabitEthernet0/0
2001:db8:2::/64
    directly connected, GigabitEthernet0/1
2001:db8:remote::/64
    [2] via fe80::2, GigabitEthernet0/0
    expires in 00:02:58
```

## Redistributing Routes into RIPng

```text
! Redistribute OSPFv3 routes into RIPng
Router(config)# ipv6 router rip RIPNG_PROCESS
Router(config-rtr)# redistribute ospf 1 metric 5

! Redistribute static routes
Router(config-rtr)# redistribute static metric 3
```

## Summary

Cisco RIPng is configured per-interface with `ipv6 rip <tag> enable`. The `ipv6 router rip <tag>` process configures global parameters. Use `show ipv6 rip database` to see learned routes and `show ipv6 route rip` to verify installation in the routing table. RIPng is appropriate only for small networks with the 15-hop limitation in mind.
