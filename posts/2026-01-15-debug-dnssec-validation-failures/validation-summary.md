# Validation Summary: How to Debug DNSSEC Validation Failures Step by Step

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- DNSSEC (DNS Security Extensions)
- DNS trust chain (DNSKEY, DS, RRSIG, NSEC/NSEC3 records)
- dig (BIND)
- delv (BIND)
- drill (ldns)
- BIND (named, rndc, dnssec-signzone, dnssec-keygen, dnssec-dsfromkey, auto-dnssec, inline-signing)
- PowerDNS (pdnsutil)
- Unbound (unbound-control)
- systemd-resolved
- Public resolvers (Google 8.8.8.8/8.8.4.4, Cloudflare 1.1.1.1, Quad9 9.9.9.9, OpenDNS)
- DNSSEC algorithms (RSASHA*, ECDSA P-256/P-384, ED25519, ED448)

## Sources Consulted
- IANA DNS Security Algorithm Numbers registry (https://www.iana.org/assignments/dns-sec-alg-numbers/) — algorithm number-to-name mapping
- RFC 4033/4034/4035 — DNSSEC introduction, resource records, and protocol
- RFC 6781 — DNSSEC Operational Practices (key rollover procedures)
- RFC 5155 — NSEC3 (authenticated denial of existence)
- BIND 9 Administrator Reference Manual — dig, delv (+vtrace), rndc signing, dnssec-signzone, dnssec-keygen, dnssec-dsfromkey
- ldns drill man page — `-D`, `-T`, `-S` flags
- PowerDNS documentation (doc.powerdns.com) — pdnsutil subcommands (show-zone, list-keys, check-zone, rectify-zone)
- DNS Flag Day 2020 (https://dnsflagday.net/2020/) — 1232-byte conservative EDNS UDP buffer recommendation
- Real-world `.com` zone DS record (key tag 30909, algorithm 8, digest type 2) for cross-checking the trace example

## Issues Found
No technical issues found.

The post is technically accurate throughout. Specific claims verified:
- Algorithm numbers (5, 7, 8, 10, 13, 14, 15, 16) all match the IANA registry.
- The `.com` DS record in the trace example (`30909 8 2 E2D3C916...`) matches the actual `.com` delegation DS.
- RRSIG field ordering (type covered, algorithm, labels, original TTL, expiration, inception, key tag, signer name) is correct; the example correctly signs A records with the ZSK and uses the parent's algorithm (8) for the RRSIG over DS.
- dig flags (`+dnssec`, `+cd`, `+multi`, `+trace`, `+bufsize`, `+tcp`, `+short`), delv `+vtrace`, and drill `-D`/`-TD`/`-S` are all valid and current.
- AD/CD flag semantics are described correctly.
- `dnssec-dsfromkey -2 -f -` usage and the monitoring script's `awk '{print $5}'` (RRSIG expiration field) are correct.
- 1232-byte conservative UDP limit aligns with DNS Flag Day 2020.

## Review Notes
- `systemd-resolve --flush-caches` is a deprecated-but-still-working alias of `resolvectl flush-caches` on modern systemd. Left as-is since it remains functional; future updates could prefer `resolvectl`.
- In `dnssec-keygen -a ECDSAP256SHA256 -b 256 ...`, the `-b 256` is redundant (key size is fixed/ignored for ECDSA), but it is not an error and the command still works.
- The Google cache-flush reference points to the public-dns documentation page rather than the direct flush form; this is acceptable as a pointer.
- All commands use `example.com` placeholders and the guidance (KSK/ZSK roles, rollover ordering, DS TTL waits, NTP/clock skew, TCP fallback) reflects standard DNSSEC operational practice.
