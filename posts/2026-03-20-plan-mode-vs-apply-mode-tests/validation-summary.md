# Validation Summary: Plan Mode vs Apply Mode in OpenTofu Tests

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- `tofu test`
- `tofu plan`
- OpenTofu test files (`.tftest.hcl` / `.tofutest.hcl`)
- OpenTofu `run` blocks
- Mock providers in OpenTofu tests
- OpenTofu state inspection commands

## Sources Consulted
- OpenTofu docs: `tofu test` command and test file structure - https://opentofu.org/docs/cli/commands/test/
- OpenTofu docs: `tofu plan` command - https://opentofu.org/docs/cli/commands/plan/
- OpenTofu docs: `tofu state list` command - https://opentofu.org/docs/cli/commands/state/list/
- OpenTofu docs: `uuid` function - https://opentofu.org/docs/language/functions/uuid/
- OpenTofu docs: function call timing for `uuid` and related functions - https://opentofu.org/docs/language/expressions/function-calls/

## Issues Found
- The post described plan mode as validating configuration without provisioning infrastructure, which could be read as implying no provider interaction. I tightened that wording to say plan mode validates without applying changes, which matches the documented `tofu plan` behavior.
- The plan mode limitations were too absolute about IAM errors and API rate limits. I revised them to clarify that plan mode can still miss issues that only appear during create or update operations.
- The cost section said cleanup happens after each test file completes, but the current OpenTofu test docs describe cleanup after each `run` block completes. I corrected that lifecycle detail.
- The idempotency example used `plan.changes.add`, `plan.changes.change`, and `plan.changes.remove` inside a test `assert`. Current OpenTofu test docs do not document a `plan` object for assertions and instead require assertions to reference resources, data sources, variables, outputs, or modules from the code under test. I replaced that snippet with the documented `tofu plan -detailed-exitcode` workflow for checking whether changes remain after an apply.
- The recommendation table said computed attribute values require `apply`, which contradicted the earlier explanation that plan mode can validate values derived from variables and locals. I narrowed that row to values only known after apply.
- The cleanup best-practice suggested verifying with `tofu state list`, but that command is documented as listing resources in a state file rather than validating test cleanup. I removed that guidance and kept the documented cleanup/cost caveat instead.

## Review Notes
- The `mock_provider` example aligns with current OpenTofu testing docs.
- The `uuid()` examples are valid, but OpenTofu documents that `uuid()` returns a new value on each call and can create spurious diffs when used directly in resource arguments. In this post it is only used to generate unique test input values.
