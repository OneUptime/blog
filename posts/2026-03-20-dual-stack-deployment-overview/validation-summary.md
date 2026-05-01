# Validation Summary: How to Understand Dual-Stack IPv4/IPv6 Deployment

## Status
validated

## Post Type
Guide / Overview

## Technologies Covered
- IPv4
- IPv6
- Dual-stack network deployment
- DNS (`A`, `AAAA`, `PTR`, `ip6.arpa`)
- RFC 6724 address selection
- Happy Eyeballs (RFC 8305)
- Linux firewall tooling (`iptables`, `ip6tables`, `nftables`)
- OSPFv2 / OSPFv3
- MP-BGP

## Sources Consulted
- RFC 6724, "Default Address Selection for Internet Protocol Version 6 (IPv6)": https://www.rfc-editor.org/rfc/rfc6724
- RFC 8305, "Happy Eyeballs Version 2: Better Connectivity Using Concurrency": https://datatracker.ietf.org/doc/html/rfc8305
- RFC 3596, "DNS Extensions to Support IP Version 6": https://www.rfc-editor.org/rfc/rfc3596
- RFC 5321, "Simple Mail Transfer Protocol": https://www.rfc-editor.org/rfc/rfc5321
- RFC 4861, "Neighbor Discovery for IP version 6 (IPv6)": https://www.rfc-editor.org/rfc/rfc4861
- RFC 8415, "Dynamic Host Configuration Protocol for IPv6 (DHCPv6)": https://www.rfc-editor.org/rfc/rfc8415
- FRRouting documentation, "BGP": https://docs.frrouting.org/en/latest/bgp.html
- nftables wiki, "Nftables families": https://wiki.nftables.org/wiki-nftables/index.php/Nftables_families
- Local CLI help output: `iptables --help`, `ip6tables --help`, `nft --help`

## Issues Found
- The RFC 6724 explanation overstated IPv6 preference as a blanket rule and the simplified precedence list had `2002::/16` ordered ahead of `::ffff:0:0/96`, which does not match the RFC 6724 default policy table. I corrected the wording to reflect that native IPv6 is generally preferred when suitable source addresses exist, and I fixed the simplified ordering.
- The Happy Eyeballs section described a fixed parallel race with a 250 ms delay before starting IPv4. RFC 8305 defines staggered connection attempts across address families and recommends a 250 ms connection-attempt delay as a default, not a universal fixed "start IPv4 after 250 ms" rule. I updated the wording accordingly.
- The DNS section said every service needs both `A` and `AAAA` records. That is too absolute; the requirement applies to services intended to be dual-stack reachable. I narrowed the wording to dual-stack services.
- The IPv6 reverse-DNS example had the `ip6.arpa` nibble-reversal wrong for `2001:db8::/32`, and the PTR owner name was therefore incorrect. I corrected both to the RFC 3596 nibble-reversed form.
- The MP-BGP snippet showed `neighbor 192.0.2.1 activate` without putting IPv4 activation under an IPv4 address-family context, which is misleading for common FRR/Cisco-style configuration. I rewrote the snippet to show activation under both `address-family ipv4 unicast` and `address-family ipv6 unicast`.
- The operational checklist claimed NTP was critical for RA/DHCPv6 leases. Router Advertisement and DHCPv6 lifetimes are protocol timers expressed in seconds, not something that depends on wall-clock synchronization in the way implied. I removed that rationale and kept the checklist item as a general operational requirement.

## Review Notes
- The firewall examples are syntactically valid, but the `nft add rule inet filter input ...` example assumes the `inet filter` table and `input` chain already exist.
- RFC 6724 policy can be overridden by host-specific policy tables, so real client behavior may differ from the default example in tuned environments.
- The post correctly uses documentation-only example prefixes such as `192.0.2.0/24`, `203.0.113.0/24`, and `2001:db8::/32`.
