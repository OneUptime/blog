# Validation Summary: How to Understand the Authentication Header (AH) in IPv6 - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- IPv6
- IPsec
- Authentication Header (AH)
- Encapsulating Security Payload (ESP)
- Linux `ip xfrm`
- `tcpdump` / libpcap filter syntax

## Sources Consulted
- RFC 4302: IP Authentication Header - https://www.rfc-editor.org/rfc/rfc4302.html
- RFC 4301: Security Architecture for the Internet Protocol - https://www.rfc-editor.org/rfc/rfc4301.html
- RFC 4303: IP Encapsulating Security Payload (ESP) - https://www.rfc-editor.org/rfc/rfc4303.html
- RFC 3715: IPsec-Network Address Translation (NAT) Compatibility Requirements - https://www.rfc-editor.org/rfc/rfc3715.html
- RFC 4868: Using HMAC-SHA-256, HMAC-SHA-384, and HMAC-SHA-512 with IPsec - https://www.rfc-editor.org/rfc/rfc4868.html
- RFC 7321: Cryptographic Algorithm Implementation Requirements and Usage Guidance for ESP and AH - https://www.rfc-editor.org/rfc/rfc7321.html
- `ip-xfrm(8)` Linux manual page - https://man7.org/linux/man-pages/man8/ip-xfrm.8.html
- `pcap-filter(7)` Linux manual page - https://man7.org/linux/man-pages/man7/pcap-filter.7.html

## Issues Found
- The post described ESP as effectively a superset of AH and said ESP authenticates only the payload. I corrected this to explain that ESP covers most deployments but does not protect preceding outer IP header fields in transport mode the way AH can.
- The transport-mode explanation implied AH always sits directly between the IPv6 base header and the upper-layer protocol. I corrected this to note the IPv6 extension-header placement rules from RFC 4302 and RFC 4301.
- The Linux `ip xfrm` AH examples used `auth hmac(sha256)` even though the post was describing the truncated HMAC-SHA-256-128 variant. I updated the commands to the documented `auth-trunc 'hmac(sha256)' ... 128` form.
- The `tcpdump` filter used `ip6 proto 51`, which libpcap documents as not chasing the IPv6 header chain. I changed it to `ip6 protochain 51` so it matches AH even when extension headers precede it.
- The sample `tcpdump` output claimed packet capture would reveal `auth hmac-sha256`. AH does not carry the algorithm name on the wire, so I reduced the example to fields that are actually visible in capture output.
- The combined AH+ESP shell snippet was a non-runnable placeholder. I replaced it with an accurate schematic note about using multiple `tmpl` entries and corrected the surrounding protocol-coverage explanation.

## Review Notes
- The post is technically valid after correction, but AH remains uncommon in modern IPsec deployments; most operational deployments use ESP and IKE-managed tooling instead of hand-written `ip xfrm` rules.
- I also locally parser-checked the updated `ip xfrm` and `tcpdump` syntax. Actual SA/policy installation still requires the appropriate privileges and matching peer-side configuration.
