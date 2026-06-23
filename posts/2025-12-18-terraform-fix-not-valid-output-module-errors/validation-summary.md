# Validation Summary: How to Fix 'Not a valid output for module' Errors in Terraform

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Terraform configuration language
- Terraform modules and child module outputs
- Terraform CLI (`init`, `validate`, `console`, `state list`, `apply`)
- HCL output blocks, `count`, `for_each`, `one`, and `try`

## Sources Consulted
- HashiCorp Developer: Use outputs to expose module data - https://developer.hashicorp.com/terraform/language/values/outputs
- HashiCorp Developer: References to Named Values - https://developer.hashicorp.com/terraform/language/expressions/references
- HashiCorp Developer: Use modules in your configuration - https://developer.hashicorp.com/terraform/language/modules/configuration
- HashiCorp Developer: Initialize the Working Directory - https://developer.hashicorp.com/terraform/cli/init
- HashiCorp Developer: terraform init command reference - https://developer.hashicorp.com/terraform/cli/commands/init
- HashiCorp Developer: terraform console command reference - https://developer.hashicorp.com/terraform/cli/commands/console
- HashiCorp Developer: terraform state list command reference - https://developer.hashicorp.com/terraform/cli/commands/state/list
- HashiCorp Developer: terraform validate command reference - https://developer.hashicorp.com/terraform/cli/commands/validate
- HashiCorp Developer: one function - https://developer.hashicorp.com/terraform/language/functions/one
- HashiCorp Developer: try function - https://developer.hashicorp.com/terraform/language/functions/try
- Terraform Registry: terraform-aws-modules/rds/aws outputs - https://registry.terraform.io/modules/terraform-aws-modules/rds/aws/latest

## Issues Found
- The "Module Not Yet Applied" section incorrectly stated that child module outputs are not available until the module is applied. Terraform determines child module output names from the module configuration; values may be unknown during planning, but a missing output-name error is not fixed by applying resources first. Replaced this with the accurate case where a remote or registry module must be initialized or reinitialized so Terraform can download and inspect its source.
- The undeclared module error example used the wrong diagnostic heading and message. Updated it to "Reference to undeclared module" with wording that matches Terraform's current diagnostic style.
- The `terraform state list` debugging section said it checks resources and outputs in state. Official documentation states that `terraform state list` lists resources in state, not output values. Updated the wording to say it checks module resources.

## Review Notes
Terraform CLI is not installed in this workspace, so command behavior was verified against official HashiCorp documentation rather than local `terraform --help` output. The examples using `one()` require Terraform v0.15 or later, which is acceptable for current Terraform versions.
