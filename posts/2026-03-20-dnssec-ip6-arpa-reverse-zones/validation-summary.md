# Validation Summary: How to Sign ip6.arpa Reverse DNS Zones with DNSSEC

## Status
validated

## Post Type
Guide

## Technologies Covered
- DNSSEC
- IPv6 reverse DNS (`ip6.arpa`)
- BIND 9
- PTR records
- Python 3 (`ipaddress`)
- `dig`, `delv`, `dnssec-keygen`, `dnssec-signzone`, `dnssec-dsfromkey`, `dnssec-verify`

## Sources Consulted
- BIND 9 DNSSEC Guide: https://bind9.readthedocs.io/en/stable/dnssec-guide.html
- BIND 9 Manual Pages (`dnssec-keygen`, `dnssec-signzone`, `dnssec-dsfromkey`, `dnssec-verify`, `host`, `delv`): https://bind9.readthedocs.io/en/v9.21.16/manpages.html
- BIND 9 Configuration Reference (`dnssec-policy`, `inline-signing`, zone configuration): https://bind9.readthedocs.io/en/v9.20.2/reference.html
- BIND 9 Release Notes (`auto-dnssec` removal): https://bind9.readthedocs.io/en/stable/notes.html
- RFC 3596, Section 2.5 (`IP6.ARPA` nibble format): https://www.rfc-editor.org/rfc/rfc3596
- RFC 3152 (Delegation of `IP6.ARPA`): https://www.rfc-editor.org/rfc/rfc3152.html
- Python `ipaddress` library documentation: https://docs.python.org/3/library/ipaddress.html
- IANA `.arpa` domain information (`ip6-servers.arpa`): https://www.iana.org/domains/arpa

## Issues Found
- The BIND configuration mixed manual `dnssec-signzone` signing with `auto-dnssec maintain; inline-signing yes;`. Current BIND releases have removed `auto-dnssec`, and manual signing should instead serve the generated `.signed` zone directly. I updated the zone stanza accordingly.
- The key-generation commands defined `KEY_DIR` but did not write keys there. I added `-K "${KEY_DIR}"` to both `dnssec-keygen` commands so the later signing step can find the keys.
- The signing example used placeholder key filenames (`KSK_ID`, `ZSK_ID`) that would not run as written. I changed the example to use `dnssec-signzone -K ... -S`, which selects the generated active keys from the key directory.
- The DS extraction example also relied on a placeholder key filename. I replaced it with `dnssec-dsfromkey -f` against the signed zone so the command works without hard-coding a key ID.
- The verification examples overstated what `dig +dnssec` and `host` prove. I changed the text to distinguish “request DNSSEC records” from actual validation, and replaced the `host` example with `delv`, which is BIND’s validation tool.
- The Python helper would silently truncate non-nibble-aligned prefixes when deriving an `ip6.arpa` zone name. I added an explicit guard so it fails for prefixes that cannot map directly to a nibble-aligned reverse zone cut.

## Review Notes
- Manual signing remains valid, but current BIND documentation prefers `dnssec-policy` when you want automated signing and re-signing.
- The sample PTR owner names for the `/48` zone were checked locally and match the expected nibble-reversed labels for the example IPv6 addresses.
- BIND DNSSEC utilities were verified against official documentation; they were not available in this workspace for live command execution.
