# Validation Summary: How to Replace Complex Dynamic Blocks with Modules

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform dynamic blocks
- Terraform modules
- AWS provider resources for Elastic Load Balancing

## Sources Consulted
- Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform type constraints and optional object attributes documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform validate command documentation: https://developer.hashicorp.com/terraform/cli/commands/validate
- Terraform init command documentation: https://developer.hashicorp.com/terraform/cli/commands/init
- AWS provider `aws_lb` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- AWS provider `aws_lb_listener` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener

## Issues Found
- The initial `aws_lb` example set `subnets` while also conditionally generating `subnet_mapping` blocks. The AWS provider documents `subnets` and `subnet_mapping` as alternative ways to attach subnets, so the example could produce an invalid configuration when `var.subnet_mappings` is set. I changed `subnets` to be set only when `var.subnet_mappings` is null.
- The testing section said to run only `terraform validate`. Official Terraform documentation states validation requires an initialized working directory with referenced plugins and modules installed. I changed the instruction to run `terraform init -backend=false` before `terraform validate`.

## Review Notes
- The module examples use `optional(...)` object attributes, which are current Terraform syntax. Users on older Terraform versions should ensure their Terraform version supports optional object attributes.
- The AWS listener action examples use valid current action types and nested block names for `forward`, `redirect`, and `fixed-response` actions.
