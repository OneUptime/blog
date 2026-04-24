# Validation Summary: How to Configure radvd Prefix Options

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- `radvd` and `radvd.conf` prefix options
- IPv6 Neighbor Discovery and Router Advertisements
- IPv6 SLAAC
- DHCPv6-managed addressing and prefix delegation
- Linux `ip` tooling
- `rdisc6` from `ndisc6`

## Sources Consulted
- `radvd.conf(5)` package documentation for radvd: https://manpages.debian.org/bookworm/radvd/radvd.conf.5.en.html
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://datatracker.ietf.org/doc/html/rfc4862
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- `rdisc6(8)` manual page: https://www.mankier.com/8/rdisc6
- Local `ip -6 addr help` output from iproute2 on the review host

## Issues Found
1. **`AdvRouterAddr` was described incorrectly and used in the wrong example.** The post said it makes the router include its own address in the RA for gateway use. In radvd, `AdvRouterAddr` is a Mobile IPv6-oriented option that advertises the interface address instead of a network prefix. I corrected the table entry and removed `AdvRouterAddr on;` from the standard SLAAC example.

2. **`AdvValidLifetime` was described with the wrong limit and the wrong scope.** The post claimed a maximum of 18.2 hours, but that limit applies to router/default-router lifetime fields, not the prefix valid lifetime. I updated the description to reflect that `AdvValidLifetime` controls prefix validity for on-link determination and SLAAC-derived addresses.

3. **`DeprecatePrefix` was presented as a normal renumbering control.** In radvd, `DeprecatePrefix` affects the shutdown RA, not regular advertisements. Normal renumbering is done by advertising a zero preferred lifetime and a reduced valid lifetime. I removed `DeprecatePrefix on;` from the active renumbering example and corrected the surrounding explanations.

4. **`DecrementLifetimes` needed tighter scope.** The original explanation made it sound like a generic renumbering feature. The radvd documentation says it is primarily intended to let advertised prefixes age in step with delegated-prefix lifetimes. I clarified that usage in the section and conclusion.

5. **One example used a non-documentation IPv6 prefix.** The multiple-prefix example used `2001:db9:2:1::/64`, which is outside the standard documentation prefix space. I replaced it with `2001:db8:3:1::/64` per RFC 3849.

6. **The final verification command comment overstated what it proves.** The original text claimed `grep -E "(temporary|mngtmpaddr)"` verified both temporary and stable addresses. I narrowed the comment and command so it now accurately checks for temporary addresses when privacy extensions are enabled.

## Review Notes
- The examples consistently use `/64`, which is correct for standard SLAAC deployments.
- For existing SLAAC addresses, hosts may ignore very short advertised valid lifetimes in some cases because of the RFC 4862 two-hour protection rule. That matters when testing rapid renumbering behavior.
- `DeprecatePrefix` is only appropriate when one router is advertising that prefix on the link; otherwise hosts can deprecate addresses that are still valid from another router's advertisements.
