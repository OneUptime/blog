# Validation Summary: How to Use tofu plan to Preview Changes

## Status
validated

## Post Type
Tutorial / CLI reference guide

## Technologies Covered
- OpenTofu (`tofu` CLI)
- Terraform (referenced for context as compatible tooling)
- Infrastructure as Code (IaC) workflows
- CI/CD plan/apply patterns
- `jq` for JSON plan parsing

## Sources Consulted
- OpenTofu `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command documentation: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu `show` command documentation: https://opentofu.org/docs/cli/commands/show/
- OpenTofu `init` command documentation: https://opentofu.org/docs/cli/commands/init/
- OpenTofu JSON Output Format: https://opentofu.org/docs/internals/json-format/

## Issues Found
1. The `-detailed-exitcode` example contained a misleading comment: "Show all resource attributes (including unchanged ones)". This is incorrect — the `-detailed-exitcode` flag only modifies the exit code returned by the command (0 = no changes, 1 = error, 2 = changes present) and does not alter plan output verbosity. The comment was changed to "Return a granular exit code based on the plan result" so the description matches the flag's actual behavior.

## Review Notes
- Plan diff symbols (`+`, `-`, `~`, `-/+`, `<=`) are accurate and match the standard OpenTofu/Terraform plan output.
- All flags shown (`-var`, `-var-file`, `-out`, `-target`, `-refresh=false`, `-destroy`, `-input=false`, `-detailed-exitcode`) are valid for `tofu plan`.
- `tofu apply tfplan` correctly applies a saved plan file non-interactively, matching documented behavior.
- `tofu show -json tfplan | jq ...` is a valid pattern; the `resource_changes` schema with `change.actions` and `address` fields aligns with the OpenTofu JSON output format.
- The section heading "Detailed Plan Output" is slightly imprecise (the flag is about exit codes, not output detail), but the content is now correct, so this is left as-is to respect the constraint of not making stylistic restructuring changes.
