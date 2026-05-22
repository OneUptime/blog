# Validation Summary: How to Use Workspaces with Dynamic Provider Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI workspaces
- Terraform provider configuration
- Terraform variables, locals, outputs, and check blocks
- AWS Terraform Provider
- Google Cloud Terraform Provider
- AzureRM Terraform Provider

## Sources Consulted
- Terraform provider block reference: https://developer.hashicorp.com/terraform/language/providers/configuration
- Terraform provider requirements: https://developer.hashicorp.com/terraform/language/providers/requirements
- Terraform CLI workspaces overview: https://developer.hashicorp.com/terraform/cli/workspaces
- Terraform workspace select command: https://developer.hashicorp.com/terraform/cli/commands/workspace/select
- Terraform plan command: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform check block reference: https://developer.hashicorp.com/terraform/language/block/check
- AWS provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- AWS VPC peering connection accepter resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_peering_connection_accepter
- Google provider documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs
- Google compute instance resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance
- AzureRM provider documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs

## Issues Found
- The introduction incorrectly said Terraform does not let you use variables in provider blocks directly. Terraform provider arguments can use expressions, including variables and locals, as long as the referenced values are known before apply. Updated the wording to match Terraform's provider configuration rules.
- The multi-cloud section said workspaces can determine which providers get configured. Terraform requires provider blocks to be declared explicitly; the workspace logic can select resource creation and provider argument values, not dynamically create provider blocks. Updated the wording.
- The multi-cloud map used different object shapes for AWS and GCP entries, and the Google provider expression referenced `local.config.project`. Added `project = null` to AWS entries so the object shape is consistent.
- The AWS instance example used a hard-coded AMI ID that is region-specific and would not work across the configured AWS regions. Replaced it with a conditional `aws_ami` data source lookup and used the selected AMI ID.
- The validation section said `check` blocks catch errors early. Terraform check blocks report warnings and continue rather than blocking the plan or apply. Updated the wording to say they warn about configuration errors.
- The debugging command used `terraform plan -target=null_resource.debug`, but no `null_resource.debug` was declared and targeting a nonexistent address would fail. Replaced it with a plain `terraform plan`.
- Added a limitation note that CLI workspaces are not ideal for complex deployments requiring separate credentials and access controls, matching Terraform's workspace guidance.

## Review Notes
Terraform is not installed in this environment, so I could not run `terraform validate` locally. The review was performed against official Terraform, AWS provider, Google provider, and AzureRM provider documentation.
