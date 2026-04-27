# Validation Summary: How to Use OpenTofu with Scalr Workspaces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (1.7.0)
- Scalr (Terraform/OpenTofu automation platform)
- Scalr Terraform provider (`Scalr/scalr`)
- HCL configuration language
- Remote backend (`backend "remote"`)

## Sources Consulted
- Scalr provider on Terraform Registry: https://registry.terraform.io/providers/Scalr/scalr/latest/docs
- `scalr_workspace` resource docs: https://docs.scalr.io/docs/provider_resource_scalr_workspace
- `scalr_iam_team` resource docs: https://docs.scalr.io/docs/provider_resource_scalr_iam_team
- `scalr_variable` resource docs: https://docs.scalr.io/docs/provider_resource_scalr_variable
- Scalr remote backend docs: https://docs.scalr.io/docs/remote-backends
- Scalr IaC platform settings: https://docs.scalr.io/docs/iac-platform
- Scalr provider GitHub repo: https://github.com/Scalr/terraform-provider-scalr
- Scalr provider CHANGELOG: https://github.com/Scalr/terraform-provider-scalr/blob/master/CHANGELOG.md

## Issues Found
1. **Invalid `opentofu_version` attribute on `scalr_workspace`.** The post used `opentofu_version = "1.7.0"`. The Scalr provider does not expose a separate `opentofu_version` attribute — version selection always uses `terraform_version`, and the IaC tool is selected via the `iac_platform` attribute (valid values: `terraform`, `opentofu`; defaults to `terraform`). Fixed by replacing `opentofu_version = "1.7.0"` with `iac_platform = "opentofu"` and `terraform_version = "1.7.0"`.

2. **Non-existent `scalr_team` resource.** The post used a `scalr_team` resource scoped to an environment via `environment_id`. The Scalr provider's team resource is `scalr_iam_team`, and it is scoped at the account level using `account_id` (format `acc-<RANDOM STRING>`), not at the environment level. Fixed by renaming the resource to `scalr_iam_team` and replacing `environment_id = scalr_environment.production.id` with `account_id = var.scalr_account_id`.

## Review Notes
- The remote backend snippet (`backend "remote"` with `hostname`, `organization`, and `workspaces { name = ... }`) matches Scalr's documented configuration for both Terraform and OpenTofu, and works with `tofu init`/`plan`/`apply`.
- The `scalr_workspace_run_schedule` resource exists in the Scalr provider; its `apply_schedule` and `destroy_schedule` attributes were made nullable in version 1.0.5, so the empty-string usage in the example is accepted, though in real usage you would provide cron expressions. Note that newer Scalr provider versions also offer `scalr_run_schedule_rule` as an alternative scheduling resource.
- The `scalr_variable` resource correctly accepts `workspace_id` alone for workspace-scoped variables (no `account_id` needed at that scope) — the post's usage is fine.
- The `for_each`/`flatten` pattern for fan-out variable creation is valid HCL and works as written, assuming the referenced `scalr_workspace.environments` keys cover every `env` in `var.workspace_vars`.
- OpenTofu 1.7.0 was a real release; pinning to a specific version is reasonable for reproducibility but readers should consider that newer versions exist as of this review.
