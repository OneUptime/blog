# Validation Summary: How to Use Terraform Workspaces for Multiple Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI workspaces
- Terraform configuration language
- Terraform S3 backend
- AWS provider resources for EC2, S3, and RDS
- GitHub Actions CI/CD workflows
- OneUptime monitoring

## Sources Consulted
- Terraform CLI workspace documentation: https://developer.hashicorp.com/terraform/cli/workspaces
- Terraform workspace select command reference: https://developer.hashicorp.com/terraform/cli/commands/workspace/select
- Terraform state workspaces documentation: https://developer.hashicorp.com/terraform/language/state/workspaces
- Terraform CLI environment variables reference: https://developer.hashicorp.com/terraform/cli/config/environment-variables
- Terraform plan command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- OneUptime official website: https://oneuptime.com/

## Issues Found
- The RDS example used `var.instance_type` for `aws_db_instance.instance_class`, but the example variable values were EC2 instance types such as `t3.small`. RDS instance classes use values such as `db.t3.small`. Added a separate `db_instance_class` variable, populated it in each `.tfvars` example, and updated the RDS resource to use it.
- The S3 backend example used `dynamodb_table` for locking. Current Terraform S3 backend documentation marks DynamoDB-based locking as deprecated and recommends S3 lockfile-based locking. Replaced `dynamodb_table = "terraform-locks"` with `use_lockfile = true`.
- The S3 backend comments said the workspace name is appended to the key automatically. For the S3 backend, the default workspace uses `key` directly, while non-default workspaces use `<workspace_key_prefix>/<workspace_name>/<key>`. Updated the explanation and comments to reflect that behavior.

## Review Notes
- Terraform was not installed in the local environment, so CLI behavior was verified against official Terraform documentation rather than local `terraform --help` output.
- Some AWS resource snippets are illustrative and omit surrounding provider/data source configuration and production-hardening settings. They are acceptable as focused examples, but a full deployable module would need the missing context.
