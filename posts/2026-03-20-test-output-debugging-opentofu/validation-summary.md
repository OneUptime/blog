# Validation Summary: How to Use Test Output for Debugging in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu test framework
- HCL test files
- JSON machine-readable UI output
- jq
- GitHub Actions

## Sources Consulted
- OpenTofu `tofu test` command documentation: https://opentofu.org/docs/cli/commands/test/
- OpenTofu machine-readable UI documentation: https://opentofu.org/docs/internals/machine-readable-ui/
- OpenTofu `tofu console` command documentation: https://opentofu.org/docs/cli/commands/console/
- OpenTofu `tofu plan` command documentation: https://opentofu.org/docs/cli/commands/plan/

## Issues Found
- The post described `tofu test -verbose` as assertion-level output. OpenTofu documents `-verbose` as printing the plan or state for each test run block, so the section and conclusion were updated to describe plan/state output instead.
- The verbose-mode example showed named assertion pass/fail lines, but OpenTofu assertion blocks do not have assertion labels and the documented verbose behavior is plan/state output. The example was adjusted to avoid implying assertion-level status lines.
- The JSON pass/fail counting example treated newline-delimited JSON UI events as an array. It was changed to read the documented `test_summary` event fields.
- The workflow used `tofu test -run=...`, but the current OpenTofu test command documentation lists `-filter=testfile` for selecting test files and does not document `-run`. The workflow now uses `-filter=tests/failing.tftest.hcl`.
- The plan-output section said a normal `tofu plan` shows the exact resource attributes assertions check. That can be inaccurate when tests use test-file variables, provider configuration, mocks, or overrides, so the wording now tells readers to match the test setup as closely as possible.
- The debug-output test comment implied the assertion prints output unconditionally. Assertion `error_message` text is only shown on failure, so the comment now says the debug output is included when the assertion fails.

## Review Notes
Local `tofu` was not installed in the review environment, so CLI behavior was verified against the official OpenTofu documentation rather than local `--help` output.
