# Validation Summary: How to Configure Traffic Shaping with tc on Linux for IPv4

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux traffic control
- iproute2 `tc`
- Queuing disciplines (qdiscs)
- Token Bucket Filter (TBF)
- Hierarchy Token Bucket (HTB)
- `u32` traffic filters
- ifupdown and Netplan persistence hooks

## Sources Consulted
- Debian iproute2 `tc(8)` man page: https://manpages.debian.org/bookworm/iproute2/tc.8.en.html
- Debian iproute2 `tc-tbf(8)` man page: https://manpages.debian.org/unstable/iproute2/tc-tbf.8.en.html
- Debian iproute2 `tc-htb(8)` man page: https://manpages.debian.org/testing/iproute2/tc-htb.8.en.html
- Debian iproute2 `tc-u32(8)` man page: https://manpages.debian.org/testing/iproute2/tc-u32.8.en.html
- Debian ifupdown `interfaces(5)` man page: https://manpages.debian.org/buster/ifupdown/interfaces.5.en.html
- Canonical Netplan FAQ on pre-up/post-up hooks: https://netplan.io/faq/
- Local `tc` client help and parser checks from iproute2 6.1.0 (`tc -V`, `tc qdisc ... help`, `tc filter ... u32 help`)

## Issues Found
- The TBF examples used `burst 32kbit`. `tc-tbf(8)` defines `burst` as a size, not a rate, and 32 kilobits is only 4 KB. Updated both examples to `burst 32kb` so the bucket size is expressed as kilobytes and is more appropriate for the shown 10 Mbit/s shaper.
- The u32 filters described SSH/HTTP/HTTPS as TCP traffic but only matched destination ports. Added `match ip protocol 6 0xff` to each filter so the examples explicitly classify TCP packets.
- The persistence section referred to `netplan` post-up hooks. Netplan does not provide native post-up hooks; its FAQ maps these workflows to NetworkManager dispatcher or networkd-dispatcher hooks. Updated the sentence accordingly.
- The ifupdown hook snippet placed a path comment before the shebang. Moved the shebang to the first line so the script is executable as written.

## Review Notes
The remaining u32 destination-port examples are valid simple IPv4/TCP filters, but u32 port matching assumes ordinary IPv4 packets without IP options. For more complex production matching, `flower` filters or a more complete u32 offset setup may be preferable.
