# Validation Summary: How to Calculate the IPv4 Header Checksum

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4
- IP header checksum
- Python
- `tcpdump`
- `ethtool`
- TCP/IP networking

## Sources Consulted
- RFC 791, Internet Protocol: https://datatracker.ietf.org/doc/html/rfc791
- RFC 1812, Requirements for IP Version 4 Routers: https://datatracker.ietf.org/doc/rfc1812/
- RFC 1624, Computation of the Internet Checksum via Incremental Update: https://datatracker.ietf.org/doc/html/rfc1624
- Python `struct` documentation: https://docs.python.org/3.11/library/struct.html
- Python `socket` documentation: https://docs.python.org/3/library/socket.html
- Local `man tcpdump` / `tcpdump --help` output for checksum-verification flags
- Local `man ethtool` / `ethtool --help` output for `--offload`

## Issues Found
- The worked checksum example had incorrect 16-bit grouping and arithmetic. The total length field was grouped as `0040` instead of `003c`, which made the sum, carry fold, and final checksum wrong. I corrected the example so the computed checksum is `0xb1e6`.
- The router checksum update section cited RFC 1141 and used an incorrect incremental-update function. RFC 1624 corrects the RFC 1141 update formula, and the original code updated the checksum by `0x0001` instead of the required `0x0100` for a TTL decrement. I replaced the text and code with an RFC 1624-compatible TTL-specific update.
- The `tcpdump` example used the wrong long option. I changed `--no-verify-checksums` to the documented `--dont-verify-checksums`.
- The `bad cksum` explanation was too broad. I narrowed it to locally captured outbound traffic, which is the case affected by checksum offload during packet capture.

## Review Notes
- The Python checksum and verification examples are syntactically correct and work as described for IPv4 headers.
- `socket.inet_aton()` is valid for IPv4 packed-address conversion here, though its acceptance of shorthand IPv4 input is platform-dependent; the examples use standard dotted-quad addresses, so this is not a problem in the post.
