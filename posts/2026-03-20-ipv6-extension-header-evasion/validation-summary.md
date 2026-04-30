# Validation Summary: How to Understand IPv6 Extension Header-Based Evasion Attacks

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPv6 extension headers
- Linux Netfilter (`ip6tables`)
- Linux `nftables`
- Suricata IDS/IPS rules

## Sources Consulted
- RFC 7045, "Transmission and Processing of IPv6 Extension Headers" - https://www.rfc-editor.org/rfc/rfc7045.html
- RFC 7112, "Implications of Oversized IPv6 Header Chains" - https://www.rfc-editor.org/rfc/rfc7112.html
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification" - https://www.rfc-editor.org/rfc/rfc8200.html
- RFC 5095, "Deprecation of Type 0 Routing Headers in IPv6" - https://www.rfc-editor.org/rfc/rfc5095.html
- RFC 6946, "Processing of IPv6 \"Atomic\" Fragments" - https://www.rfc-editor.org/rfc/rfc6946.html
- RFC 9673, "IPv6 Hop-by-Hop Options Processing Procedures" - https://www.rfc-editor.org/rfc/rfc9673.html
- nftables man page - https://www.netfilter.org/projects/nftables/manpage.html
- Netfilter IPv6 extensions HOWTO - https://netfilter.org/documentation/HOWTO/netfilter-extensions-HOWTO-6.html
- Suricata rules format documentation - https://docs.suricata.io/en/suricata-8.0.3/rules/intro.html
- Suricata IP header keyword documentation - https://docs.suricata.io/en/suricata-7.0.3/rules/header-keywords.html

## Issues Found
- The extension-header chain example omitted the second Destination Options position and ended with `Payload`. I updated it to RFC 8200's recommended order ending in `Upper-Layer Header`, because Destination Options may also appear before the upper-layer header.
- The non-initial fragment explanation implied the first fragment always contains the transport header. I corrected it to match RFC 7112: the evasion problem exists when the first fragment does not contain the complete header chain.
- The Hop-by-Hop section said every router must process the header and cited RFC 6192 for dropping it on hosts. That was too absolute and the citation was not the right authority for this claim. I updated the text to reflect slow-path/special processing behavior documented in RFC 7045/RFC 8200 and removed the incorrect RFC 6192 claim.
- The `ip6tables` Hop-by-Hop examples used `-m ipv6header --header hop-by-hop` while the comments said they would match any packet containing that header. Per Netfilter documentation, `--soft` is required for header existence matching, so I added `--soft` to those rules.
- The nftables example used `ip6 nexthdr { hopopt, routing }`, which is not appropriate for matching extension-header presence through a chain and used an invalid symbolic name. I replaced it with `exthdr hbh exists` and `exthdr rt exists`, which is the documented nftables mechanism for matching IPv6 extension-header existence.
- The RFC 7045 summary was inaccurate. RFC 7045 does not say forwarding nodes must drop unrecognized Hop-by-Hop options or must never forward packets they cannot fully inspect. I rewrote the bullets to match RFC 7045's actual requirements around recognizing standard extension headers and configurable policy.
- The fragment rule labeled as blocking atomic fragments was incorrect: `--fragid 0 --fragmore` does not identify IPv6 atomic fragments. I replaced it with `-m frag --fragfirst --fraglast`, which matches a Fragment Header with offset 0 and M flag 0.
- The comment about requiring fragments to contain at least 1280 bytes was incorrect. I replaced it with an RFC 7112 note that complete first-fragment header-chain handling is a stack/device behavior, not a simple `ip6tables` match.
- The Suricata example used `alert ipv6 ...`, but Suricata's documented rule header protocols are `ip`, `tcp`, `udp`, and `icmp` for basic protocols. I changed the rule to use `alert ip ...` together with the documented `ipv6.hdr` buffer to match the IPv6 Next Header byte directly.

## Review Notes
- The `ip6tables` examples are syntactically consistent with the installed CLI help for the `ipv6header`, `rt`, and `frag` matches, but I could not perform privileged firewall insertion tests in this environment.
- RFC 9673 further clarifies modern Hop-by-Hop processing behavior, but the post now uses wording that is consistent with RFC 7045, RFC 7112, and RFC 8200.
