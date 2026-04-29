# Validation Summary: How to Use JSON Output for Tests in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu testing (`tofu test`)
- JSON output parsing
- `jq`
- Bash
- GitHub Actions
- JUnit XML
- Slack incoming webhooks

## Sources Consulted
- OpenTofu `tofu test` command documentation: https://opentofu.org/docs/cli/commands/test/
- OpenTofu JSON view implementation: https://github.com/opentofu/opentofu/blob/main/internal/command/views/test.go
- OpenTofu test JSON message schema: https://github.com/opentofu/opentofu/blob/main/internal/command/views/json/test.go
- OpenTofu JSON message types: https://github.com/opentofu/opentofu/blob/main/internal/command/views/json/message_types.go
- OpenTofu JSON diagnostic rendering: https://github.com/opentofu/opentofu/blob/main/internal/command/views/json_view.go
- `opentofu/setup-opentofu` action README: https://github.com/opentofu/setup-opentofu/blob/main/README.md

## Issues Found
- The event-type table listed a non-existent `test_suite` event and omitted actual test events such as `test_abstract`, `test_summary`, `test_plan`, and `test_state`. I replaced the table with the event types OpenTofu actually emits.
- The JSON examples did not match the real output format. I corrected the `test_run` example message/metadata and changed the failed-assertion example to a separate `diagnostic` event, which is how OpenTofu reports assertion details.
- The `jq` parsing examples only treated `fail` as a failure and ignored `error` runs. I updated them to include both statuses and fixed the aggregate example to count `errored` runs explicitly.
- The Slack example used `tr '\n' ', '`, which does not reliably join names with `, ` and can leave malformed output. I replaced it with a `jq -rs ... | join(", ")` pipeline.
- The GitHub Actions example used `opentofu/setup-opentofu@v1` without disabling the wrapper, even though the current action guidance recommends `@v2` and notes that `tofu_wrapper: false` may be needed for correct output formatting. I updated the snippet accordingly.
- The JUnit conversion comment referenced a specific converter name that could not be validated from the consulted sources. I changed it to a generic converter-script description while preserving the example workflow.

## Review Notes
- OpenTofu’s JSON UI emits additional non-test events such as an initial `version` event. Parsers that only care about test outcomes should filter by `type`.
- OpenTofu does not document an official built-in JUnit converter for `tofu test -json`; the conversion step remains a custom or community-provided implementation.
