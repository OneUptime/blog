# Validation Summary: How to Use Assertions in OpenTofu Test Run Blocks

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- OpenTofu test framework (`tofu test`)
- AWS provider example resources (`aws_vpc`, `aws_instance`, `aws_s3_bucket`, `aws_db_instance`)

## Sources Consulted
- OpenTofu docs: `tofu test` command reference - https://opentofu.org/docs/cli/commands/test/
- Terraform Registry: `aws_vpc` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- Terraform Registry: `aws_instance` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform Registry: `aws_db_instance` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform Registry: `aws_s3_bucket` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket

## Issues Found
- The introduction said `run` block assertions validate attributes only after apply. OpenTofu documents that `assert` blocks are evaluated after either a `plan` or an `apply`, so I corrected that wording in the introduction and summary.
- The test-file structure section said test files live alongside configuration files, but the current OpenTofu docs support both flat layouts and a separate `tests` directory. I corrected the location wording to match the documented layouts and the article's own `tests/networking.tftest.hcl` example.
- The summary said multiple `run` blocks build "stateful test sequences." OpenTofu documents multiple `run` blocks and passing outputs from earlier runs into later ones, but this wording overstated shared persistent state semantics, so I reworded it to describe structuring related test cases.

## Review Notes
- Current OpenTofu documentation also supports `.tofutest.hcl` and `.tofutest.json` test files, with `.tofutest.*` taking precedence over `.tftest.*` when both share the same base name. The post remains valid using `.tftest.hcl`.
- `tofu test` is typically run after `tofu init` in the module under test. The commands in the post are still valid, but initialization is a practical prerequisite for first use.
