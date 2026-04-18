# Validation Summary: How to Verify IPv4 Header Checksum Integrity

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- IPv4 protocol (header format, checksum algorithm)
- Python 3 (`struct` module, `bytes`/`bytearray`)
- One's complement arithmetic (RFC 1071)
- Wireshark / tcpdump (packet capture)
- `ethtool` (NIC offload configuration on Linux)

## Sources Consulted
- RFC 791 — Internet Protocol (IPv4 header layout, checksum field at octets 10–11)
- RFC 1071 — Computing the Internet Checksum (one's complement fold algorithm)
- RFC 1812 — Requirements for IP Version 4 Routers (router must recompute checksum when TTL decrements; drop on invalid checksum)
- Python `struct` module documentation (format characters, network byte order)
- Wireshark man page and wiki CaptureSetup/Offloading page
- `ethtool(8)` man page / `ethtool --help` output (verified locally)

## Issues Found
- **Wireshark `-k` flag claim was incorrect.** The post stated "Use the `-k` flag in Wireshark … for accurate captures." The `-k` flag in Wireshark simply means "start the capture session immediately" and has nothing to do with checksum validation. Fixed by replacing that guidance with the correct approach: modern Wireshark disables IP/TCP/UDP checksum validation by default; if it flags packets as bad, uncheck "Validate the IPv4 checksum if possible" under Edit → Preferences → Protocols → IPv4, or pass `-o ip.check_checksum:FALSE` to `tshark`. The existing `ethtool` guidance was preserved.

## Review Notes
- The Python checksum implementation is correct. Hand-verified the sample header (0x45 0x00, 0x00 0x28, 0x04 0xD2, 0x00 0x00, 0x40 0x06, 0x00 0x00, 0x0A 0x00 0x00 0x01, 0x0A 0x00 0x00 0x02): one's complement sum = 0x9E03, checksum = 0x61FC. The carry-fold expression `total = (total & 0xFFFF) + (total >> 16)` correctly handles one's complement wrap-around.
- `struct.pack("!BBHHHBBH4s4s", …)` produces exactly 20 bytes in network byte order, matching the IPv4 header layout.
- The verification claim (sum of all 16-bit words including the checksum field equals 0xFFFF for a valid header) is correct: ones_complement_sum(header) + ~ones_complement_sum(header) = 0xFFFF in 16-bit ones-complement arithmetic.
- `ethtool -K eth0 tx-checksumming off` is a valid invocation; `tx-checksumming` is the named feature that gates all TX checksum offloads. Some drivers expose `tx` as a shorter alias.
- Minor nuance not worth changing: the post says routers "silently discard" invalid-checksum packets. Per RFC 1812 §5.2.2, the packet MUST be discarded; ICMP behavior is implementation-defined but in practice most routers drop silently, so the wording is acceptable.
