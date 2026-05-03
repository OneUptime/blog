# Validation Summary: How to Create a Subnetting Cheat Sheet

## Status
validated

## Post Type
Reference / Cheat Sheet

## Technologies Covered
- IPv4 subnetting (CIDR notation, subnet masks, wildcard masks)
- Python `ipaddress` standard library module
- Networking concepts (block sizes, host counts, broadcast/network addresses)
- RFC 3021 (31-bit prefixes on point-to-point links)

## Sources Consulted
- RFC 3021 — Using 31-Bit Prefixes on IPv4 Point-to-Point Links (https://datatracker.ietf.org/doc/html/rfc3021)
- RFC 950 — Internet Standard Subnetting Procedure
- RFC 4632 — CIDR
- Python `ipaddress` module documentation (https://docs.python.org/3/library/ipaddress.html) — verified `IPv4Network`, `.netmask`, `.hostmask` attributes
- Cisco CCNA / CompTIA Network+ subnetting references

## Issues Found
No technical issues found.

All entries in the reference table are mathematically correct:
- Subnet masks (e.g., /26 = 255.255.255.192) verified via 2^(32-prefix) bit math
- Wildcard masks correctly computed as inverse of subnet mask (255 − mask octet)
- Block sizes (256, 128, 64, ..., 1) match 2^(32-prefix)
- Subnets-from-/24 values (1, 2, 4, ..., 256) correctly double per borrowed bit
- Host counts use the standard formula 2^h − 2 for /24-/30, with correct RFC 3021 exceptions for /31 (2 usable hosts) and /32 (1 host)

The Python code uses current, non-deprecated `ipaddress` module APIs. The `IPv4Network`, `.netmask`, and `.hostmask` attributes are all valid in Python 3.

Powers-of-2 reference values are all numerically correct.

## Review Notes
- The Python script's output table prints `block` in two columns ("Block" and "Total Addrs") — these are equivalent values by definition (block size = total addresses in the subnet), so this is intentional redundancy rather than an error, though it could be simplified in a future revision.
- The "Block size" exam shortcut ("256 − last_non_255_octet_of_mask") is the classic CCNA/Network+ trick and is correct for any single-octet-changing prefix in /9-/30, which covers all practical exam scenarios.
- The cheat sheet focuses on the third/fourth octet range typical of LAN subnetting; users working with larger supernets (/8-/15) should also consult a full /8-/32 table, which the Python generator produces when invoked with broader prefix ranges.
