# Validation Summary: How to Handle Breaking Changes in Terraform Modules

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform modules
- Terraform moved blocks
- Terraform input variables, checks, and validation
- Terraform CLI
- Git tags
- Semantic Versioning

## Sources Consulted
- Terraform module refactoring and moved blocks: https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- Terraform moved block reference: https://developer.hashicorp.com/terraform/language/moved
- Terraform module sources and Git refs: https://developer.hashicorp.com/terraform/language/modules/sources
- Terraform variable validation and check blocks: https://developer.hashicorp.com/terraform/language/checks
- Terraform check block reference: https://developer.hashicorp.com/terraform/language/block/check
- Terraform plan command and `-detailed-exitcode`: https://developer.hashicorp.com/terraform/cli/commands/plan
- Semantic Versioning 2.0.0: https://semver.org/
- Git tagging documentation: https://git-scm.com/book/en/v2/Git-Basics-Tagging

## Issues Found
- The deprecated-variable fallback example set `compute_type` to `"t3.medium"` by default, so `coalesce(var.compute_type, var.instance_type, "t3.medium")` would never use the deprecated `instance_type` value. Changed `compute_type` to default to `null` so the fallback chain works as described.
- The post described input variable validation as a warning mechanism. Terraform variable validation is blocking when it fails, so this would prevent users from continuing to use the deprecated variable during the deprecation period. Replaced the example with a Terraform 1.5+ `check` block, which reports a warning and continues.
- The migration module example used `moved` blocks from a separate module to move objects under `module.vpc`, but Terraform modules may only make moved statements about their own objects and child-module objects. Reworded the strategy as a migration shim module and updated the example to move old resources into a child module from within the shim.

## Review Notes
The Terraform CLI was not installed in the local environment, so command behavior was checked against official Terraform CLI documentation instead of local `terraform --help` output.
