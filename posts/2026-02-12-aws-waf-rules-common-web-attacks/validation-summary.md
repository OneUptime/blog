# Validation Summary: How to Set Up AWS WAF Rules for Common Web Attacks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS WAF / WAFv2
- AWS CLI
- AWS WAF Web ACLs, rules, rule groups, and statements
- SQL injection and XSS match statements
- Size constraint, IP set, and geo match statements
- AWS WAF logging and sampled requests
- Terraform AWS provider

## Sources Consulted
- AWS CLI Command Reference: wafv2 create-web-acl - https://docs.aws.amazon.com/cli/latest/reference/wafv2/create-web-acl.html
- AWS CLI Command Reference: wafv2 get-sampled-requests - https://docs.aws.amazon.com/cli/v1/reference/wafv2/get-sampled-requests.html
- AWS CLI Command Reference: wafv2 put-logging-configuration - https://docs.aws.amazon.com/cli/latest/reference/wafv2/put-logging-configuration.html
- AWS WAF Developer Guide: Resources that you can protect with AWS WAF - https://docs.aws.amazon.com/waf/latest/developerguide/how-aws-waf-works-resources.html
- AWS WAF API Reference: XssMatchStatement - https://docs.aws.amazon.com/waf/latest/APIReference/API_XssMatchStatement.html
- AWS CloudFormation Reference: SqliMatchStatement - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-wafv2-rulegroup-sqlimatchstatement.html
- AWS WAF Developer Guide: Size constraint rule statement - https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-size-constraint-match.html
- AWS WAF Developer Guide: Sending web ACL traffic logs to an Amazon S3 bucket - https://docs.aws.amazon.com/waf/latest/developerguide/logging-s3.html
- HashiCorp Terraform AWS Provider documentation: aws_wafv2_web_acl - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl

## Issues Found
- The description claimed coverage for path traversal and request smuggling, but the post does not include rules for those attack classes. Updated it to list the protections actually covered: SQL injection, XSS, oversized requests, bad IPs, and unwanted geographic traffic.
- The AWS WAF resource wording referred broadly to API Gateway and AppSync. Updated it to API Gateway REST APIs and AppSync GraphQL APIs to match AWS WAF's documented supported resource types.
- The CloudFront note only mentioned `CLOUDFRONT` scope. Updated it to also mention `us-east-1`, which AWS requires for CloudFront-scoped AWS WAF resources.
- The IP set section was titled "IP Reputation Blocking," which implies AWS-managed reputation intelligence. Updated it to "Custom IP Blocking" because the example uses a manually managed IP set.
- Count mode was described as logging matching requests. Updated it to state that Count mode counts matching requests and allows them to continue; metrics, sampled requests, or logging are separate visibility features.
- The WAF logging example used an S3 bucket ARN that did not start with `aws-waf-logs-`. Updated it to the required AWS WAF logging bucket naming pattern.

## Review Notes
The AWS CLI JSON structures, WAFv2 statement names, text transformation usage, oversize handling fields, Terraform `aws_wafv2_web_acl` structure, and referenced OneUptime links were otherwise consistent with the consulted documentation. The local environment did not have the AWS CLI or Terraform installed, so command validation was performed against official documentation rather than local `--help` output.
