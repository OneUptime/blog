# Validation Summary: How to Handle Large Configuration Files in Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform configuration language
- Terraform modules
- Terraform state and remote state
- Terraform CLI
- AWS provider resources
- Terragrunt
- TFLint
- terraform-docs

## Sources Consulted
- Terraform files and configuration structure: https://developer.hashicorp.com/terraform/language/files
- Terraform modules overview and module sources: https://developer.hashicorp.com/terraform/language/modules and https://developer.hashicorp.com/terraform/language/modules/sources
- Terraform local values and variables: https://developer.hashicorp.com/terraform/language/values and https://developer.hashicorp.com/terraform/language/values/variables
- Terraform remote state data source: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- Terraform moved blocks and refactoring: https://developer.hashicorp.com/terraform/language/moved and https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- Terraform plan command options: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform state documentation: https://developer.hashicorp.com/terraform/language/state
- AWS provider resource documentation for VPC, subnet, internet gateway, and EC2 instance resources: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terragrunt documentation: https://terragrunt.gruntwork.io/
- TFLint documentation: https://github.com/terraform-linters/tflint
- terraform-docs documentation: https://terraform-docs.io/user-guide/introduction/

## Issues Found
- The performance section recommended `terraform plan -target=module.vpc` as a focused development workflow. Terraform's official documentation says `-target` is for exceptional circumstances, such as recovery or working around Terraform limitations, and is not recommended for routine operations. Updated the text to reflect that caveat while keeping the example.
- The `terraform plan -refresh=false` guidance did not mention that disabling refresh can miss external changes. Updated the text to say it should be used only for faster speculative plans when state is known to be current, and that a normal plan should run before applying.
- The data source caching note implied that local values cache data source calls. Terraform locals name and reuse expressions, but duplicate data source blocks are still separate data source declarations. Updated the text to recommend declaring a data source once and reusing its results through references or locals.

## Review Notes
The Terraform examples are illustrative and depend on omitted variable, provider, backend, and module definitions. The snippets are syntactically consistent with Terraform language patterns and current documentation, but they are not complete standalone configurations.
