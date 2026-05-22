# Validation Summary: How to Refactor Terraform Code into Modules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform modules
- Terraform moved blocks
- Terraform state commands
- Terraform AWS provider resources
- Infrastructure as Code

## Sources Consulted
- Terraform moved block reference: https://developer.hashicorp.com/terraform/language/block/moved
- Terraform module refactoring documentation: https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- Terraform module block reference: https://developer.hashicorp.com/terraform/language/block/module
- Terraform plan command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform apply command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform state mv command reference: https://developer.hashicorp.com/terraform/cli/commands/state/mv
- Terraform AWS provider aws_vpc resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- OneUptime linked reference page, verified reachable: https://oneuptime.com/blog/post/2026-02-23-terraform-moved-block-refactoring-modules/view

## Issues Found
- The post instructed readers to run `terraform plan` immediately after adding a new local module block. Terraform's module documentation says to run `terraform init` after modifying a module `source` so Terraform can install or update the local module. Updated Step 4 to run `terraform init` before `terraform plan`.

## Review Notes
- Terraform was not installed in the review environment, so CLI behavior was checked against official Terraform command documentation rather than local `terraform --help` output.
- The `moved` block examples align with Terraform v1.1 and later. The count and `for_each` examples correctly use explicit instance addresses when changing indexing.
