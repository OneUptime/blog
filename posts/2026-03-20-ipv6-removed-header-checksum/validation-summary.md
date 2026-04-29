# Validation Summary: How to Understand Why IPv6 Removed the Header Checksum

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4
- IPv6
- TCP
- UDP
- ICMPv4 / ICMPv6
- SCTP
- Ethernet and link-layer CRCs
- Python

## Sources Consulted
- RFC 791, Internet Protocol: https://www.rfc-editor.org/rfc/rfc791
- RFC 1812, Requirements for IP Version 4 Routers: https://www.rfc-editor.org/rfc/rfc1812
- RFC 8200, Internet Protocol, Version 6 (IPv6) Specification: https://www.rfc-editor.org/rfc/rfc8200
- RFC 4443, ICMPv6 for IPv6: https://www.rfc-editor.org/rfc/rfc4443
- RFC 6935, IPv6 and UDP Checksums for Tunneled Packets: https://www.rfc-editor.org/rfc/rfc6935
- RFC 3819, Advice for Internet Subnetwork Designers: https://www.rfc-editor.org/rfc/rfc3819
- RFC 792, Internet Control Message Protocol: https://www.rfc-editor.org/rfc/rfc792
- RFC 9293, Transmission Control Protocol (TCP): https://www.rfc-editor.org/rfc/rfc9293
- Executed the Python code example locally with `python3` to confirm it runs as written after correction.

## Issues Found
- The post stated that every IPv4 router must fully recalculate the header checksum on each hop. RFC 1812 is more precise: routers must verify the checksum and may use incremental checksum updating when the only change is TTL. I changed the wording in the introduction, subsection heading, and processing example to say routers verify and update the checksum rather than implying a full recomputation every time.
- The link-layer protection section said fiber links use "8b/10b or 64b/66b encoding with FEC", which conflated line coding with forward error correction. I replaced that with a technically correct statement that many modern links use strong link-layer error detection and, in some cases, FEC.
- The post claimed IPv6 "mandates checksum in all upper-layer protocols". RFC 8200 only requires pseudo-header updates for upper-layer protocols that use IP addresses in their checksum, and UDP is mandatory by default in IPv6 with limited tunnel exceptions per RFC 6935. I rewrote that section to describe TCP, UDP, ICMPv6, and SCTP accurately without overstating the rule.
- The post said "ICMPv6: Checksum required (optional in IPv4)". That was incorrect. ICMPv4 also has a required checksum per RFC 792; the IPv6 change is that ICMPv6 includes the IPv6 pseudo-header. I corrected the ICMPv6 explanation accordingly.
- The checksum coverage summary implied that the listed protocols all cover the IPv6 pseudo-header. That is true for TCP, UDP, and ICMPv6, but not stated that way for SCTP. I narrowed the pseudo-header statement to TCP, UDP, and ICMPv6 only.
- The performance code example described IPv4 cost as two full checksum passes over the header and referred to add/XOR operations. The IPv4 internet checksum is not an XOR, and modern implementations may use incremental updates. I adjusted the code comments and estimate to make clear that the calculation is only a rough illustrative model.
- The silent misrouting section implied that no error is returned and that TCP-style recovery applies generally. I corrected it to say that usually no error is returned, that TCP/UDP/ICMPv6 will usually fail integrity checks at the wrong recipient, and that retransmission applies to reliable transports such as TCP.

## Review Notes
- The Python snippet is illustrative, not a benchmark. It now accurately presents itself as a rough estimate rather than a hardware-accurate performance model.
- The statement that UDP checksums are mandatory in IPv6 is accurate only in the default case; RFC 6935 defines narrow zero-checksum exceptions for certain tunnel encapsulations.
