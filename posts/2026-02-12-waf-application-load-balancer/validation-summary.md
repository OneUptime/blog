# Validation Summary: How to Set Up WAF with Application Load Balancer

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS WAF v2
- Application Load Balancer
- AWS CLI
- CloudWatch Logs
- CloudWatch metrics and alarms
- Terraform AWS Provider

## Sources Consulted
- AWS CLI Command Reference: wafv2 create-web-acl - https://docs.aws.amazon.com/cli/latest/reference/wafv2/create-web-acl.html
- AWS CLI Command Reference: wafv2 put-logging-configuration - https://docs.aws.amazon.com/cli/latest/reference/wafv2/put-logging-configuration.html
- AWS CLI WAFV2 examples, including get-sampled-requests and logging examples - https://docs.aws.amazon.com/cli/latest/userguide/cli_wafv2_code_examples.html
- AWS WAF Developer Guide: Resources that you can protect with AWS WAF - https://docs.aws.amazon.com/waf/latest/developerguide/how-aws-waf-works-resources.html
- AWS WAF Developer Guide: Sending web ACL traffic logs to CloudWatch Logs - https://docs.aws.amazon.com/waf/latest/developerguide/logging-cw-logs.html
- AWS WAF Developer Guide: AWS WAF metrics and dimensions - https://docs.aws.amazon.com/waf/latest/developerguide/waf-metrics.html
- AWS WAF Developer Guide: AWS Managed Rules rule groups list - https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-list.html
- AWS WAF Developer Guide: Rate-based rule high-level settings - https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based-high-level-settings.html
- Terraform Registry: aws_wafv2_web_acl - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl
- Terraform Registry: aws_wafv2_web_acl_logging_configuration - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl_logging_configuration
- Terraform Registry: aws_cloudwatch_log_group - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_group

## Issues Found
- The CLI rate-based WAF rules used the default block response, which returns a WAF block response rather than the HTTP 429 expected by the rate-limit test. Updated both CLI rate-limit rules to use `CustomResponse` with `ResponseCode` 429.
- The CloudWatch alarm used `WebACL=alb-waf`, but AWS WAF CloudWatch dimensions use the Web ACL metric name. Updated the alarm dimension to `WebACL=ALB-WAF`, matching the Web ACL `MetricName` in the post.

## Review Notes
- The local environment did not have the AWS CLI or Terraform installed, so command and configuration validation was performed against official AWS and HashiCorp documentation.
- The Terraform example already used a 429 custom response for the rate limit rule, so no Terraform correction was needed for that behavior.
