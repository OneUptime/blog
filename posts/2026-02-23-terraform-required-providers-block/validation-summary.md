# Validation Summary: How to Use the Required Providers Block in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform providers
- HCL
- Terraform modules
- Terraform CLI
- Terraform dependency lock file

## Sources Consulted
- Terraform Provider Requirements documentation: https://developer.hashicorp.com/terraform/language/providers/requirements
- Terraform Version Constraints documentation: https://developer.hashicorp.com/terraform/language/expressions/version-constraints
- Terraform Providers Within Modules documentation: https://developer.hashicorp.com/terraform/language/modules/develop/providers
- Terraform Dependency Lock File documentation: https://developer.hashicorp.com/terraform/language/files/dependency-lock
- Terraform provider block reference: https://developer.hashicorp.com/terraform/language/block/provider
- Terraform init command reference: https://developer.hashicorp.com/terraform/cli/commands/init

## Issues Found
- The root module example used `version = "~> 5.31"` while the surrounding comment said it would provide `5.31.x`. Terraform's pessimistic constraint operator with two version components allows later minor versions in the same major release, such as `5.32`, but not `6.0`. I changed the example to `version = "~> 5.31.0"` so it correctly allows patch releases in the `5.31.x` range.
- The same section said the root module sets the "exact constraint." I changed this to "upper-bounded constraint" because the example uses a version range, while the dependency lock file records the exact resolved provider version.

## Review Notes
Terraform CLI was not installed in the local environment, so command behavior was verified against the official Terraform CLI documentation rather than local `terraform --help` output. The referenced OneUptime internal blog links were not externally validated beyond checking that their URL format is plausible.
