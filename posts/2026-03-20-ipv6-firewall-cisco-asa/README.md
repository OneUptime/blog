# How to Configure IPv6 Firewall Rules on Cisco ASA

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Cisco ASA, Firewall, Access Control, Enterprise

Description: Learn how to configure IPv6 firewall policies on Cisco ASA, including interface security levels, IPv6 ACLs, inspection policies, and stateful connection tracking.

## Overview

Cisco ASA supports IPv6 firewalling with stateful inspection. ASA uses security levels on interfaces (0=outside, 100=inside) to automatically permit traffic from higher to lower security levels while blocking the reverse. Explicit ACLs can override or supplement the security level policy. On ASA 9.0(1) and later, IPv4 and IPv6 entries use the same `access-list` syntax. IPv6 processing starts when you configure an IPv6 address on an interface, or when you use `ipv6 enable` for link-local only.

## Enable IPv6 on ASA Interfaces

```text
! Configure IPv6 on interfaces
interface GigabitEthernet0/0
 description "Internet (Outside)"
 nameif outside
 security-level 0
 ipv6 address 2001:db8:0:1::2/64
 no shutdown

interface GigabitEthernet0/1
 description "Internal LAN (Inside)"
 nameif inside
 security-level 100
 ipv6 address 2001:db8:100:10::1/64
 no shutdown
```

## IPv6 Access Control Lists

### Create IPv6 ACL for Inbound Traffic

```text
! Outside ACL for inbound IPv6 traffic from the internet
! Return traffic for established TCP/UDP flows is handled statefully by the ASA
access-list OUTSIDE-IN extended permit icmp6 any6 any6 unreachable
access-list OUTSIDE-IN extended permit icmp6 any6 any6 packet-too-big
access-list OUTSIDE-IN extended permit icmp6 any6 any6 time-exceeded
access-list OUTSIDE-IN extended permit icmp6 any6 any6 parameter-problem

! Allow HTTPS inbound to an internal web server
access-list OUTSIDE-IN extended permit tcp any6 host 2001:db8:100:10::10 eq 443

! Allow SSH from a management network to an internal bastion host
access-list OUTSIDE-IN extended permit tcp 2001:db8:ffff:100::/64 host 2001:db8:100:10::22 eq 22

! Apply ACL to outside interface
access-group OUTSIDE-IN in interface outside
```

## ICMPv6 Inspection Policy

```text
! Enable stateful ICMP/ICMPv6 inspection
! Use inspect icmp error instead if you only want ICMP error inspection
policy-map global_policy
 class inspection_default
  inspect icmp

service-policy global_policy global
```

## Stateful IPv6 Inspection

ASA tracks IPv6 connections in its state table:

```text
! View active connections (IPv4 and IPv6)
show conn

! View connection counts
show conn count

! View IPv6 routing
show ipv6 route

! Debug IPv6 packet flow
packet-tracer input outside tcp 2001:db8:0:1::100 54321 2001:db8:100:10::10 443 detailed
```

## IPv6 Object Groups

For cleaner ACL management:

```text
! Create IPv6 object group for management hosts
object-group network IPV6-MANAGEMENT
 network-object 2001:db8:ffff:100::/64
 network-object host 2001:db8:ffff:100::10
 description "IPv6 Management Networks"

! Create object group for internal servers
object-group network IPV6-SERVERS
 network-object host 2001:db8:100:10::10
 network-object host 2001:db8:100:10::20

! Use in ACL
access-list OUTSIDE-IN extended permit tcp object-group IPV6-MANAGEMENT host 2001:db8:100:10::22 eq 22
access-list OUTSIDE-IN extended permit tcp any6 object-group IPV6-SERVERS eq 443
```

## IPv6 Connection Timeout and Limits

```text
! Configure the global connection timeout
timeout conn 1:00:00

! Limit TCP embryonic (half-open) connections to the internal web server
access-list IPV6-SERVER-PROTECT extended permit tcp any6 host 2001:db8:100:10::10 eq 443

class-map IPV6-SERVER-CLASS
 match access-list IPV6-SERVER-PROTECT

policy-map global_policy
 class IPV6-SERVER-CLASS
  set connection embryonic-conn-max 1000
```

## Bogon Filtering

```text
! Add bogon source filters near the top of the outside ACL
access-list OUTSIDE-IN line 1 extended deny ipv6 ::/128 any6
access-list OUTSIDE-IN line 2 extended deny ipv6 ::1/128 any6
access-list OUTSIDE-IN line 3 extended deny ipv6 fe80::/10 any6
access-list OUTSIDE-IN line 4 extended deny ipv6 fc00::/7 any6
```

## Verification

```text
! Show IPv6 interface status
show ipv6 interface

! Show IPv6 ACL counters
show access-list OUTSIDE-IN

! Show IPv6 connections
show conn detail

! Test packet traversal (packet tracer)
packet-tracer input outside tcp 2001:db8:0:1::200 12345 2001:db8:100:10::10 22 detailed
! Shows: whether the packet would be allowed or dropped and why
```

## Summary

Cisco ASA IPv6 firewalling uses security levels (inside=100, outside=0) for default policy and explicit ACLs for granular control. On ASA 9.0(1) and later, create IPv6 rules with the unified `access-list` syntax and attach them with `access-group NAME in interface outside`. Assigning an IPv6 address to an interface enables IPv6 processing on that interface; `ipv6 enable` is used when you only want link-local addressing. Always allow essential ICMPv6 error messages, especially Packet Too Big (type 2), and use `inspect icmp` when you want stateful ICMP/ICMPv6 handling. Use `packet-tracer input outside tcp SRCIP SRCPORT DSTIP DSTPORT detailed` to test how specific IPv6 packets would be handled without actually sending them. Use object groups for manageable ACL definitions.
