# Validation Summary: How to Configure DNSSEC with PowerDNS Authoritative Server

## Status
validated

## Post Type
Tutorial / Guide (step-by-step DNSSEC deployment on PowerDNS Authoritative Server)

## Technologies Covered
- DNSSEC (RRSIG, DNSKEY, DS, NSEC/NSEC3)
- PowerDNS Authoritative Server 4.x (pdnsutil, pdns.conf)
- PostgreSQL backend (gpgsql)
- dig / delv DNSSEC validation tooling
- DNSViz and Verisign DNSSEC debugging tools
- Prometheus monitoring

## Sources Consulted
- PowerDNS pdnsutil manpage — https://doc.powerdns.com/authoritative/manpages/pdnsutil.1.html
- PowerDNS pdnsutil & DNSSEC docs — https://doc.powerdns.com/authoritative/dnssec/pdnsutil.html
- PowerDNS DNSSEC operational docs (NSEC3 / set-nsec3) — https://doc.powerdns.com/authoritative/dnssec/operational.html
- PowerDNS Generic PostgreSQL backend docs — https://doc.powerdns.com/authoritative/backends/generic-postgresql.html
- PowerDNS GitHub issue #5330 / #10372 (secure-zone produces a single CSK by default)
- RFC 9276 (Guidance for NSEC3 parameter settings — 0 iterations, no salt)
- RFC 5155 (NSEC3), RFC 4034/4035 (DNSSEC records and flags)

## Issues Found
1. **`secure-zone` default behavior misstated (Method 1).** The post claimed `pdnsutil secure-zone` generates a separate 256-bit ECDSA ZSK and KSK and creates NSEC3 records. In reality, with default settings PowerDNS creates a single Combined Signing Key (CSK) using ECDSAP256SHA256 (algorithm 13) and uses **NSEC** (not NSEC3) for authenticated denial of existence. Separate ZSK/KSK are only created if `default-zsk-algorithm` is configured. Rewrote the "This command:" list to describe the CSK + NSEC default accurately and added a note about how to get separate keys.

2. **NSEC3 narrow mode incorrectly described as the default.** A code comment read "Enable narrow mode (default in PowerDNS)". Narrow mode is opt-in, not the default. Changed the comment to "(opt-in; not enabled by default)".

3. **Outdated NSEC3 parameters labeled as "recommended".** The post presented `1 0 10 aabbccdd` (10 iterations + salt) as "recommended parameters". Current best practice per RFC 9276 (and PowerDNS's own documentation example, `1 0 0 -`) is 0 iterations and no salt. Updated the recommended command to `1 0 0 -`, corrected the parameter explanation, and added a sentence explaining why the older non-zero-iteration/salted guidance is now discouraged.

## Review Notes
- The `add-zone-key`, `activate-zone-key`, `deactivate-zone-key`, `remove-zone-key`, and `set-nsec3` command syntaxes used throughout are correct for PowerDNS 4.x. Note that PowerDNS 4.9/5.x restructured `pdnsutil` into `pdnsutil zone <subcommand>` forms (e.g. `zone secure`, `zone add-key`); the older forms used in the post remain supported as aliases but may emit deprecation warnings on newer releases.
- DNSKEY flag values (257 = KSK/SEP, 256 = ZSK), algorithm numbers (8 RSASHA256, 13 ECDSAP256SHA256, 14 ECDSAP384SHA384, 15 ED25519), and DS digest types (2 = SHA-256, 4 = SHA-384) are all accurate.
- The PostgreSQL schema path `/usr/share/doc/pdns-backend-pgsql/schema.pgsql.sql` is a common Debian/Ubuntu location; the exact path can vary by distribution/package version (some use `/usr/share/pdns-backend-pgsql/schema/schema.pgsql.sql`). Left as-is since the cited path is valid for the documented install method.
- 1024-bit RSA ZSK examples (`rsasha256 1024`) are still technically functional and were historically common for ZSKs, but 2048-bit is increasingly preferred; left intact as the post presents RSA purely as a legacy-compatibility option.
- The troubleshooting hint "Re-sign zone if signatures expired" using `rectify-zone` is slightly imprecise — PowerDNS performs live signing, so `rectify-zone` repairs NSEC/NSEC3 ordering and auth bits rather than re-signing — but `rectify-zone` is still the correct remediation command, so it was left unchanged.
- The `show-zone` example output showing "NSEC3 narrow mode" with separate KSK/ZSK reflects a manually-configured zone rather than the `secure-zone` default; it remains valid as illustrative output.
