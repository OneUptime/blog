# Validation Summary: How to Use mtr for IPv6 Network Diagnostics

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- mtr (My Traceroute) network diagnostic tool
- IPv6 networking
- ICMPv6 / UDP / TCP probing
- Bash scripting (awk, Python parsing of mtr JSON output)
- Public IPv6 DNS resolvers (Google, Cloudflare, Quad9, Hurricane Electric)

## Sources Consulted
- mtr(8) man page (BitWizard / mtr-tool, https://github.com/traviscross/mtr)
- `mtr --help` output (verified against locally installed mtr)
- mtr JSON report output structure (verified by running `mtr --json` locally)
- Google Public DNS IPv6 addresses: https://developers.google.com/speed/public-dns/docs/using
- Cloudflare 1.1.1.1 IPv6 addresses: https://one.one.one.one / https://developers.cloudflare.com/1.1.1.1/
- Quad9 IPv6 addresses: https://www.quad9.net/service/service-addresses-and-features
- Hurricane Electric ordns.he.net IPv6 address: https://dns.he.net (verified via DNS lookup of `ordns.he.net` → `2001:470:20::2`)

## Issues Found

1. **Invalid `--icmp` flag.** The post showed `mtr -6 --icmp ipv6.google.com` and described ICMP as an alternative to UDP. mtr has no `--icmp` option (verified via `mtr --help` and `man 8 mtr`); ICMP echo is the *default* protocol. The switchable alternatives are `-u/--udp` and `-T/--tcp`. Replaced the example with `mtr -6 --udp ipv6.google.com` and adjusted the comment to clarify that ICMP is the default and UDP is the alternative when ICMP is blocked.

2. **DNS address mislabeled as Hurricane Electric.** The script comment labeled `2620:fe::fe` as "Hurricane Electric DNS", but `2620:fe::fe` is actually Quad9's primary IPv6 DNS resolver (verified via `getent hosts dns.quad9.net`). Hurricane Electric's public resolver is `ordns.he.net` at `2001:470:20::2`. Changed the comment from "Hurricane Electric DNS" to "Quad9 DNS" so the address and label match.

3. **Conclusion referenced the same invalid `--icmp` flag.** The conclusion advised "`--icmp` for better firewall penetration", which is wrong on two counts (no such flag, and ICMP is what gets filtered, not what penetrates filters). Updated the conclusion to recommend `--udp` or `--tcp` when ICMP is filtered.

## Review Notes
- The mtr JSON output parsing example was verified by running `mtr --json` locally; the structure (`data['report']['hubs']`, with keys `count`, `host`, `Loss%`, `Avg`, etc.) matches the actual output.
- All other flags in the post (`-6`, `--report`, `--report-cycles`, `--no-dns`, `--tcp`, `--port`, `--interval`, `--psize`, `--aslookup`, `--max-ttl`, `--address`, `--json`) are valid per the man page.
- The `--aslookup` (`-z`) flag works without a separate whois lookup — mtr performs the AS lookup internally via Cymru's whois service. The phrasing "requires whois lookup" is accurate in spirit (mtr does query whois under the hood) and was left unchanged.
- The output column descriptions (Loss%, Snt, Last, Avg, Best, Wrst, StDev) match mtr's standard report mode columns.
- The IPv6 documentation prefix `2001:db8::/32` is correctly used in examples (per RFC 3849).
