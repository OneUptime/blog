# Validation Summary: How to Use tofu plan to Preview Changes - Tofu Preview Changes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI (`tofu plan`, `tofu apply`, `tofu show`)
- OpenTofu saved plan files and machine-readable output
- jq
- GitHub Actions
- actions/github-script

## Sources Consulted
- OpenTofu `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command documentation: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu `show` command documentation: https://opentofu.org/docs/cli/commands/show/
- OpenTofu JSON output format documentation: https://opentofu.org/docs/internals/json-format/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- actions/github-script documentation: https://github.com/actions/github-script

## Issues Found
1. **Saved-plan wording overpromised drift protection.** The post said saved plans provide "No drift between review and apply." OpenTofu applies a saved plan without automatically re-planning, but that does not prevent infrastructure changes outside OpenTofu from happening after the plan is created. Updated the wording to "No automatic re-planning between review and apply."
2. **`-compact-warnings` was described too broadly.** The post described it as compact output with less detail. The official docs define it as compacting warning messages only. Updated the comment to "Compact warning output."
3. **`-detailed-exitcode` was mislabeled.** The post said it shows full context of changes, but the flag changes the exit-code behavior for automation. Updated the comment to "Use detailed exit codes in CI." The listed exit code meanings were already correct.
4. **Saved plan inspection used legacy `tofu show` syntax.** Current OpenTofu docs prefer explicit target selection with `-plan=FILENAME`; positional filenames are documented as legacy behavior. Updated `tofu show changes.tfplan` and `tofu show -json changes.tfplan` to use `tofu show -plan=changes.tfplan` and `tofu show -json -plan=changes.tfplan`.
5. **GitHub Actions pipeline could mask `tofu plan` failures.** The `tofu plan ... | tee plan_output.txt` command can return `tee`'s status unless pipefail is enabled. Added `shell: bash`, which GitHub documents as running Bash with `-o pipefail`.
6. **CI comment label used Terraform instead of OpenTofu.** Updated the PR comment heading from "Terraform Plan" to "OpenTofu Plan."

## Review Notes
- The main `tofu plan`, `-out`, `apply` saved plan, variable, targeting, refresh, JSON UI, and detailed exit-code commands are valid against the current OpenTofu documentation.
- The local workspace did not have the `tofu` binary installed, so validation relied on current official OpenTofu and GitHub documentation rather than local `tofu --help` output.
- Official OpenTofu docs recommend using `-target` only in exceptional circumstances because it can lead to drift or confusion; the examples are syntactically valid, but a future revision could add that caveat.
- Saved plan files can include sensitive values in cleartext. A future revision could warn readers to protect plan files when passing them between CI stages.
