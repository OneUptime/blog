# Validation Summary: How to Use .tftest.hcl Files in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- `tofu test`
- `.tftest.hcl` test files
- HCL configuration
- Provider mocks and test overrides

## Sources Consulted
- OpenTofu documentation: `tofu test` command and test file structure: https://opentofu.org/docs/cli/commands/test/
- OpenTofu documentation: `run.expect_failures`, `run.command`, providers, mock providers, and override blocks: https://opentofu.org/docs/cli/commands/test/
- GitHub author profile link: https://github.com/nawazdhandala

## Issues Found
1. The post said a `.tftest.hcl` file can contain only three top-level block types. OpenTofu also supports `mock_provider`, `override_resource`, `override_data`, and `override_module` at the top level, so the table was expanded.
2. The `provider` block was described as handling mock definitions. OpenTofu uses `mock_provider` for provider mocks, so the provider description was narrowed and a separate `mock_provider` row was added.
3. The `command = plan` comment said plan mode cannot check resource attributes. OpenTofu's docs show plan-mode assertions against resource attributes that are known during planning, so the wording was corrected to note that plan avoids creating resources while apply-only values may be unknown.
4. The `expect_failures` example omitted `command = plan` for a variable validation test and described the entry as a named validation rule. The example now matches the documented pattern and refers to the variable validation reference.
5. The file placement section omitted the default `tests/` directory and implied `-test-directory` was part of the default search behavior. It now states that OpenTofu searches the current directory and `tests/` by default, and that `-test-directory=path` selects a different test directory while still searching the current directory.

## Review Notes
The OpenTofu CLI was not installed in this environment, so validation was performed against the current official OpenTofu documentation rather than by running `tofu test` locally.
