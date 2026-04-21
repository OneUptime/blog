# Validation Summary: How to Set Up tc tbf (Token Bucket Filter) for IPv4 Rate Limiting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux traffic control (`tc`)
- iproute2
- Token Bucket Filter (`tbf`) qdisc
- Linux QoS and egress rate limiting

## Sources Consulted
- Debian iproute2 `tc-tbf(8)` man page: https://manpages.debian.org/unstable/iproute2/tc-tbf.8.en.html
- Debian iproute2 `tc(8)` man page: https://manpages.debian.org/unstable/iproute2/tc.8.en.html
- Local `tc` CLI help output from iproute2 6.1.0: `tc qdisc add dev lo root tbf help`
- Local `man tc-tbf` and `man tc` pages from iproute2 6.1.0

## Issues Found
- The post described the examples as IPv4-specific, but a root TBF qdisc shapes outbound traffic for the whole interface rather than only IPv4 packets. Changed the title, tags, and description to describe outbound interface rate limiting.
- The main multiline shell command placed inline comments after line-continuation backslashes, which would cause the shell to end the command before the `burst` and `latency` arguments. Moved those explanations to standalone comments and left the command itself executable.
- The `burst` examples used `kbit` units. `tc-tbf(8)` documents `burst` as a byte-size bucket, and `tc(8)` defines `kbit` as kilobits while `kb`/`k` are kilobytes. Changed `32kbit`, `100kbit`, and `64kbit` to `32kb`, `100kb`, and `64kb`.
- The minimum burst calculation said `5000 bytes ≈ 5kbit`. Corrected it to `5000 bytes ≈ 5 KB (40 kbit)` and clarified the table description to use `rate / 8 / HZ` bytes.

## Review Notes
The corrected commands match the documented TBF syntax, but actually adding a qdisc still requires root privileges, `CAP_NET_ADMIN`, and a real target interface. `tc(8)` lists TBF among classless qdiscs, while `tc-tbf(8)` also documents attaching an optional inner qdisc under TBF; the post's guidance to use HTB for multiple traffic classes remains correct.
