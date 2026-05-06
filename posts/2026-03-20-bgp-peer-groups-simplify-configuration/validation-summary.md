# Validation Summary: How to Configure BGP Peer Groups to Simplify Configuration

## Status
validated

## Post Type
Guide

## Technologies Covered
- Border Gateway Protocol (BGP-4)
- Cisco IOS / Cisco IOS XE BGP peer groups
- BGP route filtering with prefix lists and route maps
- BGP route reflection
- BGP route refresh / soft reconfiguration

## Sources Consulted
- Cisco: BGP Peer Groups - https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/13755-29.html
- Cisco IOS IP Routing: BGP Command Reference, `neighbor peer-group` / `neighbor remote-as` / `neighbor soft-reconfiguration` - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-m1.html
- Cisco IOS IP Routing: BGP Command Reference, `show ip bgp peer-group` - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-s1.html
- Cisco IOS XE BGP Configuration Guide, configuring a BGP peer group - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/configuration/xe-16-12/irg-xe-16-12-book/configuring-a-basic-bgp-network.html
- Cisco IOS XE 17.x BGP 4 Soft Configuration - https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_irg-soft-config.html
- RFC 4271: A Border Gateway Protocol 4 (BGP-4) - https://www.rfc-editor.org/rfc/rfc4271
- RFC 2918: Route Refresh Capability for BGP-4 - https://www.rfc-editor.org/rfc/rfc2918.html

## Issues Found
- The verification output in Step 6 labeled the `CUSTOMERS` peer group as `internal` even though the sample configuration uses local AS `65001` and peer-group remote AS `65100`, which makes it an eBGP peer group. Updated the output to `peer-group external`.
- The sample output line under `show ip bgp neighbors 10.1.1.1 | include peer-group` was written as if it were a comment (`! Member ...`) and included punctuation that did not match Cisco output. Updated it to `Member of peer-group CUSTOMERS for session parameters`.
- The address-family example in Step 7 used `neighbor CUSTOMERS prefix-list CUSTOMER_IN in`, but `CUSTOMER_IN` had been introduced earlier as a route map name, not a prefix list. Updated the example to use `CUSTOMER_PREFIXES`, which matches the earlier prefix-list definition.
- The Step 5 explanation said that "most" per-neighbor settings override peer-group defaults. Cisco documents the rule more narrowly: members can override settings that do not affect outbound updates. Updated the sentence to reflect that behavior accurately.

## Review Notes
- `neighbor ... soft-reconfiguration inbound` remains a valid Cisco IOS command, but modern BGP peers commonly support Route Refresh (RFC 2918). Cisco documents the memory cost of storing unmodified received updates, so this command is best used deliberately rather than by default.
