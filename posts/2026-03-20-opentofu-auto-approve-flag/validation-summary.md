# Validation Summary: How to Use the -auto-approve Flag in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- OpenTofu (CLI: `tofu apply`, `tofu destroy`, `tofu plan`, `tofu show`)
- Terraform (compatible CLI semantics)
- GitHub Actions (workflow YAML, environments with manual approval)
- jq (JSON processing)
- Bash (shell scripting)

## Sources Consulted
- OpenTofu CLI documentation for `apply` and `destroy`: https://opentotu.org/docs/cli/commands/apply/ and https://opentofu.org/docs/cli/commands/destroy/
- OpenTofu CLI documentation for `plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu Machine-Readable JSON output / plan format documentation: https://opentofu.org/docs/internals/json-format/
- OpenTofu environment variables (`TF_CLI_ARGS_*`): https://opentofu.org/docs/cli/config/environment-variables/
- GitHub Actions environments and manual approval: https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment

## Issues Found
No technical issues found.

Verified items:
- `-auto-approve` flag is valid for both `tofu apply` and `tofu destroy` and skips the interactive confirmation prompt.
- Applying a saved plan file (`tofu apply tfplan`) does not prompt for confirmation — this is correct OpenTofu behavior.
- `-parallelism=20` and `-var-file=...` are valid flags for `tofu apply`.
- `TF_CLI_ARGS_apply` is a valid OpenTofu environment variable that prepends arguments to `tofu apply`.
- `tofu show -json tfplan` produces a JSON plan with `resource_changes[].change.actions[]`; `"delete"` is a valid action value in the plan JSON format.
- The jq query in Pattern 3 is syntactically valid and correctly identifies resource changes that include a delete action.
- GitHub Actions `environment:` job-level key with required reviewers is the correct mechanism for manual approval gates.

## Review Notes
- The jq filter `[.resource_changes[] | select(.change.actions[] == "delete")] | length` will also count resources being replaced (actions like `["delete", "create"]`), since the array contains `"delete"`. This is reasonable for the intent shown ("includes destroy operations / resource deletions") but readers wanting to count only pure deletions could use a more specific filter such as `select(.change.actions == ["delete"])`. Not an error — just a future refinement.
- The post correctly notes that plan files are the preferred approval mechanism in CI/CD; this aligns with OpenTofu's documented best practices.
- Version-specific information: no specific OpenTofu version is referenced. The flags and behavior described apply to all current OpenTofu releases (1.x).
