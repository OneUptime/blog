# Validation Summary: How to Use Machine-Readable UI Output in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- Machine-readable JSON UI output
- `jq`
- Bash shell scripting
- GitHub Actions
- CI/CD automation

## Sources Consulted
- OpenTofu docs: Machine-Readable UI - https://opentofu.org/docs/internals/machine-readable-ui/
- OpenTofu docs: `tofu plan` - https://opentofu.org/docs/cli/commands/plan/
- OpenTofu docs: `tofu apply` - https://opentofu.org/docs/cli/commands/apply/
- OpenTofu docs: `tofu show` - https://opentofu.org/docs/cli/commands/show/
- OpenTofu docs: `tofu output` - https://opentofu.org/docs/cli/commands/output/
- OpenTofu docs: `tofu validate` JSON output format - https://opentofu.org/docs/cli/commands/validate/

## Issues Found
- The post treated `tofu show -json` as if it emitted the same line-delimited machine-readable UI stream as `tofu plan -json` and `tofu apply -json`. I corrected the command examples and wording to distinguish streaming UI JSON from `show`'s saved plan/state JSON representation.
- The `tofu apply -json` example omitted the documented requirement to pair `-json` with either `-auto-approve` or a previously saved plan. I updated the example to use `-auto-approve`.
- The sample `version` message used incorrect fields, including `terraform` and `provider_selections`, and omitted the documented `tofu` field. I replaced it with the correct version-message shape.
- The file redirection example used a `.json` filename for line-delimited output. I changed it to `.jsonl` to match the actual output format.
- The apply parsing example labeled every `apply_complete` event as a creation. I updated it to report completion with the action from `.hook.action`, because `apply_complete` can represent create, update, replace, read, or delete operations.
- The apply parsing and webhook examples piped `tofu apply` into other commands without preserving pipeline failures. I added `set -o pipefail` so automation does not mask a failed `tofu apply`.
- The webhook example interpolated a raw JSON object directly into a JSON string, which would produce an invalid payload. I changed it to build the request body with `jq -n`.
- The best-practices note recommending `2>&1` for JSON capture was not supported by the official machine-readable UI docs and could contaminate the JSON stream with non-JSON stderr output. I removed that guidance and updated the examples accordingly.
- The failure-detection advice was too narrow. I changed it to watch for both `apply_errored` messages and `diagnostic` messages with `@level` set to `error`.

## Review Notes
- The current Machine-Readable UI docs describe the schema version as `ui: "1.0"`, but the embedded sample output on that page still shows an older `ui: "0.1.0"` example. The post was updated to follow the schema description rather than the stale sample fields.
- Official docs note that `tofu show -json` and `tofu output -json` can expose sensitive values in plain text. That caveat is relevant if this post is expanded later.
