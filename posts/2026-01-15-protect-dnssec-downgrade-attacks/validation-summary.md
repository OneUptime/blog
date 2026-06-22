# Validation Summary: How to Protect Against DNSSEC Downgrade Attacks

## Status
validated

## Post Type
Guide (security / infrastructure deep-dive with configuration examples)

## Technologies Covered
- DNSSEC (DNSKEY, RRSIG, DS, NSEC/NSEC3 records, chain of trust)
- DNS resolvers: BIND 9 and Unbound configuration
- DNS-over-TLS (DoT) and DNS-over-HTTPS (DoH)
- DANE / TLSA records
- DNSSEC cryptographic algorithms (IANA DNSSEC algorithm registry)
- Prometheus / unbound_exporter metrics
- Diagnostic tooling: dig, tcpdump, tshark
- BGP/RPKI (referenced as a complementary control)

## Sources Consulted
- ISC BIND 9 ARM / DNSSEC Guide — https://bind9.readthedocs.io/en/v9.18.14/dnssec-guide.html (valid `options` statements; confirmed `dnssec-validation`, `disable-algorithms`, `disable-ds-digests`, `rate-limit` are real, and that `dnssec-log-level` is not a BIND option — DNSSEC logging is done via the `dnssec` logging category)
- NLnet Labs Unbound documentation (unbound.conf options: `auto-trust-anchor-file`, `val-permissive-mode`, `val-bogus-ttl`, `ignore-cd-flag`, `harden-below-nxdomain`, `harden-referral-path`, `harden-algo-downgrade`, `aggressive-nsec`, `forward-tls-upstream`, `tls-service-key/pem`, `send-client-subnet`, `max-client-subnet-ipv4/ipv6`)
- IANA DNSSEC Algorithm Numbers registry (algorithm IDs 1/3/5/8/13/14/15 and their status)
- letsencrypt/unbound_exporter metrics reference — https://deepwiki.com/letsencrypt/unbound_exporter/3-metrics and https://github.com/letsencrypt/unbound_exporter (confirmed the bogus-answer metric is `unbound_answers_bogus`, mapped from `num.answer.bogus`)
- RFC 4033/4034/4035 (DNSSEC), RFC 6698 (DANE/TLSA) for record semantics and TLSA usage/selector/matching-type fields

## Issues Found
1. **Invalid BIND option `dnssec-log-level 3;`** — In the "Protection 1" BIND configuration, the `options {}` block contained `dnssec-log-level 3;`, which is not a valid `named.conf` directive and would cause BIND to fail to load. DNSSEC logging in BIND is configured via the `logging { category dnssec { ... }; }` block, which the post already includes immediately below. Removed the invalid line; the existing `logging` block correctly handles DNSSEC logging.
2. **Incorrect Prometheus metric name `unbound_dnssec_bogus`** — The Prometheus alert rule referenced `unbound_dnssec_bogus`, which is not a metric exposed by the standard unbound_exporter. The correct metric for bogus (failed DNSSEC validation) answers is `unbound_answers_bogus` (mapped from Unbound's `num.answer.bogus`). Updated the alert expression accordingly.

## Review Notes
- The DNSSEC algorithm table (IDs 1, 3, 5, 8, 13, 14, 15 with status) matches the IANA registry and current deployment guidance.
- TLSA example uses usage/selector/matching-type `3 1 1` (DANE-EE / SPKI / SHA-256). The illustrative hash is intentionally truncated; a real SHA-256 digest is 64 hex characters. This is acceptable as a non-functional example.
- The "Protection 7: Enable EDNS Client Subnet Privacy" section uses valid Unbound options, but the section heading is slightly misleading — `send-client-subnet` enables sending ECS upstream. The `max-client-subnet-ipv4: 0` / `ipv6: 0` settings scope source prefix length to 0, which is the privacy-preserving intent, but operators should note ECS is being enabled rather than disabled. Left as-is since the options are valid and the net effect aligns with the privacy goal.
- `dnssec-failed.org` (Comcast's test domain) and `dig DS example.com @a.gtld-servers.net` are accurate, real test references.
- All other commands (`dig +dnssec`, `tcpdump`, `tshark -Y "dns.flags.authenticated == 0"`) use correct, current syntax and field names.
