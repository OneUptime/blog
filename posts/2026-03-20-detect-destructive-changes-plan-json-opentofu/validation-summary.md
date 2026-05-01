# Validation Summary: How to Detect Destructive Changes in Plan JSON in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu plan JSON format
- jq
- Python 3
- GitHub Actions

## Sources Consulted
- OpenTofu JSON Output Format: https://opentofu.org/docs/internals/json-format/
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `show` command: https://opentofu.org/docs/v1.10/cli/commands/show/
- OpenTofu `apply` command: https://opentofu.org/docs/v1.9/cli/commands/apply/
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions artifact sharing between jobs: https://docs.github.com/en/actions/tutorials/store-and-share-data
- GitHub Actions deployments and environments: https://docs.github.com/en/actions/reference/deployments-and-environments
- `opentofu/setup-opentofu` action: https://github.com/opentofu/setup-opentofu
- AzureRM 4.0 upgrade guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/4.0-upgrade-guide

## Issues Found
- The workflow saved `tfplan` in the `plan` job but never transferred it to the `apply` job. I added `actions/upload-artifact@v4` and `actions/download-artifact@v5` because GitHub Actions jobs do not share a filesystem by default.
- The workflow assumed OpenTofu and the repository checkout were already present in both jobs. I added `actions/checkout@v6`, `opentofu/setup-opentofu@v2`, and `tofu init` in the `apply` job so the example can run on fresh GitHub-hosted runners.
- The `tofu show -json tfplan` example used the legacy positional form. I updated it to `tofu show -json -plan=tfplan` to match the current documented target-selection syntax.
- The dynamic GitHub environment selection used the scalar `environment` form. I changed it to the documented `environment.name` form for expression-based environment names.
- The protected resource example used `azurerm_sql_server`, which is deprecated and removed in AzureRM v4. I replaced it with `azurerm_mssql_server`.
- The `apply` step used `-auto-approve` with a saved plan file. I removed it because OpenTofu does not prompt for approval when applying a previously saved plan.

## Review Notes
- `tofu show -json` returns sensitive values in plain text. `plan.json` should be treated as sensitive output in CI systems.
- GitHub environment required reviewers are plan and repository-type dependent. On GitHub Free, Pro, and Team, required reviewers are only available for public repositories.
