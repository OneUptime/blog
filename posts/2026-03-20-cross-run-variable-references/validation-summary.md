# Validation Summary: How to Use Cross-Run Variable References in OpenTofu Tests

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (and the compatible Terraform test framework)
- HCL (HashiCorp Configuration Language)
- `.tftest.hcl` test files and `run` blocks
- AWS provider resources used as illustrative examples (`aws_vpc`, `aws_subnet`, `aws_instance`, `aws_db_instance`)

## Sources Consulted
- OpenTofu `tofu test` command documentation: https://opentofu.org/docs/cli/commands/test/
- Terraform tests language reference: https://developer.hashicorp.com/terraform/language/tests

## Issues Found
1. **Invalid cross-run resource attribute reference (Basic Output Reference Between Runs section).** The original example used `run.create_vpc.aws_vpc.main.id` to pull a value from a previous run. The OpenTofu/Terraform test framework only allows cross-run references to **outputs** of the prior run, not direct resource attributes. Changed the reference to `run.create_vpc.vpc_id` and updated the comment to clarify it goes through the configuration's output.
2. **Incorrect syntax claim in the Summary.** The summary listed `run.<block_label>.<resource_type>.<resource_name>.<attribute>` as a valid cross-run reference form. This syntax does not work — only outputs are accessible across runs. Updated the summary to reflect the single valid form (`run.<block_label>.<output_name>`) and noted that values must be exposed as outputs.

## Review Notes
- The use of `aws_vpc.main.id` inside the assertion of the `create_vpc` run block is technically valid: within a single `run` block's `assert`, resources defined in the configuration are addressable directly. The cross-run restriction only applies between `run` blocks.
- The `output.vpc_id` reference inside an assertion (Reference Module Outputs Between Runs) is correct — within a run block, outputs of the current run are referenced via `output.<name>`.
- The top-level `variables {}` block in the "Override Variables for Testing" example correctly applies to all runs unless overridden per-run.
- The "Testing Destroy Behavior" section title is slightly misleading — the example shown is really verifying a pre-destroy invariant via `plan`. It is technically correct (a `plan` after an `apply` will read state and the example checks an attribute), but readers wanting to test actual destroy behavior should also be aware of `command = destroy` as a separate option. No code change made because the snippet itself is valid.
