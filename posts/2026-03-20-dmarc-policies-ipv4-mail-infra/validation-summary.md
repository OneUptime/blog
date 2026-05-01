# Validation Summary: How to Configure DMARC Policies Referencing IPv4 Mail Infrastructure

## Status
validated

## Post Type
Guide

## Technologies Covered
- DMARC
- SPF
- DKIM
- DNS TXT records
- `dig`
- `parsedmarc`

## Sources Consulted
- RFC 7489: Domain-based Message Authentication, Reporting, and Conformance (DMARC) - https://www.rfc-editor.org/info/rfc7489
- RFC 7208: Sender Policy Framework (SPF) for Authorizing Use of Domains in Email, Version 1 - https://www.rfc-editor.org/info/rfc7208
- RFC 6376: DomainKeys Identified Mail (DKIM) Signatures - https://www.rfc-editor.org/info/rfc6376
- RFC 1035: Domain names - implementation and specification - https://www.rfc-editor.org/info/rfc1035
- BIND 9 `dig` manual - https://bind9.readthedocs.io/en/v9.21.20/manpages.html
- parsedmarc installation documentation - https://domainaware.github.io/parsedmarc/installation.html
- parsedmarc usage / CLI documentation - https://domainaware.github.io/parsedmarc/usage.html
- Postmark support article on forensic DMARC report support - https://postmarkapp.com/support/article/1096-which-domains-provide-forensic-dmarc-reports

## Issues Found
- The title, description, and introduction implied that DMARC records directly reference IPv4 mail infrastructure. I corrected that to reflect how DMARC actually works: DMARC evaluates domain alignment and relies on SPF and/or DKIM, while IPv4 addresses are typically referenced in SPF via the `ip4` mechanism.
- The `dig` examples used the more verbose default output while showing simplified expected results. I changed them to `dig +short TXT ...` so the commands better match the expected output style.
- The DKIM example used a less typical sample key record. I simplified the expected value to `v=DKIM1; k=rsa; p=...` to keep it accurate and representative.
- The multiline DMARC TXT example used backslash line continuation inside a quoted string, which is not the conventional valid zone-file form shown in the DMARC RFC examples. I replaced it with a parenthesized, multi-string TXT record.
- The explanation for `fo=1` was too loose. I updated it to reflect DMARC's aligned-pass semantics more accurately.
- The explanation for `ri=86400` treated the value as a guaranteed interval. I corrected it to note that it is a requested aggregate reporting interval.
- The `parsedmarc` example used `--json-path`, which is not part of the current documented CLI. I replaced it with the documented `-o` and `--aggregate-json-filename` options.
- The verification section used a generic `mail` command as if that alone verified DMARC alignment. I replaced it with guidance to send a message through the domain's real outbound path, which is what actually exercises SPF/DKIM/DMARC for that mail flow.
- The report-handling text and conclusion overstated coverage. I clarified that forensic reports depend on receiver support and that DMARC reports help reveal sending systems across receivers that actually send reports, rather than "every" system.

## Review Notes
- The post is technically salvageable and useful after correction, but the original framing around "referencing IPv4 mail infrastructure" was materially misleading because DMARC policies themselves are domain-based rather than IP-based.
- `ruf` remains valid DMARC syntax, but operational support is limited in practice; many receivers do not send forensic reports even when requested.
- The rollout guidance (`p=none` to `quarantine` to `reject`) is reasonable operational advice, though real rollout timing varies by environment.
