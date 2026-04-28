# Validation Summary: How to Determine the Network and Host Portions of an IPv4 Address

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- IPv4 addressing
- Subnet masks and CIDR notation
- Bitwise AND operations
- Python `ipaddress` standard library module (`IPv4Interface`, `IPv4Network`)

## Sources Consulted
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- CPython source for `ipaddress.py` (verified that `_BaseAddress` does not implement `__invert__`)
- RFC 950 (Internet Standard Subnetting Procedure) and RFC 4632 (CIDR)
- Direct execution of the post's Python snippet on Python 3.x to verify behavior and output

## Issues Found
- **`~interface.network.netmask` raises `TypeError`.** The original code computed `host_int = int(interface.ip) & int(~interface.network.netmask)`. Python's `IPv4Address` (which is what `network.netmask` returns) does not implement `__invert__`, so applying `~` to it raises `TypeError: bad operand type for unary ~: 'IPv4Address'`. I verified this by running the snippet — it failed before reaching any `print` calls, so the documented output could not have been produced as written. Replaced with `int(interface.ip) & int(network.hostmask)`, which uses the `hostmask` property explicitly provided by `IPv4Network` for this purpose. Re-ran the corrected snippet and it produces the exact output shown in the post.

## Review Notes
- All binary conversions are correct: 192 → 11000000, 168 → 10101000, 10 → 00001010, 45 → 00101101, 50 → 00110010, 200 → 11001000, 240 → 11110000.
- The /20 example AND result (`172.16.50.200 & 255.255.240.0 = 172.16.48.0`) is correct.
- The host-count table values are all accurate (/24: 254, /23: 510, /22: 1022, /16: 65534).
- The `Total Hosts = num_addresses - 2` formula in the snippet is correct for the /24 example used. Note for future revisions: it would be inaccurate for /31 (RFC 3021 point-to-point links, where both addresses are usable) and /32 (single host), but those edge cases are out of scope for this post.
- `interface.netmask` and `interface.ip` are valid `IPv4Interface` attributes and behave as documented.
