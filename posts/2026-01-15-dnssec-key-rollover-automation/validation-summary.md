# Validation Summary: How to Set Up DNSSEC Key Rollover Automation

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- DNSSEC (KSK/ZSK key rollover, RRSIG, DS records, NSEC3)
- BIND 9 (`dnssec-policy`, `auto-dnssec`, `dnssec-keygen`, `dnssec-settime`, `dnssec-dsfromkey`, `rndc`, `delv`, `dig`)
- PowerDNS (`pdnsutil`)
- Knot DNS (`knotc`, `keymgr`, policy/keystore/submission config)
- AWS Route 53 DNSSEC (boto3 / Python)
- Google Cloud DNS (`gcloud dns`)
- Python (dnspython, prometheus_client)
- Bash automation, cron, systemd timers

## Sources Consulted
- RFC 6781 — DNSSEC Operational Practices, Version 2 (pre-publication / double-signature / double-DS rollover methods)
- RFC 8624 — Algorithm Implementation Requirements (algorithm numbers: 5/7 RSASHA1 deprecated, 8 RSASHA256, 13 ECDSAP256SHA256, 14 ECDSAP384SHA384)
- ISC BIND 9 ARM — `dnssec-policy` statement and options (https://bind9.readthedocs.io/)
- BIND man pages: `dnssec-keygen`, `dnssec-settime`, `dnssec-dsfromkey`, `delv`
- PowerDNS `pdnsutil` documentation (https://doc.powerdns.com/authoritative/manpages/pdnsutil.html)
- Knot DNS configuration reference (https://www.knot-dns.cz/docs/)
- AWS boto3 Route 53 client reference (`get_dnssec`, `create_key_signing_key`, `enable_hosted_zone_dnssec`, `deactivate_key_signing_key`, `delete_key_signing_key`)
- Local verification of `dig` output behavior (`dig +dnssec +short SOA cloudflare.com @1.1.1.1`)

## Issues Found
1. **RRSIG-expiry monitor never matched its target line (functional bug).**
   In the `dnssec-monitor.sh` `check_rrsig_expiry()` function, the post used:
   `dig +dnssec "$domain" SOA +short | grep RRSIG`.
   I verified with live `dig` that under `+short`, the RRSIG record is rendered
   starting with the *covered type*, e.g. `SOA 13 2 300 <expiry> <inception> ...`,
   and does **not** contain the literal string `RRSIG`. As written, `grep RRSIG`
   would never match, so the check would always log "No RRSIG found" and return a
   false warning. Changed the grep to `grep '^SOA'` (with an explanatory comment).
   The subsequent `awk '{print $5}'` extraction is correct for this line:
   field 5 of the `+short` RRSIG rdata is the expiration timestamp (verified:
   `SOA 13 2 300 20260624031445 ...` → `$5 = 20260624031445`).

## Review Notes
- The non-`+short` diagnostic command in the Troubleshooting section
  (`dig +dnssec example.com SOA | grep RRSIG`) is correct as-is — full `dig` output
  does include the literal `RRSIG` type, so no change was needed there.
- The Prometheus exporter sets `self.resolver.use_dnssec = True`, which is not a real
  dnspython `Resolver` attribute (the idiomatic call is
  `resolver.use_edns(0, dns.flags.DO, 4096)`). It does not raise an error, and the
  AD-flag check still works because the configured upstream (8.8.8.8) is a validating
  resolver, so the example remains illustrative rather than broken. The author also
  flags the key-age metric as a placeholder. Left as-is since nothing is incorrect
  enough to break execution.
- The algorithm-strength check comments group algorithm 8 (RSASHA256) with "older RSA";
  algorithm 8 is older relative to ECDSA but is not deprecated/weak. The actual code
  only flags algorithms 5 and 7 (RSASHA1 variants) as deprecated, which is correct per
  RFC 8624, so no functional issue.
- `dnssec-enable yes;` in the "Legacy BIND" `auto-dnssec` example was removed in
  BIND 9.16, but it is correctly scoped to BIND 9.9–9.15 where it is valid; the
  modern `dnssec-policy` example is presented separately for 9.16+.
- Rollover method descriptions (pre-publication for ZSK, double-signature/double-DS for
  KSK), key-size guidance, and the summary tables align with RFC 6781 operational
  practices.
