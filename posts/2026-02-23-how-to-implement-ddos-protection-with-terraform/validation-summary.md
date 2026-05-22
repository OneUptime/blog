# Validation Summary: How to Implement DDoS Protection with Terraform

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform
- AWS Shield Standard and Shield Advanced
- AWS Shield protection groups and proactive engagement
- AWS CloudFront
- AWS WAFv2 Web ACLs and rate-based rules
- AWS Auto Scaling
- Amazon CloudWatch alarms
- Amazon SNS

## Sources Consulted
- Terraform AWS provider `aws_shield_subscription` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/shield_subscription.html.markdown
- Terraform AWS provider `aws_shield_protection` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/shield_protection.html.markdown
- Terraform AWS provider `aws_shield_protection_group` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/shield_protection_group.html.markdown
- Terraform AWS provider `aws_shield_proactive_engagement` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/shield_proactive_engagement.html.markdown
- Terraform AWS provider `aws_cloudfront_distribution` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudfront_distribution.html.markdown
- Terraform AWS provider `aws_wafv2_web_acl` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/wafv2_web_acl.html.markdown
- Terraform AWS provider `aws_cloudwatch_metric_alarm` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_metric_alarm.html.markdown
- AWS Shield FAQ: https://aws.amazon.com/shield/faqs/
- AWS Shield Advanced metrics documentation: https://docs.aws.amazon.com/waf/latest/developerguide/shield-metrics.html
- AWS Shield proactive engagement announcement: https://aws.amazon.com/about-aws/whats-new/2020/06/aws-shield-advanced-now-supports-proactive-event-response/
- AWS Shield SRT access documentation: https://docs.aws.amazon.com/waf/latest/developerguide/ddos-srt-access.html
- AWS Shield overview documentation: https://docs.aws.amazon.com/waf/latest/developerguide/ddos-overview.html
- AWS Shield protection group resource type reference: https://docs.aws.amazon.com/cli/latest/reference/shield/list-protection-groups.html

## Issues Found
- Updated Shield Advanced pricing wording from a generic "$3,000/month" statement to "$3,000/month per organization, with a 1-year subscription commitment" to match AWS pricing and Terraform provider documentation.
- Replaced "DDoS Response Team (DRT)" with the current AWS term "Shield Response Team (SRT)".
- Corrected the proactive engagement description to note that SRT proactive contact depends on a detected event correlating with an unhealthy Route 53 health check for a protected resource and requires Business or Enterprise Support.
- Fixed the CloudFront distribution WAF reference from `aws_wafv2_web_acl.cloudfront.arn` to the Web ACL resource actually defined in the post, `aws_wafv2_web_acl.ddos_protection.arn`.
- Changed the WAFv2 Web ACL example from `REGIONAL` scope to `CLOUDFRONT` scope with `us-east-1`, because CloudFront distributions require WAFv2 Web ACLs with CloudFront/global scope.

## Review Notes
The Terraform snippets are illustrative and depend on surrounding resources and variables that are not shown. The examples use legacy CloudFront `forwarded_values`, which the current Terraform provider marks as deprecated in favor of cache and origin request policies, but the argument is still supported, so it was not changed.
