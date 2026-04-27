# Validation Summary: How to Use State File JSON Format in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- OpenTofu (CLI: `tofu show -json`, `tofu state pull`, `tofu state push`, `tofu state mv`, `tofu state rm`, `tofu import`)
- Terraform-compatible state file format (v4)
- jq for JSON querying
- AWS provider (used as example resource type)

## Sources Consulted
- OpenTofu JSON Format docs: https://opentofu.org/docs/internals/json-format/
- OpenTofu `state pull` command: https://opentofu.org/docs/cli/commands/state/pull/
- OpenTofu `state push` command: https://opentofu.org/docs/cli/commands/state/push/
- OpenTofu source (`internal/states/statefile/version4.go`) confirming state v4 schema and `terraform_version` JSON field
- OpenTofu `registry-address` package confirming `registry.opentofu.org` as the default provider registry
- jq manual on `unique` (requires array input)

## Issues Found
1. **Broken jq query for module paths.** The original snippet
   `tofu state pull | jq -r '.resources[].module // "root" | unique'`
   fails because `unique` requires an array input but receives a stream of values, producing an error like `Cannot iterate over string`. Replaced with
   `tofu state pull | jq -r '[.resources[] | .module // "root"] | unique[]'`,
   which builds an array first (with `// "root"` correctly inside the array constructor so root-module resources without a `module` key are still represented) and then expands the deduplicated values back to lines.

## Review Notes
- The state v4 schema is correctly documented (version 4, `terraform_version`, `serial`, `lineage`, `outputs`, `resources`). The post does not mention the `check_results` top-level field (added in Terraform 1.2+), but this is a non-exhaustive overview, not an error.
- The provider string `provider["registry.opentofu.org/hashicorp/aws"]` is correct for state files freshly written by OpenTofu. State files originally written by Terraform (or with `source = "registry.terraform.io/..."` explicitly set) may instead show `registry.terraform.io/hashicorp/aws`. Not flagged as an error since the post's example reflects the OpenTofu default.
- `tofu show -json` produces a different schema with its own `format_version` (currently `"1.0"`), distinct from the raw state file `version: 4`. The post correctly notes the schema is "different, richer" but does not call out the `format_version` distinction.
- The `| head -20` at the end of the resource-counting jq pipeline truncates formatted JSON by lines, which can produce syntactically invalid JSON output. Left as-is since it is a common shell idiom for visually limiting output and not strictly incorrect; using `jq '... | .[0:20]'` would be cleaner.
- "Resource Entry Structure" on line 35 is missing the `##` markdown heading prefix, but per review scope (technical errors only), no stylistic fix was made.
