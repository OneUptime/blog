# How to Configure Named EIGRP for IPv6 on Cisco

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: EIGRPv6, Cisco, IPv6, Named EIGRP, Routing

Description: Learn how to configure named EIGRP (the modern EIGRP configuration mode) for IPv6 on Cisco IOS, combining IPv4 and IPv6 in a unified process.

## Overview

Named EIGRP (available since IOS 15.0(1)M) is the modern way to configure EIGRP. It provides a single EIGRP process that handles multiple address families (IPv4, IPv6, VPNv4) within one hierarchical configuration block - eliminating the need for separate Classic EIGRPv6 processes.

## Named EIGRP Configuration for IPv6

```text
! Prerequisites: enable IPv6 routing and configure IPv6 on the participating interfaces
Router(config)# ipv6 unicast-routing

! Create a named EIGRP process
Router(config)# router eigrp MY_NETWORK

! Configure IPv6 unicast address family
Router(config-router)# address-family ipv6 unicast autonomous-system 1

! Set the Router ID (required before EIGRP for IPv6 can run)
Router(config-router-af)# eigrp router-id 1.1.1.1

! Named mode for IPv6 does not use a 'network' statement
Router(config-router-af)# af-interface default
Router(config-router-af-interface)#  shutdown
Router(config-router-af-interface)#  exit-af-interface

! Enable EIGRP on the required interfaces and tune timers
Router(config-router-af)# af-interface GigabitEthernet0/0
Router(config-router-af-interface)#  no shutdown
Router(config-router-af-interface)#  hello-interval 5
Router(config-router-af-interface)#  hold-time 15
Router(config-router-af-interface)#  exit-af-interface

Router(config-router-af)# exit-address-family
```

## Configuring Both IPv4 and IPv6 in One Process

```text
Router(config)# router eigrp DUAL_STACK_NETWORK

! IPv4 address family
Router(config-router)# address-family ipv4 unicast autonomous-system 10
Router(config-router-af)# network 10.0.0.0
Router(config-router-af)# exit-address-family

! IPv6 address family
Router(config-router)# address-family ipv6 unicast autonomous-system 10
Router(config-router-af)# eigrp router-id 1.1.1.1
Router(config-router-af)# af-interface GigabitEthernet0/0
Router(config-router-af-interface)#  no shutdown
Router(config-router-af-interface)#  exit-af-interface
Router(config-router-af)# exit-address-family
```

## Interface-Specific Configuration

```text
Router(config)# router eigrp MY_NETWORK
Router(config-router)# address-family ipv6 unicast autonomous-system 1

! Configure per-interface parameters
Router(config-router-af)# af-interface GigabitEthernet0/0
Router(config-router-af-interface)#  hello-interval 5
Router(config-router-af-interface)#  hold-time 15
Router(config-router-af-interface)#  bandwidth-percent 50   ! Limit EIGRP bandwidth usage
Router(config-router-af-interface)#  exit-af-interface

! Make an interface passive (no neighbors, still advertises the prefix)
Router(config-router-af)# af-interface GigabitEthernet0/2
Router(config-router-af-interface)#  passive-interface
Router(config-router-af-interface)#  exit-af-interface

Router(config-router-af)# exit-address-family
```

## Authentication in Named EIGRP

```text
! Configure HMAC-SHA-256 authentication (Named mode supports SHA, Classic only supports MD5)
Router(config)# router eigrp MY_NETWORK
Router(config-router)# address-family ipv6 unicast autonomous-system 1
Router(config-router-af)# af-interface GigabitEthernet0/0
Router(config-router-af-interface)#  authentication mode hmac-sha-256 0 <password>
Router(config-router-af-interface)#  exit-af-interface
```

## Verification Commands

```text
! Show EIGRP IPv6 neighbors
Router# show eigrp address-family ipv6 neighbors

! Show EIGRP IPv6 topology table
Router# show eigrp address-family ipv6 topology

! Show EIGRP IPv6 routing table entries
Router# show ipv6 route eigrp

! Show EIGRP IPv6 interfaces
Router# show eigrp address-family ipv6 interfaces

! Show the named EIGRP process
Router# show eigrp protocols
```

## Sample Output

```text
Router# show eigrp address-family ipv6 neighbors

EIGRP-IPv6 VR(MY_NETWORK) Address-Family Neighbors for AS(1)
H   Address           Interface      Hold  Uptime   SRTT   RTO  Q  Seq
                                     (sec)          (ms)       Cnt Num
0   Link-local address:
    fe80::2           Gi0/0          14  01:23:45   12    200  0  55
1   Link-local address:
    fe80::3           Gi0/1          12  00:45:12   8     200  0  30
```

## Summary

Named EIGRP provides a unified configuration for all address families under a single process named `router eigrp <name>`. The IPv6 address family is configured in `address-family ipv6 unicast autonomous-system <asn>`, and interface participation is controlled in `af-interface` submode rather than with an IPv6 `network` statement. Named mode supports HMAC-SHA-256 authentication in addition to MD5, provides cleaner configuration hierarchy, and allows unified management of dual-stack routing.
