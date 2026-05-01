# Validation Summary: How to Design a Tagging Module for OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS Provider for Terraform/OpenTofu
- Amazon EC2 Auto Scaling
- AWS Config

## Sources Consulted
- OpenTofu Input Variables: https://opentofu.org/docs/language/values/variables/
- OpenTofu Custom Conditions: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu For Expressions: https://opentofu.org/docs/language/expressions/for/
- OpenTofu Workspaces: https://opentofu.org/docs/language/state/workspaces/
- OpenTofu merge Function: https://opentofu.org/docs/language/functions/merge/
- AWS Config `required-tags` managed rule: https://docs.aws.amazon.com/config/latest/developerguide/required-tags.html
- AWS provider `aws_autoscaling_group` resource docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/autoscaling_group.html.markdown
- AWS provider `aws_config_config_rule` resource docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/config_config_rule.html.markdown

## Issues Found
- The module merged `additional_tags` last, which allowed callers to override mandatory tags such as `Environment` and `CostCenter`. I changed the merge order so the module's standardized tags take precedence, matching the post's claim that the module enforces required tags.
- The `aws_autoscaling_group` example omitted required launch and placement arguments. I added `vpc_zone_identifier` and a `launch_template` block so the example matches the AWS provider's required configuration model.
- The AWS Config explanation implied broad coverage across resources. I changed the wording to refer to the AWS-managed rule and to supported resources, because the `REQUIRED_TAGS` rule only evaluates resource types whose tags AWS Config records.

## Review Notes
- `terraform.workspace` remains the documented way to reference the current workspace name in OpenTofu.
- The AWS Config `REQUIRED_TAGS` rule can validate up to six tag keys and optional expected values, but it does not prevent resource creation with incorrect tags.
