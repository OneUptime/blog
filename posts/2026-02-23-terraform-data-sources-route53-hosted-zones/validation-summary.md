# Validation Summary: How to Use Data Sources to Read Route53 Hosted Zones

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon Route 53 hosted zones and records
- AWS Certificate Manager DNS validation
- AWS IAM role assumption for cross-account access

## Sources Consulted
- Terraform Registry: `aws_route53_zone` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/route53_zone
- Terraform Registry: `aws_route53_record` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform Registry: `aws_acm_certificate` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate
- Terraform Registry: `aws_acm_certificate_validation` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate_validation
- AWS Route 53 Developer Guide: Working with private hosted zones: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zones-private.html
- AWS Route 53 Developer Guide: Routing traffic for subdomains: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-routing-traffic-for-subdomains.html
- AWS Route 53 API Reference: `CreateHostedZone`: https://docs.aws.amazon.com/Route53/latest/APIReference/API_CreateHostedZone.html
- AWS Certificate Manager User Guide: DNS validation: https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html
- AWS Certificate Manager User Guide: Troubleshoot DNS validation problems: https://docs.aws.amazon.com/acm/latest/userguide/troubleshooting-DNS-validation.html

## Issues Found
- The introductory description of `aws_route53_zone` lookup filters implied that all lookup attributes can be combined. The official Terraform AWS provider documentation states that `zone_id` directly returns a hosted zone and that `zone_id` and `name` are mutually exclusive. I changed the wording to describe name, zone ID, tags, and specific filters without implying invalid combinations.
- The ACM DNS validation example requested both `example.com` and `*.example.com` but keyed Route 53 validation records by `domain_name`. AWS ACM documentation notes that a base domain and its wildcard can receive the same CNAME validation record. Creating records keyed by domain name can therefore try to manage the same Route 53 record twice. I updated the `for_each` expression to group by `resource_record_name` and use one record per validation CNAME.
- Several public hosted-zone examples did not specify `private_zone = false`. This can be ambiguous when an AWS account contains public and private zones with the same name. I added `private_zone = false` to the public lookup examples that create public DNS records, including the ACM validation example. Public ACM certificate DNS validation requires publicly resolvable DNS records, and AWS documents that validation fails for private hosted zones.

## Review Notes
The remaining Terraform examples use current Terraform AWS provider arguments and attributes for Route 53 zones, Route 53 records, ACM certificate validation, and aliased AWS providers. The snippets are illustrative and still depend on surrounding resources such as `aws_lb.app` and `aws_eip.app` being defined elsewhere.
