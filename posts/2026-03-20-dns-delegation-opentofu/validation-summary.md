# Validation Summary: How to Configure DNS Delegation with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Route 53
- DNS delegation
- `dig`

## Sources Consulted
- OpenTofu `for_each` meta-argument: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/
- OpenTofu `provider` meta-argument: https://opentofu.org/docs/language/meta-arguments/resource-provider/
- AWS provider `aws_route53_zone` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/route53_zone.html.markdown
- AWS provider `aws_route53_zone` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route53_zone.html.markdown
- AWS provider `aws_route53_record` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route53_record.html.markdown
- Amazon Route 53 Developer Guide, creating a delegated subdomain: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/CreatingNewSubdomain.html
- Amazon Route 53 Developer Guide, NS record behavior: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/ResourceRecordTypes.html
- Amazon Route 53 Developer Guide, NS and SOA records for public hosted zones: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/SOA-NSrecords.html
- RFC 8499, DNS Terminology: https://www.rfc-editor.org/rfc/rfc8499
- RFC 1035, DNS Implementation and Specification: https://www.rfc-editor.org/rfc/rfc1035
- BIND 9 `dig` manual: https://bind9.readthedocs.io/en/v9.16.17/manpages.html

## Issues Found
- The post called `example.com` the "root zone". In DNS terminology, the root zone is `.` and delegation for `api.example.com` happens from the parent zone. I changed the wording to "parent zone" to match RFC terminology.
- The intro stated that delegation enables separate billing as a general property. That is only reliably true in cross-account setups, so I narrowed the claim accordingly.
- The TTL note implied that NS records inherently have high TTLs. TTL is operator-configured and controls how long resolvers may cache the record, so I rewrote the note and conclusion to describe 48 hours as an example long TTL rather than an intrinsic rule.
- Both `dig` examples had the query name and type in the wrong order. I corrected them to valid `dig` syntax and changed the trace example to query `NS` records directly so it validates delegation more precisely.

## Review Notes
- The examples are for public hosted zone delegation. Private hosted zones use different delegation mechanisms in Route 53 Resolver rather than public NS delegation records.
