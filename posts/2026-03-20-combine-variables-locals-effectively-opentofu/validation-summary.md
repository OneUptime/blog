# Validation Summary: How to Combine Variables and Locals Effectively in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider for Terraform/OpenTofu (`hashicorp/aws`)
- AWS EC2 (`aws_instance`)
- AWS STS caller identity data source (`aws_caller_identity`)

## Sources Consulted
- OpenTofu Input Variables: https://opentofu.org/docs/language/values/variables/
- OpenTofu Local Values: https://opentofu.org/docs/language/values/locals/
- OpenTofu References to Named Values: https://opentofu.org/docs/v1.9/language/expressions/references/
- AWS provider `aws_instance` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown
- AWS provider `aws_caller_identity` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/caller_identity.html.markdown

## Issues Found
- Pattern 1 referenced `data.aws_caller_identity.current.account_id` without declaring the `aws_caller_identity` data source. Added `data "aws_caller_identity" "current" {}` so the example is valid.
- Pattern 2 used `aws_instance` with only `instance_type` and `count`. The AWS provider requires an `ami` unless a launch template supplies it. Added an `ami` value using the documented SSM parameter resolver example.
- Pattern 3 referenced `local.name_prefix` and `local.common_tags` without defining them in the snippet, and its `aws_instance` resource omitted required arguments. Added the missing variable/local definitions and added `ami` plus `instance_type` so the example is valid.

## Review Notes
- The core explanation of variables versus locals is accurate per current OpenTofu docs, including use of `var.<name>` and `local.<name>`.
- Local values can reference other local values in the same `locals` block as long as there is no circular dependency.
- `tofu` was not installed in the local environment, so this review was completed against the current official documentation rather than by running `tofu validate` locally.
