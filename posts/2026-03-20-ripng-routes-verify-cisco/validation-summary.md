# Validation Summary: How to Verify RIPng Routes on Cisco

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS / IOS XE
- RIPng / IPv6 RIP
- IPv6 routing table verification
- Cisco show, debug, and clear commands

## Sources Consulted
- Cisco IOS IPv6 Command Reference: `show ipv6 rip` syntax, fields, database output, and timer fields: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s5.html
- Cisco IOS Debug Command Reference: `debug ipv6 rip` syntax and output: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/debug/command/db-i1-cr-book/db-i4.html
- Cisco IOS IPv6 Command Reference: `clear ipv6 rip` and `clear ipv6 route` command purposes: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_02.html
- Cisco IOS XE IP Routing Configuration Guide: interface-specific `show ipv6 rip name interface interface-id` usage: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9400/software/release/26-x/configuration_guide/rtng/b_26x_rtng_9400_cg/configuring_rip.html
- RFC 2080, RIPng for IPv6: protocol port, multicast group, metric range, and metric 16 infinity behavior: https://www.rfc-editor.org/rfc/rfc2080.html

## Issues Found
- Corrected `show ipv6 rip RIPNG_PROCESS interface brief` because Cisco documents interface filtering with a concrete `interface-id`, not a `brief` keyword.
- Corrected the `show ipv6 rip` sample timer output to include `Holddown lasts 0 seconds, garbage collect after 120`, matching Cisco's documented RIPng output.
- Updated the `show ipv6 rip database` sample to match Cisco's local RIB output format and changed the metric explanation so it does not imply that metric 1 means a route learned through a neighbor.
- Changed the IPv6 route table code description from `R - RIPng` to Cisco's documented `R - RIP` code while preserving the RIPng context.
- Removed unsupported `debug ipv6 rip events` and `debug ipv6 rip database` examples; Cisco documents `debug ipv6 rip` with optional interface and VRF filters.
- Replaced the invalid IPv6 prefix `2001:DB8:LOST::/64` with a valid documentation prefix and adjusted the metric 16 example to Cisco's documented expired-route format.
- Corrected the monitoring section: `clear ipv6 rip` deletes RIPng routes rather than resetting counters, and `clear ipv6 route rip` is not the documented way to force an immediate RIPng update.

## Review Notes
The post is now technically aligned with Cisco IOS / IOS XE documentation. Interface-specific `show ipv6 rip name interface interface-id` is documented in Catalyst IOS XE configuration guides, while the broader IOS command reference documents the common `show ipv6 rip [name] [database | next-hops]` form.
