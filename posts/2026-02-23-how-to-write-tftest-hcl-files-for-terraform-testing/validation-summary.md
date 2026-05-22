# Validation Summary: How to Write .tftest.hcl Files for Terraform Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform test framework
- `.tftest.hcl` test files
- HCL
- Terraform CLI
- Terraform providers, modules, variables, assertions, and expected failures

## Sources Consulted
- HashiCorp Terraform Tests documentation: https://developer.hashicorp.com/terraform/language/tests
- HashiCorp Terraform test file documentation: https://developer.hashicorp.com/terraform/language/files/tests
- HashiCorp Terraform provider mocking documentation: https://developer.hashicorp.com/terraform/language/tests/mocking
- HashiCorp Terraform CLI `test` command reference: https://developer.hashicorp.com/terraform/cli/commands/test

## Issues Found
- The post described the guide as covering every `.tftest.hcl` block and the complete syntax, but current Terraform test files also support features such as the optional `test` block and Terraform 1.7+ mock and override blocks. I narrowed that language to "core" and "main" syntax.
- The file structure overview said all three listed top-level block types were optional. HashiCorp documents one or more `run` blocks for test files, while root-level `variables` and `provider` blocks are optional. I changed the wording to say useful test files contain one or more `run` blocks.
- The `expect_failures` section omitted data sources and did not mention that expected failures apply to user-defined custom conditions. I added data sources and the official caveat that other errors, such as type mismatches, still fail the test.
- The `expect_failures` section did not mention the single-checkable-object caveat for most validation failures. I added the caveat that lists are reliable mainly for check blocks because most other validation failures stop execution.
- The module section did not mention test `module` block restrictions. I added that test module blocks support `source` and `version`, and that `source` can point to local or registry modules.
- The provider section said test provider blocks override the module's provider configuration. I adjusted this to match HashiCorp's wording that test files can set or override required providers used during testing.
- The run-block reference section said run blocks execute sequentially without the default qualifier. I changed it to "By default" because Terraform also supports parallel execution.

## Review Notes
Terraform was not installed in the local workspace, so CLI behavior could not be checked with `terraform test --help` or by executing sample tests. The review used official HashiCorp documentation as the source of truth.
