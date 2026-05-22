# Validation Summary: How to Use Terraform Workspaces with Dynamic Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI workspaces
- Terraform configuration language (HCL)
- Terraform S3 backend
- Terraform validation preconditions
- AWS provider configuration
- AWS resources and data sources

## Sources Consulted
- Terraform CLI workspace command documentation: https://developer.hashicorp.com/terraform/cli/commands/workspace
- Terraform workspace state documentation: https://developer.hashicorp.com/terraform/language/state/workspaces
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform variable block reference: https://developer.hashicorp.com/terraform/language/block/variable
- Terraform validation documentation: https://developer.hashicorp.com/terraform/language/validate
- Terraform lifecycle meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform `terraform_data` resource documentation: https://developer.hashicorp.com/terraform/language/resources/terraform-data
- Terraform AWS provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- The backend section said each workspace can use a different backend key. In the S3 backend, the configured `key` is shared by the backend configuration and non-default workspaces are stored under `<workspace_key_prefix>/<workspace_name>/<key>`. Updated the section wording to describe workspace-aware backend paths instead.
- The S3 backend example used `dynamodb_table`, which current Terraform documentation marks as deprecated for state locking. Replaced it with `use_lockfile = true`, the current S3-native locking setting.
- The workspace-specific variable file example used `config/${terraform.workspace}.tfvars` in a shell command. `terraform.workspace` is a Terraform expression and is not available for shell interpolation. Changed the direct example to use `config/staging.tfvars` and kept the wrapper script pattern for dynamic selection.
- The validation guard used a `null_resource` with a `local-exec` provisioner and said it runs during plan. Provisioners run during apply, not plan. Replaced it with a `terraform_data` resource using a lifecycle `precondition`, which Terraform evaluates during planning when the condition is known.
- The variable validation alternative checked `terraform.workspace` inside a `project_name` variable validation block. Variable validation is intended to validate input variable values, not as a workspace guard. Removed that example in favor of the precondition-based guard.

## Review Notes
- Terraform CLI was not installed in the local workspace, so CLI behavior was verified against official Terraform documentation instead of local `terraform --help` output.
- The post uses AWS resources as illustrative snippets and omits surrounding resources such as AMI, load balancer, subnet, and availability zone data sources. That is acceptable for a focused tutorial, but a complete runnable example would need those declarations.
