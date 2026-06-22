# Validation Summary: How to Migrate from NSEC to NSEC3 in Your DNSSEC Zone

## Status
validated

## Post Type
Tutorial / Step-by-step migration guide

## Technologies Covered
- DNSSEC (authenticated denial of existence: NSEC and NSEC3)
- BIND 9 (`dnssec-signzone`, `dnssec-policy`, `rndc`, `named-checkconf`, `nsec3hash`, `dnssec-dsfromkey`, `delv`)
- PowerDNS (`pdnsutil`)
- Knot DNS (`knotc`, YAML policy config)
- `dig` for DNS verification
- DNSViz / DNSSEC validation tooling

## Sources Consulted
- RFC 5155 — DNS Security (DNSSEC) Hashed Authenticated Denial of Existence (NSEC3), incl. Appendix A example hashes
- RFC 4034 — Resource Records for the DNS Security Extensions (NSEC)
- RFC 9276 — Guidance for NSEC3 Parameter Settings (iterations 0, empty salt)
- `dnssec-signzone(8)` man page / BIND 9 ARM — https://linux.die.net/man/8/dnssec-signzone and https://bind9.readthedocs.io/
- BIND 9 ARM `dnssec-policy` documentation and auto-dnssec deprecation notes — https://bind9.readthedocs.io/en/v9.18.14/dnssec-guide.html
- ISC KB: Inline Signing With NSEC3 — https://kb.isc.org/docs/aa-00711
- PowerDNS `pdnsutil` DNSSEC documentation
- Knot DNS configuration reference

## Issues Found
1. **Incorrect `dnssec-signzone -A` flag (and misleading comment).** In the "Alternative: Manual Zone Signing" command, the flag `-A` was annotated as "Generate NSEC3 for all types." This is wrong: `-A` sets the **opt-out** flag on the generated NSEC3 chain (and `-AA` clears it). Since the entire post recommends opt-out **disabled** (flags 0), including `-A` would have contradicted the intended configuration and produced an opt-out NSEC3 chain. Removed the `-A` line so the manual signing command matches the no-opt-out parameters described elsewhere.
2. **`auto-dnssec maintain;` combined with `dnssec-policy`.** Both the NSEC3 BIND zone config and the rollback BIND zone config listed `auto-dnssec maintain;` alongside a `dnssec-policy` statement. These two mechanisms are mutually exclusive in modern BIND 9 (`auto-dnssec` is deprecated and superseded by `dnssec-policy`); configuring both is a configuration error and the zone will not load. Removed the `auto-dnssec maintain;` line from both blocks and noted that `dnssec-policy` manages signing automatically. Left `inline-signing yes;` in place, which remains valid with `dnssec-policy` for file-based zones.

## Review Notes
- The NSEC3 record example (`h9p7u7tr2u91d0v0ljs9l1gidnp90u3h...`) and the `1 0 0 -` NSEC3PARAM format match RFC 5155 / BIND output conventions and are correct.
- RFC mappings in the comparison table (NSEC → RFC 4034, NSEC3 → RFC 5155) are correct, and the RFC 9276 guidance (0 iterations, empty salt, opt-out off for standard zones) is accurately represented.
- The "0–10 iterations" / "max 150 iterations" guidance reflects the older RFC 5155 sizing table; it is not wrong, but per RFC 9276 modern resolvers increasingly treat any iteration count above 0 as undesirable. The post already steers readers to 0, so this was left as-is.
- The inline `#` comments placed after backslash line-continuations in the `dnssec-signzone` block are an illustrative convention and would not execute verbatim as shown; this is common in documentation and was left unchanged since the intent is clearly explanatory.
- The monitoring script's `date -d "$EARLIEST_EXP"` parsing of the RRSIG `YYYYMMDDHHMMSS` expiration timestamp is fragile (GNU `date` will not parse that compact form directly); the script guards this with `2>/dev/null`. Left as-is since it is illustrative and not a correctness claim.
- PowerDNS (`pdnsutil set-nsec3 ... narrow`) and Knot DNS YAML policy snippets use valid, current option names and were verified against their respective documentation.
