# Validation Summary: How to Configure BGP Route Aggregation with Summary-Only

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- BGP
- Cisco IOS / IOS XE
- BGP route aggregation and `aggregate-address`
- `summary-only`, `as-set`, and `unsuppress-map`

## Sources Consulted
- Cisco, "Understand Route Aggregation in BGP" https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/5441-aggregation.html
- Cisco IOS IP Routing: BGP Command Reference, `aggregate-address` https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-a1.html
- Cisco IOS IP Routing: BGP Command Reference, `neighbor unsuppress-map` https://www.cisco.com/c/en/us/td/docs/ios/iproute_bgp/command/reference/irg_book/irg_bgp4.html
- Cisco, "Troubleshoot Border Gateway Protocol Routes that Do Not Advertise" https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/19345-bgp-noad.html
- RFC 4271, "A Border Gateway Protocol 4 (BGP-4)" https://www.rfc-editor.org/rfc/rfc4271
- RFC 6472, "Recommendation for Not Using AS_SET and AS_CONFED_SET in BGP" https://www.rfc-editor.org/rfc/rfc6472
- RFC 9774, "Deprecation of AS_SET and AS_CONFED_SET in BGP" https://www.rfc-editor.org/rfc/rfc9774

## Issues Found
- The post said `Atomic aggregate` appears when `summary-only` is used and indicates that component routes were suppressed. I corrected this because Cisco documentation and RFC 4271 describe `ATOMIC_AGGREGATE` as meaning path information may be missing due to aggregation; the `s` code in `show ip bgp` is the direct suppression indicator.
- The post recommended `as-set` as a default best practice. I corrected this because Cisco IOS still supports the command, but RFC 9774, published in May 2025, deprecates origination of new BGP routes containing AS_SET/AS_CONFED_SET, so it should not be presented as the default recommendation for modern Internet-facing deployments.
- The `neighbor unsuppress-map` example was described too broadly. I clarified that it selectively re-advertises previously suppressed more-specific routes to a specific neighbor.
- The aggregate configuration example showed both the plain aggregate and the `summary-only` variant as if they were entered together. I adjusted the snippet so it clearly presents the non-`summary-only` form as comparison text and the `summary-only` form as the actual configuration to apply.

## Review Notes
- Cisco IOS command syntax in the post is valid, including `aggregate-address ... summary-only` and `neighbor ... unsuppress-map`.
- The post correctly states that at least one contributing route must exist in the BGP table for the aggregate to form.
- The post uses RFC 1918 prefixes for examples, which is acceptable for lab-style documentation, though TEST-NET ranges can be clearer for public-facing examples.
- Current standards guidance changed recently: RFC 9774 was published in May 2025 and obsoletes RFC 6472 on AS_SET/AS_CONFED_SET use.
