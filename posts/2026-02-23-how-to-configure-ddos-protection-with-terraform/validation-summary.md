# Validation Summary: How to Configure DDoS Protection with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AWS provider for Terraform
- AWS Shield Standard and Shield Advanced
- AWS WAFv2
- AWS Managed Rules Bot Control
- Amazon CloudFront
- Elastic Load Balancing
- Amazon Route 53
- Amazon CloudWatch
- Amazon SNS

## Sources Consulted
- Terraform AWS provider documentation for `aws_shield_subscription`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/shield_subscription
- Terraform AWS provider documentation for `aws_shield_protection`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/shield_protection
- Terraform AWS provider documentation for `aws_shield_protection_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/shield_protection_group
- Terraform AWS provider documentation for `aws_wafv2_web_acl`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl
- Terraform AWS provider documentation for `aws_wafv2_web_acl_association`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl_association
- Terraform AWS provider documentation for `aws_cloudfront_distribution`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- AWS Shield documentation: https://docs.aws.amazon.com/shield/
- AWS Shield Advanced getting started guide: https://docs.aws.amazon.com/waf/latest/developerguide/getting-started-ddos.html
- AWS WAF rate-based rule documentation: https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based-high-level-settings.html
- AWS WAF Bot Control documentation: https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-bot.html
- AWS WAF API reference for `AWSManagedRulesBotControlRuleSet`: https://docs.aws.amazon.com/waf/latest/APIReference/API_AWSManagedRulesBotControlRuleSet.html

## Issues Found
- The WAF Bot Control managed rule referenced `AWSManagedRulesBotControlRuleSet` without an explicit Bot Control managed rule group configuration. Added `managed_rule_group_configs` with `inspection_level = "COMMON"` so the Terraform example specifies the protection level documented by AWS WAF.
- The CloudFront distribution referenced `aws_wafv2_web_acl.ddos_cloudfront.arn`, but the post did not define that Web ACL. Added a CloudFront-scoped WAFv2 Web ACL with a rate-based rule.
- The post demonstrated a regional WAF ACL for the ALB, but CloudFront requires a WAFv2 ACL with `scope = "CLOUDFRONT"`. The added CloudFront ACL uses the correct scope and is the resource associated with the distribution.

## Review Notes
The Terraform snippets still assume supporting resources such as `aws_lb.main`, `aws_eip.main`, `data.aws_route53_zone.main`, and CloudFront origin TLS configuration already exist elsewhere in the reader's configuration. That is acceptable for a focused article, but a future revision could make these assumptions explicit.
