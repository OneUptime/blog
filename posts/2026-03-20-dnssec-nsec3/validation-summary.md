# Validation Summary: How to Configure DNSSEC NSEC3 for IPv6 Zones

## Status
validated

## Post Type
Guide

## Technologies Covered
- DNSSEC
- NSEC and NSEC3
- BIND 9
- `dnssec-signzone`
- `dig`
- `nsec3hash`
- IPv6 DNS records (`AAAA`)

## Sources Consulted
- RFC 5155: DNS Security (DNSSEC) Hashed Authenticated Denial of Existence — https://datatracker.ietf.org/doc/rfc5155/
- RFC 9276: Guidance for NSEC3 Parameter Settings — https://datatracker.ietf.org/doc/html/rfc9276.html
- BIND 9 DNSSEC Guide (stable): NSEC vs. NSEC3, migration guidance, and `nsec3param` policy settings — https://bind9.readthedocs.io/en/stable/dnssec-guide.html
- BIND 9 Manual Pages: `dnssec-signzone` options including `-3`, `-H`, and `-A` — https://bind9.readthedocs.io/en/v9.21.14/manpages.html
- BIND 9 Manual Pages: `rndc signing -nsec3param` and inline-signing behavior — https://bind9.readthedocs.io/en/v9.20.16/manpages.html
- BIND 9 Manual Pages: `nsec3hash` usage — https://bind9.readthedocs.io/en/v9.16.38/manpages.html
- BIND 9 release notes: removal of `auto-dnssec` in newer BIND branches — https://bind9.readthedocs.io/en/v9.19.24/notes.html

## Issues Found
- The post claimed NSEC3 prevents zone enumeration outright. I corrected this to explain that NSEC3 prevents trivial plaintext zone walking, but hashed owner names can still be collected and predictable names can be brute-forced offline.
- The NSEC vs NSEC3 comparison table overstated NSEC3’s benefits and understated its overhead. I updated the recommendation and performance guidance to match current BIND documentation and RFC 9276.
- The `NSEC3PARAM` flags explanation was wrong. In DNS records, `NSEC3PARAM` flags must be zero; Opt-Out is indicated on `NSEC3` records, not on `NSEC3PARAM`. I corrected both the parameter description and the Opt-Out example.
- The RFC 9276 section used an inaccurate “old recommendation” and claimed iteration count does not matter to cracking speed. I replaced that with the RFC-backed guidance: non-zero iterations and random salts were common historically, but current best practice is `iterations=0` and empty salt because extra iterations add cost without materially protecting guessable names.
- The `dnssec-signzone` command examples were not valid shell because they used inline comments after line-continuation backslashes. I rewrote the commands so they are syntactically valid.
- The manual signing example incorrectly used `-A` as if it enabled NSEC3. In `dnssec-signzone`, `-A` enables NSEC3 Opt-Out; NSEC3 itself is enabled by `-3`. I removed the incorrect `-A` from the non-Opt-Out example and corrected the Opt-Out example to use a single `-A`.
- The BIND auto-signing example used `auto-dnssec maintain`, which is outdated for current BIND guidance. I replaced it with a `dnssec-policy` example using `nsec3param iterations 0 optout no salt-length 0;`.
- The BIND verification command `rndc signing -status` was invalid. I replaced it with current verification steps using `rndc reconfig`, `dig NSEC3PARAM`, and a DNSSEC query for a nonexistent name.
- The Python NSEC3 hashing example was not RFC-correct because NSEC3 hashes canonical DNS wire-format names and uses the proper NSEC3 encoding rules. I replaced it with the authoritative `nsec3hash` utility example from BIND documentation.
- The migration section used incorrect verification queries such as `dig NSEC3 zone` and `dig +dnssec NSEC zone`, which do not test what the post claimed. I replaced them with verification steps based on `NSEC3PARAM` and an NXDOMAIN response containing `NSEC3` records, and added the BIND caveat about RSASHA1-to-NSEC3 migration.

## Review Notes
- The post title and examples are framed around IPv6, but NSEC3 behavior is not IPv6-specific; it applies equally to zones serving IPv4, IPv6, or mixed RRsets.
- The corrected BIND guidance now reflects current preferred configuration patterns, but operators on older BIND LTS releases may still encounter legacy `auto-dnssec` and `rndc signing -nsec3param` workflows in historical documentation.
