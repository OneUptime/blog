# Validation Summary: How to Enable DNSSEC with BIND9 on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- BIND9
- DNS
- DNSSEC
- DNSKEY, DS, RRSIG, NSEC3
- `dnssec-policy`
- `dnssec-keygen`
- `dnssec-signzone`
- `dnssec-dsfromkey`
- `dig`
- `delv`

## Sources Consulted
- BIND 9 Administrator Reference Manual, `dnssec-policy` configuration: https://bind9.readthedocs.io/en/v9.18.21/reference.html#dnssec-policy-block-grammar
- BIND 9 DNSSEC guide, KASP and key rollover behavior: https://bind9.readthedocs.io/en/v9.16.38/dnssec.inc.html
- BIND 9 manual pages, `dnssec-keygen`, `dnssec-signzone`, `dnssec-dsfromkey`, and `rndc signing`: https://bind9.readthedocs.io/en/v9.20.0/manpages.html
- BIND 9.16 manual pages for Ubuntu-era command compatibility: https://bind9.readthedocs.io/en/v9.16.50/manpages.html
- RFC 8624, DNSSEC algorithm implementation requirements and DS digest guidance: https://www.rfc-editor.org/rfc/rfc8624
- Linked prerequisite OneUptime guide: https://oneuptime.com/blog/post/2026-03-02-how-to-set-up-bind9-as-a-primary-dns-server-on-ubuntu/view

## Issues Found
- The `dnssec-policy` example could be placed incorrectly inside Ubuntu's existing `options { ... };` block. Clarified that the top-level policy block belongs outside `options`.
- The NSEC3 examples used a random salt and, for manual signing, the `-A` opt-out flag. BIND documentation recommends `-3 -` for no salt, warns against unnecessary opt-out, and recommends zero iterations. Updated automatic policy and manual signing commands to use no salt and zero iterations.
- The automatic DS record command used `rndc signing -list`, which lists signing state rather than generating a DS record. Replaced it with a `dig DNSKEY | dnssec-dsfromkey -2 -f -` command.
- The DS record instructions generated and recommended submitting SHA-1 and SHA-256 DS records. RFC 8624 says SHA-1 must not be used for new DS/CDS generation. Updated the commands and example to generate and submit only SHA-256.
- The `ad` flag explanation did not specify that it applies when querying through a validating resolver. Added that qualifier.

## Review Notes
The tutorial remains technically valid after the corrections. The RSA/SHA-256 examples are supported, though BIND's built-in default policy now uses an ECDSA combined signing key and may be preferable for new deployments.
