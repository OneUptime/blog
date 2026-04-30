# Validation Summary: How to Understand the IPv6 Header Format

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPv6 base header and extension headers
- Python `socket` and `struct`
- `tcpdump`
- libpcap capture filters

## Sources Consulted
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification": https://www.rfc-editor.org/rfc/rfc8200.html
- RFC 6437, "IPv6 Flow Label Specification": https://datatracker.ietf.org/doc/html/rfc6437
- Python standard library documentation for `socket`: https://docs.python.org/3/library/socket.html
- `pcap-filter(7)` manual page: https://man7.org/linux/man-pages/man7/pcap-filter.7.html

## Issues Found
- The `tcpdump` flow-label capture filter was incorrect. It used `ip6[1:3]`, but `pcap-filter` only allows packet accessor sizes of 1, 2, or 4 bytes. I changed it to `ip6[0:4] & 0x000fffff == 0x000000ab`, which correctly masks the 20-bit IPv6 Flow Label from the first 32 bits of the header and compiles with the local `tcpdump`/libpcap toolchain.

## Review Notes
- The Python example was executed locally with Python 3.12.3 and produced a valid 40-byte IPv6 header and the expected parsed field values.
- The `tcpdump` command syntax was checked against the local `tcpdump` 4.99.4 help output, and the corrected capture filter was compiled locally with `tcpdump -d`.
- The post’s description of `Payload Length` is accurate at a high level; per RFC 8200 it counts everything after the base IPv6 header, including any extension headers.
- The example interface name `eth0` is environment-specific and may need to be replaced on systems that use different interface naming.
