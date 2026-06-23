# Validation Summary: How to Perform a DNSSEC KSK (Key Signing Key) Rollover

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- DNSSEC (KSK/ZSK key hierarchy, DS records, RRSIG, DNSKEY)
- BIND 9 (dnssec-keygen, dnssec-dsfromkey, rndc, delv, dnssec-policy)
- PowerDNS (pdnsutil)
- Knot DNS (keymgr)
- dig / DNS troubleshooting
- Terraform / Ansible (Infrastructure as Code examples)
- OneUptime (DNSSEC monitoring/alerting)

## Sources Consulted
- RFC 6781 (DNSSEC Operational Practices, Version 2) — KSK rollover methods (Double-Signature, Double-DS)
- RFC 7583 (DNSSEC Key Rollover Timing Considerations) — timing/safety margins
- RFC 5011 (Automated Updates of DNSSEC Trust Anchors) — REVOKE bit
- BIND 9 ARM / ISC KB — dnssec-policy keywords (https://kb.isc.org/docs/dnssec-key-and-signing-policy)
- PowerDNS pdnsutil manpage (https://doc.powerdns.com/authoritative/manpages/pdnsutil.1.html)
- Knot DNS keymgr manpage (https://www.knot-dns.cz/docs/latest/html/man_keymgr.html)

## Issues Found
No technical issues found.

Key items verified:
- DNSKEY flags: KSK = 257, ZSK = 256, algorithm 13 = ECDSAP256SHA256, key filename `K<name>.+013+<keyid>` convention — all correct.
- `dnssec-keygen -a ECDSAP256SHA256 -f KSK -n ZONE`, `dnssec-dsfromkey`, `rndc sign`, `delv ... +vtrace` — valid BIND syntax.
- `pdnsutil add-zone-key example.com ksk active ecdsa256` — confirmed valid; key bits optional for ecdsa256. `export-zone-ds`, `remove-zone-key` correct.
- BIND `dnssec-policy` keywords (`dnskey-ttl`, `publish-safety`, `retire-safety`, `parent-ds-ttl`) — confirmed valid.
- Knot `keymgr ... generate algorithm=ECDSAP256SHA256 ksk=yes`, `list`, `ds`, `set ... retire=+0` — confirmed valid (`ksk=yes` bool form and `+0` relative timing accepted).
- Double-Signature and Double-DS rollover sequencing match RFC 6781.
- DS digest_type 2 = SHA-256; .com DS/DNSKEY TTL of 86400s and 2x-TTL wait recommendations are sound.
- RFC citations (6781, 7583, 8901, 5011) match their actual titles.

## Review Notes
- The Terraform example uses illustrative resource types (`dns_dnssec_key`, `registrar_ds_record`) that do not correspond to a real published Terraform provider — DNSSEC KSK material and registrar DS records are not generally managed this way in mainstream providers. It is clearly framed as a conceptual "example," so it was left as-is, but readers should treat it as pseudo-code rather than a working configuration.
- `pdnsutil` subcommands remain valid; note that in newer PowerDNS releases some tooling is being reorganized, but the commands shown still work.
- Guidance is otherwise version-agnostic and aligns with current operational best practices.
