# Validation Summary: How to Set Up eBGP Peering Between Two Autonomous Systems

## Status
validated

## Post Type
Guide

## Technologies Covered
- Border Gateway Protocol (BGP)
- External BGP (eBGP)
- Cisco IOS routing configuration
- TCP MD5 authentication for BGP sessions
- Autonomous systems and route verification

## Sources Consulted
- RFC 4271, "A Border Gateway Protocol 4 (BGP-4)": https://datatracker.ietf.org/doc/rfc4271/
- RFC 5737, "IPv4 Address Blocks Reserved for Documentation": https://www.rfc-editor.org/rfc/rfc5737.html
- RFC 7454, "BGP Operations and Security": https://www.rfc-editor.org/rfc/rfc7454.html
- RFC 2385, "Protection of BGP Sessions via the TCP MD5 Signature Option": https://datatracker.ietf.org/doc/rfc2385/
- Cisco IOS IP Routing: BGP Configuration Guide, "Connecting to a Service Provider Using External BGP": https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/configuration/15-mt/irg-15-mt-book/irg-external-sp.html
- Cisco IOS IP Routing: BGP Command Reference, "show ip bgp neighbors" and related commands: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-s1.html
- Cisco IOS IP Routing: BGP Command Reference, "network", "neighbor password", and related commands: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-m1.html
- Cisco Support, "Troubleshoot Border Gateway Protocol Routes that Do Not Advertise": https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/19345-bgp-noad.pdf
- Cisco Support, "Configure ASA Border Gateway Protocol": https://www.cisco.com/c/en/us/support/docs/security/asa-5500-x-series-next-generation-firewalls/118050-config-bgp-00.html

## Issues Found
- The original `network` examples implied the prefixes would advertise immediately, but Cisco BGP only originates a `network` statement when a matching route already exists in the local IP routing table. I added that prerequisite to both configuration snippets.
- The CE example used `203.0.114.0/24`, which is not one of the RFC 5737 documentation ranges. I replaced it with `192.0.2.0/24`.
- Step 6 used `show ip bgp neighbors ... received-routes` as the primary verification command and suggested enabling inbound soft reconfiguration if it showed nothing. For a basic verification workflow on Cisco IOS, `show ip bgp neighbors ... routes` is the more appropriate command for accepted prefixes, while `received-routes` is for accepted and rejected routes and carries additional caveats. I corrected the command and explanation.
- The MD5 section said BGP sessions "should always" be authenticated. That was too absolute. I changed the wording to describe MD5 authentication as a common hardening measure rather than a universal requirement.
- The AS-path explanation said the peer's AS is prepended to the path. I made this more precise by stating that the advertising router prepends its own AS before sending the route.

## Review Notes
- The post uses classic Cisco IOS `router bgp` syntax without explicit address-family submodes. That remains valid for traditional IPv4 unicast configuration, though newer IOS XE examples often show address-family configuration explicitly.
- The TTL value of 1 and administrative distance of 20 are Cisco platform defaults for eBGP, not protocol requirements defined by RFC 4271 itself.
- Cisco IOS `neighbor ... password` configures TCP MD5 authentication. RFC 2385 is obsoleted by RFC 5925 (TCP-AO), but MD5 remains commonly deployed on Cisco platforms.
