# Validation Summary: How to Use Terraform State Commands (mv, rm, list) for AWS Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform state management
- AWS resources managed by Terraform
- jq for JSON inspection

## Sources Consulted
- Terraform state commands reference: https://developer.hashicorp.com/terraform/cli/commands/state
- Terraform state list command reference: https://developer.hashicorp.com/terraform/cli/commands/state/list
- Terraform state show command reference: https://developer.hashicorp.com/terraform/cli/commands/state/show
- Terraform state mv command reference: https://developer.hashicorp.com/terraform/cli/commands/state/mv
- Terraform state rm command reference: https://developer.hashicorp.com/terraform/cli/commands/state/rm
- Terraform state pull command reference: https://developer.hashicorp.com/terraform/cli/commands/state/pull
- Terraform state push command reference: https://developer.hashicorp.com/terraform/cli/commands/state/push
- Terraform state replace-provider command reference: https://developer.hashicorp.com/terraform/cli/commands/state/replace-provider
- Terraform module refactoring / moved blocks documentation: https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- Terraform resource block reference: https://developer.hashicorp.com/terraform/language/block/resource

## Issues Found
- Corrected the `terraform state replace-provider` example for a Terraform 0.13-style AWS provider namespace migration. The legacy provider address should be `registry.terraform.io/-/aws`, and the target fully-qualified provider address should be `registry.terraform.io/hashicorp/aws`.
- Replaced raw `...` placeholders inside HCL resource blocks with comments. Raw ellipses are not valid HCL syntax, while comment placeholders keep the illustrative snippet syntactically valid.

## Review Notes
Terraform v1.1 and later supports `moved` blocks for many refactoring workflows, and HashiCorp generally recommends configuration-driven refactoring when practical. The post's `terraform state mv` guidance remains valid for explicit state operations.
