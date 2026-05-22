# Validation Summary: How to Understand Resource Addressing in Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform resource addressing
- Terraform CLI state commands
- Terraform CLI import
- Terraform CLI apply targeting and replacement
- Terraform modules
- Terraform `count` and `for_each` meta-arguments
- Terraform HCL references and splat expressions

## Sources Consulted
- Terraform Resource Address Reference: https://developer.hashicorp.com/terraform/cli/state/resource-addressing
- Terraform `state show` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/show
- Terraform `state list` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/list
- Terraform `import` command reference: https://developer.hashicorp.com/terraform/cli/commands/import
- Terraform `apply` command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform `plan` command reference, including resource targeting: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `for_each` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform references to named values: https://developer.hashicorp.com/terraform/language/expressions/references
- Terraform module block reference: https://developer.hashicorp.com/terraform/language/modules/syntax

## Issues Found
- The counted-resource example used `terraform state show aws_instance.web` to show the whole resource. Terraform's `state show` command requires an address that points to a single resource instance, so I changed this example to `terraform state list aws_instance.web`, which is the correct command for listing matching instances.
- The PowerShell quoting note did not cover `for_each` string keys. I added an example using escaped inner quotes, matching Terraform's official `state show` documentation.

## Review Notes
The post is technically accurate after the fixes. Terraform was not installed in the local environment, so command behavior was verified against official Terraform documentation rather than local `terraform --help` output.
