# Validation Summary: How to Follow Terraform Best Practices

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- Terraform CLI
- Terraform AWS provider
- AWS S3 backend for Terraform state
- AWS RDS
- AWS IAM
- AWS KMS
- AWS Secrets Manager
- TFLint
- pre-commit-terraform
- Terratest
- terraform-docs
- GitHub Actions

## Sources Consulted
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform dependency lock file documentation: https://developer.hashicorp.com/terraform/language/files/dependency-lock
- HashiCorp Terraform variable block documentation: https://developer.hashicorp.com/terraform/language/block/variable
- HashiCorp Terraform type constraints documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- HashiCorp Terraform for_each documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- HashiCorp Terraform validate command documentation: https://developer.hashicorp.com/terraform/cli/commands/validate
- HashiCorp AWS provider aws_db_instance documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS RDS Secrets Manager password management documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-secrets-manager.html
- TFLint Terraform ruleset documentation: https://github.com/terraform-linters/tflint-ruleset-terraform/blob/main/docs/rules/README.md
- pre-commit-terraform hook documentation: https://github.com/antonbabenko/pre-commit-terraform
- terraform-docs markdown table documentation: https://terraform-docs.io/reference/markdown-table/
- hashicorp/setup-terraform GitHub Action documentation: https://github.com/hashicorp/setup-terraform

## Issues Found
- The S3 backend example used `dynamodb_table` for state locking. HashiCorp now marks DynamoDB-based locking for the S3 backend as deprecated and recommends S3 state locking with `use_lockfile = true`. Updated the backend snippet to use `use_lockfile = true`.

## Review Notes
- Terraform, TFLint, and terraform-docs were not installed in the local environment, so CLI behavior was verified against official documentation rather than local `--help` output.
- The GitHub Actions example pins Terraform CLI to `1.6.0`, which is old but still a valid explicit version selection for an example workflow.
