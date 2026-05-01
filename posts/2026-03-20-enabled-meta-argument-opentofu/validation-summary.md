# Validation Summary: How to Use the enabled Meta-Argument in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider resources and data sources
- Infrastructure as Code

## Sources Consulted
- OpenTofu docs: The `enabled` Meta-Argument - https://opentofu.org/docs/v1.11/language/meta-arguments/enabled/
- OpenTofu docs: Data Sources - https://opentofu.org/docs/v1.11/language/data-sources/
- OpenTofu docs: Module Blocks - https://opentofu.org/docs/language/modules/syntax/
- OpenTofu docs: What's new in OpenTofu 1.11? - https://opentofu.org/docs/intro/whats-new/
- AWS provider docs: `aws_flow_log` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/flow_log.html.markdown
- AWS provider docs: `aws_guardduty_detector` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/guardduty_detector.html.markdown
- AWS provider docs: `aws_backup_selection` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/backup_selection.html.markdown
- AWS provider docs: `aws_cloudwatch_dashboard` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_dashboard.html.markdown

## Issues Found
- The post placed `enabled` directly inside `resource`, `data`, and `module` blocks. In OpenTofu v1.11, `enabled` must be set inside a `lifecycle` block, so all examples were corrected to use `lifecycle { enabled = ... }`.
- The introduction and conclusion did not mention that `enabled` was introduced in OpenTofu v1.11. This was corrected to prevent readers on older versions from using unsupported syntax.
- The module example used `enabled` directly in the root `module` block, which would not demonstrate the module meta-argument correctly. It was changed to `lifecycle { enabled = ... }`.
- The `dashboard_body = jsonencode({...})` example was not valid HCL. It was replaced with a syntactically valid `jsonencode` example for `aws_cloudwatch_dashboard`.
- The output example claimed a disabled resource's attribute could be accessed directly and would return `null`. In OpenTofu, a disabled resource evaluates to `null`, and direct attribute access fails. The output was changed to guard the reference with a conditional expression.
- The conclusion stated that outputs from disabled resources return `null` automatically. This was corrected to explain that the resource evaluates to `null` and references must handle that safely.

## Review Notes
- This post is version-specific: the `enabled` meta-argument is available in OpenTofu v1.11 and later.
- The code snippets are illustrative and omit surrounding provider configuration and some variable definitions, which is acceptable for a guide post.
