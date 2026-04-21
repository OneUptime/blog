# Validation Summary: How to Use State File JSON Format in OpenTofu - File

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- OpenTofu state files and state snapshots
- OpenTofu CLI (`tofu state`, `tofu show`, `tofu output`)
- JSON
- jq
- Python

## Sources Consulted
- OpenTofu State documentation: https://opentofu.org/docs/language/state/
- OpenTofu State Storage and Locking documentation: https://opentofu.org/docs/language/state/backends/
- OpenTofu `tofu show` command documentation: https://opentofu.org/docs/cli/commands/show/
- OpenTofu JSON Output Format documentation: https://opentofu.org/docs/internals/json-format/
- OpenTofu `tofu output` command documentation: https://opentofu.org/docs/cli/commands/output/
- OpenTofu `tofu state list` command documentation: https://opentofu.org/docs/cli/commands/state/list/
- OpenTofu `tofu state show` command documentation: https://opentofu.org/docs/cli/commands/state/show/
- OpenTofu `tofu state pull` command documentation: https://opentofu.org/docs/cli/commands/state/pull/
- OpenTofu Resource Addressing documentation: https://opentofu.org/docs/cli/state/resource-addressing/
- OpenTofu Sensitive Data in State documentation: https://opentofu.org/docs/language/state/sensitive-data/
- OpenTofu State and Plan Encryption documentation: https://opentofu.org/docs/language/state/encryption/
- OpenTofu statefile source (`version4.go`): https://raw.githubusercontent.com/opentofu/opentofu/main/internal/states/statefile/version4.go
- OpenTofu statefile source (`write.go`): https://raw.githubusercontent.com/opentofu/opentofu/main/internal/states/statefile/write.go

## Issues Found
1. **Raw state format was presented as stable automation output**: The post did not clearly distinguish the raw state snapshot format from the documented `tofu show -json` representation. Updated the introduction and top-level structure section to explain that raw state snapshots are JSON but subject to format changes, and noted that `tofu show -json` uses a different documented top-level structure.

2. **`resources` field was described too narrowly**: The post described the raw `resources` array as containing only managed resources, but OpenTofu state can also track data resources with `mode: "data"`. Updated the wording to include managed resources and data sources.

3. **JSON examples were not valid JSON**: The top-level example used `[...]`, and the module example used `...` inside `json` code fences. Replaced these with valid JSON snippets.

4. **jq examples missed resources in child modules**: The original examples only read `.values.root_module.resources[]`, so they omitted resources under `child_modules`. Updated the jq filters to recurse through the root module and all nested child modules.

5. **Python example did not print full resource addresses**: The original Python snippet constructed addresses from `type.name`, which loses module paths and `count`/`for_each` indexes. Updated it to walk child modules recursively and print the documented `address` field.

6. **Sensitive value handling was incorrect**: The post stated that `tofu show -json` redacts sensitive values. Official OpenTofu docs state that `tofu show -json`, `tofu output -json`, and `tofu output -raw` display sensitive values in plain text. Updated the section to show sensitive values present in `values` and marked separately in `sensitive_values`, and added guidance to treat JSON output as sensitive.

7. **Module resource JSON mixed raw-state and `tofu show -json` formats**: The module example used a raw-state-style `module` field while the surrounding commands used `tofu show -json`. Updated the example to use the documented JSON output representation with an absolute `address`.

## Review Notes
- The OpenTofu CLI was not installed in this environment, so command syntax was verified against official OpenTofu documentation rather than local `tofu --help` output.
- The `tofu state list`, `tofu state show`, `tofu show -json`, and `tofu output -json` commands are current and documented.
- The raw state format is intentionally not the preferred automation interface; future readers should continue to favor `tofu show -json` for programmatic state inspection.
