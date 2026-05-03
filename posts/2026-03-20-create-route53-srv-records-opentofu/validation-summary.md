# Validation Summary: How to Create Route53 SRV Records with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC tool)
- AWS Route53 (DNS)
- HCL (HashiCorp Configuration Language)
- DNS SRV records (RFC 2782)
- XMPP (RFC 6120)
- SIP / Skype for Business Online federation
- LDAP

## Sources Consulted
- RFC 2782 — A DNS RR for specifying the location of services (DNS SRV): https://www.rfc-editor.org/rfc/rfc2782
- RFC 6120 — Extensible Messaging and Presence Protocol (XMPP): Core: https://www.rfc-editor.org/rfc/rfc6120
- AWS provider `aws_route53_record` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- AWS Route53 SRV record format documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/ResourceRecordTypes.html#SRVFormat
- OpenTofu language docs (for_each, locals, expressions): https://opentofu.org/docs/language/
- Microsoft 365 / Skype for Business Online DNS records reference (historical)

## Issues Found
No technical issues found.

- SRV RDATA format `priority weight port target` is correct per RFC 2782.
- XMPP service ports are correct: 5222 for `_xmpp-client._tcp` and 5269 for `_xmpp-server._tcp` (RFC 6120).
- LDAP port 389 with `_ldap._tcp` prefix is correct.
- SIP TLS port 5061 and the Skype for Business Online federation targets (`sipfed.online.lync.com`, `sipdir.online.lync.com`) are accurate historical values.
- `aws_route53_record` arguments (`zone_id`, `name`, `type`, `ttl`, `records`) are valid; the resource accepts SRV as a record type.
- HCL syntax (`for_each`, `keys()`, list comprehension `for ... in ... :`, `${each.key}` interpolation) is all valid.
- Inline `#` comments inside list literals are valid HCL2 syntax.

## Review Notes
- The "Microsoft Teams / Skype for Business" section uses the SRV records for Skype for Business Online, which Microsoft retired on July 31, 2021. The values shown (`sipfed.online.lync.com`, `sipdir.online.lync.com`) are historically correct, but Microsoft Teams (the current product) does not use these SRV records. The example is still useful as a demonstration of SRV record syntax for SIP federation, but readers configuring DNS for current Microsoft 365 services should consult Microsoft's current DNS reference rather than copy these values.
- The post does not pin a specific OpenTofu or AWS provider version. The shown syntax is compatible with OpenTofu 1.x and recent versions of the AWS provider (v4+/v5+).
- For SRV records pointing at A-record targets that are managed in the same configuration (e.g., the `for_each` example), an explicit `depends_on` is not strictly required because Terraform/OpenTofu infers the dependency through the `keys(local.api_instances)` reference, but that dependency is on the local, not the A records — readers wishing to guarantee creation order may want to add `depends_on = [aws_route53_record.api_instances]` to the SRV resource. This is an optional improvement, not an error.
