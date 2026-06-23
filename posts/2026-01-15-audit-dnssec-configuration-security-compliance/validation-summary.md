# Validation Summary: How to Audit DNSSEC Configuration for Security Compliance

## Status
validated

## Post Type
Guide / Checklist (security compliance auditing reference)

## Technologies Covered
- DNSSEC (DNS Security Extensions)
- `dig` (BIND DNS lookup utility) and `delv`
- `drill` (ldns) and `ldns-verify-zone`
- DNSViz, Zonemaster, Verisign DNSSEC Debugger
- BIND, PowerDNS, Knot DNS server software
- DNSSEC record types: DNSKEY, RRSIG, DS, NSEC/NSEC3
- DNSSEC algorithms (RSA, ECDSA, Ed25519/Ed448)
- Compliance frameworks: NIST SP 800-81-2, PCI-DSS 4.0, SOC 2, ISO 27001, FedRAMP, HIPAA

## Sources Consulted
- Live testing of `dig`/`delv` behavior against public resolver 1.1.1.1 (BIND 9 dig)
- RFC 4034 (DNSSEC Resource Records — DNSKEY flags 256/257, RRSIG/DS presentation format)
- RFC 8624 / IANA DNSSEC Algorithm Numbers registry (algorithm number → name/status mapping)
- RFC 5155 (NSEC3) and RFC 9276 (NSEC3 parameter best practices)
- RFC 7583 (DNSSEC Key Rollover Timing)
- BIND 9 `dig`/`delv` documentation (removal of `+sigchase`, introduction of `delv`)

## Issues Found
1. **Key-id grep would return nothing (Section 2.3).** The command `dig DNSKEY example.com | grep -oP 'key id = \K\d+'` does not work: default (single-line) `dig` output does not emit the `; key id =` comment. Verified empirically that the comment only appears with `+multiline`. Changed the command to `dig +multiline DNSKEY example.com | grep -oP 'key id = \K\d+'` and updated the inline comment.
2. **Monitoring script `+short` broke RRSIG parsing (Section 6.1).** The line `EXPIRY=$(dig +short +dnssec $DOMAIN SOA | grep RRSIG | awk '{print $9}')` always produced an empty result, because `+short` prints RRSIG rdata starting with the covered type (e.g. `SOA 13 2 ...`) without the literal string `RRSIG`, so `grep RRSIG` matches nothing. Verified empirically against 1.1.1.1. Removed `+short` so the full output (which contains the `RRSIG` type column and whose field `$9` is the expiration timestamp) is matched: `dig +dnssec $DOMAIN SOA | grep RRSIG | awk '{print $9}'`. This now matches the (already correct) usage in the custom audit script in the Automated Tools section.

## Review Notes
- The DNSSEC algorithm table, DNSKEY flag values (257 = KSK, 256 = ZSK), `awk '{print $3}'` algorithm extraction, RRSIG `$9` expiration field, and NSEC3PARAM field order (`algorithm flags iterations salt`) were all verified correct.
- The `+sigchase` deprecation note and `delv` (BIND 9.10+) replacement guidance are accurate; `delv +rtrace` and `delv -a anchor-file` flags were verified to exist.
- `dnssec-failed.org` (Comcast) is a valid intentionally-broken test domain, and `cloudflare.com` is DNSSEC-signed — both examples are appropriate.
- NSEC3 guidance recommends "iterations 0-10." This is fine but slightly behind current best practice: RFC 9276 (2022) recommends **0** iterations and an empty salt, and some modern validators treat any non-zero iteration count as less desirable. The post's "kept low" framing is not wrong, just conservative. No change made.
- `ldns-verify-zone -k /path/to/ksk.key` — the `-k` trust-anchor flag could not be verified (ldns tools not installed in the environment); standard usage verifies against the DNSKEYs embedded in the signed zone file. Left as-is since it is plausible and not demonstrably wrong.
- Compliance-framework mappings (e.g. "PCI-DSS 4.0 requires DNSSEC") are interpretive rather than literal mandates; they are presented as audit-mapping guidance and are reasonable in that context.
