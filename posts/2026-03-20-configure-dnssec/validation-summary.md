# Validation Summary: How to Configure DNSSEC for Secure DNS Lookups

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- DNS
- DNSSEC
- BIND 9
- `dig`
- `dnssec-keygen`
- `dnssec-signzone`
- `dnssec-dsfromkey`
- `delv`

## Sources Consulted
- ISC BIND 9 DNSSEC Guide: https://bind9.readthedocs.io/en/stable/dnssec-guide.html
- ISC BIND 9 Configuration Reference (`dnssec-validation`, `bind.keys`): https://bind9.readthedocs.io/en/v9.18.21/reference.html
- ISC BIND 9 Release Notes 9.20.0 (`auto-dnssec` removal): https://bind9.readthedocs.io/en/v9.20.0/notes.html
- ISC BIND 9 Manual Pages (`dnssec-signzone`, `dnssec-dsfromkey`, `delv`): https://bind9.readthedocs.io/en/v9.21.16/manpages.html
- RFC 4034, Resource Records for the DNS Security Extensions: https://datatracker.ietf.org/doc/rfc4034/

## Issues Found
- The DNSSEC chain-of-trust explanation said parent zones sign child zones and that the KSK signs the ZSK. I corrected this to show that parent zones publish DS records, each zone signs its own RRsets, and the KSK signs the DNSKEY RRset, which matches RFC 4034 and ISC's DNSSEC guide.
- The validation-failure example used `bogus.dnssec-tools.org`. I replaced it with `www.dnssec-failed.org`, which ISC documents as the standard test domain for confirming that a validating resolver returns `SERVFAIL`.
- The manual signing example used `dnssec-signzone -A`, but in current BIND `-A` enables NSEC3 OPTOUT rather than verifying signatures. I replaced it with a standard manual-signing invocation using `-a -N INCREMENT -o` and explicit key files.
- The manual signing example also forced NSEC3 with a random salt. Current ISC documentation warns against unnecessary NSEC3 tuning and notes that adding salt provides no practical benefit. I removed that usage from the example.
- The automated signing section recommended `auto-dnssec maintain`, which ISC removed in BIND 9.20. I updated the post to use the current `dnssec-policy default; inline-signing yes;` configuration and removed the no-longer-applicable manual key-generation steps for that mode.
- The verification section used `drill -TD`. I replaced it with BIND's `delv`, which ISC documents as the current DNSSEC-aware validation utility.
- The introduction implied a resolver validates a zone with a directly known public key. I corrected the wording to reference the zone's DNSKEY records and the chain of trust back to the DNS root.

## Review Notes
- `dnssec-validation auto;` is still valid, but on current BIND releases it is already the default when no `dnssec-validation` line is present.
- `dnssec-policy default` uses BIND's current automatic key and signing policy, which differs from the manual KSK/ZSK workflow shown earlier in the post.
- The `AD` flag in `dig` appears only when the query is answered by a validating recursive resolver; authoritative servers do not set it for you.
