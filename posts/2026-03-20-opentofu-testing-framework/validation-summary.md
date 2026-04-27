# Validation Summary: How to Set Up the OpenTofu Testing Framework

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (1.6+)
- HCL (HashiCorp Configuration Language)
- OpenTofu native testing framework (`.tftest.hcl` / `.tofutest.hcl`)
- Mock providers / `mock_provider` / `mock_resource`
- AWS provider (`aws_instance`) used as illustrative example
- AWS environment variables (`AWS_PROFILE`, `AWS_DEFAULT_REGION`)
- `TF_VAR_*` environment variables

## Sources Consulted
- [OpenTofu `tofu test` command documentation](https://opentofu.org/docs/cli/commands/test/)
- [OpenTofu testing framework / mock providers](https://opentofu.org/docs/cli/commands/test/) (mock_provider, mock_resource, defaults block)
- OpenTofu PR #1772 — "add mock providers for testing framework" (https://github.com/opentofu/opentofu/pull/1772)
- OpenTofu 1.6 release notes (introduced native testing framework)
- AWS Terraform/OpenTofu provider docs for `aws_instance` (attributes `public_ip`, `private_ip`, `instance_state`, `tags`, `instance_type`)

## Issues Found
- **Incorrect CLI usage for running a specific test file.** The post originally used `tofu test tests/unit.tftest.hcl` and `tofu test tests/integration.tftest.hcl` as if a test file could be passed as a positional argument. Per the official `tofu test` documentation, the command does not accept a positional file argument; you must use the `-filter=` option to target a specific test file. Both occurrences were fixed to `tofu test -filter=tests/unit.tftest.hcl` and `tofu test -filter=tests/integration.tftest.hcl` respectively.

## Review Notes
- File extensions `.tftest.hcl` and `.tofutest.hcl` are both valid; when both with the same base name exist in a directory, OpenTofu prioritizes `.tofutest.hcl` and ignores `.tftest.hcl`. The post does not need to mention this nuance, but readers mixing both extensions should be aware.
- `mock_provider` and `mock_resource` blocks (with the `defaults = {}` map) are supported in OpenTofu 1.7+. The post states a 1.6+ prerequisite, which is correct for the basic testing framework but the mock-provider example specifically requires 1.7 or later. This is a minor caveat worth noting in a future revision but does not constitute a technical error in the example itself.
- The `-test-directory`, `-verbose`, and `-var` flags shown are all valid `tofu test` options.
- `aws_instance` exposes `instance_state`, `public_ip`, `private_ip`, and `tags` as attributes; the assertions referencing these are accurate.
- `TF_VAR_<name>` env vars and standard AWS SDK env vars (`AWS_PROFILE`, `AWS_DEFAULT_REGION`) are correctly used.
