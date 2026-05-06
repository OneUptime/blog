# Validation Summary: How to Conditionally Create Resources with count in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS Provider for OpenTofu/Terraform
- Amazon EC2
- AWS WAFv2
- Amazon CloudWatch Logs
- Amazon Route 53
- AWS Certificate Manager
- Amazon VPC NAT Gateway
- Amazon SNS

## Sources Consulted
- OpenTofu `count` meta-argument: https://opentofu.org/docs/v1.11/language/meta-arguments/count/
- OpenTofu `one` function: https://opentofu.org/docs/language/functions/one/
- OpenTofu `try` function: https://opentofu.org/docs/language/functions/try/
- OpenTofu `enabled` meta-argument: https://opentofu.org/docs/v1.11/language/meta-arguments/enabled/
- AWS provider `aws_instance` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown
- AWS provider `aws_wafv2_web_acl_association` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/wafv2_web_acl_association.html.markdown
- AWS provider `aws_cloudwatch_log_group` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_log_group.html.markdown
- AWS provider `aws_route53_record` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route53_record.html.markdown
- AWS provider `aws_acm_certificate` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/acm_certificate.html.markdown
- AWS provider `aws_nat_gateway` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/nat_gateway.html.markdown
- AWS provider `aws_eip` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/eip.html.markdown
- AWS provider `aws_route` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route.html.markdown
- AWS provider `aws_cloudwatch_metric_alarm` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_metric_alarm.html.markdown
- AWS provider `aws_sns_topic` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/sns_topic.html.markdown
- AWS provider `aws_cloudfront_distribution` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudfront_distribution.html.markdown

## Issues Found
- The inline comment above `aws_instance.bastion[0].public_ip` described `[0]` as "one-based indexing." I changed it to refer to a conditional expression or `try()` because `count` instance addresses are zero-based in OpenTofu.
- The conclusion implied that plain `[0]` access is inherently safe for conditional resources. I changed it to clarify that `[0]` access must be guarded by the same condition to avoid invalid index errors when `count = 0`, while `one()` is appropriate for zero-or-one resources.
- The introduction and conclusion described `count` as the "most straightforward" or "simplest" option. I softened that wording so it remains accurate with current OpenTofu documentation, which now documents `lifecycle { enabled = ... }` as a cleaner alternative for a single optional resource or module.

## Review Notes
- The AWS resource arguments used in the examples match current provider documentation.
- For CloudFront custom domains, an ACM certificate later attached to the distribution must be in `us-east-1`; this post does not cover that association step, so no code change was required.
