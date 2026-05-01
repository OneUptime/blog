# Validation Summary: How to Sign IPv6 Forward DNS Zones with DNSSEC

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- DNSSEC
- IPv6
- DNS
- BIND 9
- `dnssec-keygen`
- `dnssec-signzone`
- `dnssec-verify`
- `rndc`
- `dig`

## Sources Consulted
- BIND 9 DNSSEC Guide: https://bind9.readthedocs.io/en/stable/dnssec-guide.html
- BIND 9 manual pages (`dnssec-keygen`, `dnssec-signzone`, `dnssec-verify`, `rndc`): https://bind9.readthedocs.io/en/v9.21.16/manpages.html
- BIND 9 release notes (`auto-dnssec` removal and current DNSSEC behavior): https://bind9.readthedocs.io/en/v9.20.4/notes.html
- BIND 9 release notes (`dnssec-enable` obsolete): https://bind9.readthedocs.io/en/v9.16.23/notes.html
- RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 9276, Guidance for NSEC3 Parameter Settings: https://datatracker.ietf.org/doc/html/rfc9276
- ISC Knowledge Base, DNSSEC signed zones best practice guidance relating to NSEC3 signing and validation: https://kb.isc.org/docs/dnssec-signed-zones-best-practice-guidance-for-nsec3-iterations

## Issues Found
- The sample AAAA records for `cdn` used `2001:db8:cdn::/64`, which is not valid IPv6 text because `cdn` is not hexadecimal. I changed those addresses to valid documentation-prefix IPv6 addresses.
- The key-generation comments said the KSK was "larger" than the ZSK. With `ECDSAP256SHA256`, the distinction is role, not key size. I corrected the comments to describe key usage instead of size.
- The manual `dnssec-signzone` example used a random NSEC3 salt and `-A` (opt-out). Current BIND and RFC 9276 guidance recommend no salt, zero additional iterations, and avoiding opt-out except for very large zones with sparse secure delegations. I changed the example to `-3 -` and `-H 0`, and removed opt-out.
- The manual signing example wrote the signed zone to an implied location, but the subsequent `dnssec-verify` and `grep` commands referenced a relative path that would not match after `cd /var/named/keys/`. I made the output file path explicit and updated the verification commands accordingly.
- The BIND configuration mixed manual signed-zone loading with `auto-dnssec maintain` and `inline-signing yes`. That is inconsistent with the manual workflow, and `auto-dnssec` has been removed from current BIND releases. I changed Step 3 to a manual signed-zone configuration and rewrote Step 4 to show the current automatic-signing approach using `dnssec-policy` plus `inline-signing yes`.
- The configuration included `dnssec-enable yes`, which ISC documents as obsolete and without effect. I removed it.
- The post used `rndc signing -status example.com`, but current `rndc` documentation uses `rndc signing -list example.com` for signing-state inspection. I corrected the command.
- The external resolver validation command implied that querying `@8.8.8.8` against the example zone would validate immediately. That only makes sense after the zone is publicly delegated and its DS record is published. I clarified that requirement.
- The automation script tried to identify the ZSK by filtering filenames for `KSK`, but BIND key filenames do not encode the KSK flag that way. I changed the script to identify keys from the `.key` file comments.
- The automation script could set the SOA serial backwards if run more than once in a day. I fixed the serial logic so it increments safely.
- The automation script also used the outdated NSEC3 salt and opt-out pattern. I updated it to use no salt, zero additional iterations, and an explicit signed output path.

## Review Notes
- The post is technically valid after correction.
- The manual signing workflow remains supported, but for current BIND releases the preferred automation path is `dnssec-policy`.
- In current BIND documentation, the built-in `default` policy uses a combined-signing key (CSK) rather than a separate KSK/ZSK pair, so the automatic-signing example is intentionally distinct from the manual key-generation example.
