# Validation Summary: How to Use Terraform Cloud CLI in CI/CD Pipelines

## Status
validated

## Post Type
Tutorial / CI/CD integration guide

## Technologies Covered
- Terraform CLI
- Terraform Cloud / HCP Terraform CLI-driven workflows
- Terraform `cloud` block
- HCP Terraform Workspace Variables API
- HCP Terraform Workspaces API
- GitHub Actions
- GitLab CI
- Sentinel policy checks

## Sources Consulted
- HashiCorp Developer: Use HCP Terraform with the Terraform CLI - https://developer.hashicorp.com/terraform/cli/cloud
- HashiCorp Developer: CLI-driven remote run workflow for HCP Terraform - https://developer.hashicorp.com/terraform/cloud-docs/run/cli
- HashiCorp Developer: Terraform block reference / `cloud` block - https://developer.hashicorp.com/terraform/language/settings/terraform-cloud
- HashiCorp Developer: Workspace variables API reference - https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspace-variables
- HashiCorp Developer: Workspaces API reference - https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- HashiCorp Developer: Run modes and options in HCP Terraform - https://developer.hashicorp.com/terraform/cloud-docs/run/modes-and-options
- HashiCorp Developer: Workspace locking settings - https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings
- HashiCorp Developer: HCP Terraform plans and features - https://developer.hashicorp.com/terraform/cloud-docs/overview
- HashiCorp Developer: Cost estimation overview - https://developer.hashicorp.com/terraform/enterprise/cost-estimation

## Issues Found
- The post stated Terraform Cloud supports only two workflow models. HashiCorp documents UI/VCS-driven, API-driven, and CLI-driven workflows, so the text now says the section focuses on two common options while acknowledging API-driven runs.
- The setup section described the `cloud {}` configuration as a backend. The `cloud` block is the current Terraform CLI integration configuration and is mutually exclusive with a `backend` block, so the wording now says "Terraform Cloud integration."
- The GitHub Actions and status-check examples used `terraform plan | tee` without enabling shell pipe failure handling. Without `set -o pipefail`, the step can succeed when `terraform plan` fails because the pipeline returns `tee`'s exit status. Added `set -o pipefail` before those commands.
- The variables section said workspace variables could be set via "API or CLI" while the examples use the workspace variables API and run-specific `TF_VAR_` environment variables. Updated the wording to match the mechanisms shown.
- The workspace management section was labeled "with CLI" but used the HCP Terraform API. Renamed it to "with API."
- The workspace creation payload used `tag-names` in `attributes`. Current HCP Terraform Workspaces API documentation uses `relationships.tag-bindings` for key-value workspace tags when creating a workspace. Updated the payload to use `tag-bindings`.
- The summary referred to a "`cloud {}` backend block." Updated it to "`cloud {}` block" to match Terraform terminology.

## Review Notes
- The post uses the older "Terraform Cloud" naming while HashiCorp documentation now commonly uses "HCP Terraform." The product URLs and API host remain valid, so this was left unchanged except where source names appear in this validation summary.
- The examples pin Terraform `1.7.4`, which is older than current Terraform releases but still compatible with the demonstrated CLI-driven workflow. Future revisions could update the pinned version intentionally across examples.
