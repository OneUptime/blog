# Validation Summary: How to Handle Infrastructure as Code Best Practices

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Infrastructure as Code
- Terraform
- Terraform S3 backend and state locking
- AWS S3
- AWS RDS
- AWS Secrets Manager
- AWS security groups
- GitHub Actions
- TFLint
- Checkov

## Sources Consulted
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform sensitive data documentation: https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- Terraform AWS provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS RDS Secrets Manager password management documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-secrets-manager.html
- HashiCorp setup-terraform action documentation: https://github.com/hashicorp/setup-terraform
- Checkov GitHub Action documentation: https://github.com/bridgecrewio/checkov-action
- TFLint documentation: https://github.com/terraform-linters/tflint
- Terraform version constraints documentation: https://developer.hashicorp.com/terraform/language/expressions/version-constraints
- Terraform init and dependency lock file documentation: https://developer.hashicorp.com/terraform/tutorials/cli/init

## Issues Found
- The S3 backend example used `dynamodb_table` for state locking. Current Terraform documentation marks DynamoDB-based S3 backend locking as deprecated, so the example was changed to S3 lockfile locking with `use_lockfile = true`, the Terraform version constraint was raised to `>= 1.10.0`, and the IAM permission comment was updated for S3 lockfile permissions.
- The secrets example claimed that reading database credentials from AWS Secrets Manager meant the password was not stored in Terraform state as plaintext. Terraform documentation states that state and plan files can contain sensitive resource attributes and values. The example was changed to use `manage_master_user_password = true` so RDS manages the password in Secrets Manager, and the surrounding text now warns that Terraform state still needs protection.
- The GitHub Actions examples used `hashicorp/setup-terraform@v3`. The action's current documentation uses `hashicorp/setup-terraform@v4`, so the examples were updated to v4.

## Review Notes
The remaining examples are illustrative and omit supporting resources such as subnet groups, referenced security groups, provider configuration, and module internals. That is acceptable for a best-practices guide, but complete runnable Terraform would need those dependencies defined.
