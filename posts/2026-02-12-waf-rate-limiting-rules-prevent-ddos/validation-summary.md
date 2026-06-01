# Validation Summary: How to Create WAF Rate-Limiting Rules to Prevent DDoS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS WAF
- AWS WAFv2 API and AWS CLI
- AWS WAF rate-based rules
- Terraform AWS provider
- DDoS mitigation and rate limiting

## Sources Consulted
- AWS WAF Developer Guide: Rate-based rule high-level settings: https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based-high-level-settings.html
- AWS CloudFormation Template Reference: AWS::WAFv2::WebACL RateBasedStatement: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-wafv2-webacl-ratebasedstatement.html
- AWS CLI Command Reference: update-web-acl: https://docs.aws.amazon.com/cli/latest/reference/wafv2/update-web-acl.html
- AWS CLI Command Reference: get-rate-based-statement-managed-keys: https://docs.aws.amazon.com/cli/latest/reference/wafv2/get-rate-based-statement-managed-keys.html
- AWS CLI Command Reference: get-sampled-requests: https://docs.aws.amazon.com/cli/latest/reference/wafv2/get-sampled-requests.html
- AWS WAF API Reference: RateBasedStatementCustomKey: https://docs.aws.amazon.com/waf/latest/APIReference/API_RateBasedStatementCustomKey.html
- AWS WAF Developer Guide: Customized web requests and responses: https://docs.aws.amazon.com/waf/latest/developerguide/waf-custom-request-response.html
- Terraform AWS Provider documentation: aws_wafv2_web_acl: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl

## Issues Found
- The post stated that the minimum rate-based rule threshold is 100 requests per 5 minutes. AWS WAF now allows a minimum limit of 10 requests per evaluation window, so the key detail was updated.
- The post described AWS WAF rate-based rules as always using a 5-minute window. AWS WAF now supports configurable evaluation windows of 60, 120, 300, and 600 seconds, with 300 seconds as the default, so the explanation was updated while preserving the examples' default 5-minute behavior.
- The `get-sampled-requests` example used a fixed full-day timestamp from 2026-02-12. AWS only allows sampled request time windows from the previous three hours, so the command was changed to generate a recent one-hour UTC window.

## Review Notes
The AWS CLI JSON examples, WAFv2 statement structure, custom key examples, custom response example, monitoring command names, and Terraform `aws_wafv2_web_acl` structure are consistent with current official documentation. For CloudFront-scoped Web ACLs, the AWS CLI commands still need `--scope CLOUDFRONT` and the `us-east-1` region, but the post's examples consistently use `REGIONAL`.
