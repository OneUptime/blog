# Validation Summary: How to Set Up BGP Multihoming with Two ISPs

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP
- eBGP multihoming
- Cisco IOS
- OSPF
- Route maps
- AS-path prepending
- Local preference

## Sources Consulted
- RFC 4271, "A Border Gateway Protocol 4 (BGP-4)": https://datatracker.ietf.org/doc/rfc4271/
- RFC 5737, "IPv4 Address Blocks Reserved for Documentation": https://datatracker.ietf.org/doc/rfc5737/
- RFC 6996, "Autonomous System (AS) Reservation for Private Use": https://datatracker.ietf.org/doc/rfc6996/
- RFC 7454, "BGP Operations and Security": https://www.rfc-editor.org/rfc/rfc7454.html
- Cisco IOS IP Routing: Protocol-Independent Command Reference, `set local-preference`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_pi/command/Cisco_IOS_IP_Routing_Protocol-Independent_Command_Reference.pdf
- Cisco IOS IP Routing: BGP Command Reference, `network`, `set as-path prepend`, `clear ip bgp`, and `default-information originate (BGP)`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book.pdf
- Cisco IOS IP Routing: OSPF Command Reference, `default-information originate (OSPF)`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_ospf/command/iro-cr-book.pdf
- Cisco IOS Configuration Fundamentals, "Searching and Filtering CLI Output": https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/fundamentals/configuration/xe-16-6/fundamentals-xe-16-6-book/cf-cli-search.html
- Cisco IOS IP Routing Protocol-Independent Command Reference, `show ip route`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_pi/command/Cisco_IOS_IP_Routing_Protocol-Independent_Command_Reference/IP_Routing_Protocol-Independent_Commands_S_through_T.html

## Issues Found
- The prerequisite sentence treated a `/24` as a direct RIR allocation requirement. I corrected it to the technically accurate public-IPv4 guidance: a public ASN and a prefix large enough to be accepted globally, with `/24` as the common minimum announced size.
- The outbound-policy explanation claimed local preference would send all outbound traffic to ISP1. I corrected this to the accurate case: local preference decides between competing paths when both ISPs advertise the same destination.
- The AS-path prepending example referenced `OUR_PREFIX` without defining it. I added `ip prefix-list OUR_PREFIX permit 192.0.2.0/24` so the route maps are complete.
- The failover verification used `show ip route bgp | head -20`, which is Unix syntax, not Cisco IOS CLI syntax. I replaced it with a valid IOS command.
- The default-route section incorrectly mixed BGP default origination with `redistribute bgp` into OSPF, which could leak the full BGP table into the IGP and did not match the section's stated goal. I replaced it with OSPF `default-information originate`, conditioned on a default route already existing in the RIB.

## Review Notes
- The IP addresses in the examples are RFC 5737 documentation prefixes, which is appropriate for a tutorial.
- The sample ASNs are RFC 6996 private-use values, which is fine for documentation. A real public multihoming deployment normally uses a public ASN and routable address space.
- AS-path prepending influences inbound routing but does not guarantee it; upstream local preference and remote policy can override it.
- OSPF default origination in Step 6 assumes the CE has `0.0.0.0/0` in its routing table. In full-table designs, that may require a separate default-route strategy.
- The GitHub author URL resolved to the expected profile.
