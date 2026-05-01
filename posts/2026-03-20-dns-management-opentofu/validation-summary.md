# Validation Summary: How to Manage DNS with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Route53
- Azure DNS
- Google Cloud DNS
- Infrastructure as Code

## Sources Consulted
- AWS provider docs: `aws_route53_zone`, `aws_route53_record`, `aws_route53_health_check` (`https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_zone`, `https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record`, `https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_health_check`)
- AWS Route 53 Developer Guide: weighted routing and simple routing (`https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-weighted.html`, `https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-simple.html`)
- AzureRM provider docs: `azurerm_dns_zone`, `azurerm_dns_a_record`, `azurerm_dns_cname_record` (`https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dns_zone`, `https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dns_a_record`, `https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dns_cname_record`)
- Google provider docs: `google_dns_managed_zone`, `google_dns_record_set` (`https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/dns_managed_zone`, `https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/dns_record_set`)

## Issues Found
- The Route53 example labeled multiple `A` values as "round-robin." I changed this to "simple routing with multiple values" because Route53 documents this behavior as simple routing that returns all values in random order.
- The weighted Route53 example reused the same `app` record name and type as the earlier simple `A` record example. I added a clarification that the weighted records are an alternative to the simple record, because Route53 does not allow weighted and non-weighted records with the same name and type in the same hosted zone.
- The weighted routing comments implied absolute percentages. I updated them to describe relative weights, which is how Route53 documents weighted routing behavior.
- The conclusion implied that nameserver delegation always happens at the registrar for any hosted zone. I corrected this to public zones and clarified that delegation can happen at the registrar or in the parent DNS zone.

## Review Notes
- Route53 health checks are managed correctly as standalone resources. For DNS responses to change based on health status, records must reference a `health_check_id` or use a supported alias target with `evaluate_target_health = true`.
- The Google Cloud DNS example correctly includes the required trailing dot in `dns_name`.
- The Azure DNS and Google Cloud DNS resource syntax in the post matches the current provider documentation.
