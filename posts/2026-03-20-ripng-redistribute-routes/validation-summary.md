# Validation Summary: How to Redistribute Routes into RIPng

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- RIPng
- IPv6 routing
- Route redistribution
- FRRouting
- Cisco IOS / IOS XE
- OSPFv3
- BGP
- Route maps and IPv6 prefix lists

## Sources Consulted
- FRRouting RIPng documentation: https://docs.frrouting.org/en/latest/ripngd.html
- FRRouting route-map documentation: https://docs.frrouting.org/en/latest/routemap.html
- FRRouting OSPFv3 redistribution documentation: https://docs.frrouting.org/en/stable-9.0/ospf6d.html
- Cisco IOS RIP for IPv6 route redistribution guide: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_rip/configuration/15-mt/irr-15-mt-book/ip6-rip-route-redist.html
- Cisco IOS IPv6 redistribute command reference: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-m1.html
- Cisco IOS show ipv6 rip command reference: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s5.html
- Cisco IOS set metric route-map command reference: https://www.cisco.com/c/en/us/td/docs/ios/iproute_pi/command/reference/iri_book/iri_pi2.html
- RFC 2080, RIPng for IPv6: https://datatracker.ietf.org/doc/html/rfc2080

## Issues Found
- The Cisco BGP redistribution example used `redistribute bgp metric 8`, but Cisco IOS requires the BGP autonomous system number/process ID when redistributing BGP. Changed it to `redistribute bgp 65001 metric 8`.
- The loop-prevention snippet used inline `!` comments after commands, which is not safe IOS/FRR configuration syntax. Moved those comments to separate configuration-comment lines.
- The loop-prevention snippet defined the `RIPNG_TO_OSPF` route map but did not apply it to OSPFv3 redistribution. Added `router ospf6` with `redistribute ripng route-map RIPNG_TO_OSPF`, matching FRRouting OSPFv3 redistribution syntax.
- The Cisco verification example used Unix `grep`, which is not a Cisco IOS CLI command. Replaced it with the documented `show ipv6 rip RIPNG_PROCESS database` form.
- The summary described redistribution only as `redistribute <protocol> metric <value>`, which omitted Cisco process IDs required for protocols such as BGP. Updated the summary to distinguish FRRouting syntax from Cisco IOS syntax where a process ID is required.

## Review Notes
Validated against official documentation and RFC 2080. The examples were not executed on live FRRouting or Cisco IOS devices, so platform-specific feature availability still depends on the installed FRR/Cisco release and enabled routing daemons.
