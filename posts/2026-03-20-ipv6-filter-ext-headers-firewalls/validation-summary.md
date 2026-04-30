# Validation Summary: How to Filter IPv6 Extension Headers in Firewalls

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Linux `ip6tables`
- Linux `nftables`
- ICMPv6
- IPsec
- IPv6 Extension Headers

## Sources Consulted
- RFC 7045: Transmission and Processing of IPv6 Extension Headers — https://www.rfc-editor.org/rfc/rfc7045
- RFC 4890: Recommendations for Filtering ICMPv6 Messages in Firewalls — https://www.rfc-editor.org/rfc/rfc4890.html
- RFC 9288: Recommendations on the Filtering of IPv6 Packets Containing IPv6 Extension Headers at Transit Routers — https://www.ietf.org/rfc/rfc9288.html
- RFC 5095: Deprecation of Type 0 Routing Headers in IPv6 — https://www.ietf.org/rfc/rfc5095.html
- RFC 3810: Multicast Listener Discovery Version 2 (MLDv2) for IPv6 — https://www.rfc-editor.org/rfc/rfc3810
- Netfilter Extensions HOWTO: New IPv6 netfilter matches — https://www.nftables.org/documentation/HOWTO/netfilter-extensions-HOWTO-6.html
- nftables wiki: Matching packet headers — https://wiki.nftables.org/wiki-nftables/index.php/Matching_packet_headers
- nftables wiki: Quick reference-nftables in 10 minutes — https://wiki.nftables.org/wiki-nftables/index.php/Quick_reference-nftables_in_10_minutes
- Local CLI help and translation checks: `ip6tables -m ipv6header -h`, `ip6tables -m rt -h`, `ip6tables -m frag -h`, `ip6tables -m mh -h`, `ip6tables-translate`, `nft -c`

## Issues Found
- The routing-header guidance was outdated. The post said to allow non-Type-0 routing headers including Type 3, but RFC 9288 recommends transit routers drop Routing Header Types 0, 1, and 3 while permitting Type 2 and Type 4. I updated the policy summary, examples, and conclusion accordingly.
- The `nftables` example matched ICMPv6 with `ip6 nexthdr ipv6-icmp`, which is incorrect when IPv6 extension headers are present. The nftables documentation recommends `icmpv6 type` or `meta l4proto` because `ip6 nexthdr` only matches the immediate next header. I corrected the nftables rules to use the right selectors.
- The `ip6tables` fragment example used `-m frag` without fragment-specific criteria. That is not the right way to match presence of the Fragment Header. I replaced it with `-m ipv6header --header frag --soft`.
- The ICMPv6 guidance was incomplete and too permissive in one spot. The post unconditionally allowed Redirect (Type 137), even though RFC 4890 treats Redirect as policy-dependent, and it omitted essential Destination Unreachable and Parameter Problem handling. I removed Redirect from the default allow set and added the missing RFC 4890-relevant types.
- The post said unknown extension headers should be “logged and forwarded” as an RFC 7045 recommendation. RFC 7045 does not say that; it says forwarding nodes must be configurable to allow unrecognized extension headers, while the default policy may still drop them. I corrected that claim.
- The fixed-offset `u32` example for matching a Hop-by-Hop Router Alert option was too brittle to recommend generically because it assumes a specific packet layout. I removed it and kept the rate-limit example aligned with RFC 9288 guidance on slow-path Hop-by-Hop handling.
- The `ip6tables` script flushed built-in chains without warning that it affects the entire ruleset. I added a note that the snippet is illustrative and should be adapted to the existing firewall policy before use.

## Review Notes
- The post is now technically accurate, but the `ip6tables` and `nftables` snippets are still focused on extension-header handling rather than being complete production firewall policies.
- `nftables` is the modern Linux packet-filtering framework; the `ip6tables` example remains useful for legacy or compatibility-layer environments.
