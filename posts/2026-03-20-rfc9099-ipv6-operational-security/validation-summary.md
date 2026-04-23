# Validation Summary: How to Understand RFC 9099 IPv6 Operational Security Considerations

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- IPv6 operational security
- RFC 9099
- IPv6 addressing and ULA
- Bogon and reserved-prefix filtering
- ICMPv6 and NDP filtering
- iproute2 `ip`
- ip6tables
- IPv6 extension headers
- RA Guard, DHCPv6 Shield, SAVI, and SEND
- BGP, OSPFv3, and IS-IS routing security

## Sources Consulted
- RFC 9099: Operational Security Considerations for IPv6 Networks - https://www.rfc-editor.org/rfc/rfc9099.html
- RFC 4890: Recommendations for Filtering ICMPv6 Messages in Firewalls - https://www.rfc-editor.org/rfc/rfc4890.html
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6) - https://www.rfc-editor.org/rfc/rfc4861.html
- RFC 4862: IPv6 Stateless Address Autoconfiguration - https://www.rfc-editor.org/rfc/rfc4862.html
- RFC 4193: Unique Local IPv6 Unicast Addresses - https://www.rfc-editor.org/rfc/rfc4193.html
- RFC 7045: Transmission and Processing of IPv6 Extension Headers - https://www.rfc-editor.org/rfc/rfc7045.html
- RFC 8200: Internet Protocol, Version 6 (IPv6) Specification - https://www.rfc-editor.org/rfc/rfc8200.html
- IANA IPv6 Special-Purpose Address Space registry - https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml
- IANA IPv6 Address Space registry - https://www.iana.org/assignments/ipv6-address-space/ipv6-address-space.xhtml
- IANA ICMPv6 Parameters registry - https://www.iana.org/assignments/icmpv6-parameters/icmpv6-parameters.xhtml
- Local `ip -6 addr help`, `ip6tables --help`, and `ip6tables -m hl --help` output

## Issues Found
- The overview said RFC 9099 "updates" RFC 4942. RFC 9099 describes itself as complementing RFC 4942, so the wording was corrected.
- The ULA guidance did not distinguish the overall `fc00::/7` ULA block from the normally locally assigned `fd00::/8` space. The text was clarified.
- The address-verification commands used brittle `grep` patterns and only matched `fd` or `2001:` addresses. They now use `ip -6 addr show to fc00::/7` and `ip -6 addr show to 2000::/3`.
- The bogon filtering section implied every listed prefix should be filtered unconditionally. It now notes exceptions for intentional services such as NAT64 and for valid more-specific IANA allocations.
- The ICMPv6 section overstated which types can be blocked and treated all NDP as source-link-local. The section now follows RFC 4890 more closely, treats Echo Request/Reply as normally allowed, moves Redirect to explicit policy, and constrains NDP with hop limit 255 instead of incorrectly requiring all NDP sources to be link-local.
- The ICMPv6 ip6tables example omitted Neighbor Advertisement and used overly strict NDP source filtering. The example now includes echo handling and router/neighbor solicitation/advertisement rules with hop-limit matching.
- The BGP ip6tables example used `<trusted-bgp-peers>`, which is not valid shell syntax in a bash command. It now uses a documentation-prefix example address with a comment instructing replacement.
- The extension-header section incorrectly said packets with unrecognized extension headers in destination options should be dropped. It now focuses on illegal extension-header order/repetition, incomplete first fragments, and policy-based Hop-by-Hop handling.

## Review Notes
The edited `ip` commands were run successfully. The ip6tables examples were checked against installed command help and match help; a full `ip6tables-restore --test` parse was blocked by non-root permissions at commit time, not by a syntax error.
