# Validation Summary: How to Configure Route 53 Weighted Routing with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Route 53
- Route 53 weighted routing policies
- Route 53 alias records
- Route 53 health checks
- AWS CLI
- HCL

## Sources Consulted
- AWS Route 53 Developer Guide: Weighted routing - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-weighted.html
- AWS Route 53 Developer Guide: Values specific for weighted records - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-weighted.html
- AWS Route 53 Developer Guide: Values specific for weighted alias records - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-weighted-alias.html
- AWS Route 53 Developer Guide: Health checks in complex configurations - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-complex-configs.html
- Terraform AWS provider documentation: aws_route53_record - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform AWS provider documentation: aws_route53_health_check - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_health_check
- OpenTofu CLI documentation: Basic CLI features - https://opentofu.org/docs/cli/commands/
- OpenTofu CLI documentation: apply command - https://opentofu.org/docs/cli/commands/apply/
- AWS CLI Command Reference: route53 list-resource-record-sets - https://docs.aws.amazon.com/cli/latest/reference/route53/list-resource-record-sets.html

## Issues Found
- The health-check example created both blue and green Route 53 health checks but only associated a health check with the blue weighted record. Added the corresponding `green_with_health` weighted record with `health_check_id = aws_route53_health_check.green.id` so the example matches Route 53 guidance to check all records in a weighted group when using health checks.
- The conclusion stated that setting a record's weight to 0 stops Route 53 from routing to it. Updated this to include the documented exception that if all records in the group have weight 0, Route 53 routes to all of them with equal probability.
- The conclusion overstated weighted routing as a guaranteed zero-downtime deployment mechanism and implied health checks always exclude unhealthy endpoints. Revised the wording to describe weighted routing as gradual traffic shifting and to note that health checks or alias `evaluate_target_health` exclude unhealthy endpoints when other healthy records are available.

## Review Notes
The OpenTofu and AWS CLI commands are current and valid. The examples were reviewed statically against official documentation; no live AWS resources were provisioned during validation.
