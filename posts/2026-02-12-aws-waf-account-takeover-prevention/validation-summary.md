# Validation Summary: How to Set Up AWS WAF Account Takeover Prevention

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS WAFv2
- AWS Managed Rules Account Takeover Prevention (ATP)
- AWS CLI
- Terraform AWS provider
- Amazon CloudWatch metrics
- AWS WAF JavaScript integration SDK

## Sources Consulted
- AWS WAF Developer Guide: AWS WAF Fraud Control account takeover prevention (ATP) rule group: https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-atp.html
- AWS WAF Developer Guide: AWS WAF Fraud Control account takeover prevention (ATP): https://docs.aws.amazon.com/waf/latest/developerguide/waf-atp.html
- AWS WAF API Reference: RequestInspection: https://docs.aws.amazon.com/waf/latest/APIReference/API_RequestInspection.html
- AWS WAF API Reference: ResponseInspection: https://docs.aws.amazon.com/waf/latest/APIReference/API_ResponseInspection.html
- AWS WAF API Reference: ResponseInspectionStatusCode, BodyContains, Header, and Json: https://docs.aws.amazon.com/waf/latest/APIReference/
- AWS CLI Command Reference: wafv2 update-web-acl: https://docs.aws.amazon.com/cli/latest/reference/wafv2/update-web-acl.html
- AWS WAF Developer Guide: AWS WAF metrics and dimensions: https://docs.aws.amazon.com/waf/latest/developerguide/waf-metrics.html
- AWS WAF Developer Guide: AWS WAF JavaScript integrations and ATP token usage: https://docs.aws.amazon.com/waf/latest/developerguide/waf-atp-with-tokens.html
- Terraform Registry: aws_wafv2_web_acl resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl

## Issues Found
- The post configured ATP response inspection on a `REGIONAL` web ACL. AWS documents ATP response inspection as available only for web ACLs that protect CloudFront distributions. Updated the CLI and Terraform examples to use `CLOUDFRONT`, added `--region us-east-1` where required, corrected the sampled request ARN format, and added notes about the CloudFront-only response inspection constraint.
- The Terraform example said it was starting in count mode but only counted one ATP subrule. Changed the managed rule group's `override_action` to `count {}` so the example actually starts the group in count mode.
- The ATP rules table and rule-action override example referenced `UnsortedStolenCredentialCheck`, which is not in the current AWS ATP managed rule group listing. Removed that rule from the table and replaced the override with `AttributeCompromisedCredentials`. Added the current failed-login-response ATP rules.
- The CloudWatch metric example used the web ACL name and managed rule group name as dimensions. AWS WAF metrics use the configured metric names for `WebACL` and `Rule`, so the example now uses `myWebACL` and `ATP`.
- The post described ATP as checking for known bots and said the JavaScript SDK was especially needed for stolen-credential checks. Tightened the wording to AWS WAF token signals and session-level client verification, which matches AWS's description of the JavaScript integration.

## Review Notes
The AWS WAF `update-web-acl` operation replaces the mutable web ACL specification, so users must include all existing rules when adapting the command. The post's examples are otherwise syntactically plausible for the documented AWS WAFv2 ATP API shape.
