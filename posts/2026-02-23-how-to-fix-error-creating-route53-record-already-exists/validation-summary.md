# Validation Summary: How to Fix Error Creating Route53 Record Already Exists

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Terraform (HashiCorp)
- Terraform AWS Provider (`aws_route53_record`, `aws_route53_zone`, `aws_lb`, `aws_cloudfront_distribution`, `aws_s3_bucket`, `aws_s3_bucket_website_configuration`)
- AWS Route53 (DNS service, alias records, routing policies, zone apex rules)
- AWS CLI (`aws route53 list-resource-record-sets`, `aws route53 change-resource-record-sets`)
- DNS concepts (CNAME, A records, RFC 1912 apex CNAME restriction, RFC 1034 CNAME exclusivity)

## Sources Consulted
- Terraform AWS Provider docs — `aws_route53_record`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record (import format, `allow_overwrite`)
- Terraform AWS Provider docs — `aws_s3_bucket_website_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_website_configuration (`website_domain` attribute)
- Terraform AWS Provider docs — `aws_s3_bucket`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket (`hosted_zone_id` attribute)
- AWS CLI v2 reference for `aws route53 list-resource-record-sets` and `change-resource-record-sets`
- AWS Route53 Developer Guide — alias records, zone apex restrictions, CHANGE batch semantics
- RFC 1912 §2.4 (CNAME at zone apex disallowed) and RFC 1034 §3.6.2 (CNAME cannot coexist with other records of same name)

## Issues Found
No technical issues found.

Verified specifically:
- Import ID format `ZONEID_RECORDNAME_TYPE` (and `_SETID` variant for routing policies) is correct per the provider's import documentation.
- `aws_s3_bucket_website_configuration.website_domain` is a real exported attribute (intended for Route53 alias records).
- `aws_s3_bucket.hosted_zone_id` is exported and not deprecated.
- `allow_overwrite` is a valid `aws_route53_record` argument with the described behavior.
- AWS CLI commands and JMESPath query syntax are valid; `--change-batch` DELETE requires exact match of all original fields, consistent with the example.
- CNAME-at-apex prohibition and CNAME/other-type exclusivity are accurately described.
- Error message format is consistent with real AWS provider output for `InvalidChangeBatch`.

## Review Notes
- The DELETE example uses `"Name": "api.example.com"` without a trailing dot. Route53 accepts both forms in API calls (it normalizes), so this works in practice, but FQDN-with-trailing-dot is the canonical form.
- The post correctly notes that exceptions to A-record uniqueness apply only when using weighted, latency, failover, or geolocation routing policies (each requiring a `set_identifier`).
- The "Best Practices" alias remark says alias records "support health checks" — this is true via `evaluate_target_health` on alias targets that themselves are health-checkable; standalone Route53 health checks attached to the record are also supported. Accurate as written.
- No version-specific caveats: examples target current Terraform AWS provider (v4+/v5+) idioms (separated `aws_s3_bucket_website_configuration` resource).
