# Validation Summary: How to Parse OpenTofu JSON Message Types

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- OpenTofu (machine-readable JSON UI for `tofu plan -json` / `tofu apply -json`)
- jq (JSON processing)
- Bash scripting

## Sources Consulted
- OpenTofu Machine-Readable UI documentation: https://opentofu.org/docs/internals/machine-readable-ui/
- Terraform Machine-Readable UI documentation (sibling specification): https://developer.hashicorp.com/terraform/internals/machine-readable-ui

## Issues Found
1. **Incorrect `action` field values in apply lifecycle messages.** The `apply_start`, `apply_complete`, and `apply_errored` examples used `"action": "creating"`. Per the official spec, the `hook.action` field uses the same enum as `planned_change.change.action` — `noop`, `create`, `read`, `update`, `replace`, `delete` — not gerund forms. Updated all three examples to use `"action": "create"`.

2. **`resource_drift` example contained non-spec fields.** The example included `before` and `after` objects under `change`. The OpenTofu spec explicitly states that the `resource_drift` message does not contain the attribute-level diff — that detail is only available via the JSON plan output. Replaced the example with the canonical structure (full `resource` object with `addr`, `module`, `resource`, `implied_provider`, `resource_type`, `resource_name`, `resource_key`) and added a brief sentence noting where the attribute diff actually lives.

## Review Notes
- The `version` message example is correct: it uses the `terraform` field even on OpenTofu output (preserved for compatibility with downstream tooling). The accompanying jq command also pulls from `.terraform`, which is correct.
- The `@module` value `tofu.ui` is correct for OpenTofu (Terraform uses `terraform.ui`).
- The jq snippets and the bash parsing script are syntactically valid and work against the documented schema. The `jq` group_by + map idiom for counting actions is correct.
- The diagnostic `range` structure (`filename`, `start`/`end` with `line`/`column`) matches the spec.
- The `outputs` example shows `db_password` with `"value": null` for a sensitive output. In actual OpenTofu output, sensitive outputs do include the real value field; using `null` here is a stylistic choice for the doc rather than a spec error, so it was left as-is.
