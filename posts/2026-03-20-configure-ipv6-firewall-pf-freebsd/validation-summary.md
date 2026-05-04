# Validation Summary: How to Configure IPv6 Firewall Rules with pf on FreeBSD

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- FreeBSD (rc.conf, service)
- pf (Packet Filter) firewall
- pfctl (pf control utility)
- IPv6 / ICMPv6
- NDP (Neighbor Discovery Protocol)
- NPTv6 (Network Prefix Translation, RFC 6296)

## Sources Consulted
- FreeBSD pf.conf(5) man page: https://man.freebsd.org/cgi/man.cgi?query=pf.conf&sektion=5
- FreeBSD icmp6(4) man page: https://man.freebsd.org/cgi/man.cgi?query=icmp6&sektion=4
- FreeBSD pfctl(8) man page: https://man.freebsd.org/pfctl
- FreeBSD Handbook, Chapter 33 (Firewalls): https://docs.freebsd.org/en/books/handbook/firewalls/
- RFC 3849 (IPv6 Address Prefix Reserved for Documentation)
- RFC 6296 (IPv6-to-IPv6 Network Prefix Translation)
- RFC 4861 (Neighbor Discovery for IPv6)

## Issues Found

1. **Incorrect ICMPv6 type abbreviation `redirect`** (used twice in `icmp6-type` lists). The pf parser (per `icmp6(4)` and `pfctl_parser.c`) accepts the abbreviation `redir` for ICMPv6 type 137, not `redirect`. Loading these rules with `pfctl -nf` would fail with a parse error. Changed both occurrences to `redir`.

2. **Invalid IPv6 literals using non-hex characters** in the "Allow/Block Specific IPv6 Addresses" section:
   - `2001:db8::trusted` — contains `t`, `r`, `s`, `u` (not valid hex)
   - `2001:db8::bad:actor` — `actor` contains `t`, `o`, `r` (not valid hex)
   - `2001:db8:blocked::/48` — `blocked` contains `l`, `o`, `k` (not valid hex)
   
   These would all cause pf to fail to parse the configuration. Replaced with valid hex addresses within the documentation prefix `2001:db8::/32` (RFC 3849):
   - `2001:db8::1`
   - `2001:db8::bad:1`
   - `2001:db8:dead::/48`

## Review Notes

- The `ipv6_gw="2001:db8::1"` macro is defined but not referenced elsewhere in the configuration. Not technically incorrect, but a minor cleanup opportunity.
- The author lists ICMPv6 type 137 in the comment block as "Redirect" — the comment description is correct; only the rule keyword needed correction.
- The list of essential ICMPv6 types is consistent with RFC 4890 recommendations for what must be permitted through an IPv6 firewall.
- The NPTv6 example correctly translates between two equally-sized prefixes (both /48), which is required by RFC 6296. Using `fd00:db8::/48` (within ULA space `fd00::/8`) as the internal prefix is acceptable for an example, though `fd00:db8::/48` is unusual phrasing — production deployments should pick a randomly generated ULA prefix per RFC 4193.
- `match in all scrub (no-df max-mss 1440)` is valid modern FreeBSD pf syntax.
- All `pfctl` flags shown (`-nf`, `-f`, `-e`, `-d`, `-sr`, `-ss`, `-s info`) are correct per the current `pfctl(8)` man page.
