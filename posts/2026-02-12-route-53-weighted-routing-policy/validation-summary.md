# Validation Summary: How to Configure Route 53 Weighted Routing Policy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Route 53
- Route 53 weighted routing policies
- Route 53 health checks
- AWS CLI
- Terraform AWS provider
- Elastic Load Balancing / Application Load Balancers
- DNS caching and TTLs

## Sources Consulted
- AWS Route 53 Developer Guide: Weighted routing: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-weighted.html
- AWS Route 53 Developer Guide: Values specific for weighted records: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-weighted.html
- AWS Route 53 Developer Guide: Values specific for weighted alias records: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-weighted-alias.html
- AWS Route 53 Developer Guide: How Route 53 chooses records when health checking is configured: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-how-route-53-chooses-records.html
- AWS CLI Command Reference: route53 change-resource-record-sets: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- AWS CLI Command Reference: route53 create-health-check: https://docs.aws.amazon.com/cli/latest/reference/route53/create-health-check.html
- Terraform AWS Provider: aws_route53_record: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform AWS Provider: aws_route53_health_check: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_health_check

## Issues Found
- The post described rollback as "instant." DNS records can remain cached until TTL expiry, so the wording was changed to "quick" rollback with DNS caching caveats.
- The initial explanation said setting weight 0 stops traffic entirely. AWS documents exceptions when all records in the weighted group have weight 0 and when health-check behavior causes Route 53 to consider zero-weight records, so the explanation was clarified.
- The canary deployment section suggested routing directly to a target group. Route 53 weighted DNS records route to DNS-addressable endpoints, not directly to ALB target groups, so the wording now uses a separate DNS-addressable endpoint such as a separate ALB.
- The health-check explanation implied redistribution without qualification. It was updated to mention consistently configured health checks for the weighted record group.
- The zero-weight section said Route 53 returns all records when all weights are 0. AWS documents equal-probability routing to all resources, not returning every record in a single answer, so that section was corrected.
- The Terraform example created an `aws_route53_health_check` resource that was not associated with any `aws_route53_record`. Since the ALB alias records already use `evaluate_target_health`, the orphan health-check block was removed.

## Review Notes
The AWS CLI JSON structures and Terraform weighted alias record snippets are consistent with current official documentation. Alias records correctly omit TTL, and non-alias weighted records use matching TTL values. The internal link to the Route 53 health checks article matches an existing post directory in the repository.
