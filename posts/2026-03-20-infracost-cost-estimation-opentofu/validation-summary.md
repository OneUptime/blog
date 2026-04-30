# Validation Summary: How to Use Infracost for Cost Estimation with OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Infracost CLI
- OpenTofu CLI
- GitHub Actions
- YAML configuration (`infracost.yml`)
- `jq`
- `bc`

## Sources Consulted
- Infracost CLI commands: https://www.infracost.io/docs/features/cli_commands/
- Infracost config file docs: https://www.infracost.io/docs/features/config_file/
- Infracost GitHub Actions README: https://github.com/infracost/actions
- OpenTofu `show` command docs: https://opentofu.org/docs/cli/commands/show/
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `init` command docs: https://opentofu.org/docs/cli/commands/init/
- `opentofu/setup-opentofu` README: https://github.com/opentofu/setup-opentofu
- `actions/checkout` README: https://github.com/actions/checkout
- GitHub Actions contexts reference: https://docs.github.com/en/actions/reference/workflows-and-actions/contexts

## Issues Found
- The saved-plan example skipped `tofu init`, which is required in a fresh working directory before `tofu plan`. Added `tofu init`.
- The post used the legacy `tofu show -json tfplan.binary` positional form. Updated it to `tofu show -json -plan=tfplan.binary` to match the current OpenTofu command documentation.
- The "Before vs After" example used `git stash` and `git stash pop` as if they switched between `main` and a feature branch. They do not. Replaced that sequence with an actual baseline-from-`main` flow using `git checkout main` and `git checkout -`.
- The GitHub Actions workflow used `git checkout ${{ github.base_ref }}` and `git checkout ${{ github.head_ref }}` after a default checkout. That does not match Infracost's documented workflow and can fail because `actions/checkout` fetches only the triggering ref by default. Replaced it with separate `actions/checkout@v4` steps for the base branch and PR branch.
- The workflow used `opentofu/setup-opentofu@v1`. Updated it to `opentofu/setup-opentofu@v2`, which is the current usage shown in the action's README.
- The `terraform_var_files` entries in `infracost.yml` were incorrect. Infracost resolves those paths relative to each project's `path`, so the original values would resolve incorrectly. Changed both entries to `terraform.tfvars`.

## Review Notes
- Infracost's official CLI docs are still written primarily in Terraform terms, but the post's OpenTofu flow is valid because Infracost accepts Terraform-compatible HCL and OpenTofu-generated plan JSON.
- The GitHub Actions example uses the documented CLI-based setup path with `infracost/actions/setup@v3`. Infracost also documents newer `diff` and `scan` actions, but those are early access and were not substituted here.
