# Validation Summary: How to Create IAM Users with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL configuration language)
- HashiCorp AWS provider (`hashicorp/aws`)
- AWS Identity and Access Management (IAM)
  - `aws_iam_user`, `aws_iam_user_login_profile`, `aws_iam_access_key`
  - `aws_iam_group`, `aws_iam_user_group_membership`
  - `aws_iam_group_policy`, `aws_iam_group_policy_attachment`
  - `aws_iam_policy`, `aws_iam_account_password_policy`
- AWS-managed policies (`AdministratorAccess`, `ReadOnlyAccess`)
- AWS IAM policy language (JSON, including `aws:MultiFactorAuthPresent` and `aws:username` policy variables)
- HashiCorp `null` provider (`null_resource` with `local-exec` provisioner)
- Terraform built-in functions: `jsonencode`, `for_each`, `formatdate`, `timestamp`

## Sources Consulted
- Terraform AWS provider docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
  - `aws_iam_user`
  - `aws_iam_user_login_profile` (attribute `password` exposed when `pgp_key` not set)
  - `aws_iam_access_key` (attributes `id` and `secret`)
  - `aws_iam_group`, `aws_iam_user_group_membership` (non-exclusive membership), `aws_iam_group_policy`, `aws_iam_group_policy_attachment`
  - `aws_iam_policy`, `aws_iam_account_password_policy` (all nine arguments used in the post are valid)
- AWS IAM documentation:
  - Managed policy ARN format (`arn:aws:iam::aws:policy/AdministratorAccess`, `ReadOnlyAccess`)
  - IAM policy variables (`${aws:username}`, `aws:MultiFactorAuthPresent`)
  - AWS reference example "Allow IAM users to manage their own MFA devices"
- Terraform language docs:
  - String interpolation escaping (`$${...}` to emit literal `${...}` inside `jsonencode`)
  - `formatdate` and `timestamp` functions
- HashiCorp `null` provider docs for `null_resource` / `triggers` / `local-exec` provisioner

## Issues Found
- **Misleading comment on access-key rotation trigger.** The original comment read `# Trigger recreation every 90 days`, but the trigger value is `formatdate("YYYY-MM", timestamp())`, which only changes when the calendar month rolls over (i.e., monthly), not every 90 days. Updated the comment to `# Trigger recreation when the calendar month changes` so it accurately describes the behavior.

## Review Notes
- All Terraform resource names, argument names, and attribute references are valid for the current `hashicorp/aws` provider.
- All IAM action strings, ARN formats, and AWS-managed policy ARNs used in the post are correct.
- The MFA enforcement policy follows AWS's well-known "let users manage their own MFA devices" pattern and uses `BoolIfExists` with `aws:MultiFactorAuthPresent`, which is the AWS-recommended construction.
- The `$${aws:username}` escape inside `jsonencode` is correct: Terraform interprets `${...}` as interpolation, so doubling the dollar sign emits the literal IAM policy variable `${aws:username}`.
- Caveats worth noting (technically correct as-is, but readers should be aware):
  - `aws_iam_access_key.secret` and `aws_iam_user_login_profile.password` are written to Terraform state in plaintext when no `pgp_key` is provided. Production users should encrypt remote state (e.g., S3 + KMS) and/or use `pgp_key` to encrypt these values.
  - Using `timestamp()` in `triggers` is a known Terraform footgun for perpetual diffs; truncating to month via `formatdate("YYYY-MM", ...)` mitigates this but a more idiomatic approach is the `time_rotating` resource from the `hashicorp/time` provider. Left as-is since the existing code is syntactically valid and the intent (monthly reminder) still works.
  - `aws_iam_user_group_membership` is intentionally non-exclusive (composable per user); the post uses it correctly. Readers should not confuse it with `aws_iam_group_membership`, which is exclusive at the group level.
