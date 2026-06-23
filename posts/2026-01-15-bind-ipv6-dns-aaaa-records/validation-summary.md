# Validation Summary: How to Configure BIND for IPv6 DNS (AAAA Records)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- BIND9 (ISC named DNS server)
- IPv6 / AAAA records
- DNS reverse zones (ip6.arpa, in-addr.arpa)
- DNSSEC and TSIG dynamic updates
- Linux (Ubuntu/Debian, CentOS/RHEL), systemd, UFW, firewalld
- dig / nslookup / host / rndc tooling

## Sources Consulted
- BIND 9 Administrator Reference Manual — https://bind9.readthedocs.io/
- BIND 9.18 Advanced Configurations (dynamic update, allow-update vs update-policy) — https://bind9.readthedocs.io/en/v9.18.13/chapter6.html
- Cloudflare 1.1.1.1 IP addresses (IPv6 resolvers) — https://developers.cloudflare.com/1.1.1.1/ip-addresses/
- Zytrax DNS for Rocket Scientists, zone transfer/update statements — https://www.zytrax.com/books/dns/ch7/xfer.html
- RFC 3596 (DNS Extensions to Support IPv6) and RFC 4291 (IPv6 Addressing Architecture)
- Google Public DNS IPv6 addresses (2001:4860:4860::8888 / ::8844)

## Issues Found
1. **Incorrect Cloudflare IPv6 resolver address.** The forwarders list contained `2606:4700:4700::64`, which is not a Cloudflare resolver. Cloudflare's secondary IPv6 resolver (paired with `1.0.0.1`) is `2606:4700:4700::1001`. Fixed.
2. **Invalid `prefer-ipv6` option.** The dual-stack `options` block used `prefer-ipv6 { any; };`, which is not a valid BIND named.conf statement and would cause `named-checkconf` to fail. Replaced with the valid, intent-preserving `query-source-v6 address *;` for IPv6 outgoing queries.
3. **`allow-update` and `update-policy` used together in the same zone.** These two statements are mutually exclusive in BIND; configuring both in one zone is a configuration error. Removed the `allow-update` line and kept `update-policy`, with a clarifying comment.
4. **Deprecated TSIG key generation command.** The comment used `dnssec-keygen -a HMAC-SHA256 ... -n HOST` to generate a TSIG key; current BIND removed HMAC/TSIG generation from `dnssec-keygen`. Updated to `tsig-keygen -a hmac-sha256 dhcp-update-key`.

## Review Notes
- The IPv6 reverse-zone nibble math was verified and is correct: the `/48` zone name `1.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa`, the 20-nibble PTR owner names in the reverse zone file, and the full 32-nibble `dig -x` expected output all reverse correctly for `2001:db8:1::/48`.
- IPv6 address abbreviation example, A vs AAAA explanation, ip6.arpa nibble-reversal, and the summary tables are all accurate.
- `auto-dnssec maintain; inline-signing yes;` is still functional but considered legacy in modern BIND (9.16+); the recommended approach is now `dnssec-policy`. Left as-is since it is not incorrect, only superseded — worth a future refresh.
- Example addresses correctly use documentation ranges (`2001:db8::/32` per RFC 3849, `192.0.2.0/24`, RFC 1918 space).
