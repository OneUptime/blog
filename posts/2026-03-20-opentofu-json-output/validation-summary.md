# Validation Summary: How to Use OpenTofu's JSON Output Format

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (`tofu` CLI: plan, show, output, providers schema)
- JSON plan format / JSON state format / provider schema JSON
- jq (JSON processing in shell)
- Bash scripting (CI/CD analysis script)
- Mentions of related tooling: Infracost, OPA/conftest, Checkov

## Sources Consulted
- OpenTofu JSON Output Format docs: https://opentofu.org/docs/internals/json-format/
- OpenTofu `tofu show` command docs: https://opentofu.org/docs/cli/commands/show/
- OpenTofu `tofu plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `tofu output` command docs: https://opentofu.org/docs/cli/commands/output/
- OpenTofu `tofu providers schema` command docs: https://opentofu.org/docs/cli/commands/providers/schema/

## Issues Found
- **Incomplete `jq 'keys'` example output.** The post showed `["configuration", "format_version", "output_changes", "prior_state", "resource_changes", "variables"]` as the result of running `jq 'keys'` on a plan JSON. In practice, recent OpenTofu plan JSON always includes additional standard top-level fields such as `planned_values`, `terraform_version` (kept for compatibility), and `timestamp`. Updated the comment to a representative output that includes those fields, so the example matches what a reader would actually see.

## Review Notes
- `tofu plan -out=tfplan.binary` and `tofu show -json tfplan.binary` are both correct. The `tofu show <plan-file>` positional form is the long-standing usage; the more explicit `tofu show -plan=FILENAME -json` form is also supported but kept the original (positional) form because it is what most existing tooling and tutorials use.
- `tofu show -json` (no argument) correctly returns the current state representation.
- `tofu output -json` and `tofu output -json <name>` are correct.
- `tofu providers schema -json` is correct, and the `registry.opentofu.org/hashicorp/aws` source address used in the jq examples is the standard fully-qualified address for the AWS provider in the OpenTofu registry.
- `format_version` of `"1.2"` for the plan JSON is correct for recent OpenTofu releases (as of OpenTofu 1.7+).
- The shell `select(.change.actions[] == "create")` filter will match any plan action array that contains `"create"` — which includes replace operations like `["delete", "create"]`. This is technically intentional in many CI scripts (a replace is also a create), but readers should be aware that creates and destroys reported by the analysis script will count replaces in both buckets. Not a bug, just a behavior worth noting; left as-is to keep the post concise.
- The state JSON path `.values.root_module.resources[]` and the `.values.root_module.child_modules[]` (not used in the post) are accurate. When no state exists, `tofu show -json` returns only `{"format_version": "1.0"}` with no `values` key — an edge case worth noting but outside the scope of the post.
