# Validation Summary: How to Configure DMARC for IPv6 Mail Servers

## Status
validated

## Post Type
Guide

## Technologies Covered
- DMARC
- SPF
- DKIM
- DNS TXT records
- IPv6 email delivery
- `dig`
- `parsedmarc`
- `swaks`

## Sources Consulted
- RFC 7489: Domain-based Message Authentication, Reporting, and Conformance (DMARC): https://www.rfc-editor.org/rfc/rfc7489
- RFC 7208: Sender Policy Framework (SPF) for Authorizing Use of Domains in Email, Version 1: https://www.rfc-editor.org/rfc/rfc7208
- parsedmarc usage documentation: https://domainaware.github.io/parsedmarc/usage.html
- Google Public DNS JSON API for DNS over HTTPS: https://developers.google.com/speed/public-dns/docs/doh/json
- Swaks official reference documentation: https://jetmore.org/john/code/swaks/files/swaks-20240103.0/doc/ref.txt
- ESPC Email Verification tool powered by Port25: https://espcoalition.org/senderid
- Google Workspace Email sender guidelines: https://support.google.com/mail/answer/81126?hl=en
- Microsoft Learn: Use DMARC to validate email, setup steps: https://learn.microsoft.com/en-us/microsoft-365/security/office-365-security/email-authentication-dmarc-configure?view=o365-worldwide

## Issues Found
- The post implied DMARC evaluation depended on both SPF and DKIM alignment. I corrected this to state that DMARC passes when at least one aligned SPF or DKIM check succeeds, which matches RFC 7489.
- The post said IPv6 SPF must include explicit `ip6:` mechanisms. I corrected this because SPF can also authorize IPv6 senders through mechanisms such as `a`, `mx`, and `include` when they resolve to IPv6-capable senders, as described in RFC 7208.
- The `p=quarantine` example comment said failed mail goes to the spam folder. I corrected this to RFC-accurate wording: quarantine asks receivers to treat failed mail as suspicious, often placing it in spam.
- The `p=reject` example comment said failed mail is rejected outright. I corrected this to note that DMARC publishes a requested receiver policy rather than a hard guarantee of identical handling by every provider.
- The MxToolbox `curl` example was misleading for real domains because current API documentation requires authentication for normal lookup calls, with only limited no-key live testing for `example.com`. I replaced it with a working Google Public DNS-over-HTTPS JSON query.
- The `parsedmarc` example used the obsolete `--json-path` CLI flag. I replaced it with the current configuration-file based invocation documented for modern `parsedmarc` releases.
- The Port25 verification service was incorrectly described as Google's check-auth service, and the reply example was more specific than the authoritative documentation guarantees. I corrected the attribution and generalized the expected result description.
- The conclusion repeated the incorrect assumption that IPv6 SPF validation requires explicit `ip6:` entries. I updated it to say the SPF policy must authorize the IPv6 sending sources.

## Review Notes
- `ruf` failure-report syntax is valid DMARC, but support for per-message forensic reporting is inconsistent across large receivers; aggregate `rua` reporting is more commonly relied on in practice.
- Receiver behavior for `quarantine`, `reject`, and `pct` can vary somewhat by provider because DMARC communicates requested handling rather than an absolute enforcement guarantee.
