# Validation Summary: How to Use Conditionals with for_each in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider for OpenTofu/Terraform
- Amazon S3
- Elastic Load Balancing
- Amazon Route 53
- Amazon CloudWatch
- Amazon SNS

## Sources Consulted
- OpenTofu `for_each` meta-argument: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/
- OpenTofu `for` expressions: https://opentofu.org/docs/language/expressions/for/
- OpenTofu provider configuration: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu resource `provider` meta-argument: https://opentofu.org/docs/language/meta-arguments/resource-provider/
- OpenTofu 1.9 release notes (`provider` iteration with `for_each`): https://opentofu.org/docs/v1.9/intro/whats-new/
- AWS provider `aws_lb_target_group` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lb_target_group.html.markdown
- AWS provider `aws_route53_record` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route53_record.html.markdown
- AWS provider `aws_cloudwatch_metric_alarm` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_metric_alarm.html.markdown
- AWS provider `aws_sns_topic_subscription` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/sns_topic_subscription.html.markdown

## Issues Found
- The introduction described `for_each` too broadly. OpenTofu documents resource and module `for_each` as accepting a map or a set of strings, so I corrected that wording.
- The `Conditional for_each with toset` example did not actually filter `var.regions`, and it referenced `aws.regional[each.key]` without declaring the corresponding provider configuration. I added the iterated `aws.regional` provider block and changed the resource `for_each` to build a filtered set from `var.regions`, matching the documented OpenTofu pattern.

## Review Notes
- The multi-region provider pattern used in the `toset` example depends on OpenTofu provider iteration, which was introduced in OpenTofu 1.9.
- I did not run `tofu init` or `tofu plan`, because the post contains illustrative snippets rather than a complete runnable configuration with AWS credentials and surrounding infrastructure.
