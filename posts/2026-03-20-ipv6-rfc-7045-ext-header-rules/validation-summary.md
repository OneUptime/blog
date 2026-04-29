# Validation Summary: How to Understand RFC 7045 Extension Header Transmission Rules

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- RFC 7045
- RFC 8200
- ICMPv6
- Linux `ip6tables`
- Linux `ping`

## Sources Consulted
- RFC 7045: https://www.rfc-editor.org/rfc/rfc7045.txt
- RFC 8200: https://www.rfc-editor.org/rfc/rfc8200.txt
- RFC 4443: https://www.rfc-editor.org/rfc/rfc4443.html
- IANA IPv6 Parameters registry: https://www.iana.org/assignments/ipv6-parameters/ipv6-parameters.xhtml
- `iptables-extensions(8)` Linux manual page: https://www.man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `ping(8)` Linux manual page: https://www.man7.org/linux/man-pages/man8/ping.8.html
- Local CLI help from `ip6tables -j REJECT -h`, `ip6tables -m ipv6header -h`, `ip6tables -m rt -h`, and `ping -h`

## Issues Found
- The post attributed incorrect ICMPv6 language to RFC 7045 Section 2.2. I replaced that section with the actual RFC 7045 Section 2.1 requirements: policy-based handling for standard extension headers, individually configurable discard policy, and configurable allowance for unrecognized headers.
- The endpoint behavior section was incorrect. Unknown extension headers are not handled "like No Next Header", and "action bits" apply to options, not arbitrary extension headers. I corrected this to RFC 8200 behavior: process headers in order, and discard plus send ICMPv6 Parameter Problem Code 1 when the required `Next Header` value is unrecognized.
- The IANA registry list incorrectly included `59` (`No Next Header`) as an extension header. I removed it and noted that RFC 7045 explicitly excludes it from the IPv6 Extension Header Types registry.
- The "policy framework" section described named allow/block/deprecated policy categories that RFC 7045 does not define. I rewrote it to reflect the RFC's actual configurable-policy requirements for standard, experimental, and unrecognized extension headers.
- The `ip6tables` example used `--reject-with icmp6-param-prob`, which is not a valid `ip6tables` REJECT type, and it claimed `-m ipv6header --header none --soft` matched unknown extension headers, which it does not. I replaced that with a valid explicit RH0 block example using logging plus `icmp6-adm-prohibited`, and removed the incorrect unknown-header matcher claim.
- The fragment-header test used `ping6 -s 1400 -M want`, which would not normally exceed a 1500-byte MTU and therefore would not reliably create a Fragment Header. I corrected the example to `ping -6 -s 2000 -M want` and clarified that the payload must exceed the egress MTU.
- The conclusion overstated RFC 7045 by claiming silent drops of unrecognized extension headers violate the RFC and that ICMPv6 error responses are required. I corrected the conclusion to match the RFC's actual configurable-policy requirements.

## Review Notes
- RFC 7045 is still relevant, but parts of the post depend on later documents too. Endpoint processing rules come from RFC 8200, and practical ICMPv6 reject behavior is governed by ICMPv6 and firewall implementation details rather than RFC 7045 alone.
- The article uses `ip6tables`, which is still supported, but many modern Linux systems implement it via the nftables backend.
