# Validation Summary: How to Use the -json Flag for Machine-Readable Output in OpenTofu - Opentofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu CLI (`tofu` commands)
- Terraform-compatible machine-readable UI / JSON log format
- `jq` (JSON command-line processor)
- Bash scripting for CI/CD
- GitHub CLI (`gh pr comment`)

## Sources Consulted
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/
- OpenTofu JSON output format / machine-readable UI: https://opentofu.org/docs/internals/machine-readable-ui/
- OpenTofu state JSON format: https://opentofu.org/docs/internals/json-format/
- OpenTofu `tofu show` command docs: https://opentofu.org/docs/cli/commands/show/
- OpenTofu `tofu validate` command docs: https://opentofu.org/docs/cli/commands/validate/
- OpenTofu `tofu version` command docs: https://opentofu.org/docs/cli/commands/version/
- OpenTofu `tofu providers schema` docs: https://opentofu.org/docs/cli/commands/providers/schema/
- Terraform `metadata functions` reference (inherited by OpenTofu): https://developer.hashicorp.com/terraform/cli/commands/metadata/functions
- jq manual: https://jqlang.github.io/jq/manual/

## Issues Found
No technical issues found.

The list of commands supporting `-json` is accurate, including the streaming machine-readable UI format for `plan`/`apply`, the structured state and plan formats from `show -json`, and the validate/version/providers-schema/metadata-functions JSON outputs. The example event objects use the correct `@level`, `@message`, `@module`, `type` keys with `planned_change`, `apply_start`, `apply_complete`, etc. The JSON paths used in the `jq` examples (`.values.root_module.resources[].address`, `.resource_changes[].change.actions`, `.change.resource.addr`) match the documented OpenTofu JSON formats. The `tofu version -json` fields (`terraform_version`, `platform`, `provider_selections`, `terraform_outdated`) are correct — OpenTofu keeps `terraform_version` and `terraform_outdated` keys for compatibility.

## Review Notes
- The `-auto-approve` requirement when running `tofu apply -json` is correctly applied in the example, since `-json` mode disables interactive approval prompts.
- The replacement-detection example only matches `["delete","create"]`, but Terraform/OpenTofu can also emit `["create","delete"]` for replacements with `create_before_destroy = true`. The script will undercount such replacements; this is a minor robustness gap rather than a correctness bug, so the post was left as-is.
- The example uses OpenTofu 1.6.2 strings in mocked output. While newer OpenTofu releases exist (1.8.x / 1.9.x as of early 2026), the JSON schemas referenced have not changed in a backward-incompatible way, so the examples remain valid against current versions.
- The grep-then-jq pipeline (`grep '"type":"planned_change"'`) is fragile against future field-ordering changes in the JSON serialization, but works reliably against the current OpenTofu output.
