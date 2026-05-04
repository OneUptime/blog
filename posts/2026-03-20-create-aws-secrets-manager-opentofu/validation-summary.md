# Validation Summary: How to Create AWS Secrets Manager Secrets with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible)
- AWS Secrets Manager
- AWS KMS
- AWS IAM
- AWS Lambda (for rotation)
- HCL (HashiCorp Configuration Language)

## Sources Consulted
- Terraform AWS provider — `aws_secretsmanager_secret`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret
- Terraform AWS provider — `aws_secretsmanager_secret_version`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_version
- Terraform AWS provider — `aws_secretsmanager_secret_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_policy
- Terraform AWS provider — `aws_secretsmanager_secret_rotation`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_rotation
- AWS IAM global condition context keys: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS KMS condition keys (`kms:ViaService`): https://docs.aws.amazon.com/kms/latest/developerguide/policy-conditions.html

## Issues Found
No technical issues found.

Verified specifically:
- `aws_secretsmanager_secret_policy` correctly uses `secret_arn` (this is the required argument; the resource does NOT accept `secret_id`).
- `aws_secretsmanager_secret_rotation` correctly uses `secret_id`, `rotation_lambda_arn`, and a `rotation_rules` block with `automatically_after_days`.
- `recovery_window_in_days` comment is accurate: 0 forces immediate deletion, otherwise 7-30 days.
- `aws_secretsmanager_secret_version` correctly uses `secret_id` and `secret_string`.
- `aws:SourceVpc` is the correct IAM global condition key for restricting access to a specific VPC.
- `kms:ViaService` is a valid KMS condition key with the documented `<service>.<region>.amazonaws.com` value format.
- `jsonencode` usage and IAM policy structure (Version 2012-10-17, Statement, Effect, Principal, Action, Resource, Condition) are correct.
- `for_each` over a map and `output` aggregation pattern are valid HCL.

## Review Notes
- The post sensibly notes that secret values should be supplied via secure channels rather than committed to OpenTofu state — worth reinforcing that any `secret_string` value passed via Terraform/OpenTofu is still stored in plaintext in the state file, so the state backend must itself be encrypted and access-controlled.
- The `aws_secretsmanager_secret_rotation` `rotation_rules` block also supports `duration` and `schedule_expression` (newer alternatives to `automatically_after_days`); the example uses the simple form, which is fine.
- The Deny-non-VPC policy uses `aws:SourceVpc`, which only evaluates when the request is made through a VPC endpoint. Calls from outside a VPC (e.g., the open internet) will not have this key set, so `StringNotEquals` evaluates to true and the deny applies — which is the intended behavior, but readers should be aware they need a Secrets Manager VPC endpoint configured for legitimate in-VPC access.
