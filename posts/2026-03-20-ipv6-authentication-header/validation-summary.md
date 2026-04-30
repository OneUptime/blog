# Validation Summary: How to Understand the Authentication Header (AH) in IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPsec
- Authentication Header (AH)
- Encapsulating Security Payload (ESP)
- Linux `ip xfrm`
- `tcpdump`

## Sources Consulted
- RFC 4302, IP Authentication Header: https://www.rfc-editor.org/rfc/rfc4302.html
- RFC 4301, Security Architecture for the Internet Protocol: https://www.rfc-editor.org/rfc/rfc4301.html
- RFC 4303, IP Encapsulating Security Payload (ESP): https://www.rfc-editor.org/rfc/rfc4303.html
- RFC 6437, IPv6 Flow Label Specification: https://www.rfc-editor.org/rfc/rfc6437.html
- RFC 8200, Internet Protocol, Version 6 (IPv6) Specification: https://www.rfc-editor.org/rfc/rfc8200.html
- Local `ip-xfrm(8)` man page and `ip xfrm state help` / `ip xfrm policy help` output on the review host
- Local `ping(8)` man page on the review host
- Local `tcpdump(8)` man page and `tcpdump -d` filter parsing on the review host

## Issues Found
- The introduction said AH authenticates the "entire" IPv6 packet. RFC 4302 excludes mutable or otherwise zeroed fields from the ICV, so I corrected the wording to reflect that AH authenticates the packet except for those fields.
- The post treated anti-replay as unconditional. RFC 4302 and RFC 4301 describe anti-replay as an optional service at the receiver's discretion, so I changed the wording to "Optional anti-replay protection."
- The AH `Payload Len` description was imprecise. RFC 4302 defines it as the AH length in 32-bit words minus 2, not merely "not counting Next Header," so I corrected that field description.
- The ICV description implied a generic HMAC output truncated to "96+ bits." RFC 4302 defines the ICV as algorithm-specific and variable length, constrained to an integral multiple of 32 bits, so I updated that explanation.
- The mutable-fields section said the IPv6 Flow Label may be modified by intermediate nodes. RFC 6437 says a non-zero Flow Label is normally expected to be delivered unchanged, while RFC 4302 excludes it from the AH ICV for compatibility reasons. I corrected that explanation.
- The destination-address explanation implied it is always included in AH authentication. RFC 4302 distinguishes between the no-routing-header case and the Routing Header case, where the destination address is mutable but predictable. I corrected that note.
- The verification commands were dated or overly narrow. I changed `ping6` to the current documented `ping -6` form and changed the `tcpdump` filter from `ip6[6] == 51` to `ip6 protochain 51` so it still matches AH when other IPv6 extension headers are present.
- The AH vs ESP comparison overstated what ESP does and used imprecise terminology in the conclusion. I corrected the table and closing paragraph so they match RFC 4301/RFC 4303 behavior, changed IPv4 `TTL` to IPv6 `Hop Limit`, and removed the non-standard `ESP-AUTH` wording.

## Review Notes
- The Linux `ip xfrm` examples match the current command syntax in local `ip-xfrm(8)` documentation and CLI help output.
- End-to-end execution of `ip xfrm state add` and `ip xfrm policy add` was not possible in this environment because the kernel rejected the netlink operations with `RTNETLINK answers: Operation not permitted` without elevated privileges.
- The article's `ip xfrm` examples use documentation-prefix IPv6 addresses (`2001:db8::/32`), which is appropriate for a blog example but not directly usable on a live network without replacement.
