# Validation Summary: How to Configure WAF Rules with Rate Limiting in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS WAFV2 Web ACLs
- AWS WAF rate-based rules
- AWS Managed Rules
- AWS CloudWatch Logs
- AWS CloudWatch metrics and alarms
- AWS SNS

## Sources Consulted
- AWS WAFV2 API Reference: RateBasedStatement - https://docs.aws.amazon.com/waf/latest/APIReference/API_RateBasedStatement.html
- AWS WAF Developer Guide: Rate-based rule high-level settings - https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based-high-level-settings.html
- AWS WAF Developer Guide: AWS WAF metrics and dimensions - https://docs.aws.amazon.com/waf/latest/developerguide/waf-metrics.html
- AWS WAF Developer Guide: Sending web ACL traffic logs to CloudWatch Logs - https://docs.aws.amazon.com/waf/latest/developerguide/logging-cw-logs.html
- AWS WAF Developer Guide: Associating or disassociating protection with an AWS resource - https://docs.aws.amazon.com/waf/latest/developerguide/web-acl-associating-aws-resource.html
- AWS WAFV2 API Reference: WebACL - https://docs.aws.amazon.com/waf/latest/APIReference/API_WebACL.html
- AWS Managed Rules documentation: Baseline rule groups - https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-baseline.html
- Terraform Registry: aws_wafv2_web_acl - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl
- Terraform Registry: aws_wafv2_web_acl_logging_configuration - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl_logging_configuration
- Terraform Registry: aws_wafv2_web_acl_association - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl_association

## Issues Found
- The post stated that rate-based rules always use a five-minute window. AWS WAF now supports one-minute, two-minute, five-minute, and ten-minute evaluation windows, with five minutes as the default. Updated the explanation and the basic example comment to reflect the default.
- The post stated that the minimum AWS WAF rate limit is 100 requests per five minutes. The current AWS WAFV2 API minimum is 10 requests per evaluation window. Updated the minimum limit statement.
- The post stated that AWS evaluates rate-based rules approximately every 30 seconds. Current AWS documentation says AWS WAF checks the rate about every 10 seconds. Updated the timing statement.
- The CloudWatch alarm used `aws_wafv2_web_acl.comprehensive.name` for the `WebACL` dimension. AWS WAF metrics use the Web ACL metric name, not the resource name, for the `WebACL` dimension. Changed it to `ComprehensiveWAF` to match the `visibility_config.metric_name`.

## Review Notes
The Terraform examples are otherwise consistent with current AWS provider WAFV2 resource syntax. The examples use `scope = "REGIONAL"`; CloudFront distributions require a `CLOUDFRONT` web ACL managed through the US East (N. Virginia) endpoint and are associated through the CloudFront distribution configuration rather than `aws_wafv2_web_acl_association`.
