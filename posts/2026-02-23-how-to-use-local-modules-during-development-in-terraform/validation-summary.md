# Validation Summary: How to Use Local Modules During Development in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform modules
- Terraform local and Git module sources
- Terraform CLI commands: `init`, `validate`, `plan`, `apply`, `destroy`, `test`
- Terraform override files
- Terraform native test framework
- HCL configuration
- Git

## Sources Consulted
- Terraform module block reference: https://developer.hashicorp.com/terraform/language/block/module
- Terraform modules overview: https://developer.hashicorp.com/terraform/language/modules
- Terraform local module tutorial: https://developer.hashicorp.com/terraform/tutorials/modules/module-create
- Terraform override files documentation: https://developer.hashicorp.com/terraform/language/files/override
- Terraform test framework documentation: https://developer.hashicorp.com/terraform/language/tests
- Terraform test command reference: https://developer.hashicorp.com/terraform/cli/commands/test
- Terraform init command reference: https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform local backend documentation: https://developer.hashicorp.com/terraform/language/backend/local

## Issues Found
- The post said local modules use relative paths and that Terraform recognizes local sources when they start with `./` or `../`. Terraform also supports absolute local paths, though relative paths are the portable recommended form. Updated the wording to describe portable relative local paths more precisely.
- The standalone `modules/networking/tests/main.tf` example used `random_id` but only declared the AWS provider in `required_providers`. Added an explicit `hashicorp/random` provider requirement so the example fully declares the providers it uses.

## Review Notes
- Terraform CLI is not installed in this environment, so command behavior was verified against official Terraform CLI documentation rather than local `terraform --help` output.
- The `terraform test` example is version-appropriate: the native test framework is documented as available in Terraform v1.6.0 and later, and test files in the default `tests` directory are discovered when running `terraform test` from the module root.
