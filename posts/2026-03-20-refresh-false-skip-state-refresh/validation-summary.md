# Validation Summary: How to Use -refresh=false to Skip State Refresh

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu state refresh and refresh-only planning
- GitHub Actions workflow syntax

## Sources Consulted
- OpenTofu `tofu plan` documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `tofu apply` documentation: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu `tofu refresh` documentation: https://opentofu.org/docs/cli/commands/refresh/
- GitHub Actions workflow syntax reference: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- `actions/checkout` action repository: https://github.com/actions/checkout
- `opentofu/setup-opentofu` action repository: https://github.com/opentofu/setup-opentofu

## Issues Found
- The `-refresh-only` section described the flag as something that only "shows drift." I changed that wording to cover both documented behaviors: `tofu plan -refresh-only` detects drift, while `tofu apply -refresh-only` reconciles state and outputs to the current remote state.
- The GitHub Actions snippet was not valid workflow syntax. It placed `schedule` and `on` inside individual jobs, even though GitHub Actions defines workflow triggers under the top-level `on` key. I rewrote the example as a valid single workflow with top-level triggers and per-job `if` conditions.
- The GitHub Actions snippet also omitted required job scaffolding. GitHub requires each job to declare `runs-on`, and the example would not have worked on a fresh hosted runner without checking out the repository, installing OpenTofu, and running `tofu init`. I added `runs-on`, `actions/checkout`, `opentofu/setup-opentofu`, and `tofu init -input=false` to each job.
- The standalone refresh section incorrectly showed `tofu apply -refresh-only -auto-approve` as the recommended replacement for deprecated `tofu refresh`. OpenTofu documents that command as the effective alias for `tofu refresh` and instead recommends `tofu apply -refresh-only` so changes can be reviewed before they are committed to state. I corrected the command and its explanatory comment.
- The section heading said "Terraform State Refresh Command" even though the post is about OpenTofu and uses `tofu` commands. I corrected the heading to "OpenTofu State Refresh Command."

## Review Notes
- The core explanation of `-refresh=false` is correct and matches the OpenTofu docs: it is available for both `tofu plan` and `tofu apply`, speeds up planning by skipping remote-state synchronization, and should not be combined with `-refresh-only`.
- The scheduled drift-check example uses `tofu plan -refresh-only -no-color`, which is technically valid. If the goal is to make drift affect CI status automatically, adding `-detailed-exitcode` would be a useful future enhancement, but the current example is not incorrect without it.
- A local `tofu` binary was not available in this workspace, so command validation was performed against the official OpenTofu documentation and the official action repositories rather than local `--help` output.
