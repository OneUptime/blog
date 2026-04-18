# Validation Summary: How to Understand Variable Precedence in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (variable definition and precedence)
- HCL (variables.tf, *.tfvars, *.auto.tfvars)
- Environment variables (TF_VAR_*)
- OpenTofu CLI (`tofu plan`, `tofu apply`, `tofu console`, `-var`, `-var-file`)

## Sources Consulted
- OpenTofu Input Variables documentation: https://opentofu.org/docs/language/values/variables/ (section "Variable Definition Precedence")
- Terraform Input Variables documentation (for cross-reference): https://developer.hashicorp.com/terraform/language/values/variables

## Issues Found

1. **Incorrect precedence order for TF_VAR_ environment variables.** The post originally placed `TF_VAR_` env vars at position 6 (higher than `terraform.tfvars` and `*.auto.tfvars`). Per the official OpenTofu docs, `TF_VAR_` env vars have the LOWEST user-provided precedence — only defaults are lower; tfvars files (including auto-loaded ones) override them. Fixed the precedence list to place TF_VAR_ at position 2 (just above defaults).

2. **Incorrect separation of `-var-file` and `-var` into two precedence levels.** The post originally listed them as positions 7 and 8, asserting `-var` always wins over `-var-file`. Per the docs, `-var` and `-var-file` share the same precedence level and are processed in the order they appear on the command line — the last occurrence for a given variable wins. Consolidated them into a single level (7) and added a clarifying note.

3. **"With TF_VAR (overrides everything)" example was wrong.** The step-by-step example claimed `TF_VAR_instance_count=6` would override `common.auto.tfvars = 3`, producing `6`. In reality, `auto.tfvars` wins, so the correct result is `3`. Rewrote the example to reflect actual OpenTofu behavior.

4. **"Without any explicit variables" comment said result was `2` (terraform.tfvars).** With `common.auto.tfvars` also present, the result is `3` (auto.tfvars overrides terraform.tfvars). Corrected the comment.

5. **Gotcha 1 claim that "TF_VAR_ overrides terraform.tfvars" is false.** Reworded to clarify that TF_VAR_ only wins when no tfvars / auto.tfvars file sets the same variable, but still demonstrates the real footgun (leaking env vars across contexts when the variable isn't otherwise set).

6. **Gotcha 2 inverted the actual behavior.** It stated "-var always takes precedence over -var-file regardless of order" — this is incorrect for OpenTofu. Rewrote the gotcha to show that command-line `-var` and `-var-file` are equal-precedence and the later occurrence wins, with an example of both orderings.

7. **Minor**: Fixed a missing line-continuation backslash in the multi-line `tofu apply` example so the command structure reads correctly.

## Review Notes
- The terminology "alphabetical" vs "lexical" for auto.tfvars loading is effectively equivalent for typical ASCII filenames; used "lexical" in the corrected precedence list to match the official docs wording.
- The `vault read -field=value secret/prod/db` example uses a `-field=value` flag which is Vault CLI syntax; it is illustrative and correct for a literal KV v1 secret with a `value` key, though real-world usage would likely use `-field=password` or similar. Left as author wrote it since it is an external-tool illustration, not the core topic.
- Defaults being "level 1" is a convention used by the author; OpenTofu docs describe defaults separately as the fallback when no other source provides a value. The post's framing is pedagogically reasonable.
