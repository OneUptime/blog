# Validation Summary: How to Manage DNSSEC DS Records for IPv6 Zones

## Status
validated

## Post Type
Guide

## Technologies Covered
- DNSSEC
- DNS DS and DNSKEY records
- BIND 9 utilities: `dnssec-dsfromkey`, `dnssec-keygen`, `rndc`, `dig`
- Registrar-side DS publication workflows
- Cloudflare DNSSEC API behavior

## Sources Consulted
- BIND 9 manual pages: `dnssec-dsfromkey`, `dnssec-keygen`, `dig` and related tooling: https://bind9.readthedocs.io/en/v9.21.14/manpages.html
- BIND 9 DNSSEC Guide: https://bind9.readthedocs.io/en/stable/dnssec-guide.html
- BIND 9 configuration reference for `auto-dnssec`, `rndc sign`, and `rndc loadkeys`: https://bind9.readthedocs.io/en/v9.16.38/reference.html
- RFC 4034, "Resource Records for the DNS Security Extensions": https://datatracker.ietf.org/doc/html/rfc4034
- RFC 4509, "Use of SHA-256 in DNSSEC Delegation Signer (DS) Resource Records (RRs)": https://datatracker.ietf.org/doc/html/rfc4509
- RFC 6605, "Elliptic Curve Digital Signature Algorithm (DSA) for DNSSEC": https://datatracker.ietf.org/doc/html/rfc6605
- Cloudflare DNSSEC API documentation: https://developers.cloudflare.com/api/resources/dns/subresources/dnssec/
- Cloudflare multi-signer DNSSEC setup documentation: https://developers.cloudflare.com/dns/dnssec/multi-signer-dnssec/setup/

## Issues Found
- The post incorrectly framed DS records as an IPv6-specific topic. DS records are defined at the DNS delegation layer and are not specific to IPv6 zones, so I removed the IPv6-specific title, tag, and description wording.
- The `dnssec-dsfromkey` example incorrectly claimed the default output included multiple digest types. Current BIND documentation says the default is SHA-256 unless additional `-a` options are provided, so I corrected the example.
- The signed-zone example used `dnssec-dsfromkey -s`, but `-s` is keyset mode, not zone-file mode. I changed it to `-f` to match the documented zone-file workflow.
- The registrar parsing snippet extracted the wrong fields from `dnssec-dsfromkey` output. By default the tool omits TTL, so the original `awk` field numbers were off by one and would not parse the DS fields correctly. I fixed the field positions and added a note explaining why.
- The verification snippet also used the wrong `awk` field for the local DS digest and assumed a single published DS hash. I corrected the field index and made the comparison work against the DS hashes returned by the parent nameserver.
- The Cloudflare API example was inaccurate for current DNSSEC endpoint behavior. Cloudflare's documented DNSSEC endpoint is `PATCH /zones/{zone_id}/dnssec` for enabling DNSSEC settings, not a generic registrar DS-submission API that accepts raw DS components in the form shown. I replaced that with an API-neutral registrar note.
- The rollover script generated the new KSK outside the configured key directory, used an invalid TTL-check example, and relied on `rndc reload` for a key-loading/signing action that BIND documents separately. I added `-K "${KEY_DIR}"`, fixed the TTL-check guidance, and changed the command to `rndc sign` with wording that limits it to named-managed DNSSEC setups.
- The monitoring script tried to match filenames containing `KSK`, but BIND key filenames do not encode that string. It also extracted the wrong digest field. I rewrote the loop to inspect `.key` files directly, rely on `dnssec-dsfromkey` to emit only KSK-based DS records by default, and compare the correct digest field.

## Review Notes
- The `rndc sign` example is appropriate when `named` is managing DNSSEC for the zone, such as with `auto-dnssec` or `dnssec-policy`; fully manual `dnssec-signzone` workflows would use a different resigning path.
- The validation note about the `ad` flag is now scoped to validating recursive resolvers, which matches how `dig` and DNSSEC validation behavior are documented.
