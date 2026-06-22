# Validation Summary: How to Harden Your DNSSEC Configuration

## Status
validated

## Post Type
Guide / Reference (hardening checklist with configuration examples for BIND and PowerDNS)

## Technologies Covered
- DNSSEC (DNS Security Extensions)
- BIND 9 (`dnssec-policy`, `named.conf`, `rndc`, `dnssec-keygen`, `dnssec-dsfromkey`, `dnssec-signzone`, `dnssec-verify`, `delv`, `dig`)
- PowerDNS Authoritative Server (`pdnsutil`)
- DNSSEC algorithms (ECDSA P-256/P-384, Ed25519, RSA/SHA-256)
- NSEC3 (RFC 9276 best practices)
- CDS/CDNSKEY (RFC 7344)
- Response Rate Limiting (RRL)
- Prometheus / Alertmanager monitoring
- HSM / PKCS#11 key storage

## Sources Consulted
- BIND 9 ARM — `dnssec-policy`, key-store, nsec3param, signatures-validity statements: https://bind9.readthedocs.io/
- delv(1) manual — confirms `+trace` is supported and mimics `dig +trace`: https://manpages.ubuntu.com/manpages/xenial/man1/delv.1.html
- pdnsutil(1) manual — accepted algorithm mnemonics for `add-zone-key`: https://doc.powerdns.com/authoritative/manpages/pdnsutil.1.html
- PowerDNS Domain Metadata docs — valid `SOA-EDIT-API` values: https://doc.powerdns.com/authoritative/domainmetadata.html
- PowerDNS settings docs — `default-soa-edit-signed`: https://doc.powerdns.com/authoritative/settings.html
- RFC 9276 — Guidance for NSEC3 Parameter Settings (0 iterations, empty salt)
- RFC 7344 — Automating DNSSEC Delegation Trust Maintenance (CDS/CDNSKEY)
- IANA DNSSEC Algorithm Numbers registry (algorithm IDs 1, 3, 5–8, 13–15)

## Issues Found
1. **PowerDNS algorithm mnemonic was wrong (4 commands).** The post used `pdnsutil add-zone-key example.com ksk active ecdsap256sha256` (and the ZSK equivalent) in two places. `ecdsap256sha256` is the BIND mnemonic; `pdnsutil` only accepts `ecdsa256` for algorithm 13. Running the commands as written would fail. Changed all four PowerDNS occurrences to `ecdsa256`. The BIND `dnssec-policy` blocks correctly use `ecdsap256sha256` and were left unchanged.
2. **Invalid `SOA-EDIT-API` metadata value.** The post set `pdnsutil set-meta example.com SOA-EDIT-API INCEPTION-INCREMENT`. `INCEPTION-INCREMENT` is a valid `SOA-EDIT` value but not a documented `SOA-EDIT-API` value (valid values: DEFAULT, INCREASE, EPOCH, SOA-EDIT, SOA-EDIT-INCREASE). Changed it to `DEFAULT`, and corrected the accompanying comment, which inaccurately implied `default-soa-edit-signed` controls signature validity (it controls SOA serial handling for signed zones).

## Review Notes
- Algorithm IDs (Ed25519=15, ECDSA P-256=13, ECDSA P-384=14, RSA/SHA-256=8) and the deprecated-algorithm list (1, 3, 5, 6, 7) are correct per the IANA registry.
- NSEC3 guidance (algorithm 1 = SHA-1 only, 0 iterations, empty salt, opt-out off) correctly reflects RFC 9276; the BIND `nsec3param iterations 0 optout no salt-length 0;` and PowerDNS `set-nsec3 example.com '1 0 0 -' narrow` syntax are both valid.
- DS digest types (1=SHA-1 deprecated, 2=SHA-256 recommended, 4=SHA-384) and CDS/CDNSKEY usage (RFC 7344) are accurate.
- BIND `dnssec-policy` statements (`signatures-validity`, `signatures-validity-dnskey`, `signatures-refresh`, `publish-safety`, `retire-safety`, timing parameters, `key-store` PKCS#11) and `rndc dnssec`/`delv`/`dig` commands are valid. Note the `key-store` statement requires a recent BIND (9.20+); readers on older releases use the legacy native-PKCS#11/engine setup instead.
- PowerDNS does not expose a directly user-tunable RRSIG validity window the way BIND does; the (now-corrected) SOA-EDIT example is tangential to signature validity and is best read as serial-handling guidance rather than a signature-lifetime control.
