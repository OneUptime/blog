# Validation Summary: How to Avoid Hardcoding Credentials in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform AWS provider
- Terraform Vault provider
- Terraform Random provider
- AWS Secrets Manager
- AWS Systems Manager Parameter Store
- AWS RDS
- AWS Lambda
- HashiCorp Vault
- pre-commit
- detect-secrets
- Gitleaks
- Trivy / tfsec

## Sources Consulted
- Terraform documentation: Manage sensitive data in your configuration - https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- Terraform documentation: Protect sensitive input variables - https://developer.hashicorp.com/terraform/tutorials/configuration-language/sensitive-variables
- Terraform CLI documentation: terraform taint command - https://developer.hashicorp.com/terraform/cli/commands/taint
- Terraform AWS provider documentation: aws_db_instance - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider documentation: aws_secretsmanager_secret_version - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_version
- AWS Secrets Manager documentation: What's in a secret? - https://docs.aws.amazon.com/secretsmanager/latest/userguide/whats-in-a-secret.html
- Terraform Vault provider documentation: vault_generic_secret data source - https://registry.terraform.io/providers/hashicorp/vault/latest/docs/data-sources/generic_secret
- detect-secrets documentation - https://github.com/Yelp/detect-secrets
- Gitleaks documentation - https://github.com/gitleaks/gitleaks
- tfsec documentation / migration notice - https://github.com/aquasecurity/tfsec
- Trivy Terraform scanning documentation - https://trivy.dev/docs/latest/coverage/iac/terraform/

## Issues Found
- Clarified Terraform state exposure. The post correctly warned that variable values can end up in state, but some later sections could be read as implying that Secrets Manager, SSM, Vault data sources, and generated passwords avoid state exposure entirely. Added caveats that resolved secret values can still be stored in Terraform state unless ephemeral values and write-only provider arguments are used where supported.
- Updated the detect-secrets pre-commit version from `v1.4.0` to `v1.5.0`, matching the current upstream example.
- Updated the Gitleaks pre-commit repository from `https://github.com/zricethezav/gitleaks` to `https://github.com/gitleaks/gitleaks` and the example version from `v8.18.0` to `v8.24.2`, matching the current upstream example.
- Replaced the tfsec command recommendation with Trivy. The tfsec project is now part of Trivy, and Trivy supports Terraform misconfiguration and secret scanning.
- Replaced the deprecated `terraform taint` rotation example with `terraform apply -replace="random_password.db_password"`, which Terraform recommends for v0.15.2 and later.
- Narrowed the final guidance from avoiding all `.tfvars` files to avoiding committed `.tfvars` files, because local ignored `.tfvars` files are valid Terraform input files, though they still require careful handling.

## Review Notes
- The Terraform snippets are partial examples and omit unrelated required production settings such as RDS networking, allocated storage, final snapshot behavior, IAM permissions, and Lambda deployment package configuration. That is acceptable for a focused secrets-management article.
- The examples that use `password`, `secret_string`, and secret data source values are useful for explaining the pattern but still require secure remote state, encryption at rest, and strict state access controls in real environments.
