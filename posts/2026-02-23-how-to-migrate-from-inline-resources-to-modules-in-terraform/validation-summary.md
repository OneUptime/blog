# Validation Summary: How to Migrate from Inline Resources to Modules in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform configuration language
- Terraform modules
- Terraform state management
- Terraform `moved` blocks
- Terraform CLI `state mv`, `state pull`, `init`, and `plan`
- HashiCorp AWS provider resources for VPC networking

## Sources Consulted
- HashiCorp Terraform documentation: Refactor modules - https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- HashiCorp Terraform documentation: `moved` block reference - https://developer.hashicorp.com/terraform/language/block/moved
- HashiCorp Terraform documentation: `terraform state mv` command - https://developer.hashicorp.com/terraform/cli/commands/state/mv
- HashiCorp Terraform documentation: `terraform state` commands - https://developer.hashicorp.com/terraform/cli/commands/state
- HashiCorp Terraform documentation: Module block reference - https://developer.hashicorp.com/terraform/language/block/module
- HashiCorp Terraform AWS provider documentation: `aws_vpc` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- HashiCorp Terraform AWS provider documentation: `aws_subnet` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- HashiCorp Terraform AWS provider documentation: `aws_internet_gateway` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/internet_gateway
- HashiCorp Terraform AWS provider documentation: `aws_route_table` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table

## Issues Found
- The description said the guide used imports, but the post does not show or require Terraform imports. Changed it to refer to moved blocks instead.
- The manual `terraform state mv` workflow initialized the module only after moving state. Terraform documentation requires running `terraform init` after adding or changing a module `source`, so the `terraform init` step was moved before the state move commands.
- The moved-block section said to run `terraform plan` directly. Updated it to mention running `terraform init` first when a new module source was added.
- The checklist recommended removing moved blocks after one successful apply. HashiCorp documents that removing moved blocks can be a breaking change, especially for shared modules. Updated the guidance to keep moved blocks in shared modules and only remove them later for private configurations after all workspaces have applied.
- The output example referenced `module.networking.vpc_id`, but the module snippet did not define that output. Added a minimal `modules/networking/outputs.tf` example exposing `aws_vpc.this.id`.

## Review Notes
The Terraform and AWS provider snippets are syntactically valid for the documented resources. The migration may still produce intentional tag changes because the example changes subnet Name tags from `production-public-a` and `production-public-b` to index-based names.
