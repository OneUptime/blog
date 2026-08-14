# Validation Summary: Control State Sharing Between terraform test Run Blocks

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Terraform CLI
- Terraform test framework and `.tftest.hcl` files
- HCL `run`, `test`, `module`, `variables`, and `assert` blocks
- Terraform test state, alternate-module state, and `state_key`
- Run-output references and test dependencies
- Parallel test execution and cleanup
- Terraform providers, backends, and remote infrastructure

## Sources Consulted

- [Terraform tests](https://developer.hashicorp.com/terraform/language/tests)
- [Terraform v1.6 tests: original framework and module-state behavior](https://developer.hashicorp.com/terraform/language/v1.6.x/tests)
- [Terraform v1.11 tests: `state_key` behavior](https://developer.hashicorp.com/terraform/language/v1.11.x/tests)
- [Terraform v1.12 tests: parallel execution](https://developer.hashicorp.com/terraform/language/v1.12.x/tests#parallel-execution)
- [`terraform test` command reference](https://developer.hashicorp.com/terraform/cli/commands/test)
- [`terraform plan` command reference](https://developer.hashicorp.com/terraform/cli/commands/plan)
- [Terraform v1.15.8 test plan implementation](https://github.com/hashicorp/terraform/blob/v1.15.8/internal/moduletest/graph/plan.go)
- [Terraform v1.15.8 test apply implementation](https://github.com/hashicorp/terraform/blob/v1.15.8/internal/moduletest/graph/apply.go)
- [Write Terraform Tests tutorial](https://developer.hashicorp.com/terraform/tutorials/configuration-language/test)
- [Purpose of Terraform State](https://developer.hashicorp.com/terraform/language/state/purpose)
- [Providers Within Modules](https://developer.hashicorp.com/terraform/language/modules/develop/providers)
- [Terraform 1.6.0 release notes](https://github.com/hashicorp/terraform/releases/tag/v1.6.0)
- [Terraform 1.11.0 release notes](https://github.com/hashicorp/terraform/releases/tag/v1.11.0)
- [Terraform 1.12.0 release notes](https://github.com/hashicorp/terraform/releases/tag/v1.12.0)

## Issues Found

- The cleanup guidance said to tag every applied resource, but HashiCorp documents that not all resource types or providers support tags. Qualified both tagging recommendations with "where supported" and added provider-specific discovery rules for untaggable resources so the janitor guidance remains actionable.
- The parallel-execution guidance referred to unique "state paths." Terraform test state is in memory, and a `state_key` is an internal identifier rather than a backend path. Replaced this with "storage paths" to describe external resource identifiers that can actually collide across scenarios.

## Review Notes

All six HCL snippets are syntactically valid. The examples are intentionally partial and depend on matching variables, resources, and module outputs in the surrounding Terraform configuration. The version boundaries are correct: the current test framework is available in Terraform 1.6 and later, `state_key` requires Terraform 1.11 or later, and parallel run execution requires Terraform 1.12 or later. No deprecated Terraform test syntax was found.
