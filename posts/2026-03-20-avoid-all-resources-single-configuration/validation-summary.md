# Validation Summary: How to Avoid Putting All Resources in a Single Configuration

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- OpenTofu modules and state management
- AWS Systems Manager Parameter Store
- AWS provider for OpenTofu/Terraform-compatible configurations
- Infrastructure as Code

## Sources Consulted
- OpenTofu documentation: Files and Directories - https://opentofu.org/docs/language/files/
- OpenTofu documentation: Command: state list - https://opentofu.org/docs/cli/commands/state/list/
- OpenTofu documentation: Module Blocks - https://opentofu.org/docs/language/modules/syntax/
- OpenTofu documentation: Module Sources - https://opentofu.org/docs/v1.9/language/modules/sources/
- OpenTofu documentation: The terraform_remote_state Data Source - https://opentofu.org/docs/language/state/remote-state-data/
- Terraform Registry official AWS provider docs: `aws_ssm_parameter` data source - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssm_parameter
- Terraform Registry official AWS provider docs: `aws_ssm_parameter` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter
- Terraform Registry official AWS provider docs: `aws_security_group` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group

## Issues Found
- The "Signs You Need to Split" block was tagged as `hcl`, but its contents were plain prose bullets rather than valid HCL. I changed the fence to `text` so the post no longer presents invalid configuration syntax as executable code.

## Review Notes
- No further technical issues were found after the fix.
- The post's recommendation to prefer explicit publishing mechanisms such as SSM Parameter Store over `terraform_remote_state` is consistent with current OpenTofu guidance.
- OpenTofu CLI was not installed in the workspace, so command syntax was verified against official OpenTofu documentation rather than local `tofu ... --help` output.
