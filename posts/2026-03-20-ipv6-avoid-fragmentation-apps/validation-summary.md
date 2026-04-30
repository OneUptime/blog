# Validation Summary: How to Avoid IPv6 Fragmentation in Applications

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Path MTU Discovery (PMTUD)
- Datagram PLPMTUD (DPLPMTUD)
- Python `socket` programming
- DNS / EDNS(0) / `dig`
- BIND 9
- QUIC
- DTLS
- WireGuard

## Sources Consulted
- RFC 8200: IPv6 Specification: https://www.rfc-editor.org/rfc/rfc8200
- RFC 8201: Path MTU Discovery for IPv6: https://www.rfc-editor.org/rfc/rfc8201
- RFC 3542: Advanced Sockets API for IPv6: https://www.rfc-editor.org/rfc/rfc3542.html
- RFC 8899: Packetization Layer Path MTU Discovery for Datagram Transports: https://www.rfc-editor.org/rfc/rfc8899
- RFC 9000: QUIC Transport: https://www.rfc-editor.org/rfc/rfc9000.html
- RFC 9147: DTLS 1.3: https://www.rfc-editor.org/rfc/rfc9147
- RFC 9715: IP Fragmentation Avoidance in DNS over UDP: https://www.rfc-editor.org/rfc/rfc9715.html
- Linux `ipv6(7)`: https://man7.org/linux/man-pages/man7/ipv6.7.html
- Linux `ip(7)`: https://man7.org/linux/man-pages/man7/ip.7.html
- BIND 9 `dig` manual: https://bind9.readthedocs.io/en/v9.21.14/manpages.html
- BIND 9 configuration reference: https://bind9.readthedocs.io/en/v9_18_8/reference.html
- ISC KB on `dig` EDNS buffer defaults: https://kb.isc.org/docs/behavior-dig-versions-edns-bufsize
- WireGuard `wg-quick(8)`: https://man7.org/linux/man-pages/man8/wg-quick.8.html
- WireGuard `wg-quick` Linux source: https://git.zx2c4.com/wireguard-tools/tree/src/wg-quick/linux.bash

## Issues Found
- The strategy list referred to `IP_DONTFRAGMENT`, which is not the correct IPv6 socket option. I changed it to `IPV6_DONTFRAG` (or platform equivalent) because IPv6 uses source fragmentation semantics and does not use the IPv4 DF-bit model.
- The post said to keep packets below 1280 bytes without clarifying that 1280 is the full IPv6 packet size. I clarified that for UDP over IPv6 this usually means a payload of at most 1232 bytes before extension headers.
- The Python snippet enabled `IPV6_RECVPATHMTU` as if the example handled PMTU notifications directly. I changed the snippet to mark that option as optional and noted that consuming those notifications requires `recvmsg()` with `IPV6_PATHMTU` ancillary data, which the example does not implement.
- The Python snippet used a hard-coded numeric errno (`90`) for `EMSGSIZE`. I replaced it with `errno.EMSGSIZE` for correctness and readability.
- The DNS `dig` example used `@8.8.8.8`, which forces IPv4 and did not match the IPv6-focused discussion. I changed it to `dig -6 @2001:4860:4860::8888 ...` so the example actually exercises IPv6.
- The DNS section attributed the 1232-byte guidance to RFC 8900 as a blanket recommendation. I rewrote that text to state the technically accurate conservative practice without misattributing the recommendation.
- The QUIC section said implementations fall back to a 1280-byte minimum if PMTUD fails. I corrected this to QUIC's 1200-byte minimum UDP payload size until larger sizes are validated, per RFC 9000.
- The DTLS section implied PMTU discovery is simply "handled per RFC 6347". I corrected it to reflect that DTLS leaves PMTU discovery primarily to the application or underlying transport, and I updated the reference to include RFC 9147.
- The WireGuard section claimed a fixed "`underlying MTU - 60 bytes`" rule. I replaced this with the accurate behavior: WireGuard depends on correct interface MTU selection, and `wg-quick` auto-detects MTU from the endpoint route unless overridden.

## Review Notes
- The socket code remains Linux-oriented. That is appropriate for the post, but readers should know that IPv6 PMTU socket options and Python constant exposure vary by platform.
- The BIND configuration snippet is valid for current BIND 9 releases and matches current operational practice for conservative UDP sizing.
