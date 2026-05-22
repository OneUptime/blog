# Validation Summary: How to Handle Workspace Variables vs Terraform Variables in HCP

## Status
validated

## Post Type
Guide

## Technologies Covered
- HCP Terraform workspace variables
- Terraform input variables and variable precedence
- HCP Terraform workspace variables API
- HCP Terraform variable sets API
- Terraform CLI environment variables
- Terraform AWS, AzureRM, and Google providers

## Sources Consulted
- HashiCorp Developer: Manage variables and variable sets in HCP Terraform, https://developer.hashicorp.com/terraform/cloud-docs/variables/managing-variables
- HashiCorp Developer: Workspace variables API reference, https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspace-variables
- HashiCorp Developer: Variable sets API reference, https://developer.hashicorp.com/terraform/enterprise/api-docs/variable-sets
- HashiCorp Developer: Use input variables to add module arguments, https://developer.hashicorp.com/terraform/language/values/variables
- HashiCorp Developer: Terraform CLI environment variables reference, https://developer.hashicorp.com/terraform/cli/config/environment-variables
- Terraform Registry: AWS provider documentation, https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform Registry: AzureRM provider documentation, https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- Terraform Registry: Google provider documentation, https://registry.terraform.io/providers/hashicorp/google/latest/docs

## Issues Found
- The post said HCP Terraform environment variables are not available to Terraform code directly. I updated this to note Terraform's `TF_VAR_` convention, because Terraform can use environment variables named `TF_VAR_name` as input variable values.
- The variable precedence list omitted `TF_VAR_` environment variables and variable set precedence details, and it placed workspace variables too high for CLI-driven runs. I updated the list to reflect HCP Terraform's documented precedence for priority variable sets, CLI arguments, local `TF_VAR_` variables, workspace variables, non-priority variable sets, `.auto.tfvars`, `terraform.tfvars`, and defaults.

## Review Notes
The Terraform snippets are illustrative and reference resources such as `aws_security_group.app` and `aws_iam_role.lambda` that are not defined in the post. That is acceptable for the surrounding examples, but a future full working tutorial would need to include those dependencies.
