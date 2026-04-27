# Validation Summary: How to Use the sensitive and nonsensitive Functions in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- HCL (HashiCorp Configuration Language)
- AWS provider resources (`aws_ssm_parameter`, `aws_db_instance`, `aws_secretsmanager_secret_version`)

## Sources Consulted
- OpenTofu `sensitive` function docs: https://opentofu.org/docs/language/functions/sensitive/
- OpenTofu `nonsensitive` function docs: https://opentofu.org/docs/language/functions/nonsensitive/
- AWS provider `aws_db_instance` resource source (sensitive attribute markings): https://github.com/hashicorp/terraform-provider-aws/blob/main/internal/service/rds/instance.go
- AWS provider `aws_db_instance` registry docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance

## Issues Found
No technical issues found.

The syntax of `sensitive(value)` and `nonsensitive(value)` is correctly described, and all code examples are valid HCL that demonstrates proper usage patterns:
- `sensitive()` correctly wraps interpolated/computed values to apply the sensitive marker.
- `nonsensitive()` is correctly used in the "Selectively Revealing Sensitive-Marked Values" example to extract a non-secret field from a sensitive `jsondecode` result.
- The "Sensitive Output Pattern" section correctly shows `sensitive = true` on output blocks.
- The note that sensitive values are still stored unredacted in state (and that backend-level encryption is required for true security) is accurate.

## Review Notes
- The "Using nonsensitive for Debugging" example calls `nonsensitive(aws_db_instance.main.address)`. The `address` attribute is not marked sensitive in the AWS provider, so this call is effectively a no-op in current OpenTofu (returns the value as-is). This is technically correct and will not error out, but the example is somewhat redundant — `nonsensitive()` is most useful when the input genuinely carries a sensitive marker (as shown in the next example with `jsondecode` of a Secrets Manager value).
- The `debug_mode` variable in that same example is declared but unused — minor stylistic noise but not a technical error.
- The "Protecting Combined Credentials" example references `var.db_name` without declaring it; treated as an illustrative snippet, not a complete config.
- Historical note (informational only): Early Terraform 0.15/0.16 raised an error when `nonsensitive()` was called on a non-sensitive value. Current OpenTofu relaxes this and returns the value unchanged. The post does not make any claim that contradicts current behavior.
