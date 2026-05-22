# Validation Summary: How to Use Local State Files in Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- Terraform local backend
- Terraform CLI workspaces
- Terraform state locking
- Terraform state backups
- AWS provider for Terraform

## Sources Consulted
- HashiCorp Terraform local backend documentation: https://developer.hashicorp.com/terraform/language/backend/local
- HashiCorp Terraform backend configuration documentation: https://developer.hashicorp.com/terraform/language/backend
- HashiCorp Terraform state locking documentation: https://developer.hashicorp.com/terraform/language/state/locking
- HashiCorp Terraform workspaces documentation: https://developer.hashicorp.com/terraform/language/state/workspaces
- HashiCorp Terraform dependency lock file documentation: https://developer.hashicorp.com/terraform/language/files/dependency-lock
- HashiCorp Terraform CLI init documentation: https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform AWS provider aws_instance resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS provider aws_ami data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami

## Issues Found
- The introductory `aws_instance` example used a hard-coded AMI ID. AMI IDs are region-specific and can become unavailable over time, so the example was changed to use the AWS provider's `aws_ami` data source to select the latest Amazon Linux 2023 AMI in `us-east-1`.
- The `.gitignore` example ignored `.terraform.lock.hcl`. Terraform's dependency lock file is intended to be committed so provider selections remain reproducible, so that ignore entry was removed and the surrounding comment was updated.

## Review Notes
- Terraform was not installed in the local environment, so CLI behavior was checked against official HashiCorp documentation rather than local `terraform --help` output.
- The local backend `path` and `workspace_dir` settings, workspace layout, backend reinitialization flow, state sensitivity warning, and filesystem-based locking explanation are consistent with current Terraform documentation.
