# Validation Summary: How to Choose the Right DNSSEC Algorithm (RSA vs ECDSA)

## Status
validated

## Post Type
Guide / comparison (decision guide with implementation examples)

## Technologies Covered
- DNSSEC (Zone Signing Keys, Key Signing Keys, DS records, RRSIG, DNSKEY)
- RSA signing algorithms (RSASHA1/5, RSASHA256/8, RSASHA512/10)
- ECDSA signing algorithms (ECDSAP256SHA256/13, ECDSAP384SHA384/14)
- BIND 9 `dnssec-policy`
- PowerDNS `pdnsutil`
- Knot DNS policy configuration
- OpenSSL key generation
- `dig` / `delv` validation tooling

## Sources Consulted
- IANA DNSSEC Algorithm Numbers registry — https://www.iana.org/assignments/dns-sec-alg-numbers/dns-sec-alg-numbers.xml (algorithm numbers 5, 8, 10, 13, 14)
- RFC 8624 — Algorithm Implementation Requirements and Usage Guidance for DNSSEC — https://datatracker.ietf.org/doc/rfc8624/ (RSASHA1 deprecation, ECDSA recommendation levels)
- RFC 6605 — ECDSA for DNSSEC — https://datatracker.ietf.org/doc/html/rfc6605 (P-256/P-384 signature sizes)
- RFC 5702 — RSASHA256 / RSASHA512 — referenced for RSA variants
- RFC 6979 — Deterministic ECDSA — referenced for nonce-reuse mitigation
- PowerDNS `pdnsutil` manpage — https://doc.powerdns.com/authoritative/manpages/pdnsutil.1.html (set-nsec3 SALT must be hex or `-`)
- PowerDNS issue #12650 — https://github.com/PowerDNS/pdns/issues/12650 (confirms non-hex salt is invalid)
- NIST key-size equivalence guidance (RSA-3072 ≈ 128-bit ≈ P-256; RSA-7680 ≈ 192-bit ≈ P-384)

## Issues Found
1. **Invalid PowerDNS NSEC3 salt value.** The command `pdnsutil set-nsec3 example.com '1 0 10 auto' narrow` used `auto` as the SALT field. Per the PowerDNS documentation, the SALT must be a hexadecimal string or `-` for no salt; `auto` is not a recognized value (PowerDNS issue #12650 confirms non-hex salts should be rejected). Changed `auto` to `-` so the command is valid: `pdnsutil set-nsec3 example.com '1 0 10 -' narrow`.

## Review Notes
- Algorithm numbers (RSASHA1=5, RSASHA256=8, RSASHA512=10, ECDSAP256SHA256=13, ECDSAP384SHA384=14) are correct against the IANA registry.
- Security-equivalence claims (P-256 ≈ RSA-3072 ≈ 128-bit; P-384 ≈ RSA-7680 ≈ 192-bit) and signature sizes (64 / 96 bytes) are accurate.
- BIND `dnssec-policy` syntax, including the optional `key-directory` keyword and the per-key `algorithm`/size tokens, is valid. OpenSSL (`prime256v1`), `dig +dnssec +multi`, and `delv +rtrace` commands are correct.
- NSEC3 best practice: RFC 9276 (2022) now recommends 0 iterations and an empty salt. The post's examples (10 iterations in both the PowerDNS and Knot snippets) still function but are no longer the recommended values; this is a best-practice consideration rather than an error, so it was left unchanged.
- Resolver/server "supported since" version numbers (e.g., BIND 9.6.0 for RSASHA256, BIND 9.9.0 for ECDSA) are approximate; the post hedges appropriately and the broad claims are sound.
