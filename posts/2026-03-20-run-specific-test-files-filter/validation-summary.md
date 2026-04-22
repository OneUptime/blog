# Validation Summary: Running Specific Test Files and Filtering in OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- OpenTofu CLI
- OpenTofu test framework
- CI/CD workflows
- GitHub Actions YAML
- Bash scripting

## Sources Consulted
- OpenTofu Command: test documentation: https://opentofu.org/docs/cli/commands/test/
- OpenTofu Basic CLI Features documentation for the global `-chdir` option: https://opentofu.org/docs/cli/commands/
- OpenTofu Machine-Readable UI documentation for JSON test output: https://opentofu.org/docs/v1.8/internals/machine-readable-ui/

## Issues Found
- The post said `tofu test` runs only `.tftest.hcl` files. Updated this to include all supported OpenTofu test file extensions: `*.tftest.hcl`, `*.tftest.json`, `*.tofutest.hcl`, and `*.tofutest.json`.
- The post used `tofu test -chdir=...`, but `-chdir` is a global OpenTofu option that must appear before the subcommand. Updated examples to `tofu -chdir=... test`.
- The post described a `-run` flag for filtering individual `run` blocks. OpenTofu's documented `tofu test` options do not include `-run`; filtering is by test file via `-filter`. Replaced the run-name filtering guidance and examples with file-based filtering guidance.
- The post used `-filter` with directories such as `tests/unit/` and `tests/integration/`. OpenTofu documents `-filter` as selecting individual test files, so directory examples were changed to use `-test-directory`.
- The CI example labeled the unit test command as plan-only, which could imply that the shown CLI flags force plan mode. Updated the label to describe running unit test files without claiming plan-only behavior.
- The verbose output description said it showed all assertions. OpenTofu documents `-verbose` as printing the plan or state for each test run block, so the description was corrected.
- The command for listing tests only matched `*.tftest.hcl`. Updated it to include all supported OpenTofu test file extensions.

## Review Notes
The local `tofu` executable was not available in the workspace, so CLI behavior was verified against the current official OpenTofu documentation. The CI examples remain illustrative; plan-only behavior depends on the test files using `command = plan` inside their `run` blocks, because `tofu test` defaults to apply mode.
