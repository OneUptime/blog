# Validation Summary: How to Use Conditional Resource Creation in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider resources (`aws_instance`, `aws_cloudwatch_metric_alarm`, `aws_nat_gateway`, `aws_eip`)
- OpenTofu meta-arguments (`count`, `for_each`)
- Conditional expressions

## Sources Consulted
- OpenTofu `count` meta-argument: https://opentofu.org/docs/language/meta-arguments/count/
- OpenTofu `for_each` meta-argument: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/
- OpenTofu conditional expressions: https://opentofu.org/docs/language/expressions/conditionals/
- OpenTofu module block syntax: https://opentofu.org/docs/language/modules/syntax/
- OpenTofu `enabled` meta-argument: https://opentofu.org/docs/v1.11/language/meta-arguments/enabled/
- AWS provider `aws_instance` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown
- AWS provider `aws_cloudwatch_metric_alarm` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_metric_alarm.html.markdown
- AWS provider `aws_nat_gateway` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/nat_gateway.html.markdown
- AWS provider `aws_eip` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/eip.html.markdown

## Issues Found
- The anti-pattern example used `aws_instance.bastion.public_ip`, which is not the correct failure mode for a resource declared with `count`. Counted resources must always be indexed. I changed the example to `aws_instance.bastion[0].public_ip` so the "bad" example now accurately demonstrates the real error case when `count = 0`.

## Review Notes
- The post's `count` and `for_each` patterns are technically valid in current OpenTofu.
- In OpenTofu v1.11 and later, `lifecycle { enabled = ... }` is a newer built-in alternative for conditionally creating a single resource or module. The post remains correct after the fix, but this is worth noting for future updates.
