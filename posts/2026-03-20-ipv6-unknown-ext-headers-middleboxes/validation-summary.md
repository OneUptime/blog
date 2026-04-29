# Validation Summary: How to Handle Unknown Extension Headers in Middleboxes

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPv6 extension headers
- RFC 7045
- RFC 5095
- RFC 7872
- RFC 8200
- `ip6tables`
- `nftables`
- Scapy
- `ping` / iputils

## Sources Consulted
- RFC 7045, "Transmission and Processing of IPv6 Extension Headers" - https://datatracker.ietf.org/doc/html/rfc7045
- RFC 5095, "Deprecation of Type 0 Routing Headers in IPv6" - https://datatracker.ietf.org/doc/html/rfc5095
- RFC 7872, "Observations on the Dropping of Packets with IPv6 Extension Headers in the Real World" - https://www.rfc-editor.org/rfc/rfc7872
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification" - https://datatracker.ietf.org/doc/rfc8200/
- RFC 8021, "Generation of IPv6 Atomic Fragments Considered Harmful" - https://www.rfc-editor.org/rfc/rfc8021.html
- RFC 3810, "Multicast Listener Discovery Version 2 (MLDv2) for IPv6" - https://datatracker.ietf.org/doc/rfc3810/
- IANA IPv6 Extension Header Types registry - https://www.iana.org/assignments/ipv6-parameters/ipv6-parameters.xhtml
- Scapy IPv6 API documentation - https://scapy.readthedocs.io/en/latest/api/scapy.layers.inet6.html
- Local `ping -h` output from iputils
- Local `ip6tables -m ipv6header -h` and `ip6tables -m rt -h` output
- Local `man nft(8)` documentation

## Issues Found
- The RFC 7045 section overstated the requirements. The original text said unknown extension headers must be forwarded and that drops must be logged and should trigger ICMPv6. RFC 7045 is narrower: forwarding nodes that inspect EHs must understand standard EHs, default policy should allow standard EHs, unrecognized EHs must be configurable to allow, and defaults may still drop unrecognized or experimental EHs. I rewrote this section to match the RFC text.
- The measurement block used broad drop-rate ranges without tying them to an authoritative source. I replaced it with rates directly documented in RFC 7872.
- The `ping6` example used an outdated command form and incorrectly claimed that `-s 1280 -M want` forces fragmentation. Current iputils uses `ping -6`, and local fragmentation depends on MTU. I updated the command and comment to reflect that.
- The Scapy fragment test built an IPv6 atomic fragment (`m=0`, `offset=0`), which RFC 8021 treats as undesirable to generate. I replaced it with a real fragmented ICMPv6 Echo Request built via Scapy's `fragment6()` helper.
- The `ip6tables` rules used `-m ipv6header --header ...` without `--soft`, which does not mean "packet contains this header". I changed those rules to use `--soft` so they match presence of the named extension header.
- The `ip6tables` and `nftables` comments tied forwarded Hop-by-Hop handling to MLD too directly. MLD uses Hop Limit 1 and Router Alert and is link-local, so I generalized the comments.
- The `nftables` example relied on `ip6 nexthdr` for EH handling even though the official `nft(8)` docs warn that it only inspects the immediate Next Header field. The original RH0 rule was also syntactically invalid. I replaced the example with parser-aware `exthdr`, `rt type`, and `meta l4proto` usage.

## Review Notes
- RFC 7045 does not require forwarding nodes to allow unrecognized extension headers by default; it requires them to be configurable to allow such traffic. The post now reflects that nuance.
- The RFC 7872 drop rates are historical measurements from a specific dataset, not universal current Internet-wide rates.
- `nftables` can match specific IPv6 extension headers with `exthdr` and `rt` expressions, but generic "unknown EH" handling is not something a simple `ip6 nexthdr` check can express correctly.
