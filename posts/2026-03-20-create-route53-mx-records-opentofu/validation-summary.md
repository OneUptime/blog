# Validation Summary: How to Create Route53 MX Records with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible HCL)
- AWS Route53 (Hosted Zones, DNS records)
- AWS provider for Terraform/OpenTofu (`aws_route53_record`, `aws_route53_zone`)
- DNS MX records
- Google Workspace email
- Microsoft 365 (Exchange Online)
- Amazon SES (MAIL FROM domain)
- SPF (RFC 7208)
- DMARC (RFC 7489)

## Sources Consulted
- AWS Route53 documentation: MX record format ("priority hostname") — https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/ResourceRecordTypes.html#MXFormat
- Terraform AWS provider `aws_route53_record` reference — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform AWS provider `aws_route53_zone` data source — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/route53_zone
- Google Workspace MX record configuration (legacy 5-record set) — https://support.google.com/a/answer/140034
- Microsoft 365 MX record format `<tenant-domain>.mail.protection.outlook.com` with priority 0 — https://learn.microsoft.com/en-us/microsoft-365/admin/get-help-with-domains/create-dns-records-at-any-dns-hosting-provider
- Amazon SES custom MAIL FROM domain MX record (`10 feedback-smtp.<region>.amazonses.com`) — https://docs.aws.amazon.com/ses/latest/dg/mail-from.html
- RFC 7208 (SPF) and RFC 7489 (DMARC) for syntax of TXT records
- OpenTofu HCL syntax for `for_each`, `locals`, and resource references — https://opentofu.org/docs/language/

## Issues Found
No technical issues found.

## Review Notes
- The Google Workspace MX configuration shown is the legacy 5-record set, which is still fully supported. Google has also introduced a simpler single-record option (`1 SMTP.GOOGLE.COM`) for newer setups; either is valid.
- The Microsoft 365 MX example uses `example-com.mail.protection.outlook.com`. The actual hostname depends on your tenant's initial onmicrosoft.com domain prefix (with `.` replaced by `-`); readers should substitute their own value from the Microsoft 365 admin center.
- The Amazon SES subdomain example is specifically the MX record needed for a SES MAIL FROM domain (used to align bounce/complaint handling with your own domain), not for inbound mail receiving. Inbound SES would use `inbound-smtp.<region>.amazonaws.com`. The post's framing as "Amazon SES" is correct for the MAIL FROM use case.
- The "Multiple Domains" example references `data.aws_route53_zone.io` and `data.aws_route53_zone.couk` without showing their declarations; this is expected to be inferred by the reader from the `main` zone example earlier in the post.
- AWS Route53 accepts MX values both with and without a trailing dot on the hostname; the post's format (no trailing dot) is valid.
- The `aws_route53_record` resource in the AWS provider also offers the `allow_overwrite` argument for managing imported records, which is not covered here but is not required for the tutorial's scope.
