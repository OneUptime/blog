# Validation Summary: How to Manage Route 53 DNS with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Route 53
- AWS provider for OpenTofu
- DNS records and routing policies
- Route 53 health checks

## Sources Consulted
- AWS provider `aws_route53_record` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- AWS provider `aws_route53_zone` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_zone
- AWS provider `aws_route53_health_check` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_health_check
- AWS Route 53: Choosing between alias and non-alias records: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html
- AWS Route 53: Values specific for simple alias records: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-alias.html
- AWS Route 53: Values specific for failover alias records: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-failover-alias.html
- AWS Route 53: Failover routing: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-failover.html
- AWS Route 53: Considerations when working with a private hosted zone: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zone-private-considerations.html

## Issues Found
- The alias-record section implied alias records are for any AWS resource. I changed it to "supported AWS resources" because Route 53 alias targets are limited to specific AWS resource types and in-zone records.
- The failover example only showed a `PRIMARY` record, which does not accurately demonstrate Route 53 failover routing. I added a matching `SECONDARY` record so the example reflects an actual failover pair.
- The health check example used `primary.example.com` without defining that hostname in the example. I changed the health check `fqdn` to `aws_lb.primary.dns_name` so the example is internally consistent.
- The best-practices claim that alias records "resolve faster" was not supported by AWS documentation. I replaced it with documented advantages: alias records can be used at the zone apex, and Route 53 does not charge for alias queries to AWS resources.
- The health-check guidance was too broad for alias targets. I updated it to distinguish between non-alias targets, where Route 53 health checks are commonly used, and supported alias targets, where `evaluate_target_health` is the documented default and Route 53 health checks are optional for extra endpoint-level checks.

## Review Notes
- The Route 53 record syntax used in the post matches the current AWS provider resource schema that OpenTofu uses.
- The alias examples correctly omit `ttl`, which is required for alias records.
- Private hosted zones also require the VPC DNS attributes `enableDnsHostnames` and `enableDnsSupport` to be set to `true`; the snippet is valid, but that operational prerequisite is worth keeping in mind.
