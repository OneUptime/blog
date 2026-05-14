# Validation Summary: How to Configure Terraform Variables and Outputs on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform input variables
- Terraform variable validation
- Terraform local values
- Terraform output values
- Terraform CLI
- HCL
- AWS provider `aws_instance` resource
- RHEL 9 on AWS

## Sources Consulted
- HashiCorp Terraform input variables documentation: https://developer.hashicorp.com/terraform/language/values/variables
- HashiCorp Terraform local values documentation: https://developer.hashicorp.com/terraform/language/values/locals
- HashiCorp Terraform output values documentation: https://developer.hashicorp.com/terraform/language/values/outputs
- HashiCorp Terraform `terraform output` command reference: https://developer.hashicorp.com/terraform/cli/commands/output
- HashiCorp AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance

## Issues Found
- The `terraform output -raw instance_ids` command was incorrect because `instance_ids` is a list output and Terraform's `-raw` flag only supports values Terraform can convert directly to strings, such as string, number, and boolean values. Changed the example to `terraform output -json instance_ids | jq -r '.[0]'` so it correctly extracts an item from the list for scripting.

## Review Notes
Terraform CLI is not installed in this workspace, so local `terraform validate` could not be run. The reviewed snippets are consistent with current HashiCorp documentation. The `aws_instance` example assumes the surrounding AWS provider configuration and `data.aws_ami.rhel9` data source exist elsewhere in the Terraform configuration.
