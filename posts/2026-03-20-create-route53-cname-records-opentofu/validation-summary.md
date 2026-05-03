# Validation Summary: How to Create Route53 CNAME Records with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS Route53 (DNS)
- AWS Certificate Manager (ACM)
- AWS RDS (referenced via `aws_db_instance`)
- DNS CNAME records

## Sources Consulted
- Terraform AWS Provider — `aws_route53_record`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform AWS Provider — `aws_route53_zone` (data source): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/route53_zone
- Terraform AWS Provider — `aws_acm_certificate`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate
- Terraform AWS Provider — `aws_acm_certificate_validation`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate_validation
- Terraform AWS Provider — `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS Route 53 Developer Guide — Routing policies (Weighted): https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-weighted.html
- RFC 1034 §3.6.2 — CNAME restrictions (cannot coexist with other records, including at zone apex)

## Issues Found
No technical issues found.

## Review Notes
- The HCL syntax for `aws_route53_record`, `aws_route53_zone`, `aws_acm_certificate`, and `aws_acm_certificate_validation` matches the current AWS provider schema.
- The ACM DNS-validation pattern (`for_each` over `aws_acm_certificate.main.domain_validation_options`, then feeding `record.fqdn` into `aws_acm_certificate_validation.validation_record_fqdns`) is the canonical, provider-recommended approach.
- The weighted routing policy block uses `set_identifier` and `weighted_routing_policy { weight = N }` correctly. Weights are relative integers (0–255), not percentages — the inline comments call them percentages, which is informally true only because 90 + 10 = 100, but readers should know the values are weights, not enforced percentages. Not changed because it does not affect correctness of the example.
- The conclusion's caveat that CNAMEs cannot be placed at the zone apex (and that alias records should be used there) is correct per RFC 1034 and AWS Route 53 documentation.
- For the internal-services example, `aws_db_instance.primary.address` returns a hostname and is a valid CNAME target, so the example works as written.
