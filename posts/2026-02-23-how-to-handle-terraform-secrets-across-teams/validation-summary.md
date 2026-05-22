# Validation Summary: How to Handle Terraform Secrets Across Teams

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- AWS Secrets Manager
- Amazon S3 Terraform backend
- AWS IAM resource policies
- AWS Lambda
- HashiCorp Vault
- GitHub Actions
- TruffleHog
- Gitleaks

## Sources Consulted
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform sensitive variables tutorial: https://developer.hashicorp.com/terraform/tutorials/configuration-language/sensitive-variables
- Terraform sensitive function documentation: https://developer.hashicorp.com/terraform/language/functions/sensitive
- Terraform lifecycle meta-argument documentation: https://docs.hashicorp.com/terraform/language/meta-arguments/lifecycle
- AWS Prescriptive Guidance for Secrets Manager and Terraform: https://docs.aws.amazon.com/prescriptive-guidance/latest/secure-sensitive-data-secrets-manager-terraform/using-secrets-manager-and-terraform.html
- AWS CLI create-secret command reference: https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/create-secret.html
- AWS Lambda Python runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html
- Terraform AWS provider aws_secretsmanager_secret documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret
- Terraform AWS provider aws_secretsmanager_secret_rotation documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_rotation
- Terraform random provider random_password documentation: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password
- Terraform Vault provider generic secret documentation: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/resources/generic_secret
- Terraform Vault dynamic AWS credentials tutorial: https://developer.hashicorp.com/terraform/tutorials/secrets/secrets-vault
- TruffleHog CI documentation: https://docs.trufflesecurity.com/scanning-in-ci
- Gitleaks README and pre-commit example: https://github.com/gitleaks/gitleaks
- Linked OneUptime Terraform access controls article: https://oneuptime.com/blog/post/2026-02-23-how-to-set-up-terraform-access-controls-for-teams/view

## Issues Found
- The plan-output example implied an RDS password would be printed in cleartext. The AWS provider treats the RDS password argument as sensitive, so Terraform redacts it in normal CLI output. I changed the example to show an unmarked output value and clarified that provider-declared sensitive values are often redacted automatically.
- The `random_password` example used `ignore_changes = all` to prevent regeneration on every apply. `random_password` persists its result in state and does not regenerate on every apply unless replacement is triggered, so I removed that lifecycle block.
- Several `aws_db_instance` snippets omitted provider-required arguments such as `allocated_storage` and `username`. I added minimal required fields so the examples are technically valid resource examples.
- One RDS example pinned PostgreSQL to an old minor version. I removed the unnecessary minor-version pin to avoid recommending an outdated engine patch level.
- The S3 backend example used `dynamodb_table` for state locking. Terraform now marks DynamoDB-based S3 backend locking as deprecated and recommends `use_lockfile = true`, so I updated the backend snippet.
- The local value example did not actually mark the local value as sensitive. I wrapped the local object with Terraform's `sensitive()` function.
- The Gitleaks pre-commit hook used an older pinned version. I updated it to the current version shown in the official Gitleaks pre-commit example.

## Review Notes
The Terraform examples remain illustrative rather than complete standalone modules. The post correctly emphasizes that secrets flowing through Terraform can still be stored in state and that state must be protected.
