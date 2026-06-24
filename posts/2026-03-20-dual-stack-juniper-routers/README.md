# How to Configure Dual-Stack on Juniper Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPv4, Dual-Stack, Juniper, Junos

Description: Learn how to configure dual-stack IPv4 and IPv6 routing on Juniper routers running JunOS, including interface addressing, static routes, OSPF, and BGP address families.

## Overview

Juniper Junos OS supports dual-stack natively. IPv4 and IPv6 are both first-class routing families - each gets its own RIB (inet.0 for IPv4, inet6.0 for IPv6). Protocols such as OSPF run as separate instances (OSPF for IPv4, OSPFv3 for IPv6), while BGP supports both in a single session using multiprotocol extensions.

## Interface Configuration

```text
set interfaces ge-0/0/0 unit 0 description "WAN"
set interfaces ge-0/0/0 unit 0 family inet address 192.0.2.1/24
set interfaces ge-0/0/0 unit 0 family inet6 address 2001:db8:0:1::1/64

set interfaces ge-0/0/1 unit 0 description "LAN"
set interfaces ge-0/0/1 unit 0 family inet address 10.0.0.1/24
set interfaces ge-0/0/1 unit 0 family inet6 address 2001:db8:0:2::1/64

# Apply

commit
```

Verification:

```text
show interfaces ge-0/0/0 terse
show interfaces ge-0/0/1 terse
```

## Static Routes for Both Families

```text
# IPv4 default route
set routing-options static route 0.0.0.0/0 next-hop 192.0.2.254

# IPv6 default route
set routing-options rib inet6.0 static route ::/0 next-hop 2001:db8:0:1::254

# Verify
show route table inet.0
show route table inet6.0
```

## OSPF and OSPFv3

```text
# OSPFv2 for IPv4
set protocols ospf area 0.0.0.0 interface ge-0/0/1.0
set protocols ospf area 0.0.0.0 interface lo0.0 passive
set protocols ospf reference-bandwidth 100g

# OSPFv3 for IPv6 (separate process)
set protocols ospf3 area 0.0.0.0 interface ge-0/0/1.0
set protocols ospf3 area 0.0.0.0 interface lo0.0 passive

# Verify
show ospf neighbor
show ospf3 neighbor
show route protocol ospf
show route protocol ospf3 table inet6.0
```

## BGP Dual-Stack (Multiprotocol BGP)

```nginx
# Example with separate IPv4 and IPv6 peer sessions in one group
set protocols bgp group UPSTREAM type external
set protocols bgp group UPSTREAM peer-as 65002

# IPv4 peer
set protocols bgp group UPSTREAM neighbor 192.0.2.2 family inet unicast
set protocols bgp group UPSTREAM neighbor 192.0.2.2 export EXPORT-V4

# IPv6 peer on a separate session
set protocols bgp group UPSTREAM neighbor 2001:db8:0:1::2 family inet6 unicast
set protocols bgp group UPSTREAM neighbor 2001:db8:0:1::2 export EXPORT-V6

# Export policies
set policy-options policy-statement EXPORT-V4 term 1 from route-filter 10.0.0.0/8 orlonger
set policy-options policy-statement EXPORT-V4 term 1 then accept

set policy-options policy-statement EXPORT-V6 term 1 from route-filter 2001:db8::/32 orlonger
set policy-options policy-statement EXPORT-V6 term 1 then accept

# Verify
show bgp summary
show route protocol bgp table inet6.0
```

## Router Advertisement (RA) Configuration

```text
# Configure RA on LAN interface for host auto-configuration
set protocols router-advertisement interface ge-0/0/1.0 prefix 2001:db8:0:2::/64
set protocols router-advertisement interface ge-0/0/1.0 max-advertisement-interval 60
set protocols router-advertisement interface ge-0/0/1.0 min-advertisement-interval 20

# Managed flag (signal hosts to use DHCPv6 for stateful addressing)
set protocols router-advertisement interface ge-0/0/1.0 managed-configuration

# Suppress RA on WAN interface
# (Do not configure RA on upstream-facing interfaces)
```

## Firewall Filters (ACLs) for Dual-Stack

```text
# IPv4 filter
set firewall family inet filter INBOUND-V4 term ICMP from protocol icmp
set firewall family inet filter INBOUND-V4 term ICMP then accept

set firewall family inet filter INBOUND-V4 term BGP from source-address 192.0.2.2/32
set firewall family inet filter INBOUND-V4 term BGP from destination-address 192.0.2.1/32
set firewall family inet filter INBOUND-V4 term BGP from protocol tcp
set firewall family inet filter INBOUND-V4 term BGP from destination-port 179
set firewall family inet filter INBOUND-V4 term BGP then accept

set firewall family inet filter INBOUND-V4 term HTTPS from destination-address 10.0.0.10/32
set firewall family inet filter INBOUND-V4 term HTTPS from protocol tcp
set firewall family inet filter INBOUND-V4 term HTTPS from destination-port 443
set firewall family inet filter INBOUND-V4 term HTTPS then accept

set firewall family inet filter INBOUND-V4 term DEFAULT then reject

# IPv6 filter
set firewall family inet6 filter INBOUND-V6 term ICMPV6-CONTROL from next-header icmpv6
set firewall family inet6 filter INBOUND-V6 term ICMPV6-CONTROL then accept

set firewall family inet6 filter INBOUND-V6 term BGP from source-address 2001:db8:0:1::2/128
set firewall family inet6 filter INBOUND-V6 term BGP from destination-address 2001:db8:0:1::1/128
set firewall family inet6 filter INBOUND-V6 term BGP from next-header tcp
set firewall family inet6 filter INBOUND-V6 term BGP from destination-port 179
set firewall family inet6 filter INBOUND-V6 term BGP then accept

set firewall family inet6 filter INBOUND-V6 term HTTPS from destination-address 2001:db8:0:2::10/128
set firewall family inet6 filter INBOUND-V6 term HTTPS from next-header tcp
set firewall family inet6 filter INBOUND-V6 term HTTPS from destination-port 443
set firewall family inet6 filter INBOUND-V6 term HTTPS then accept

set firewall family inet6 filter INBOUND-V6 term DEFAULT then reject

# Apply to interface
set interfaces ge-0/0/0 unit 0 family inet filter input INBOUND-V4
set interfaces ge-0/0/0 unit 0 family inet6 filter input INBOUND-V6
```

## Verification Commands

```text
# Interface addresses
show interfaces terse

# Routing tables
show route table inet.0
show route table inet6.0

# NDP/ARP cache
show arp
show ipv6 neighbors

# BGP summary
show bgp summary

# Ping both families
ping 192.0.2.254
ping inet6 2001:db8:0:1::254

# Traceroute
traceroute 8.8.8.8
traceroute inet6 2001:4860:4860::8888
```

## Summary

Juniper Junos OS dual-stack assigns both `family inet` and `family inet6` on each interface unit. IPv4 routes live in inet.0, IPv6 routes in inet6.0 - set static routes using `routing-options rib inet6.0` for IPv6. Run OSPFv2 under `protocols ospf` and OSPFv3 under `protocols ospf3` as separate instances. For BGP, you can carry both families over one MP-BGP session or use separate IPv4 and IPv6 neighbor sessions as shown here. Create separate `family inet` and `family inet6` firewall filters and apply both on the interface.
