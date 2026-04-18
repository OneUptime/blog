# Validation Summary: How to Use /31 Subnets on Point-to-Point Links (RFC 3021)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RFC 3021 (31-bit IPv4 prefixes on point-to-point links)
- IPv4 subnetting (/31 vs /30)
- Python 3 `ipaddress` standard library module
- Linux iproute2 (`ip addr`)
- Cisco IOS interface configuration

## Sources Consulted
- RFC 3021, "Using 31-Bit Prefixes on IPv4 Point-to-Point Links" (December 2000) — https://datatracker.ietf.org/doc/html/rfc3021
- Python `ipaddress` module documentation — https://docs.python.org/3/library/ipaddress.html
- iproute2 `ip-address(8)` man page
- Cisco IOS IP Addressing Configuration Guide (31-bit prefixes on point-to-point interfaces, supported since IOS 12.2(2)T)

## Issues Found
No technical issues found.

- RFC 3021 publication year (2000) and core claim (both addresses usable, no broadcast) match the RFC text.
- /31 vs /30 comparison table is arithmetically correct (4 vs 2 addresses; both yield 2 usable hosts per link; saves 2 addresses per link).
- Python code is correct: `IPv4Network.subnets(new_prefix=31)` yields 128 /31 subnets from a /24, and iterating a /31 network via `list(subnet)` yields both addresses (the network/broadcast distinction does not apply for /31 in the iterator). Output matches.
- Linux `ip addr add 10.254.0.0/31 dev eth1` is valid syntax; the kernel has supported /31 host addressing for many years.
- Cisco IOS mask `255.255.255.254` is the correct dotted-decimal form of /31, and the `interface ... / ip address` syntax is correct.

## Review Notes
- The compatibility note states "Cisco IOS 12.2+: supports /31 with `no ip directed-broadcast`." This is accurate — `no ip directed-broadcast` has been the default on Cisco interfaces since IOS 12.0, and /31 support landed in 12.2(2)T. The phrasing could be clarified in a future revision (the directive is already the default and need not be explicitly added), but it is not technically incorrect.
- The post correctly notes fallback to /30 for legacy equipment; some very old or non-Cisco devices may still treat the second address as broadcast.
