# How to Configure IPv6 Access Control Lists on Cisco IOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Cisco IOS, ACL, Firewall, Access Control

Description: Learn how to create and apply IPv6 Access Control Lists on Cisco IOS routers, including permit/deny rules, ICMPv6 type matching, and interface application.

## Overview

Cisco IOS uses Named IPv6 Access Control Lists for packet filtering. IPv6 ACLs work similarly to IPv4 ACLs but use 128-bit addresses and support ICMPv6-specific matches. By default, they are stateless - each packet is evaluated independently. For session-aware filtering, use reflexive IPv6 ACLs (`reflect`/`evaluate`) or a firewall feature such as Zone-Based Firewall (ZBF).

## Creating a Basic IPv6 ACL

```text
! Create a named IPv6 ACL
ipv6 access-list BASIC-IPV6-FILTER

 ! Allow established TCP connections (approximate - no real conntrack)
 permit tcp any any established

 ! Allow ICMPv6 essential types
 permit icmp any any destination-unreachable  ! Type 1
 permit icmp any any packet-too-big           ! Type 2 - NEVER block
 permit icmp any any time-exceeded            ! Type 3
 permit icmp any any parameter-problem        ! Type 4

 ! Allow Neighbor Discovery / Router Discovery
 permit icmp any any router-solicitation          ! Type 133
 permit icmp FE80::/10 any router-advertisement   ! Type 134
 permit icmp any any nd-ns                        ! Type 135
 permit icmp any any nd-na                        ! Type 136

 ! Allow HTTPS from internet
 permit tcp any any eq 443

 ! Allow SSH from management network
 permit tcp FD00:100::/48 any eq 22

 ! Implicit deny (deny ipv6 any any - IOS adds this automatically)
```

## Applying ACLs to Interfaces

```text
! Apply inbound filter on internet-facing interface
interface GigabitEthernet0/0
 ipv6 traffic-filter BASIC-IPV6-FILTER in

! Apply outbound filter (restrict what leaves)
interface GigabitEthernet0/0
 ipv6 traffic-filter EGRESS-FILTER out
```

## ICMPv6 Type Matching

Cisco IOS supports named ICMPv6 types in IPv6 ACLs:

```text
! Named ICMPv6 types in IOS:
permit icmp any any echo-request   ! Type 128 (Echo Request)
permit icmp any any echo-reply     ! Type 129 (Echo Reply)
permit icmp any any packet-too-big ! Type 2
permit icmp any any time-exceeded  ! Type 3
permit icmp any any unreachable    ! Type 1
permit icmp any any nd-ns          ! Type 135 (Neighbor Solicitation)
permit icmp any any nd-na          ! Type 136 (Neighbor Advertisement)
permit icmp any any router-solicitation   ! Type 133
permit icmp any any router-advertisement  ! Type 134

! Or match by type number
permit icmp any any 2              ! Packet Too Big
permit icmp any any 135            ! Neighbor Solicitation
```

## Complete Router Protection ACL

```text
! ACL to match traffic destined for the router itself
! (use with CoPP/CPPr, or merge these permits into an interface ACL that also permits required transit traffic)
ipv6 access-list PROTECT-ROUTER-V6

 ! Allow established connections to router
 permit tcp any any established

 ! Allow all essential ICMPv6
 permit icmp any any destination-unreachable
 permit icmp any any packet-too-big
 permit icmp any any time-exceeded
 permit icmp any any parameter-problem
 permit icmp any any nd-ns
 permit icmp any any nd-na
 permit icmp any any router-solicitation
 permit icmp FE80::/10 any router-advertisement

 ! Allow BGP (if this is a BGP router)
 permit tcp 2001:DB8:100::/48 any eq bgp

 ! Allow SSH from management
 permit tcp FD00:100::/48 any eq 22

 ! Allow OSPFv3 multicast
 permit 89 any FF02::5/128        ! OSPFv3 AllSPFRouters
 permit 89 any FF02::6/128        ! OSPFv3 AllDRouters

 ! Block everything else to router
 deny ipv6 any any log
```

## ACL for Filtering Transit Traffic

```nginx
! ACL on upstream interface to filter transit (forwarded) traffic
ipv6 access-list TRANSIT-FILTER

 ! Block bogon sources
 deny ipv6 2001:DB8::/32 any log   ! Documentation
 deny ipv6 ::/128 any log          ! Unspecified
 deny ipv6 ::1/128 any log         ! Loopback
 deny ipv6 FC00::/7 any log        ! ULA (shouldn't come from internet)
 deny ipv6 FE80::/10 any log       ! Link-local

 ! Allow everything else
 permit ipv6 any any

interface GigabitEthernet0/0
 ipv6 traffic-filter TRANSIT-FILTER in
```

## Viewing and Verifying ACLs

```text
! Show ACL contents
Router# show ipv6 access-list BASIC-IPV6-FILTER

! Show ACL with hit counts
Router# show ipv6 access-list BASIC-IPV6-FILTER
IPv6 access list BASIC-IPV6-FILTER
    permit tcp any any established (45234 matches) sequence 10
    permit icmp any any packet-too-big (123 matches) sequence 30
    permit tcp FD00:100::/48 any eq 22 (22 matches) sequence 110

! Clear ACL counters
Router# clear ipv6 access-list BASIC-IPV6-FILTER

! Verify ACL is applied to interface
Router# show ipv6 interface GigabitEthernet0/0 | include access list
  Inbound  access list is BASIC-IPV6-FILTER
```

## Editing ACL Entries

```text
! IPv6 ACLs support sequence numbers
! To edit: insert/delete by sequence number, or create a new ACL and swap it in

! Method: Create new ACL, swap, delete old
ipv6 access-list BASIC-IPV6-FILTER-NEW
  ...new rules...

interface GigabitEthernet0/0
  no ipv6 traffic-filter BASIC-IPV6-FILTER in
  ipv6 traffic-filter BASIC-IPV6-FILTER-NEW in

! Delete old
no ipv6 access-list BASIC-IPV6-FILTER
! Rename (IOS doesn't support rename directly)
```

## Summary

Cisco IOS IPv6 ACLs are created with `ipv6 access-list NAME` and applied with `ipv6 traffic-filter NAME in|out`. Unlike IPv4 ACLs, IPv6 ACLs support named ICMPv6 types directly (`packet-too-big`, `nd-ns`, `router-advertisement`). Always include `permit icmp any any packet-too-big` - IOS won't add this automatically and blocking it breaks PMTUD. By default, ACLs are stateless; `permit tcp any any established` can approximate return TCP matching, while reflexive ACLs (`reflect`/`evaluate`) provide session-aware filtering. Verify with `show ipv6 access-list NAME` which shows hit counts per rule.
