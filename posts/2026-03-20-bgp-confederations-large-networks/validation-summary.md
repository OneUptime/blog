# Validation Summary: How to Configure BGP Confederations for Large Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP
- BGP confederations
- iBGP
- eBGP
- Cisco IOS

## Sources Consulted
- RFC 5065: Autonomous System Confederations for BGP — https://datatracker.ietf.org/doc/html/rfc5065
- Cisco IOS XE 17.x IP Routing Configuration Guide, "Configuring Internal BGP Features" — https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_irg-int-features-0.html
- Cisco IOS Release 15M&T IP Routing: BGP Configuration Guide, "Configuring Internal BGP Features" — https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/configuration/15-mt/irg-15-mt-book/irg-int-features.html
- Cisco IOS IP Routing: BGP Command Reference — https://www.cisco.com/c/en/us/td/docs/ios/iproute_bgp/command/reference/irg_book.pdf

## Issues Found
- Step 2 was incomplete: the section title said it configured R3 and R4, but only R3 had a configuration snippet. I added the corresponding R4 configuration so sub-AS 65002 is fully configured.
- The route-reflector comparison table incorrectly described confederation next-hop behavior as if it matched normal eBGP between sub-ASes. I corrected this to note that next-hop is preserved by default across member ASes, which aligns with RFC 5065 and Cisco documentation.
- The external AS-path example was too broad as written. I qualified it to routes originated inside the confederation, because member-AS numbers are stripped at the confederation boundary, but any non-confederation AS_PATH content would still remain.
- The loopback-based peering examples omitted the prerequisite of IP reachability to those loopback addresses. I added a short note that an IGP or static routing must provide that reachability.

## Review Notes
- The examples use classic Cisco IOS IPv4-unicast BGP syntax. On deployments using explicit address-family activation, equivalent `address-family ipv4 unicast` and `neighbor ... activate` commands may also be required depending on platform and existing defaults.
