# Validation Summary: How to Sign Your DNS Zone with DNSSEC Using BIND

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- BIND 9 (9.16+, 9.18)
- DNSSEC (zone signing, key management)
- `dnssec-signzone` CLI
- `dnssec-keygen` / `dnssec-dsfromkey` CLI
- BIND `dnssec-policy`, inline signing, `auto-dnssec`
- NSEC / NSEC3 authenticated denial of existence
- `rndc`, `named-checkconf`, `named-checkzone`, `dig`, `delv`

## Sources Consulted
- BIND 9 Administrator Reference Manual / ISC man pages for `dnssec-signzone`, `dnssec-keygen`, `dnssec-dsfromkey`, `rndc`, `named.conf` (https://bind9.readthedocs.io/)
- ISC BIND DNSSEC Guide (https://bind9.readthedocs.io/en/latest/dnssec-guide.html)
- ISC release notes on `auto-dnssec` deprecation (deprecated in 9.16.36 / 9.18.10 in favor of `dnssec-policy`)
- RFC 4035 (DNSSEC Protocol Modifications), RFC 5155 (NSEC3), RFC 6781 (Operational Practices), RFC 9276 (NSEC3 parameter guidance)

## Issues Found
- **Incorrect `dnssec-signzone` flag for signature inception.** The options table listed `-i` as "Signature inception (offset)" with example `-i -1h`. This is wrong: in `dnssec-signzone`, `-i interval` specifies the *cycle interval* used when re-signing an already-signed zone (RRSIGs expiring within the interval get regenerated), not the inception time. The signature inception is set with `-s start-time`. Changed the row to `-s` with example `-s -1h`. All other rows (`-o`, `-K`, `-N` with KEEP/INCREMENT/UNIXTIME/DATE, `-S`, `-e`, `-3`, `-H`, `-A`, `-f`) were verified correct.

## Review Notes
- DNSKEY flag values (256 = ZSK, 257 = KSK), algorithm 13 = ECDSAP256SHA256, and the RRSIG layout in the sample signed zone (KSK 12345 signing the DNSKEY RRset, ZSK 54321 signing other RRsets) are all accurate.
- `dnssec-policy` syntax was checked: both human-readable durations (`90d`, `14d`) and ISO 8601 durations (`P90D`, `PT1H`) are accepted by BIND, and the post correctly mixes them across examples. Options such as `signatures-validity-dnskey`, `max-zone-ttl`, `zone-propagation-delay`, `parent-registration-delay`, and `nsec3param iterations 0 optout no salt-length 8` are all valid.
- The `auto-dnssec` deprecation note (deprecated since 9.16.36 / 9.18.10, use `dnssec-policy`) is accurate and appropriately surfaced.
- NSEC3: SHA-1 (algorithm 1) is correctly described as the only option; iterations 0 is correctly recommended.
- Minor best-practice nuance (not an error): RFC 9276 suggests an empty NSEC3 salt provides essentially no additional security benefit; the post uses an 8-byte salt, which is still valid and widely used. Could be mentioned in a future revision but is not incorrect.
- The `-e +30d` / `-s -1h` relative-time syntax with unit suffixes is supported by current BIND signing tools.
