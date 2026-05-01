# Validation Summary: How to Filter BGP Routes Using Prefix Lists

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP
- Cisco IOS
- IP prefix lists
- BGP route filtering
- BGP soft reset / route refresh

## Sources Consulted
- Cisco IOS XE IP Routing Commands: `ip prefix-list` and related command references: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9500/software/release/17-15/command_reference/b_1715_9500_cr/ip_routing_commands.pdf
- Cisco IOS IP Routing: BGP Command Reference: `show ip bgp neighbors`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-s1.html
- Cisco IOS IP Routing: BGP Command Reference: `neighbor soft-reconfiguration inbound`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-m1.html
- Cisco IOS IP Routing: BGP Command Reference: `clear ip bgp`: https://www.cisco.com/c/en/us/td/docs/ios/iproute_bgp/command/reference/irg_book/irg_bgp2.html
- Cisco support article, "Block One or More Networks From a BGP Peer": https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/13750-22.html
- RFC 2918, Route Refresh Capability for BGP-4: https://www.rfc-editor.org/rfc/rfc2918.html
- RFC 5737, IPv4 Address Blocks Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc5737

## Issues Found
- The post used `show ip bgp neighbors ... received-routes` without noting that this view requires `neighbor X.X.X.X soft-reconfiguration inbound` on Cisco IOS. I added that caveat and noted the memory cost, while keeping `routes` as the fallback verification command.
- The outbound example described `198.51.100.0/24` as an allocated prefix, but RFC 5737 reserves that block for documentation examples. I changed the wording so the example is no longer presented as a real allocated prefix.
- The comparison table overstated access-list limitations by saying access lists cannot match prefix length and are simply "legacy." Cisco documents that extended access lists can match exact masks and some mask ranges, though prefix lists are generally more convenient for BGP filtering. I corrected the table to reflect that.
- The soft-reset text implied `clear ip bgp ... soft` is universally nondisruptive. I clarified that this behavior depends on route refresh support, which aligns with Cisco guidance and RFC 2918.

## Review Notes
- The prefix-list syntax, `ge`/`le` usage, implicit deny behavior, and `neighbor ... prefix-list {in|out}` examples are technically correct.
- The bogon examples are illustrative rather than exhaustive. In production, operators typically maintain broader bogon filters and often combine prefix filtering with AS-path, community, max-prefix, and RPKI-based policy controls.
