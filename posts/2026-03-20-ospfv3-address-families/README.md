# How to Understand OSPFv3 Address Families

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSPFv3, IPv6, Address Families, RFC 5838, Routing

Description: Understand OSPFv3 address families defined in RFC 5838, which extend OSPFv3 to carry both IPv4 and IPv6 routing information in a single protocol instance.

## Overview

By default, OSPFv3 only carries IPv6 routing information. RFC 5838 extends OSPFv3 with **Address Family (AF) support**, allowing a single OSPFv3 process to simultaneously carry both IPv4 and IPv6 routes. This is distinct from running OSPFv2 and OSPFv3 as separate processes.

## Address Family Concepts

OSPFv3 address families are identified by an **Instance ID** field in the Hello packet:
- Instance IDs 0-31: IPv6 unicast (base OSPFv3)
- Instance IDs 32-63: IPv6 multicast
- Instance IDs 64-95: IPv4 unicast (RFC 5838 extension)
- Instance IDs 96-127: IPv4 multicast

## Default OSPFv3 (IPv6 Unicast AF)

Standard OSPFv3 without RFC 5838 uses Instance ID 0 for IPv6 unicast:

```bash
# FRRouting - standard OSPFv3 (IPv6 unicast, Instance ID 0)

router ospf6
 ospf6 router-id 1.1.1.1

interface eth0
 ipv6 ospf6 area 0.0.0.0
 ipv6 ospf6 instance-id 0    # Default - IPv6 unicast
```

## Cisco Address-Family Configuration (RFC 5838)

The modern Cisco syntax uses explicit address-family blocks:

```text
! Configure OSPFv3 with both IPv4 and IPv6 address families
Router(config)# router ospfv3 1
Router(config-router)# router-id 1.1.1.1

! IPv6 unicast address family (default)
Router(config-router)# address-family ipv6 unicast
Router(config-router-af)# exit

! IPv4 unicast address family (RFC 5838)
Router(config-router)# address-family ipv4 unicast
Router(config-router-af)# exit

! Enable on interfaces for both AFs
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ospfv3 1 ipv6 area 0
Router(config-if)# ospfv3 1 ipv4 area 0
```

## Verification

```text
! Show OSPFv3 process with address family info
Router# show ospfv3

OSPFv3 1 address-family ipv6 (router-id 1.1.1.1)
...
OSPFv3 1 address-family ipv4 (router-id 1.1.1.1)
...

! Show IPv4 routes learned via OSPFv3 AF
Router# show ip route ospf

! Show IPv6 routes learned via OSPFv3 AF
Router# show ipv6 route ospf
```

## FRRouting Address Family Support

FRRouting supports OSPFv3 address families in newer versions:

```bash
# Standard IPv6 in ospf6d
vtysh
configure terminal

router ospf6
 ospf6 router-id 1.1.1.1

interface eth0
 ipv6 ospf6 area 0.0.0.0

end
write memory
```

## Why Use OSPFv3 Address Families?

| Approach | Pros | Cons |
|----------|------|------|
| OSPFv2 (IPv4) + OSPFv3 (IPv6) separately | Independent control | Two separate routing processes |
| OSPFv3 with RFC 5838 AFs | Single process for both | Less widely supported |
| Dual-stack with separate processes | Most compatible | Higher overhead |

## Instance ID on the Wire

The Instance ID field allows multiple OSPFv3 instances on the same link without interference. Two routers form adjacency only if they have the same Instance ID:

```bash
# On a Cisco router, set a non-default instance ID for testing
Router(config-if)# ospfv3 1 ipv6 area 0 instance 10    # Custom instance ID
```

## Summary

OSPFv3 address families (RFC 5838) extend the base protocol to carry both IPv4 and IPv6 routing in a single OSPFv3 process using different Instance IDs. Cisco IOS-XE supports this with the `address-family ipv4/ipv6 unicast` configuration. In practice, most deployments use separate OSPFv2 and OSPFv3 processes for simplicity. Instance IDs are key to understanding how multiple OSPFv3 instances coexist on the same link.
