# Validation Summary: How to Use tofu show to Display State or Plan - Tofu State Plan

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu state and saved plan inspection
- OpenTofu JSON output format
- `jq`
- Shell commands

## Sources Consulted
- OpenTofu official documentation: `tofu show` command - https://opentofu.org/docs/cli/commands/show/
- OpenTofu official documentation: `tofu plan` command and `-out=FILENAME` option - https://opentofu.org/docs/cli/commands/plan/
- OpenTofu official documentation: JSON output format for state, plan, values, resources, child modules, and outputs - https://opentofu.org/docs/internals/json-format/
- OpenTofu official documentation: output values and root module output behavior - https://opentofu.org/docs/language/values/outputs/
- jq official manual: filters, functions, recursion, string interpolation, and `group_by` - https://jqlang.org/manual/v1.7/

## Issues Found
1. **Saved plan examples used the legacy positional filename form**: The post used `tofu show changes.tfplan` and `tofu show -json changes.tfplan`. Current OpenTofu documentation supports that as legacy usage but recommends explicit target selection. **Fix:** Updated saved-plan examples to use `tofu show -plan=changes.tfplan` and `tofu show -plan=changes.tfplan -json`.
2. **Several JSON examples claimed to extract all resources but only queried root-module resources**: The `.values.root_module.resources[]` path excludes resources inside child modules. OpenTofu's JSON values representation stores child modules recursively under `child_modules`. **Fix:** Updated the resource queries and full inventory example to use a recursive `jq` helper that walks root and child modules.
3. **The resource ID output omitted module paths and instance addresses**: The original string used `\(.type).\(.name)`, which can be ambiguous for module resources or repeated instances. **Fix:** Changed it to use each resource's absolute `.address`.
4. **The module resource example only inspected direct child modules**: The original `.values.root_module.child_modules[]? | .resources[]?` query skipped nested child modules. **Fix:** Replaced it with a recursive resource query filtered to addresses beginning with `module.`.
5. **The outputs example implied descendant module outputs were available**: OpenTofu's values representation documents `.values.outputs` as root module outputs only; descendant module outputs are not retained there. **Fix:** Changed the comment from "Get module outputs" to "Get root module outputs."

## Review Notes
- The local environment did not have `tofu` installed, so OpenTofu CLI behavior was validated against official OpenTofu documentation rather than local command execution.
- The revised `jq` filters were syntax-checked locally with `jq-1.7` against a synthetic state JSON containing root, child-module, and nested child-module resources.
- OpenTofu documents that `tofu show -json` can return sensitive values from state in plain text, and saved plan files can contain sensitive values. That caveat would be useful in a future content update.
