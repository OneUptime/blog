# Validation Summary: How to Debug IPv6 DNS Resolution with dig and nslookup

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- DNS (AAAA, A, PTR, NS, SOA, MX, TXT/SPF, DNSKEY, DS records)
- IPv6 (ip6.arpa reverse DNS, dual-stack)
- `dig` (BIND dnsutils)
- `nslookup`
- `delv` (DNSSEC validation)
- `kdig` (knot-dnsutils) for DNS over TLS
- DNS over HTTPS (DoH) via curl
- DNSSEC
- Bash scripting, `nc`, `ping6`, `curl`

## Sources Consulted
- ISC BIND `dig` manual — https://bind9.readthedocs.io/en/latest/manpages.html#dig
- ISC `delv` manual — https://bind9.readthedocs.io/en/latest/manpages.html#delv
- RFC 3596: DNS Extensions to Support IP Version 6 — https://www.rfc-editor.org/rfc/rfc3596
- RFC 4291: IP Version 6 Addressing Architecture — https://www.rfc-editor.org/rfc/rfc4291
- RFC 8482: Providing Minimal-Sized Responses to DNS Queries That Have QTYPE=ANY — https://www.rfc-editor.org/rfc/rfc8482
- RFC 8499: DNS Terminology — https://www.rfc-editor.org/rfc/rfc8499
- Cloudflare blog/docs on deprecating ANY query responses (RFC 8482 implementation)

## Issues Found
1. **Misleading `ANY` query claim (Checking All Record Types section).** The post stated `dig example.com ANY` is a way "to query both A and AAAA records simultaneously." Since RFC 8482, most major resolvers and authoritative servers (e.g., Cloudflare) return a minimal/`HINFO` response to `ANY` queries rather than the full record set, so this is not reliable. Reworded the explanation to describe `ANY` accurately, cite RFC 8482, and direct readers to query each type separately for dependable results.

2. **Incorrect "full DNSSEC validation" claim.** The post labeled `dig AAAA example.com +dnssec +multiline` as performing "full DNSSEC validation." `+multiline` only formats records (e.g., `RRSIG`/`DNSKEY`) across multiple lines for readability; `dig` does not validate the DNSSEC chain of trust at all — it only requests the records and reports the resolver-set `ad` flag. Corrected the heading/text to explain what `+multiline` actually does and to point to `delv` for genuine chain-of-trust validation.

## Review Notes
- Verified the manual IPv6 PTR query in the reverse-lookup section: `2606:2800:220:1:248:1893:25c8:1946` expands to the nibble sequence that reverses to `6.4.9.1.8.c.5.2.3.9.8.1.8.4.2.0.1.0.0.0.0.2.2.0.0.0.8.2.6.0.6.2.ip6.arpa` — matches the post exactly.
- The example AAAA address (`2606:2800:220:1:248:1893:25c8:1946`) and authoritative nameservers (`a.iana-servers.net`, `b.iana-servers.net`) are the real, correct values for `example.com`. Root/gTLD server IPs in the `+trace` sample (`198.41.0.4`, `192.5.6.30`) are also accurate.
- Installation commands (`apt-get install dnsutils`, `dnf install bind-utils`), transport flags (`-4`/`-6`), and query options (`+short`, `+trace`, `+ttlunits`, `+cd`, `+time`, `+tries`, `-x`, `-f`) are all correct and current for BIND 9.18.
- `ping6` is shown for IPv6 connectivity checks. It still works on macOS and many Linux distros, though on modern Linux it is increasingly superseded by `ping -6`/`ping`. Not an error, but a minor portability caveat worth noting for future updates.
- `nc -z ... 53` tests TCP reachability of port 53; DNS servers do listen on TCP/53, so the check is valid (it will not exercise the more common UDP/53 path, but that is acceptable as a reachability probe).
- The DoH (`curl` against cloudflare-dns.com) and DoT (`kdig +tls-ca +tls-host`) examples are syntactically correct.
