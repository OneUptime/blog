# Validation Summary: How to Configure PowerDNS as an Authoritative IPv6 DNS Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PowerDNS Authoritative Server (pdns)
- `pdnsutil` CLI
- `pdns_control` CLI
- gmysql backend (PowerDNS generic MySQL backend)
- DNSSEC (NSEC3)
- IPv6 / AAAA / PTR (ip6.arpa) records
- PowerDNS REST API (zones endpoint)
- `dig` for IPv6 query testing

## Sources Consulted
- PowerDNS Authoritative Server settings reference: https://doc.powerdns.com/authoritative/settings.html
- `pdnsutil` man page: https://doc.powerdns.com/authoritative/manpages/pdnsutil.1.html
- PowerDNS Authoritative upgrade notes: https://doc.powerdns.com/authoritative/upgrading.html
- PowerDNS GitHub issue #4727 (duplicate records via `add-record`): https://github.com/PowerDNS/pdns/issues/4727
- RFC 9276 (NSEC3 parameter guidance) — informational

## Issues Found
1. **`local-ipv6` setting is deprecated.** Since PowerDNS Authoritative Server 4.5.0, `local-ipv6` is deprecated; the documented modern approach is to put both IPv4 and IPv6 listeners into `local-address`, which has accepted IPv6 addresses since 4.3.0. Replaced the split `local-address=0.0.0.0` / `local-ipv6=::` configuration (and the commented `local-ipv6=2001:db8::53` example) with the unified `local-address=0.0.0.0, ::` form (and a corresponding `local-address=2001:db8::53, 0.0.0.0` example).
2. **Duplicate SOA created via `pdnsutil add-record @ SOA`.** `pdnsutil create-zone` automatically seeds a default SOA for the new zone. Following it with `pdnsutil add-record example.com @ SOA "..."` appends a second SOA record (PowerDNS's `add-record` is non-idempotent and does not deduplicate — see issue #4727), producing an invalid zone. Changed both the forward-zone SOA and the reverse-zone SOA from `add-record` to `replace-rrset`, which overwrites the auto-generated SOA in place.

## Review Notes
- The legacy `pdnsutil` verb-noun forms used in the post (`create-zone`, `add-record`, `replace-rrset`, `rectify-zone`, `check-zone`, `secure-zone`, `set-nsec3`) are still accepted in current PowerDNS as aliases for the newer `zone create` / `rrset add` / `rrset replace` / `zone rectify` / etc. structure. Both forms are documented to keep working, so no rewrite was necessary.
- The `set-nsec3 example.com "1 0 10 deadbeef"` example is syntactically valid (algorithm 1 = SHA-1, flags 0, 10 iterations, salt `deadbeef`). RFC 9276 now recommends 0 iterations and an empty salt (`'1 0 0 -'`), and modern resolvers may treat zones with high NSEC3 iteration counts as insecure. The example value is acceptable for demonstration but not the current best practice.
- The IPv6 reverse zone delegation `0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa` correctly corresponds to `2001:db8::/64`, and the PTR owner `1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0` correctly maps to `2001:db8::1`.
- `dig AAAA www.example.com @2001:db8::53 -6` works as written; the explicit `-6` is redundant when the server is specified by IPv6 address but harmless.
- The REST API request uses `PATCH /api/v1/servers/localhost/zones/example.com.` with an `rrsets` body containing `changetype: REPLACE` — this matches the current PowerDNS Authoritative API contract.
- The post does not pin a PowerDNS version. The corrected configuration is correct on 4.5+ (current line is 4.9 / 5.x); on the now-unsupported 4.0–4.4 era, the older split `local-ipv6` form would also work.
