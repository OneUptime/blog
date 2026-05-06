# Validation Summary: How to Configure BGP IPv6 Blackhole Community

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP standard communities
- RFC 7999 BLACKHOLE community
- IPv6 BGP routing
- BIRD 2
- FRRouting (FRR)
- Cisco IOS
- RIPEstat Data API

## Sources Consulted
- RFC 1997, `BGP Communities Attribute`: https://www.ietf.org/ietf-ftp/rfc/rfc1997.txt.pdf
- RFC 7999, `BLACKHOLE Community`: https://www.rfc-editor.org/rfc/rfc7999
- IANA, `Border Gateway Protocol (BGP) Well-known Communities`: https://www.iana.org/assignments/bgp-well-known-communities/bgp-well-known-communities.xhtml
- BIRD 2.16 User's Guide: https://bird.nic.cz/doc/bird-2.16.2.html
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRRouting Route Maps documentation: https://docs.frrouting.org/en/latest/routemap.html
- Cisco IOS IP Routing: BGP Command Reference, `ip community-list` / `ip bgp-community new-format`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-c1.html
- Cisco IOS IP Routing: BGP Command Reference, `neighbor send-community`: https://www.cisco.com/c/en/us/td/docs/ios/iproute_bgp/command/reference/irg_book/irg_bgp3.html
- Cisco IOS IPv6 Command Reference, `match ipv6 address`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i5.html
- RIPEstat Data API, `BGP State`: https://stat.ripe.net/docs/data-api/api-endpoints/bgp-state

## Issues Found
- The post described RFC 7999 IPv6 blackholing, but the original BIRD, FRR, and Cisco examples were generic community/local-preference policy examples rather than BLACKHOLE signaling. I replaced them with examples that tag an IPv6 `/128` with `65535:666`.
- The sample neighbor `2001:db8:peer::1` was not valid IPv6 notation. I replaced it with a valid documentation-prefix address.
- The standard-community example incorrectly labeled `65000:100` as a well-known community. I corrected it to use `65535:666` and identified it as the RFC 7999 BLACKHOLE well-known community.
- The FRR example used Cisco-style `ip community-list` syntax and applied an inbound local-preference policy instead of tagging an outbound IPv6 blackhole route. I rewrote it to use FRR route-map and IPv6 prefix-list syntax consistent with the documented FRR CLI.
- The Cisco IOS example also applied an inbound local-preference policy instead of advertising the BLACKHOLE community upstream. I changed it to an outbound route-map with `send-community` and IPv6 prefix matching.
- The RIPEstat `jq` filter referenced a nonexistent `.data.routes[].attrs.communities` path. Based on the RIPEstat API documentation and a live response check, I corrected it to `.data.bgp_state[].community`.
- The overview and conclusion overstated the effect of `65535:666`. I qualified the wording so it matches RFC 7999: the receiving network must explicitly choose to honor the BLACKHOLE community.

## Review Notes
- No technical issues remain after correction.
- The examples now use valid documentation-prefix IPv6 addresses and an illustrative `/128`. Upstream acceptance rules for blackhole announcements remain provider-specific.
- The RIPEstat command is syntactically correct, but it must be run against a live announced prefix to produce meaningful external verification.
- The external links in the post were checked and resolved successfully: `https://oneuptime.com` and the author's GitHub profile.
