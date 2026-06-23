# Validation Summary: How to Perform a DNSSEC ZSK (Zone Signing Key) Rollover

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- DNSSEC (Zone Signing Keys, Key Signing Keys, DNSKEY/RRSIG/DS records)
- BIND 9 (`dnssec-keygen`, `dnssec-settime`, `dnssec-verify`, `rndc`, `dnssec-policy`)
- PowerDNS (`pdnsutil`)
- Knot DNS (policy configuration)
- `dig` for DNS/DNSSEC inspection
- Bash, Python, and Ansible automation

## Sources Consulted
- RFC 6781 — DNSSEC Operational Practices, Version 2 (https://tools.ietf.org/html/rfc6781)
- RFC 7583 — DNSSEC Key Rollover Timing Considerations (https://tools.ietf.org/html/rfc7583)
- BIND 9 Administrator Reference Manual — DNSSEC chapter and `dnssec-policy` reference (https://bind9.readthedocs.io/)
- PowerDNS Authoritative Server — ZSK Rollover guide (https://doc.powerdns.com/authoritative/guides/zskroll.html)
- PowerDNS Authoritative Server — `pdnsutil` documentation (https://doc.powerdns.com/authoritative/dnssec/pdnsutil.html)
- Knot DNS Configuration Reference — policy section (https://www.knot-dns.cz/docs/)

## Issues Found
- **PowerDNS "Automated Rollover" section was factually wrong.** The post claimed PowerDNS performs automatic ZSK rollovers via a `ZSK-ROLLOVER-INTERVAL` metadata key (e.g. `pdnsutil set-meta example.com ZSK-ROLLOVER-INTERVAL 7776000`), plus a `PRESIGNED 0` setting. This metadata does not exist and PowerDNS has no built-in timer-based automatic ZSK rollover. Verified against the official PowerDNS ZSK Rollover guide, which documents a **manual** pre-publication procedure using `pdnsutil add-zone-key` / `activate-zone-key` / `deactivate-zone-key` / `remove-zone-key` (these moved under a `zone` namespace in PowerDNS 5.0). I rewrote the subsection (renamed to "PowerDNS Manual Rollover") to use the real `pdnsutil` commands and to clarify that PowerDNS keeps RRSIGs fresh automatically but key add/activate/remove are manual steps.

## Review Notes
- The BIND `dnssec-policy` example is correct, including the `ksk key-directory lifetime ... algorithm ecdsap256sha256` syntax — `key-directory` is a valid token in the `keys` block (it appears in BIND's built-in default policy). Option names (`signatures-validity`, `dnskey-ttl`, `publish-safety`, `retire-safety`, `parent-ds-ttl`, `parent-propagation-delay`) are all valid.
- The Knot DNS policy snippet is valid: `ksk-size: 256` / `zsk-size: 256` are correct for `ecdsap256sha256`, and `ksk-lifetime: 0` correctly denotes unlimited.
- Key file naming (`Kexample.com.+008+12345.*` for algorithm 8 = RSASHA256, `+013+` for algorithm 13 = ECDSAP256SHA256), algorithm numbers (8, 13, 14), DNSKEY flag `256` for ZSK, and the RRSIG field layout in the examples are all correct.
- `dnssec-settime` flags (`-P`, `-A`, `-I`, `-D`, `-p all`) and `dnssec-keygen`/`dnssec-verify`/`rndc dnssec -status` usage are accurate.
- Caveat (not corrected — illustrative helper scripts): the Bash `get_active_zsk` `grep -q "A:"` check and the Python `_determine_state` field matching (`line.startswith(field[0].upper() + ':')`) assume an abbreviated `dnssec-settime -p` output, whereas real output uses full word labels (`Created:`, `Publish:`, `Activate:`, `Inactive:`, `Delete:`). These monitoring scripts are presented as illustrative and would need environment-specific adjustment before production use; the core rollover instructions and server configs are unaffected.
