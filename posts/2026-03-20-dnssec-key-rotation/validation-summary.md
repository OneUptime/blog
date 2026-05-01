# Validation Summary: How to Automate DNSSEC Key Rotation for IPv6 Zones

## Status
validated

## Post Type
Guide

## Technologies Covered
- DNSSEC
- BIND 9
- Bash
- `dnssec-keygen`
- `dnssec-settime`
- `dnssec-signzone`
- `dnssec-dsfromkey`
- `rndc`
- `dig`

## Sources Consulted
- ISC BIND 9 DNSSEC Guide (manual signing, rollover methods, validation behavior): https://bind9.readthedocs.io/en/v9.16.20/dnssec-guide.html
- ISC BIND 9 Manual Pages (`dnssec-keygen`, `dnssec-settime`, `dnssec-signzone`, `dnssec-dsfromkey`, `rndc dnssec`): https://bind9.readthedocs.io/en/v9.16.38/manpages.html
- ISC BIND 9 Configuration Reference (`dnssec-policy` grammar and zone options): https://bind9.readthedocs.io/en/v9.16.25/reference.html
- RFC 6781, DNSSEC Operational Practices, Version 2: https://datatracker.ietf.org/doc/html/rfc6781
- RFC 7583, DNSSEC Key Rollover Timing Considerations: https://datatracker.ietf.org/doc/html/rfc7583
- RFC 9276, Guidance for NSEC3 Parameter Settings: https://datatracker.ietf.org/doc/html/rfc9276

## Issues Found
- The ZSK section labeled the procedure as pre-publication but the original script actually double-signed the zone. I corrected the timeline and replaced the script with a timing-metadata-based pre-publication example using `dnssec-settime`, `dnssec-keygen -S`, and `dnssec-signzone -S`.
- The manual scripts generated keys in the wrong place and relied on `dnssec-signzone` to publish new DNSKEYs without smart signing. I added `-K`, switched to smart signing, and clarified that manual signing requires `named` to serve the `.signed` zone output.
- The original scripts used placeholder key filenames, an undefined `TTL` variable, and NSEC3 `-A` opt-out in places where it was not explained. I removed the broken placeholders, removed the undefined variable use, and replaced the signing commands with safer examples that match the described rollover flow.
- The verification steps treated the `ad` flag as if it would appear when querying an authoritative server. I changed the examples to verify the signed zone with `dnssec-verify`, inspect the served DNSKEY RRset, and clarified in the conclusion that `ad` only applies when querying a validating resolver.
- The automated BIND section used `signatures-jitter` in a BIND 9.16 `dnssec-policy` example even though that setting is not valid there, and it omitted the zone `key-directory`. I removed the invalid setting, added `key-directory`, and added the version caveat that `nsec3param` in `dnssec-policy` requires BIND 9.16.9+.
- The automated KSK rollover instructions used `rndc dnssec -rollover` as if it confirmed DS publication. I corrected the workflow to use `rndc reconfig`, `rndc dnssec -status`, and `rndc dnssec -checkds ... published|withdrawn` as documented by ISC.
- The monitoring script reported file creation timestamps instead of actual key publication, activation, inactivation, and deletion metadata, and its IPv6 reverse-zone example was not a real `ip6.arpa` name. I changed it to read timing metadata via `dnssec-settime` and used a plausible IPv6 reverse zone name.
- One explanatory sentence overstated the failure mode as “SERVFAIL for all queries.” I tightened that to the accurate validating-resolver behavior.

## Review Notes
- The DNSSEC rollover mechanics described here are protocol-agnostic; they apply equally to forward zones with AAAA records and to IPv6 reverse zones under `ip6.arpa`.
- ISC’s current guidance favors `dnssec-policy` over manual signing for most BIND deployments; the manual examples are appropriate only when you intentionally need manual control.
