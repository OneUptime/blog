# Validation Summary: How to Implement DNSSEC for Email Security (DKIM, DMARC, SPF)

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- SPF (Sender Policy Framework)
- DKIM (DomainKeys Identified Mail)
- DMARC (Domain-based Message Authentication, Reporting & Conformance)
- DNSSEC
- BIND 9 (named, dnssec-keygen, dnssec-signzone, rndc)
- PowerDNS (pdnsutil)
- AWS Route 53, Cloudflare API, Google Cloud DNS
- OpenSSL (RSA key generation)
- dig / delv (DNS diagnostics)
- MTA-STS, DANE/TLSA, BIMI (mentioned as bonus layers)

## Sources Consulted
- RFC 7208 (SPF) — mechanisms, qualifiers, 10 DNS lookup limit
- RFC 6376 (DKIM Signatures) — tag/value record fields (v, k, p, h, s, t), selector layout
- RFC 7489 (DMARC) — policy values, tags (sp, rua, ruf, pct, adkim, aspf, fo, rf, ri), alignment modes
- RFC 4033/4034/4035 and RFC 6781 (DNSSEC) — DNSKEY/RRSIG/DS/NSEC3 record types, chain of trust
- ISC BIND 9 Administrator Reference Manual and BIND 9.16/9.18 release notes — named.conf options, dnssec-signzone usage, removal of `dnssec-enable`
- PowerDNS documentation — pdnsutil secure-zone, default-ksk-algorithm/default-zsk-algorithm settings
- AWS Route 53 DNSSEC docs, Cloudflare API docs, Google Cloud DNS docs
- RFC 8460 (MTA-STS) and BIMI / DANE references for the bonus records

## Issues Found
- **Deprecated/removed BIND option `dnssec-enable yes;`** (named.conf example). This option was deprecated in BIND 9.15 and **removed** in BIND 9.16.0; DNSSEC responses are now always enabled, and including the directive causes a configuration error so `named` fails to load on current BIND (9.16+, including the 9.18/9.20 LTS lines). Fixed by removing the `dnssec-enable yes;` line from the `options` block, leaving the valid `dnssec-validation auto;`.

## Review Notes
- `auto-dnssec maintain;` + `inline-signing yes;` are correct and still function in the widely-deployed BIND 9.18 LTS, but were deprecated in favor of `dnssec-policy` and are slated for removal in newer BIND branches (9.19+). Worth modernizing to `dnssec-policy default;` in a future revision, but not incorrect for current LTS.
- The `delv ... example.com A` example shows `93.184.216.34`, the long-standing IANA `example.com` address; that reserved-documentation host stopped serving a stable A record in 2025. It is purely illustrative output, so left as-is.
- SPF lookup-limit explanation lists `include`, `a`, `mx`, and `redirect` as counting toward the limit of 10; `ptr` and `exists` also count per RFC 7208, but the post's list is accurate as far as it goes.
- The DMARC aggregate-report Python parser uses broad `.//` XPath lookups; it works on standard report schemas but is intentionally simplified (no per-row record/policy_evaluated traversal). Functionally correct for the demonstration.
- All other DNS record formats, OpenSSL commands, qualifier/tag tables, and cloud-provider CLI/API calls verified accurate.
