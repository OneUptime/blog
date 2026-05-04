# How to Configure IPv6 Multicast on Cisco Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Multicast, Cisco, PIM-SM, IOS

Description: A guide to enabling and configuring IPv6 multicast routing on Cisco IOS routers, including PIM-SM, RP configuration, and MLD settings.

## Prerequisites

- Cisco IOS 12.4(4)T or later (for full IPv6 multicast support)
- IPv6 unicast routing enabled
- Interfaces configured with IPv6 addresses

## Enabling IPv6 Multicast Routing

```cisco
! Enable IPv6 unicast routing first
ipv6 unicast-routing

! Enable IPv6 multicast routing
ipv6 multicast-routing

! Verify
show ipv6 multicast
```

## Configuring PIM on Interfaces

PIM must be enabled on every interface that participates in multicast:

```cisco
! Configure PIM on LAN interface
interface GigabitEthernet0/0
 ipv6 address 2001:db8:1::1/64
 ipv6 pim

! Configure PIM on WAN interface
interface GigabitEthernet0/1
 ipv6 address 2001:db8:2::1/64
 ipv6 pim

! Configure PIM on loopback (for RP address)
interface Loopback0
 ipv6 address 2001:db8::1/128
 ipv6 pim
```

## Configuring a Static RP

```cisco
! Configure a static RP for all multicast groups
ipv6 pim rp-address 2001:db8::1

! Configure RP for a specific group range
ipv6 pim rp-address 2001:db8::1 ff3e::/32

! Configure multiple RPs with different group ranges
ipv6 pim rp-address 2001:db8::a ff3e::/32 bidir
ipv6 pim rp-address 2001:db8::b ff0e::db8:0:0/96

! Verify RP configuration
show ipv6 pim rp
```

## Configuring BSR (Bootstrap Router)

```cisco
! Configure this router as a BSR candidate
ipv6 pim bsr candidate bsr 2001:db8::1 priority 100

! Configure RP candidate for BSR
ipv6 pim bsr candidate rp 2001:db8::1 group-list ff3e::/32 priority 10

! Verify BSR status
show ipv6 pim bsr election
show ipv6 pim bsr rp-cache
```

## Configuring MLD

```cisco
! Configure MLD version on an interface
interface GigabitEthernet0/0
 ipv6 mld version 2

! Configure MLD query interval (seconds, default 60)
interface GigabitEthernet0/0
 ipv6 mld query-interval 30

! Configure MLD querier timeout
interface GigabitEthernet0/0
 ipv6 mld query-timeout 120

! Configure maximum response time for MLD queries (in seconds, default 10)
interface GigabitEthernet0/0
 ipv6 mld query-max-response-time 10

! Join a multicast group on the router (for testing)
interface GigabitEthernet0/0
 ipv6 mld join-group ff3e::db8:cafe
```

## Configuring Bidirectional PIM (BiDir)

For groups where multiple sources exist (e.g., videoconferencing), BiDir PIM is more efficient:

```cisco
! Enable BiDir PIM for a specific RP
ipv6 pim rp-address 2001:db8::1 ff3e::/32 bidir

! Verify BiDir state (Designated Forwarder info)
show ipv6 pim df
```

## Verification Commands

```cisco
! Check PIM neighbors
show ipv6 pim neighbor

! Check PIM interface configuration
show ipv6 pim interface

! Check multicast routing table
show ipv6 mroute

! Check multicast routing table summary
show ipv6 mroute summary

! Check PIM join/prune state
show ipv6 pim topology

! Check MLD group memberships
show ipv6 mld groups

! Check MLD interface statistics
show ipv6 mld interface GigabitEthernet0/0

! Detailed PIM debug (use carefully - high output)
debug ipv6 pim
debug ipv6 mld
```

## Access Control for Multicast

```cisco
! Create an IPv6 access list for allowed multicast groups
ipv6 access-list ALLOWED_MCAST
 permit ipv6 any ff3e::/32

! Apply to MLD to control which groups hosts can join
interface GigabitEthernet0/0
 ipv6 mld access-group ALLOWED_MCAST

! Filter source registrations at the RP (protect RP from unauthorized sources)
ipv6 access-list ALLOWED_SOURCES
 permit ipv6 any ff3e::/32

ipv6 pim accept-register list ALLOWED_SOURCES
```

## Troubleshooting IPv6 Multicast on Cisco

```cisco
! No traffic flowing? Check the mroute table
show ipv6 mroute ff3e::db8:beef

! Check if RPF (Reverse Path Forwarding) check passes
show ipv6 mroute ff3e::db8:beef detail

! Check PIM adjacency with the RP
show ipv6 pim topology ff3e::db8:beef

! Verify RP is reachable
ping ipv6 2001:db8::1

! Check MLD on the last-hop router
show ipv6 mld groups
show ipv6 mld traffic
```

## Summary

Cisco IOS IPv6 multicast configuration requires `ipv6 multicast-routing` globally, `ipv6 pim` on each participating interface, and RP configuration either static (`ipv6 pim rp-address`) or dynamic (BSR). MLD is configured per-interface for listener management. Use `show ipv6 mroute`, `show ipv6 pim neighbor`, and `show ipv6 mld groups` to verify the multicast topology is working correctly.
