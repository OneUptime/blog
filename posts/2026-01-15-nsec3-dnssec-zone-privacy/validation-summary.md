# Validation Summary: How to Configure NSEC3 for Enhanced DNSSEC Zone Privacy

## Status
validated

## Post Type
Tutorial / Configuration guide (DNSSEC NSEC3 across BIND, PowerDNS, Knot DNS, and NSD)

## Technologies Covered
- DNSSEC / NSEC3 (RFC 5155, RFC 9276, RFC 8198, RFC 9077)
- BIND 9 (`named`, `rndc`, `dnssec-policy`, `dnssec-signzone`, `dnssec-keygen`, `delv`)
- PowerDNS Authoritative Server (`pdnsutil`, pdns.conf, HTTP API)
- Knot DNS (`knot.conf`, `knotc`, `keymgr`)
- NSD + ldns tools (`ldns-signzone`, `ldns-keygen`, `drill`, `nsd-control`)
- `dig`, `openssl`
- Prometheus / bind_exporter (monitoring)

## Sources Consulted
- RFC 9276 — Guidance for NSEC3 Parameter Settings: https://www.rfc-editor.org/rfc/rfc9276
- RFC 8198 — Aggressive Use of DNSSEC-Validated Cache: https://www.rfc-editor.org/rfc/rfc8198
- RFC 9077 — NSEC and NSEC3: TTLs and Aggressive Use: https://www.rfc-editor.org/rfc/rfc9077.html
- BIND 9 `rndc` manual / Name Server Operations: https://bind9.readthedocs.io/
- ISC KB — dnssec-policy requires dynamic DNS or inline-signing: https://kb.isc.org/docs/dnssec-policy-requires-dynamic-dns-or-inline-signing
- PowerDNS Authoritative Settings reference: https://doc.powerdns.com/authoritative/settings.html
- PowerDNS DNSSEC / pdnsutil docs: https://doc.powerdns.com/authoritative/dnssec/index.html , https://doc.powerdns.com/authoritative/manpages/pdnsutil.1.html
- Knot DNS Configuration Reference + knotc man page: https://www.knot-dns.cz/docs/3.3/html/reference.html , https://www.knot-dns.cz/docs/3.3/html/man_knotc.html
- Knot DNS Modules (onlinesign / minimally covering NSEC): https://www.knot-dns.cz/docs/3.0/html/modules.html
- ldns-signzone man page: https://manpages.debian.org/bullseye/ldnsutils/ldns-signzone.1.en.html , https://man.archlinux.org/man/core/ldns/ldns-signzone.1.en
- Debian/Ubuntu `ldnsutils` package: https://packages.debian.org/sid/net/ldnsutils

## Issues Found

1. **BIND basic zone config mixed mutually-exclusive options.** The example combined `auto-dnssec maintain;` with `dnssec-policy default;`. These are mutually exclusive in modern BIND (and `auto-dnssec` is deprecated as of 9.16.36). Removed `auto-dnssec maintain;`, leaving `dnssec-policy default;` + `inline-signing yes;` (the supported configuration).

2. **Incorrect `rndc signing -nsec3param` parameters.** The command was `1 0 8 $(openssl rand -hex 8)` but the comment claimed "0 iterations". The argument order is `hash flags iterations salt`, so `8` was actually 8 iterations — contradicting the post's RFC 9276 zero-iteration guidance. Changed to `1 0 0 $(openssl rand -hex 8)` and clarified the parameter order in the comment.

3. **`dnssec-signzone -A` (opt-out) contradicted post guidance.** In `dnssec-signzone`, `-A` sets the NSEC3 opt-out flag, which the post explicitly recommends against for non-TLD zones. Removed `-A` from the signing example.

4. **Invalid PowerDNS global settings.** `dnssec=yes` and `default-nsec3-params=1 0 0 -` are not real `pdns.conf` settings (verified against the PowerDNS settings reference). DNSSEC and NSEC3 are configured per-zone via `pdnsutil`. Replaced those lines with a note explaining per-zone configuration. Kept the valid `default-soa-content` and `default-ttl` settings.

5. **Invalid Knot DNS `key:` section.** The config declared DNSSEC keys in a top-level `key:` block with `ksk: yes` / `algorithm: ECDSAP256SHA256`. In Knot, the `key:` section is for TSIG keys only; DNSSEC signing keys are generated automatically from the `policy` (or via `keymgr`). Removed the invalid block and added a clarifying comment.

6. **Non-existent `knotc zone-nsec3-salt` command.** Verified against the knotc man page — no such command exists, and there is no dedicated manual salt-rotation command (salt rotates automatically per `nsec3-salt-lifetime`). Replaced it with the accurate note plus `knotc zone-sign` to force a re-sign.

7. **Wrong Debian/Ubuntu package name (×2).** `apt-get install ldns-utils` is incorrect; the package providing `drill`, `ldns-signzone`, etc. is `ldnsutils`. Fixed both occurrences.

8. **Mislabeled `ldns-signzone -p` flag.** The post described `-p` as "Add time-based salt"; it actually sets the NSEC3 opt-out flag. Also removed `-p` from the example command (opt-out contradicts the post's recommendation) and corrected the option description.

9. **Overstated Knot "white lies" default.** The post said NSEC3 white lies are "On by default" in Knot. Minimally-covering / on-the-fly NSEC3 responses come from the optional `onlinesign` module, which is not enabled by default. Corrected to "Via the onlinesign module (not enabled by default)".

10. **Incorrect RFC attribution.** "Aggressive Use of DNSSEC-Validated Cache" is defined in RFC 8198, not RFC 9077 (RFC 9077 refines NSEC/NSEC3 TTL handling for aggressive use). Updated the attribution accordingly.

## Review Notes
- Core conceptual content is accurate: NSEC zone-walking, NSEC3 hashing, RFC 9276 guidance (0 iterations, empty/static salt, no rotation), opt-out semantics, and the SHA-1-only NSEC3 hash algorithm are all correctly described.
- BIND `dnssec-policy` syntax (`nsec3param`, `keys { ksk key-directory lifetime ... }`, signature/safety timers) is valid for BIND 9.16+.
- PowerDNS `pdnsutil` commands (`create-zone`, `secure-zone`, `set-nsec3`, `unset-nsec3`, `show-zone`), narrow mode, and the API `nsec3param`/`nsec3narrow` fields are correct.
- Knot `policy` NSEC3 options, `keymgr` generation syntax, and NSD/ldns signing flow (`ldns-keygen -k`, algorithm `+013` = ECDSAP256SHA256, `nsd-control reload`) are correct.
- The troubleshooting step that greps for `auto-dnssec` is now slightly dated given the switch to `dnssec-policy`, but `auto-dnssec` remains a real (deprecated) directive, so it was left unchanged.
- The Prometheus metric names (e.g. `bind_zone_dnssec_signature_expiration_seconds`) are illustrative; exact metric names depend on the bind_exporter version. Left as-is since they are presented as examples.
- The iteration "cracking math" is illustrative/order-of-magnitude and consistent with the RFC 9276 rationale.
