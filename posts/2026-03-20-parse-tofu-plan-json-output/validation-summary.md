# Validation Summary: How to Parse tofu plan JSON Output Programmatically

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTofu (tofu CLI: `plan`, `show -json`)
- OpenTofu plan JSON output format
- Python (standard library `json`, `sys`)
- jq (shell-based JSON processor)

## Sources Consulted
- Official OpenTofu JSON output format docs: https://opentofu.org/docs/internals/json-format/
- OpenTofu repository: https://github.com/opentofu/opentofu

## Issues Found

1. **Incorrect `format_version` value.** The post showed `"format_version": "1.2"`, but the official OpenTofu docs document `"format_version": "1.0"` for the plan representation. Changed to `"1.0"`.

2. **`terraform_version` listed at the wrong level.** The post placed `terraform_version` as a top-level key of the plan JSON. Per the OpenTofu docs, `terraform_version` lives inside the state representation (i.e., the `prior_state` sub-object), not at the top level of the plan. Replaced the top-level `terraform_version` entry with `prior_state` and added the other documented top-level keys (`output_changes`, `resource_drift`, `checks`, `timestamp`, `errored`) so the listing is accurate.

3. **`provider_name` shown with full registry address.** The post showed `"provider_name": "registry.opentofu.org/hashicorp/aws"`, but per the docs `provider_name` is the short provider name only (e.g., `"aws"`); the fully qualified address with registry hostname is `full_name` and appears under `configuration.provider_config`. Changed to `"aws"`.

4. **Incomplete list of `change.actions` values.** The post listed only `["create"]`, `["update"]`, `["delete"]`, `["delete", "create"]`, and `["no-op"]`. The official docs include additional valid combinations: `["read"]` (data source reads), `["create", "delete"]` (replace via create-before-destroy), and `["forget"]` (resource removed from state without destroying). Updated the list to include all documented values.

## Review Notes
- The Python parsing script handles both replacement orderings correctly because it uses `set(actions) == {"delete", "create"}`, so it works for both destroy-then-create and create-before-destroy replacements without modification.
- The Python script does not handle `["read"]` or `["forget"]` actions explicitly — they would be silently dropped from the summary. This is acceptable for the tutorial's stated goal (summarizing create/update/delete/replace), but readers extending the script for production policy enforcement should add these branches.
- The `tofu plan -out=tfplan` and `tofu show -json tfplan` commands are correct and current.
- The `variables` section structure (`{ "varname": { "value": "varvalue" } }`) and the corresponding `jq '.variables | to_entries[] | {name: .key, value: .value.value}'` extraction pattern are accurate.
- The `resource_changes` entry fields shown (`address`, `module_address`, `mode`, `type`, `name`, `provider_name`, `change.{actions, before, after, after_unknown}`) are all documented. Optional fields not shown in the example (`previous_address`, `index`, `deposed`, `action_reason`) exist in the schema but are not necessary for the tutorial's narrative.
