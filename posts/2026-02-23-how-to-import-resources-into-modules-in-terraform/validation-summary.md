# Validation Summary: How to Import Resources into Modules in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform modules
- Terraform import blocks
- Terraform state management
- Terraform moved blocks
- Terraform `for_each`
- AWS provider resources: `aws_instance`, `aws_eip`, `aws_vpc`

## Sources Consulted
- Terraform CLI `import` command reference: https://developer.hashicorp.com/terraform/cli/commands/import
- Terraform import existing resources documentation: https://developer.hashicorp.com/terraform/language/import/single-resource
- Terraform module block reference: https://developer.hashicorp.com/terraform/language/modules/syntax
- Terraform `for_each` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform module refactoring and `moved` blocks documentation: https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- Terraform AWS provider `aws_eip` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip.html

## Issues Found
- The nested module example referenced `var.cidr_block` in the VPC module without showing the required variable declaration or how the value was passed through the parent module. Added `cidr_block` variable declarations and arguments so the example is internally consistent.
- The post said moved blocks can be removed after applying. HashiCorp's documentation warns that removing moved blocks can be a breaking change for shared or long-lived modules. Updated the guidance to keep moved blocks for shared modules and remove them only after every relevant workspace has applied the move.

## Review Notes
- Terraform was not installed in the local workspace, so commands could not be verified with local `terraform validate` or CLI help output. Syntax and behavior were checked against official HashiCorp documentation instead.
- The import block guidance is accurate for Terraform 1.5 and later, and the module and `for_each` resource address examples match Terraform's documented addressing behavior.
