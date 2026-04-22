# Validation Summary: How to Run Specific Test Cases in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- `tofu test`
- HCL test files
- Infrastructure as Code testing
- CLI filtering and JSON output

## Sources Consulted
- OpenTofu CLI `test` command documentation: https://opentofu.org/docs/cli/commands/test/
- OpenTofu basic CLI features and `-chdir` documentation: https://opentofu.org/docs/cli/commands/
- OpenTofu machine-readable UI documentation for `tofu test -json`: https://opentofu.org/docs/internals/machine-readable-ui/
- OpenTofu v1.11.6 `test` command source: https://github.com/opentofu/opentofu/blob/v1.11.6/internal/command/test.go
- OpenTofu v1.11.6 GitHub release: https://github.com/opentofu/opentofu/releases/tag/v1.11.6

## Issues Found
- The description and introduction said OpenTofu can filter by test name pattern. The official `tofu test` command does not document a `-run` option, and the current command implementation exposes file filters instead. Updated the wording to explain that focused execution is done at the test file level.
- Several examples used positional test file arguments such as `tofu test tests/unit.tftest.hcl`. OpenTofu documents `-filter=testfile` for selecting individual files, so these commands were changed to `tofu test -filter=...`.
- The test-name filtering section used unsupported `-run` examples and showed skipped run blocks. Replaced those examples with documented `-filter` usage and clarified that run blocks should be organized into separate files when they need to be run independently.
- The `-verbose` comment said it shows each assertion result. OpenTofu documents `-verbose` as printing the plan or state for each test run block, so the comment was corrected.
- The JSON example treated `tofu test -json` output as a JSON array. OpenTofu emits machine-readable JSON messages as individual JSON objects, so the `jq` command was changed to filter the JSON stream directly.
- The parallel execution section claimed different test files run in parallel and used `tofu test tests/`. OpenTofu v1.11.6 source executes selected files in sorted order, so the section was updated to describe file execution order and use valid commands.
- The all-tests comment only mentioned the `tests/` directory. OpenTofu discovers test files in both the current directory and the configured test directory, so the comment was corrected.

## Review Notes
OpenTofu was not installed on the local PATH in this workspace, so the review used current official documentation and the v1.11.6 source/release as the authoritative references. The post remains a file-level filtering guide because current OpenTofu does not provide run-block name filtering.
