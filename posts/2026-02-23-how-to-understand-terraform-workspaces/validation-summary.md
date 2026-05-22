# Validation Summary: How to Understand Terraform Workspaces

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform CLI workspaces
- Terraform state and backends
- Terraform S3 backend
- HCP Terraform / Terraform Cloud workspaces
- Terraform AWS provider
- AWS EC2 and S3 resources

## Sources Consulted
- HashiCorp Terraform CLI workspace overview: https://developer.hashicorp.com/terraform/cli/workspaces
- HashiCorp Terraform state workspaces documentation: https://docs.hashicorp.com/terraform/language/state/workspaces
- HashiCorp Terraform workspace command reference: https://docs.hashicorp.com/terraform/cli/commands/workspace
- HashiCorp Terraform `workspace new` command reference: https://developer.hashicorp.com/terraform/cli/commands/workspace/new
- HashiCorp Terraform `workspace select` command reference: https://developer.hashicorp.com/terraform/cli/commands/workspace/select
- HashiCorp Terraform `workspace delete` command reference: https://developer.hashicorp.com/terraform/cli/commands/workspace/delete
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform AWS provider `aws_ami` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- Terraform AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Referenced OneUptime follow-up post: https://oneuptime.com/blog/post/2026-02-23-how-to-create-a-new-workspace-with-terraform-workspace-new/view

## Issues Found
- The post said a new workspace "only creates a new, empty state file." HashiCorp documents this as creating a new, empty workspace with isolated state, and the state object may not exist as a local file until Terraform writes state. Changed the wording to avoid over-specifying the storage artifact.
- The post mentioned workspace-specific variable files without clarifying that Terraform does not automatically select them just because a workspace is active. Changed the wording to "manually selected workspace-specific variable files."
- The workspace deletion quick reference only mentioned switching away first. HashiCorp documents that a workspace must also not be tracking resources unless `-force` is used. Updated the comment to include that condition.
- The practical example used a hardcoded, old AMI ID. Replaced it with an `aws_ami` data source that selects a current Amazon Linux 2023 AMI owned by Amazon, then uses `data.aws_ami.amazon_linux.id` in the `aws_instance` resource.

## Review Notes
Terraform was not installed in the local environment, so CLI behavior was verified against official HashiCorp documentation rather than local `terraform` command output. The S3 backend example is accurate for the default `workspace_key_prefix` of `env:` for non-default workspaces.
