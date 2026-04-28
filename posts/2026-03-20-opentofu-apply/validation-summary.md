# Validation Summary: How to Use tofu apply to Deploy Infrastructure

## Status
validated

## Post Type
Tutorial / CLI reference guide

## Technologies Covered
- OpenTofu (`tofu apply` command)
- Terraform (compatible CLI)
- GitHub Actions (CI/CD example with `actions/upload-artifact@v4` and `actions/download-artifact@v4`)
- AWS provider resources (`aws_s3_bucket`, `aws_instance`) used as illustrative examples

## Sources Consulted
- OpenTofu CLI documentation for `apply`: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu CLI documentation for `plan`: https://opentofu.org/docs/cli/commands/plan/
- GitHub Actions `upload-artifact` / `download-artifact` v4 (current major version)

## Issues Found
No technical issues found.

All claims and commands were verified:
- `tofu apply` runs a fresh plan and prompts for confirmation by default — correct.
- `tofu apply tfplan` applies a saved plan and skips the confirmation prompt — confirmed by official docs ("OpenTofu takes the actions in the saved plan without prompting you for confirmation").
- `-auto-approve` skips the interactive approval — correct.
- `-var=` and `-var-file=` flags — correct syntax and behavior.
- `-target=<resource>` and `-target=module.<name>` — correct (and the caveat about state inconsistency is accurate).
- `-parallelism=N` with documented default of 10 — confirmed by official docs.
- `-refresh=false` — correct.
- `-replace=<resource>` — correct (forces destroy and recreate).
- The "Apply complete! Resources: X added, Y changed, Z destroyed." output format matches actual OpenTofu output.
- The GitHub Actions workflow uses `actions/upload-artifact@v4` and `actions/download-artifact@v4`, which are current.
- The "pick up where it left off" behavior after partial failure is accurate — OpenTofu persists state for completed resources, and re-running apply continues from there.

## Review Notes
- The post correctly emphasizes the safer pattern of using saved plan files (`tofu plan -out=tfplan` then `tofu apply tfplan`) over `-auto-approve` for CI/CD, which aligns with OpenTofu's recommended practices.
- The advice to use `-target` sparingly is accurate — official docs warn that targeting can produce a state inconsistent with the configuration.
- One minor note (not an issue): when re-running `tofu apply` after a partial failure, OpenTofu re-plans against the (partially updated) state, so it's not literally "resuming" the previous run — it computes a new plan based on what exists. The post's phrasing ("pick up where it left off") is a reasonable simplification for the audience.
