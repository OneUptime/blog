# Validation Summary: How to Troubleshoot BGP Neighbor State Stuck in OpenSent

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- BGP-4
- BGP finite state machine
- BGP OPEN and NOTIFICATION messages
- Cisco IOS / IOS XE BGP troubleshooting commands

## Sources Consulted
- RFC 4271, "A Border Gateway Protocol 4 (BGP-4)": https://www.rfc-editor.org/rfc/rfc4271.html
- RFC 5492, "Capabilities Advertisement with BGP-4": https://www.rfc-editor.org/rfc/rfc5492.html
- RFC 6286, "Autonomous-System-Wide Unique BGP Identifier for BGP-4": https://www.rfc-editor.org/rfc/rfc6286.html
- IANA Border Gateway Protocol (BGP) Parameters registry: https://www.iana.org/assignments/bgp-parameters/bgp-parameters.xhtml
- Cisco IOS Debug Command Reference, `debug ip bgp`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/debug/command/i1/db-i1-cr-book/db-i1.html
- Cisco IOS IP Routing: BGP Command Reference, `neighbor timers`: https://www.cisco.com/c/en/us/td/docs/ios/iproute_bgp/command/reference/irg_book/irg_bgp4.html
- Cisco, "Troubleshoot Border Gateway Protocol Basic Issues": https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/218027-troubleshoot-border-gateway-protocol-bas.html
- Cisco, "Unsupported Capabilities Cause BGP Peer Malfunction": https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/116189-problemsolution-technology-00.html

## Issues Found
- The post listed Bad BGP Identifier as error 2/4. RFC 4271 and IANA define Bad BGP Identifier as OPEN error subcode 3, so I changed the examples, table, and duplicate router ID section to use 2/3.
- The post listed Unsupported Optional Parameter as 2/8 and used it for capability mismatch. RFC 4271 defines Unsupported Optional Parameter as 2/4, while RFC 5492 defines Unsupported Capability as 2/7. I changed the table and capability section to use 2/7 for unsupported/disjoint capability issues.
- The hold-time section described the issue as a timer mismatch and implied all hold times have a minimum of 3 seconds. RFC 4271 allows Hold Time 0 and requires values to be either 0 or at least 3 seconds, so I updated the wording and section title.
- The `show ip bgp summary` sample showed `MsgRcvd` as 1 while the text described no valid received OPEN. I changed the sample to `MsgRcvd` 0 for consistency.
- The Cisco IOS debug example used `debug ip bgp 203.0.113.2 opens`, but Cisco's documented `debug ip bgp` keywords do not include `opens`. I replaced it with supported BGP event and peer-specific debugging commands.

## Review Notes
The remaining Cisco IOS snippets are syntactically plausible and align with Cisco examples. The `neighbor dont-capability-negotiate` command is valid but should be used carefully because it disables capability negotiation for that peer.
