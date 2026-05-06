# Validation Summary: How to Use Conditional Expressions (Ternary) in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider examples for OpenTofu/Terraform Registry

## Sources Consulted
- OpenTofu Conditional Expressions: https://opentofu.org/docs/language/expressions/conditionals/
- OpenTofu Types and Values: https://opentofu.org/docs/language/expressions/types/
- OpenTofu Input Variables: https://opentofu.org/docs/language/values/variables/
- OpenTofu `count` meta-argument: https://opentofu.org/docs/language/meta-arguments/count/
- OpenTofu `merge` function: https://opentofu.org/docs/language/functions/merge/
- OpenTofu `one` function: https://opentofu.org/docs/language/functions/one/
- AWS provider `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider `aws_cloudwatch_log_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_group
- AWS provider `aws_lb`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb

## Issues Found
- The `tags` example used `Critical = ... ? "true" : null` while describing that as conditionally adding a tag. In OpenTofu, `null` omission semantics apply when an argument itself is `null`; using `null` as a nested map value does not cleanly express conditional key omission. I changed the example to use `merge(..., condition ? { Critical = "true" } : {})`, which correctly adds the tag only in production.
- The `Conditional with null` section said `null` means "never expire", but the example actually fell back to `90`. I corrected the comment to match the code. This also aligns with the AWS provider docs, where CloudWatch Logs uses `retention_in_days = 0` for never-expire behavior.
- The conclusion said conditional expressions evaluate both branches syntactically. I updated that explanation to match the OpenTofu docs more precisely: OpenTofu must be able to determine a consistent result type for both branches, even though only one result is selected.

## Review Notes
- The post’s main conditional-expression syntax and most examples were technically correct after the fixes above.
- The `count = condition ? 1 : 0` pattern remains valid, but current OpenTofu docs note that `enabled` is now a cleaner alternative for zero-or-one resource or module instances in newer OpenTofu versions.
