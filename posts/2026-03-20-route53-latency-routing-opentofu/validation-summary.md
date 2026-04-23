# Validation Summary: How to Configure Route 53 Latency Routing with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS Route 53
- Route 53 latency-based routing
- Route 53 health checks
- AWS CLI
- HashiCorp AWS provider for Terraform/OpenTofu
- DNS

## Sources Consulted
- AWS Route 53 Developer Guide: Latency-based routing: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-latency.html
- AWS Route 53 Developer Guide: Values specific for latency alias records: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-latency-alias.html
- AWS Route 53 API Reference: ResourceRecordSet: https://docs.aws.amazon.com/Route53/latest/APIReference/API_ResourceRecordSet.html
- AWS Route 53 API Reference: HealthCheckConfig: https://docs.aws.amazon.com/Route53/latest/APIReference/API_HealthCheckConfig.html
- AWS Route 53 Developer Guide: Values for creating or updating health checks: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-creating-values.html
- AWS CLI Command Reference: route53 test-dns-answer: https://docs.aws.amazon.com/cli/latest/reference/route53/test-dns-answer.html
- Terraform Registry: aws_route53_record resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform Registry: aws_route53_health_check resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_health_check
- OpenTofu CLI documentation: https://opentofu.org/docs/v1.6/cli/commands/

## Issues Found
- The region comments for `eu-west-1` and `ap-southeast-1` implied geography-based behavior. Updated them to say the records serve users with the lowest latency to those regions.
- The health check example derived the health check FQDN from the region and domain without making it an explicit regional endpoint. Added `health_check_fqdn` to the endpoint map and updated the health check to target that stable, region-specific endpoint instead of the latency-routed record name.
- The AWS CLI test command described checking a client IP but used `--resolver-ip`, which simulates a DNS resolver IP. Updated the example to use `--edns0-client-subnet-ip` for client-subnet simulation.
- The conclusion said Route 53 returns all records when every region is unhealthy. Updated it to state that Route 53 behaves as if all health checks are passing and responds according to the routing policy.
- The latency measurement wording referred to AWS edge locations. Updated it to match AWS documentation more closely: Route 53 bases latency data on traffic between users, or their resolver/client subnet, and AWS data centers rather than the user's specific application resources.

## Review Notes
- The HCL snippets use current AWS provider resource names and arguments for Route 53 records, latency routing policies, alias records, and health checks.
- The OpenTofu commands shown are valid. OpenTofu 1.6 documentation is no longer actively maintained, but the examples use stable syntax that is compatible with OpenTofu v1.6+.
- The regional `health_check_fqdn` values are placeholders and must resolve directly to each regional endpoint in a real deployment.
