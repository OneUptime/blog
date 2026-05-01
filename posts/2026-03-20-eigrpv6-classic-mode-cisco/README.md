# How to Configure Classic EIGRPv6 on Cisco

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: EIGRPv6, Cisco, IPv6, Classic EIGRP, Routing

Description: Learn how to configure Classic EIGRPv6 on Cisco IOS using the legacy ipv6 router eigrp configuration mode.

## Overview

Classic EIGRPv6 uses the `ipv6 router eigrp` configuration mode. This is the older syntax available on all Cisco IOS versions that support EIGRPv6. While named EIGRP is preferred for new deployments, classic mode remains common on legacy equipment.

## Prerequisites

```text
! Enable IPv6 unicast routing
Router(config)# ipv6 unicast-routing

! Verify IPv6 forwarding
Router# show running-config | include ipv6 unicast-routing
```

## Classic EIGRPv6 Configuration

Unlike EIGRP for IPv4, classic EIGRPv6 is enabled per-interface (not per-network statement) and is shutdown by default:

```text
! Step 1: Create the EIGRPv6 process
Router(config)# ipv6 router eigrp 1
Router(config-rtr)# eigrp router-id 1.1.1.1    ! Set manually if no suitable IPv4-derived router ID exists
Router(config-rtr)# no shutdown                 ! EIGRPv6 is shutdown by default!

! Step 2: Enable EIGRPv6 on interfaces
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ipv6 address 2001:db8:1::1/64
Router(config-if)# ipv6 eigrp 1    ! Activate EIGRP process 1 on this interface

Router(config)# interface GigabitEthernet0/1
Router(config-if)# ipv6 address 2001:db8:2::1/64
Router(config-if)# ipv6 eigrp 1
```

**Critical Note**: The `no shutdown` command under `ipv6 router eigrp` is required. Without it, EIGRPv6 will not form any adjacencies.

## Setting the Router ID

EIGRPv6 requires a 32-bit Router ID, just like OSPFv3. If there is no suitable IPv4 address on the router, it must be set manually:

```text
Router(config)# ipv6 router eigrp 1
Router(config-rtr)# eigrp router-id 1.1.1.1   ! Using dotted decimal notation
Router(config-rtr)# no shutdown
```

## Passive Interfaces

```text
! Suppress EIGRPv6 on a specific interface (still advertises the prefix)
Router(config)# ipv6 router eigrp 1
Router(config-rtr)# passive-interface GigabitEthernet0/2
```

## Configuring Timers

```text
! Change hello and hold timers on an interface
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ipv6 hello-interval eigrp 1 5    ! Hello every 5 seconds
Router(config-if)# ipv6 hold-time eigrp 1 15        ! Hold time 15 seconds
```

## Authentication

```text
! MD5 authentication for classic EIGRPv6
Router(config)# key chain EIGRP_KEY
Router(config-keychain)# key 1
Router(config-keychain-key)# key-string MySecretKey

Router(config)# interface GigabitEthernet0/0
Router(config-if)# ipv6 authentication mode eigrp 1 md5
Router(config-if)# ipv6 authentication key-chain eigrp 1 EIGRP_KEY
```

## Verification Commands

```text
! Show EIGRPv6 neighbors
Router# show ipv6 eigrp neighbors

! Show EIGRPv6 topology table
Router# show ipv6 eigrp topology

! Show EIGRPv6 routes in the routing table
Router# show ipv6 route eigrp

! Show EIGRPv6 process
Router# show ipv6 eigrp
```

## Sample Neighbor Output

```text
Router# show ipv6 eigrp neighbors

IPv6-EIGRP neighbors for process 1
H   Address           Interface      Hold  Uptime   SRTT   RTO  Q  Seq Num
0   Link-local address:              14  01:23:45   8     200  0  42
    FE80::2           Gi0/0
1   Link-local address:              11  00:30:12   12    200  0  35
    FE80::3           Gi0/1
```

## Classic vs Named EIGRP

| Feature | Classic EIGRPv6 | Named EIGRPv6 |
|---------|----------------|---------------|
| Configuration | `ipv6 router eigrp` | `router eigrp <name>` + AF |
| Default state | Shutdown | Shutdown (address family) |
| Authentication | MD5 only | MD5 and SHA-256 |
| Multi-AF | Separate processes | Single process |
| Recommended for new deployments | No | Yes |

## Summary

Classic EIGRPv6 uses `ipv6 router eigrp <asn>` and requires `no shutdown` plus a Router ID to function; configure `eigrp router-id` explicitly if no suitable IPv4-derived Router ID is available. EIGRPv6 is enabled per-interface with `ipv6 eigrp <asn>`. For new deployments, prefer Named EIGRP. Classic mode is maintained for backward compatibility with older IOS versions.
