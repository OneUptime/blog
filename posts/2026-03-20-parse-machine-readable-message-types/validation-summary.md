# Validation Summary: Parsing Machine-Readable Message Types in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (machine-readable JSON output / `-json` flag)
- jq (JSON processing on the command line)
- Python (json module)
- Bash scripting (Slack webhook integration via curl)

## Sources Consulted
- OpenTofu Machine-Readable UI documentation: https://opentofu.org/docs/internals/machine-readable-ui/
- OpenTofu source code (action string mapping): https://github.com/opentofu/opentofu/blob/main/internal/command/jsonplan/plan.go (`actionString` function)
- OpenTofu source code (hook JSON view): https://github.com/opentofu/opentofu/blob/main/internal/command/views/json/hook.go

## Issues Found
1. **`version` message field name was incorrect.** The post used `"terraform": "1.6.0"` in the `version` message example, but OpenTofu's machine-readable UI emits the version under the `"tofu"` key (the official docs example shows `"tofu": "0.15.4"`). Changed `"terraform"` to `"tofu"` to match the actual OpenTofu output format.

2. **Hook `action` field used progressive verb forms.** The post showed `"action": "creating"` in the `apply_start`, `apply_complete`, and `apply_errored` examples. According to the OpenTofu source (`actionString` in `internal/command/jsonplan/plan.go`) and the official machine-readable UI docs, the JSON `action` value uses the base form (`"create"`, `"update"`, `"delete"`, `"read"`, `"no-op"`, `"forget"`), not the progressive form. The progressive form (e.g., "Creating...") only appears in the human-readable `@message` text, not in the structured `action` field. Changed all three occurrences from `"creating"` to `"create"`.

## Review Notes
- The `@module` value of `"tofu.ui"` is correct per OpenTofu's docs (OpenTofu changed this from Terraform's `"terraform.ui"`).
- The `change_summary` fields (`add`, `change`, `remove`, `operation`) are accurate, and `operation` values include `"plan"`, `"apply"`, and `"destroy"`.
- The simplified examples for `resource_drift` and `planned_change` omit some optional fields (e.g., `previous_resource`, `reason`, full resource metadata like `module`, `implied_provider`, `resource_type`, etc.) but the shown subset is structurally correct.
- The `ui` schema version `"1.0"` shown in the example is illustrative; the real value at the time of writing is `"0.1.0"` per the docs, but since the post uses a fictitious version pair this was left as-is (it doesn't affect the technical accuracy of the parsing approach).
- `tofu test -json` is supported and emits `test_abstract`, `test_file`, `test_run`, and `test_summary` event types.
- The Slack notifier example uses `change_summary` from `tofu apply -json`, which is correct — during apply, the `operation` field will be `"apply"` and `@message` will be in the form "Apply complete! Resources: ...".
- The jq, Python, and bash code samples are all syntactically correct and would work as described once the field-name corrections above are applied.
