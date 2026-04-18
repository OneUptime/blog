# Validation Summary: How to Validate IPv4 Addresses Without Regex in Python Using ipaddress Module

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python 3 (standard library)
- `ipaddress` module (`IPv4Address`, `IPv6Address`, `ip_address`, `IPv4Network`)
- Python type hints (`typing.Iterator`, PEP 585 `list[str]`)

## Sources Consulted
- Python `ipaddress` module official documentation: https://docs.python.org/3/library/ipaddress.html
- CPython `ipaddress` source / changelog (leading-zero rejection introduced in 3.9.5 via bpo-36384): https://docs.python.org/3/whatsnew/3.9.html
- RFC 791 (Internet Protocol) for IPv4 semantics
- RFC 4632 (CIDR) for strict vs. non-strict network parsing
- Local verification: executed every code block against Python 3.12.3 and confirmed outputs matched the post's expected values

## Issues Found
No technical issues found.

Verified behaviors:
- `ipaddress.IPv4Address` correctly rejects all negative test cases, including `"192.168.01.1"` (leading zeros) on Python 3.9.5+.
- `ipaddress.AddressValueError` is a subclass of `ValueError`, so the double-catch in `except (ipaddress.AddressValueError, ValueError)` is redundant but harmless and explicit — intentional for clarity.
- `ipaddress.ip_address()` returns an `IPv4Address` for dotted-quad strings and `IPv6Address` for IPv6 strings; the `isinstance` check correctly distinguishes them.
- `addr.is_private`, `is_loopback`, `is_multicast`, `is_global`, `packed`, and `int(addr)` all produce the values shown in the comments. `192.168.1.1` → private (True), packed `c0a80101`, int 3232235777; `8.8.8.8` → private False, global True.
- `IPv4Network("192.168.1.0/24", strict=False)` with `in` containment check works as described.
- `list[str]` annotation requires Python 3.9+; this is implicit in the post's context (leading-zero rejection also requires 3.9.5+), so no version caveat is needed.

## Review Notes
- The leading-zero rejection behavior (`"192.168.01.1"` → invalid) is specific to Python 3.9.5 and later. Older versions (including 3.8 and earlier 3.9 point releases) accepted leading zeros and interpreted the octet as decimal. Readers on those very old Python versions would see a different result for that one test case. The post's target audience is modern Python, so this is not flagged as an error.
- Catching both `ipaddress.AddressValueError` and `ValueError` is redundant (the former subclasses the latter), but it is defensive and documents intent, so no change is warranted.
- The `packed.hex()` comment correctly notes 4-byte big-endian ordering (network byte order), which matches `IPv4Address.packed` as documented.
