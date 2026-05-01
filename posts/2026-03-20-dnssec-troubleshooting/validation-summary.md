# Validation Summary: How to Troubleshoot DNSSEC for IPv6 Zones

## Status
validated

## Post Type
Guide

## Technologies Covered
- DNSSEC
- DNS
- IPv6
- BIND 9
- `dig`
- `dnssec-signzone`
- `dnssec-dsfromkey`
- `dnssec-verify`
- Bash

## Sources Consulted
- BIND 9 manual pages (`dig`, `dnssec-dsfromkey`, `dnssec-signzone`, `dnssec-verify`, `named-checkzone`): https://bind9.readthedocs.io/en/v9.21.20/manpages.html and https://bind9.readthedocs.io/en/v9.21.14/manpages.html
- BIND 9 DNSSEC Guide: https://bind9.readthedocs.io/en/stable/dnssec-guide.html
- BIND 9 stable release notes (`auto-dnssec` removal): https://bind9.readthedocs.io/en/stable/notes.html
- RFC 4034, Resource Records for the DNS Security Extensions: https://www.rfc-editor.org/rfc/rfc4034.html
- RFC 4035, Protocol Modifications for the DNS Security Extensions: https://www.rfc-editor.org/rfc/rfc4035.html
- Local `dig` behavior on the review host (`DiG 9.18.39`) to confirm output behavior for `+short`, `+comments`, `+dnssec`, and `+cdflag`

## Issues Found
- The diagnostic script used `dig +short +comments` while trying to inspect `status` and `flags`. `+short` suppresses the verbose header, so the script would not show the validation state it claimed to inspect. I replaced those lookups with `+noall +answer +authority +comments` and normalized the bypass flag to `+cdflag`.
- The post described `NXDOMAIN for existing name` as a DNSSEC clock-skew symptom. Under DNSSEC validation, bogus signatures or invalid denial-of-existence proofs are typically validation failures, not authoritative `NXDOMAIN` results. I corrected the symptom wording and flowchart to focus on `SERVFAIL`/denial-of-existence proof troubleshooting.
- The signature-expiry parsing examples used the wrong `RRSIG` field numbers. Per RFC 4034, the Signature Expiration field is the ninth presentation-format field in these examples, not the seventh. I corrected the `awk` field selection in both the manual expiry checks and the monitoring script.
- The DS comparison example was too brittle: it queried a hard-coded `.com` parent server, assumed a specific key algorithm filename pattern, and compared only a partial digest value. I updated it to retrieve published DS records via a resolver, generate local DS records from the available KSK files, include both SHA-256 and SHA-384 digests, and compare complete DS records.
- The re-signing example had multiple operational problems: a broken shell line continuation with an inline comment, brittle ZSK/KSK discovery, unnecessary manual serial editing, and forced NSEC3 OPTOUT behavior (`-A`) that BIND documents warn against for normal zones. I replaced it with a current `dnssec-signzone -S -K ... -N INCREMENT` workflow and kept `dnssec-verify` as the verification step.
- The post referenced `auto-dnssec`, which has been removed from current BIND 9. I replaced that reference with `dnssec-policy/manual signing` so the guidance matches current BIND terminology and supported workflows.
- The signature-expiry section depended on `ZONE` being defined somewhere else. I made that block self-contained so the example can be run directly.

## Review Notes
- The post is technically relevant and salvageable after correction.
- Current BIND guidance prefers `dnssec-policy` over older `auto-dnssec` workflows; the post still remains useful because it covers troubleshooting and manual signing/verification tasks.
- The examples are Linux-centric and assume GNU `date`, `/var/named`, and `chronyc`; that is acceptable for the current post but means the commands are not portable to BSD/macOS as written.
- The review environment did not have the `dnssec-*` utilities installed locally, so those command options were verified against the current official BIND documentation rather than local `--help` output.
