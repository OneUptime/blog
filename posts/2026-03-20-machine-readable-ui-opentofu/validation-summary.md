# Validation Summary: How to Use OpenTofu's Machine-Readable UI Output

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- Machine-readable JSON UI output
- JSON Lines
- `jq`
- Python 3
- GitHub Actions

## Sources Consulted
- OpenTofu Machine-Readable UI docs: https://opentofu.org/docs/internals/machine-readable-ui/
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command docs: https://opentofu.org/docs/cli/commands/apply/
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- OpenTofu source for JSON UI version message: https://raw.githubusercontent.com/opentofu/opentofu/v1.11/internal/command/views/json_view.go
- OpenTofu source for `change_summary` fields: https://raw.githubusercontent.com/opentofu/opentofu/v1.11/internal/command/views/json/change_summary.go
- OpenTofu source for planned change actions: https://raw.githubusercontent.com/opentofu/opentofu/v1.11/internal/command/jsonentities/change.go

## Issues Found
- The sample `version` object used `terraform` instead of `tofu`. I changed it to `tofu`, which matches the current JSON UI implementation.
- The sample `version` object needed the current JSON UI schema version. I set the sample to `ui: "1.2"` to match the current OpenTofu implementation.
- The post did not mention that `-json` implies `-input=false`, and that `tofu apply -json` also requires either `-auto-approve` or a saved plan. I added that clarification under the command examples because it is required for the commands to work reliably in automation.
- The command examples redirected `stderr` into the JSON log files with `2>&1`. I removed that so the captured files remain clean JSON Lines streams for downstream parsing.
- The `change_summary` sample omitted current `import` and `forget` fields. I added those fields to reflect the current output shape.
- The message type table described `change_summary` only as planned changes. I corrected it to cover both planned and applied changes.
- The parsing example labeled as apply progress only selected `apply_start` and `apply_complete`. I updated it to include `apply_progress`.
- The Python progress reporter used `no-op`, but current streamed action values use `noop`. I corrected that and added current action handling for `import` and `remove`.
- The Python progress reporter summarized plans using only add/change/remove counts. I updated it to also account for `import` and `forget` counts when present.
- The GitHub Actions example relied on a pipeline but did not make failure handling explicit. I added `set -o pipefail` and filtered the final `change_summary` by `operation == "apply"` so the reported result corresponds to the apply stage.
- The GitHub Actions result string only reported add/change/remove counts. I expanded it to include `import` and `forget`, matching the current `change_summary` structure.

## Review Notes
- The published OpenTofu machine-readable UI docs are internally inconsistent: the prose says the `ui` version is `1.0`, older examples still show `0.1.0`, and the current implementation emits `1.2`. For the post fixes, I followed the current implementation where the docs and examples diverged.
