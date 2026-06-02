# Validation Summary: How to Configure Route 53 Multivalue Answer Routing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Route 53
- Route 53 multivalue answer routing
- Route 53 health checks
- AWS CLI
- Terraform AWS provider
- DNS

## Sources Consulted
- AWS Route 53 Developer Guide: Multivalue answer routing - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-multivalue.html
- AWS Route 53 Developer Guide: Values specific for multivalue answer records - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-multivalue.html
- AWS CLI Command Reference: route53 change-resource-record-sets - https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- AWS CLI Command Reference: route53 create-health-check - https://docs.aws.amazon.com/cli/latest/reference/route53/create-health-check.html
- Terraform Registry: aws_route53_record - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform Registry: aws_route53_health_check - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_health_check

## Issues Found
- The post said Route 53 only returns healthy endpoints. AWS documents that Route 53 can return up to eight records even when all associated health checks are unhealthy, so the explanation and limitations were updated to include that caveat.
- The post described health checks as required for each multivalue answer record. AWS allows multivalue records without health checks, but health checks are needed for automatic removal of unhealthy endpoints, so that wording was corrected.
- The post implied that multivalue answer records must use IP addresses because Alias records are unsupported. Route 53 does not support Alias records for multivalue answer routing, but the policy can be used with supported non-alias record types; the limitation was narrowed to A/AAAA IP-address examples.

## Review Notes
The AWS CLI examples use placeholder hosted zone and health check IDs, so users must replace them with real IDs returned by Route 53. The local AWS CLI was not installed in this workspace, so command validation was performed against the official AWS CLI command reference.
