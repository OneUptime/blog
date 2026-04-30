# Validation Summary: How to Understand IPv6 Multicast Address Format

## Status
validated

## Post Type
Reference guide

## Technologies Covered
- IPv6 addressing
- IPv6 multicast
- IETF RFCs for multicast addressing and scopes
- `iproute2` multicast address inspection commands

## Sources Consulted
- RFC 4291, "IP Version 6 Addressing Architecture" - https://datatracker.ietf.org/doc/html/rfc4291
- RFC 3306, "Unicast-Prefix-based IPv6 Multicast Addresses" - https://datatracker.ietf.org/doc/html/rfc3306
- RFC 7346, "IPv6 Multicast Address Scopes" - https://datatracker.ietf.org/doc/html/rfc7346
- RFC 7371, "Updates to the IPv6 Multicast Addressing Architecture" - https://datatracker.ietf.org/doc/html/rfc7371
- RFC 4795, "Link-local Multicast Name Resolution (LLMNR)" - https://datatracker.ietf.org/doc/html/rfc4795
- RFC 9915, "Dynamic Host Configuration Protocol for IPv6 (DHCPv6)" - https://datatracker.ietf.org/doc/html/rfc9915
- IANA IPv6 Multicast Address Space registry - https://www.iana.org/assignments/ipv6-multicast-addresses/ipv6-multicast-addresses.xhtml
- Local `ip maddress` help output from `iproute2` (`ip -6 maddr help`)

## Issues Found
- The transient example `ff3e::8000:1` was labeled as site-local, but `e` is global scope and `3` also sets the prefix-based `P` flag. It was corrected to `ff15::1234`, which is a valid transient site-local example.
- The scope descriptions for interface-local and realm-local were too imprecise. They were updated to match RFC 4291 and RFC 7346 more closely.
- `ff02::1:3` was incorrectly identified as the DHCPv6 all-servers address. It was corrected to LLMNR; the DHCPv6 all-servers address remains `ff05::1:3`.
- `ff0e::1` was incorrectly listed as the well-known global all-nodes address. RFC 4291 defines well-known all-nodes addresses only for scopes 1 and 2, so that example was replaced with the valid site-local all-routers address `ff05::2`.
- The construction note used `1x` as a flags nibble example, which is not a valid nibble value in this context. The wording was corrected to describe basic well-known versus transient flag settings accurately.
- The prefix-based multicast example used `ff3e:0030:2001:db8::1` while claiming a `/32` prefix. `0030` encodes a prefix length of 48, not 32, so it was corrected to `ff3e:0020:2001:db8::1`.
- The prefix-based format block was updated to reflect the RFC 7371 update to RFC 3306, which splits the next 8 bits into additional flags and reserved bits.

## Review Notes
- The post is now technically accurate for the base IPv6 multicast format and the specific examples it includes.
- RFC 7371 extends the architecture beyond the base `|FF|flags|scope|group ID|` view for some multicast address families, so prefix-based and Embedded-RP discussions need that newer context.
