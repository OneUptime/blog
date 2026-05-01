# Validation Summary: How to Use the enabled Meta-Argument Introduced in OpenTofu 1.11

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu 1.11
- OpenTofu configuration language (HCL)
- OpenTofu modules and meta-arguments
- AWS provider resources used as examples (`aws_wafv2_web_acl`, `aws_cloudwatch_log_group`, `aws_shield_protection`, `aws_backup_plan`)

## Sources Consulted
- OpenTofu: The `enabled` Meta-Argument - https://opentofu.org/docs/v1.11/language/meta-arguments/enabled/
- OpenTofu: What's new in OpenTofu 1.11? - https://opentofu.org/docs/intro/whats-new/
- OpenTofu: `lifecycle` Blocks - https://opentofu.org/docs/language/meta-arguments/lifecycle/
- OpenTofu: Module Blocks - https://opentofu.org/docs/language/modules/syntax/
- AWS provider docs source: `aws_wafv2_web_acl` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/wafv2_web_acl.html.markdown
- AWS provider docs source: `aws_cloudwatch_log_group` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_log_group.html.markdown
- AWS provider docs source: `aws_shield_protection` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/shield_protection.html.markdown
- AWS provider docs source: `aws_backup_plan` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/backup_plan.html.markdown

## Issues Found
- The post showed `enabled` as a top-level argument inside `resource` and `module` blocks. In OpenTofu 1.11, `enabled` must be nested inside a `lifecycle` block. I updated every affected example to use the documented syntax.
- The `log_group_arn` output directly accessed `aws_cloudwatch_log_group.app.arn`. When a resource is disabled with `enabled = false`, the resource evaluates to `null`, so direct attribute access is invalid. I changed the output to use a null-safe conditional expression.
- After these fixes, the remaining examples and claims aligned with the OpenTofu 1.11 language docs and the current AWS provider resource docs used by the snippets.

## Review Notes
- The post is version-specific and now matches the OpenTofu 1.11 documentation, including the current requirement that `enabled` is placed inside `lifecycle` blocks.
- No terminal commands were present in the post, so there were no CLI examples to validate.
