# Validation Summary: How to Use Variables and Outputs in Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform configuration language
- Terraform input variables
- Terraform local values
- Terraform output values
- Terraform CLI variable assignment
- AWS provider resource examples

## Sources Consulted
- Terraform input variables documentation: https://developer.hashicorp.com/terraform/language/values/variables
- Terraform variable block reference: https://developer.hashicorp.com/terraform/language/block/variable
- Terraform type constraints documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform local values documentation: https://developer.hashicorp.com/terraform/language/values/locals
- Terraform output values documentation: https://developer.hashicorp.com/terraform/language/values/outputs
- Terraform sensitive data documentation: https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- Terraform CLI output command reference: https://developer.hashicorp.com/terraform/cli/commands/output
- Terraform built-in functions documentation: https://developer.hashicorp.com/terraform/language/functions
- Terraform cidrsubnet function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- AWS provider aws_instance resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider aws_vpc resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc

## Issues Found
- The variable precedence list incorrectly placed `TF_VAR_` environment variables as the highest-precedence source. Terraform's documented precedence gives environment variables lower precedence than `terraform.tfvars`, `terraform.tfvars.json`, auto-loaded tfvars files, and command-line `-var`/`-var-file` options. Updated the list to show defaults, then environment variables, then tfvars files, auto-loaded tfvars files, and CLI flags.
- The auto-loaded variable files entry only mentioned `*.auto.tfvars`. Updated it to include `*.auto.tfvars.json`, which Terraform also auto-loads in lexical order.

## Review Notes
Terraform was not installed in the local environment, so validation was performed against official Terraform and Terraform AWS provider documentation rather than by running `terraform validate`. The hard-coded AMI ID in the introductory AWS instance example is syntactically valid HCL but may not exist in every AWS account or region over time; using a data source is more robust for production examples.
