# Validation Summary: Passing Variables to OpenTofu Tests

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (`tofu test` command and the `.tftest.hcl` testing framework)
- Terraform (compatible test framework)
- HCL (HashiCorp Configuration Language)
- AWS provider (used in examples: VPC, EC2, S3, multi-region provider aliases)
- GitHub Actions (CI/CD example using a matrix strategy)

## Sources Consulted
- OpenTofu test command reference: https://opentofu.org/docs/cli/commands/test/
- Terraform tests language reference: https://developer.hashicorp.com/terraform/language/tests
- Terraform test CLI reference: https://developer.hashicorp.com/terraform/cli/commands/test
- Terraform v1.6 CHANGELOG (test framework GA, `-var`/`-var-file` introduced): https://github.com/hashicorp/terraform/blob/v1.6/CHANGELOG.md
- Terraform v1.7 CHANGELOG (functions allowed in `variables` and `provider` blocks of test files): https://github.com/hashicorp/terraform/blob/v1.7/CHANGELOG.md
- Terraform v1.9 CHANGELOG (provider `version` no longer permitted in `.tftest.hcl` provider blocks): https://github.com/hashicorp/terraform/blob/v1.9/CHANGELOG.md
- HashiCorp PR #33504: introduce `-var` / `-var-file` flags to `terraform test` (merged 2023-07-19)
- HashiCorp issue/PR #34204: functions in `variables`/`provider` blocks within test files

## Issues Found
No technical issues found. All seven verifiable claims check out:

1. The `.tftest.hcl` file extension is correct.
2. File-level `variables {}` blocks are valid in test files.
3. Per-run `variables {}` overrides inside `run` blocks are supported and follow the documented precedence rules.
4. The `tofu test -var=...` and `tofu test -var-file=...` CLI flags are supported (added to Terraform's test command in v1.6.0; documented for OpenTofu's `tofu test`).
5. The `expect_failures = [var.environment]` pattern with `command = plan` is the documented way to test that a variable validation rejects invalid input.
6. Calling `uuid()` inside a file-level `variables {}` block is valid in current OpenTofu and in Terraform >= 1.7.0.
7. Top-level `provider "aws" {}` blocks (including aliased providers) are supported in `.tftest.hcl` files.

## Review Notes
- **Version caveat for `uuid()` in `variables {}` blocks**: This works on current OpenTofu and Terraform 1.7+. On Terraform 1.6.x the test framework did not allow function calls inside file-level `variables`/`provider` blocks. Readers running pre-1.7 Terraform would need to upgrade. The post does not call this out explicitly; not strictly an error since the post targets OpenTofu, but a version note would help mixed-tool readers.
- **`expect_failures` scope**: The official docs note that `expect_failures` only absorbs failures from custom conditions (variable `validation`, pre/postconditions, `check` blocks) — not type-mismatch errors — and recommend pairing it with `command = plan` (which the post correctly does).
- **Provider version constraints**: Since Terraform 1.9, `version = "..."` is no longer valid inside `provider` blocks in `.tftest.hcl` files (it must live in the main configuration). The post does not include any such constraint, so it is not affected, but worth knowing if anyone extends these examples.
- **`uuid()` non-determinism**: The post's use of `uuid()` for a `bucket_prefix` is appropriate (a per-run unique prefix is exactly what's wanted). General Terraform guidance discourages `uuid()` in resource config because of plan instability — that warning does not apply here, since the value is consumed for naming inside a single test run.
