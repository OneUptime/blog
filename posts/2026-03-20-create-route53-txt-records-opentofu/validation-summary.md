# Validation Summary: How to Create Route53 TXT Records with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS provider (`hashicorp/aws`)
- Amazon Route53 (`aws_route53_zone` data source, `aws_route53_record` resource)
- DNS TXT records
- SPF (Sender Policy Framework)
- DKIM (DomainKeys Identified Mail)
- DMARC (Domain-based Message Authentication, Reporting and Conformance)
- BIMI (Brand Indicators for Message Identification)
- SendGrid domain authentication
- Google Workspace email authentication

## Sources Consulted
- Terraform AWS Provider — `aws_route53_record`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform AWS Provider — `aws_route53_zone` (data source): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/route53_zone
- RFC 7208 (SPF): https://datatracker.ietf.org/doc/html/rfc7208
- RFC 6376 (DKIM Signatures): https://datatracker.ietf.org/doc/html/rfc6376
- RFC 7489 (DMARC): https://datatracker.ietf.org/doc/html/rfc7489
- BIMI Group specification: https://bimigroup.org/
- SendGrid Domain Authentication docs: https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication
- Google Workspace SPF/DKIM setup: https://support.google.com/a/answer/33786 and https://support.google.com/a/answer/174124
- HCL2 syntax (comments inside collection literals): https://developer.hashicorp.com/terraform/language/syntax/configuration

## Issues Found
No technical issues found.

The HCL syntax is valid, all resource and data-source argument names match the current AWS provider schema, the SPF/DKIM/DMARC/BIMI string formats follow their respective RFCs/specifications, and SendGrid's correct use of CNAME (not TXT) for DKIM is accurately called out in an inline comment.

## Review Notes
- TXT record per-string limit: A single TXT string in DNS is limited to 255 octets (RFC 1035). DKIM public keys (RSA 2048-bit) typically exceed this and must be split into multiple quoted strings within a single record value (e.g. `"v=DKIM1; k=rsa; p=part1" "part2"`). The DKIM example uses `MIIBIjAN...` (truncated with `...`) so this isn't a defect, but readers copying the pattern for a real key should be aware they must split long values themselves — the AWS provider does not do this automatically.
- Only one SPF policy record (`v=spf1 ...`) per name is permitted by RFC 7208 §3.2. The "Multiple TXT Records on the Same Name" example correctly contains only one SPF string alongside non-SPF verification strings, which is RFC-compliant.
- BIMI's `a=` (Authority Evidence) tag pointing to a `.pem` is a Verified Mark Certificate (VMC); it is required by major mailbox providers (Gmail, Yahoo) for the BIMI logo to actually display. This is correct usage but worth knowing for readers expecting the BIMI logo to appear without a VMC.
- DMARC `pct=100` is the default per RFC 7489 §6.3 and may be omitted; including it explicitly is fine and clarifying.
- Hardcoding `ttl = 3600` is reasonable for stable records, but during cutovers (e.g. moving SPF/DKIM providers) a shorter TTL like 300 is often preferred temporarily.
- None of the above are corrections — they're all caveats that don't affect the accuracy of the published examples.
