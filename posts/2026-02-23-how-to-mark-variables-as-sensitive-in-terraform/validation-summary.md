# Validation Summary: How to Mark Variables as Sensitive in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform input variables, outputs, validation blocks, state, and plan files
- Terraform CLI variable assignment with `TF_VAR_`, `-var`, and `-var-file`
- Terraform S3 backend
- AWS Provider resources for RDS, SSM Parameter Store, IAM, and CodeBuild
- AWS CodeBuild environment variables

## Sources Consulted
- HashiCorp Terraform input variables documentation: https://developer.hashicorp.com/terraform/language/values/variables
- HashiCorp Terraform sensitive values tutorial: https://developer.hashicorp.com/terraform/tutorials/configuration-language/sensitive-variables
- HashiCorp Terraform manage sensitive data documentation: https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- HashiCorp Terraform output block documentation: https://developer.hashicorp.com/terraform/language/block/output
- HashiCorp Terraform `terraform plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp AWS Provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- HashiCorp AWS Provider `aws_codebuild_project` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codebuild_project
- AWS CodeBuild `EnvironmentVariable` API documentation: https://docs.aws.amazon.com/codebuild/latest/APIReference/API_EnvironmentVariable.html
- OneUptime linked Terraform sensitive data post: https://oneuptime.com/blog/post/2026-01-27-terraform-sensitive-data/view

## Issues Found
- The post overstated Terraform's redaction behavior by saying sensitive values are hidden in all CLI output, logs, and error messages. Updated the wording to describe standard Terraform CLI output, plan/apply/destroy output, and Terraform log messages more precisely.
- The post said environment variable values "never touch disk." Updated this to the narrower and accurate claim that `TF_VAR_` assignment avoids creating a Terraform variable file that could be committed to version control.
- The S3 backend example used `dynamodb_table` for state locking. HashiCorp now documents DynamoDB-based locking as deprecated, so the example was updated to `use_lockfile = true`.
- The CodeBuild example passed a GitHub token as a `PLAINTEXT` environment variable. AWS strongly discourages `PLAINTEXT` for sensitive values, so the example now stores the token in an SSM `SecureString` parameter and references it from CodeBuild with `type = "PARAMETER_STORE"`.
- The CodeBuild example referenced an IAM role without showing it. Added the minimal assume-role document, IAM role, SSM parameter, and SSM read policy needed for the example to be coherent.

## Review Notes
Terraform CLI was not installed in the local environment, so command verification was performed against official HashiCorp CLI documentation rather than local `terraform --help` output. The post remains accurate as a conceptual guide, but modern Terraform also supports ephemeral and write-only patterns for reducing sensitive data in state and plan files; those are outside this post's current scope.
