# Validation Summary: JSON Output for OpenTofu Tests

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu native testing (`tofu test`)
- JSON / NDJSON-style streaming output
- `jq`
- Python
- JUnit XML
- GitHub Actions

## Sources Consulted
- OpenTofu `tofu test` command documentation: https://opentofu.org/docs/cli/commands/test/
- OpenTofu machine-readable UI documentation: https://opentofu.org/docs/v1.8/internals/machine-readable-ui/
- OpenTofu source for JSON UI message types: https://github.com/opentofu/opentofu/blob/v1.11/internal/command/views/json/message_types.go
- OpenTofu source for test JSON payload structures: https://github.com/opentofu/opentofu/blob/v1.11/internal/command/views/json/test.go
- OpenTofu source for `tofu test` JSON rendering and `-verbose` behavior: https://github.com/opentofu/opentofu/blob/v1.11/internal/command/views/test.go
- OpenTofu source for current JSON UI schema version: https://github.com/opentofu/opentofu/blob/v1.11/internal/command/views/json_view.go
- GitHub Actions workflow syntax (`continue-on-error`): https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions artifact documentation: https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts

## Issues Found
- The sample JSON schema was incorrect. The post used non-existent `test_run_start` and `test_run_result` message types, root-level `run` / `result` fields, and `@module: "tofu.test"`. I replaced the sample with the actual `tofu test -json` structure: `version`, `test_abstract`, `test_file`, `test_run`, and `test_summary`, using the real nested objects and `@module: "tofu.ui"`.
- The shell parsing example targeted a non-existent event type and field layout. I changed it to parse `test_run` events and extract `run` plus `status` from the nested `test_run` object.
- The Python JUnit conversion script parsed the wrong event type and would have missed `error` and `skip` outcomes. I updated it to consume `test_run` events, emit proper suite counts, and map `fail`, `error`, and `skip` statuses to JUnit elements.
- The GitHub Actions `jq` example was incorrect for an NDJSON stream and only counted `fail`, not `error`. I changed it to slurp the stream with `jq -s` and read the final `test_summary` event.
- The GitHub Actions flow would stop before the reporting step on a failing `tofu test` exit code, and artifact upload would not run after a failing parse step. I added `continue-on-error: true` to the test step and `if: always()` to the later steps so reporting and artifact capture still happen.
- The event-type table and filtering examples referenced unsupported test message names. I corrected them to the documented and source-backed message types, including `test_plan` and `test_state` for `-verbose`.
- The `-verbose` best-practice note implied generic detailed logs; in JSON mode, OpenTofu emits structured `test_plan` or `test_state` messages instead. I corrected that wording.

## Review Notes
- OpenTofu’s public machine-readable UI docs document the core test message types well, but some newer details are clearer in source than in the prose docs, especially the current JSON UI schema version and the extra `test_plan` / `test_state` messages emitted with `-verbose`.
