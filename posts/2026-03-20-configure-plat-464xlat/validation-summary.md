# Validation Summary: How to Configure PLAT (Provider-Side Translator) for 464XLAT

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- 464XLAT (RFC 6877)
- PLAT / NAT64 (RFC 6146)
- Jool (Linux NAT64/SIIT implementation, version 4.x)
- iptables / ip6tables (mangle table, JOOL target)
- BIND9 DNS64 (RFC 6147)
- radvd with PREF64 RA option (RFC 8781)
- Linux sysctl IPv4/IPv6 forwarding

## Sources Consulted
- [RFC 6877 — 464XLAT: Combination of Stateful and Stateless Translation](https://datatracker.ietf.org/doc/rfc6877/)
- [RFC 6146 — Stateful NAT64](https://datatracker.ietf.org/doc/rfc6146/)
- [RFC 6052 — IPv6 Addressing of IPv4/IPv6 Translators (well-known prefix 64:ff9b::/96)](https://datatracker.ietf.org/doc/rfc6052/)
- [RFC 8781 — Discovering PREF64 in Router Advertisements](https://datatracker.ietf.org/doc/rfc8781/)
- [Jool documentation — Stateful NAT64 Run](https://nicmx.github.io/Jool/en/run-nat64.html)
- [Jool documentation — instance Mode](https://nicmx.github.io/Jool/en/usr-flags-instance.html)
- [Jool documentation — global flags](https://nicmx.github.io/Jool/en/usr-flags-global.html)
- [Jool documentation — Vanilla Run / iptables JOOL target](https://nicmx.github.io/Jool/en/run-vanilla.html)
- [radvd.conf(5) Debian manpage](https://manpages.debian.org/unstable/radvd/radvd.conf.5.en.html)
- [radvd PR #179 — Add pref64 support (RFC 8781)](https://github.com/radvd-project/radvd/pull/179)
- [Jool Debian package manpage (jool-tools)](https://manpages.debian.org/unstable/jool-tools/jool.8.en.html)

## Issues Found

1. **Invalid `jool pool6 add` command (NAT64 mode).**
   The post used `jool pool6 add 64:ff9b::/96` as a separate step after `jool instance add --iptables`. In Jool 4.x stateful NAT64 mode, there is no standalone `jool pool6 add` subcommand — the translation prefix must be passed via `--pool6` to `jool instance add`, or modified later via `jool global update pool6 …`.
   Fix: merged the two commands into `jool instance add --iptables --pool6 64:ff9b::/96`.

2. **Invalid `jool pool6 display` command (NAT64 mode).**
   `jool pool6 display` does not exist in NAT64 mode (it is a SIIT-mode subcommand). The pool6 prefix is shown via `jool global display`.
   Fix: replaced `jool pool6 display` with `jool global display`.

3. **Wrong global flag name `max-stored-pkts`.**
   The post used `jool global update max-stored-pkts 512`, but this is not a valid global key. The current Jool global key for the maximum number of stored packets awaiting their second TCP SYN ("Simultaneous Open") is `maximum-simultaneous-opens`.
   Fix: replaced `max-stored-pkts` with `maximum-simultaneous-opens`.

## Review Notes

- The radvd `nat64prefix` directive used in the post is correct. RFC 8781 calls the option "PREF64", but the actual radvd.conf keyword (added in PR #179, available in radvd 2.20+) is `nat64prefix`. The `AdvValidLifetime 65528` value the author used is exactly the maximum permitted value (the option encodes lifetime in 13 bits with an 8-second multiplier; the post's value is the upper bound and is a reasonable choice for a long-lived prefix).
- The well-known NAT64 prefix `64:ff9b::/96` (RFC 6052) and example IPv4 ranges (`203.0.113.0/24`, `198.51.100.0/24` per RFC 5737) are appropriate for documentation.
- `jool instance add --iptables` defaults to instance name `default`, so the `-j JOOL --instance default` rules in the iptables sections are consistent with the instance creation step.
- The `jool pool4 add --tcp/--udp/--icmp <prefix>` form is valid; without an explicit port range Jool defaults to the full ephemeral range for TCP/UDP.
- The DNS64 BIND9 configuration (`dns64 64:ff9b::/96 { … exclude { RFC1918 ranges }; }`) is syntactically correct per BIND9 ARM.
- Conceptually the post correctly identifies the PLAT as a NAT64 gateway in 464XLAT (RFC 6877) and that DNS64 is not strictly required when CLAT is present, since CLAT will synthesize IPv6 addresses for IPv4 literals.
