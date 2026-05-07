# Validation Summary: How to Manage AWS Secrets Manager with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS Secrets Manager
- AWS KMS
- AWS IAM
- AWS Lambda rotation for Secrets Manager
- HashiCorp AWS provider resources
- HashiCorp Random provider

## Sources Consulted
- OpenTofu Sensitive Data in State: https://opentofu.org/docs/language/state/sensitive-data/
- OpenTofu Ephemerality: https://opentofu.org/docs/language/ephemerality/
- OpenTofu Write-only attributes: https://opentofu.org/docs/v1.11/language/ephemerality/write-only-attributes/
- OpenTofu Resource syntax note on write-only attributes: https://opentofu.org/docs/language/resources/syntax/
- AWS Secrets Manager `GetSecretValue` API reference: https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
- AWS Secrets Manager rotation by Lambda: https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_lambda.html
- AWS Secrets Manager setup guide for automatic rotation: https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_turn-on-for-other.html
- AWS Secrets Manager rotation Lambda execution role permissions: https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets-required-permissions-function.html
- Terraform Registry AWS provider `aws_secretsmanager_secret` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret
- Terraform Registry AWS provider `aws_secretsmanager_secret_version` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_version
- Terraform Registry AWS provider `aws_secretsmanager_secret_version` data source docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/secretsmanager_secret_version
- Terraform Registry AWS provider `aws_secretsmanager_secret_rotation` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_rotation
- Terraform Registry Random provider `random_password` resource docs: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password

## Issues Found
- The post said reading a secret with `data "aws_secretsmanager_secret_version"` avoids storing it in state. That is incorrect. The data source returns the decrypted `secret_string`, and OpenTofu state must still be treated as sensitive. I corrected the comment in the example and updated the introductory guidance.
- The conclusion claimed the shown pattern keeps secret values out of the state file. That was incorrect because the post also uses `random_password`, `aws_secretsmanager_secret_version.secret_string`, and a Secrets Manager data source, all of which can place secret values in state. I corrected the conclusion and noted OpenTofu v1.11+ ephemeral values and write-only attributes as the state-avoidance option.
- The IAM example granted only `secretsmanager:GetSecretValue`, but the post configures the secret with a customer-managed KMS key through `kms_key_id = var.kms_key_arn`. AWS requires `kms:Decrypt` on that key for `GetSecretValue` in this case. I added the missing `kms:Decrypt` statement.
- The rotation example did not mention the additional Lambda-side permissions required for rotation to work. I added a note that the Lambda function needs a resource policy allowing `secretsmanager.amazonaws.com` to invoke it and an execution role that can access the secret and KMS key.

## Review Notes
- The HCL syntax and the resource/data source names used in the post are current and valid.
- `recovery_window_in_days = 0` is valid for `aws_secretsmanager_secret` and forces deletion without a recovery window; `7` to `30` days are the other allowed values.
- `rotation_rules { automatically_after_days = 30 }` is a valid current configuration for `aws_secretsmanager_secret_rotation`.
- If a future revision wants the code examples themselves to avoid persisting secrets in state, the secret creation and retrieval examples should be rewritten around OpenTofu v1.11+ ephemeral resources and `secret_string_wo`. The current code remains functional once the state-handling guidance is corrected.
