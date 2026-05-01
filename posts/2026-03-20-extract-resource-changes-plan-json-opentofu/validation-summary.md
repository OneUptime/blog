# Validation Summary: How to Extract Resource Changes from Plan JSON in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu plan JSON format
- jq
- Python 3

## Sources Consulted
- OpenTofu JSON Output Format: https://opentofu.org/docs/internals/json-format/
- OpenTofu `show` command: https://opentofu.org/docs/cli/commands/show/
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- jq 1.6 manual: https://jqlang.org/manual/v1.6/

## Issues Found
- The introduction incorrectly implied that `resource_changes` contains only resources the plan will affect. I corrected it to reflect OpenTofu's documented behavior: the array includes all resource instances in the configuration, including unchanged entries with `["no-op"]` actions.
- The plan-to-JSON example used the legacy positional `tofu show` syntax. I updated it to the current explicit form, `tofu show -json -plan=tfplan`.
- The `jq` examples labeled as "changes" did not filter out `["no-op"]` entries, which could include unchanged resources in the results. I added `select(.change.actions != ["no-op"])` where needed.
- The explanation of `before` and `after` said creates and deletes produce `null`. OpenTofu documents these values as unset for some action types, so I clarified that `jq` will render missing fields as `null` and noted that `after` is also unset for `["forget"]`.
- The `after_unknown` and `after_sensitive` examples only extracted top-level keys even though both objects are recursive structures in the JSON format. I replaced those examples with recursive path extraction using `paths(type == "boolean")` and corrected the surrounding explanations.
- The sensitive-values example said it would find sensitive attributes that "will change", but `after_sensitive` indicates sensitivity in the planned value, not whether a sensitive field itself changed. I narrowed the wording to match the data model.

## Review Notes
- `tofu show -json` returns sensitive values in plain text. Consumers should combine `after_sensitive` with `after` before displaying or exporting plan data.
- Legacy `tofu show <filename>` usage is still supported, but the current OpenTofu documentation recommends explicit target-selection options such as `-plan=FILENAME`.
