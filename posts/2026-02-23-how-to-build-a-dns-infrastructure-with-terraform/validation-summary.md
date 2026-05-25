# Validation Summary: How to Build a DNS Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Route 53 hosted zones and records
- AWS Route 53 health checks and routing policies
- AWS Route 53 DNSSEC
- AWS KMS
- Amazon CloudWatch metrics, alarms, and Logs

## Sources Consulted
- Terraform AWS Provider: aws_route53_zone_association - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_zone_association
- Terraform AWS Provider: aws_route53_record - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform AWS Provider: aws_route53_health_check - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_health_check
- Terraform AWS Provider: aws_route53_hosted_zone_dnssec - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_hosted_zone_dnssec
- Terraform AWS Provider: aws_route53_query_log - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_query_log
- AWS Route 53 Developer Guide: Monitoring health checks using CloudWatch - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/monitoring-health-checks.html
- AWS Route 53 Developer Guide: Working with customer managed keys for DNSSEC - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-configuring-dnssec-cmk-requirements.html
- AWS Route 53 API Reference: CreateQueryLoggingConfig - https://docs.aws.amazon.com/Route53/latest/APIReference/API_CreateQueryLoggingConfig.html
- Amazon CloudWatch Logs API Reference: LogGroup - https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_LogGroup.html

## Issues Found
- The private hosted zone example mixed an inline `vpc` block with standalone `aws_route53_zone_association` resources. Terraform AWS Provider documentation warns this combination can cause perpetual plan differences unless the inline VPC association is ignored. Added `lifecycle { ignore_changes = [vpc] }` to the private zone.
- The calculated health check referenced `aws_route53_health_check.app_api` and `aws_route53_health_check.app_db`, which were not defined in the post. Added concrete API and status health checks and updated the calculated health check to require 2 of 3 child checks to be healthy.
- Route 53 health check metrics are available in CloudWatch in US East (N. Virginia). Added `provider = aws.us_east_1` to the CloudWatch alarm so the `AWS/Route53` `HealthCheckStatus` metric can be found.
- The latency routing examples referenced undefined health checks. Removed the invalid `health_check_id` references while keeping alias target health evaluation.
- The DNSSEC KMS key policy omitted `kms:Verify`, which AWS and Terraform examples include for Route 53 DNSSEC signing keys. Added `kms:Verify`.
- The DNSSEC section enabled hosted zone signing but did not mention publishing the DS record with the registrar or parent zone. Added a short note so the DNSSEC chain of trust is complete.
- The query logging snippet referenced `aws_cloudwatch_log_resource_policy.dns_logging` without defining it. Added the required CloudWatch Logs resource policy and IAM policy document, including Route 53 write permissions and confused-deputy conditions.

## Review Notes
Terraform was not installed in the local environment, so validation was performed against current official Terraform AWS Provider documentation and AWS service documentation rather than by running `terraform validate`.
