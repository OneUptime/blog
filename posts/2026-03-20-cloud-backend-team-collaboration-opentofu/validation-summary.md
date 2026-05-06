# Validation Summary: How to Use Cloud Backend for Team Collaboration in OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu
- HCP Terraform (formerly Terraform Cloud)
- HCP Terraform API
- GitHub Actions
- Sentinel policy-as-code
- Slack webhook notifications

## Sources Consulted
- OpenTofu: Using the Cloud Backend with OpenTofu CLI: https://opentofu.org/docs/cli/cloud/
- OpenTofu: Cloud Backend Settings: https://opentofu.org/docs/v1.11/cli/cloud/settings/
- OpenTofu: Backend Type: remote: https://opentofu.org/docs/language/settings/backends/remote/
- HCP Terraform: CLI-driven remote run workflow: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/run/cli
- HCP Terraform: Teams API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/teams
- HCP Terraform: Team access API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/team-access
- HCP Terraform: Workspace notification configurations API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/notification-configurations/workspace
- HCP Terraform: Workspaces API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- HCP Terraform: Runs API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/run
- HCP Terraform: Policies API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/policies
- HCP Terraform: Manage policies and policy sets: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/manage-policy-sets
- HCP Terraform: `tfrun` Sentinel import reference: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfrun
- HCP Terraform / Terraform Enterprise: Cost estimation overview: https://developer.hashicorp.com/terraform/enterprise/cost-estimation
- GitHub Docs: Workflow syntax for GitHub Actions: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- `opentofu/setup-opentofu` action README: https://github.com/opentofu/setup-opentofu

## Issues Found
- Updated outdated product naming from "Terraform Cloud" to "HCP Terraform" throughout the technical explanation, while retaining the historical name once in the introduction for clarity. HashiCorp renamed Terraform Cloud to HCP Terraform in 2024, and current docs use the HCP Terraform name.
- Replaced the `tofu force-unlock LOCK_ID` example in the run-queue section with the HCP Terraform workspace force-unlock API. The original command is for OpenTofu state locks; the section was describing HCP Terraform-managed workspace/run locking.
- Corrected the notification configuration request payload type from `notification-configurations` to `notification-configuration` to match the current request schema in the workspace notifications API docs.
- Fixed the GitHub Actions example so it can actually work as a PR check. Added `contents: read` permission because GitHub sets unspecified permissions to `none` when a `permissions` block is present, which would otherwise break `actions/checkout`.
- Updated `opentofu/setup-opentofu` from `@v1` to the current documented `@v2` usage.
- Changed the plan step to capture the exit code and added a final failure step so the workflow still comments the plan output but does not silently pass when `tofu plan` errors.
- Simplified the PR comment body generation and added `await` to the GitHub API call.
- Corrected the structured apply workflow notes to match OpenTofu cloud backend guidance for non-interactive runs. Remote execution from CI requires auto-approved deployments; if auto-apply is disabled, the apply must be handled from HCP Terraform rather than treated as a standard non-interactive CLI apply step.
- Adjusted the audit-trail `jq` example to emit the creator relationship ID instead of returning the whole `created-by` relationship object.
- Reworked the policy section to match current Sentinel/HCP Terraform behavior. Changed the code fence from `python` to `hcl` because the example is Sentinel policy code, not Python.
- Removed the invalid `tfrun.phase` usage; the current `tfrun` import reference does not document a `phase` field.
- Replaced the policy rule with a valid cost-estimate check based on `tfrun.cost_estimate.delta_monthly_cost`.
- Corrected the API example so it creates a Sentinel policy object with `kind: "sentinel"` and associates it with a policy set.
- Added the missing note that creating the policy object alone is not enough; the policy source must still be uploaded using the `links.upload` URL returned by the API.

## Review Notes
- HCP Terraform team management examples are correct for `app.terraform.io`, but HCP Europe organizations use HCP groups instead of teams.
- The saved-plan workflow shown with `tofu plan -out=plan.tfplan` and `tofu apply plan.tfplan` applies to CLI-driven HCP Terraform workspaces. That is a valid collaboration pattern, but it differs from VCS-driven workspace runs.
- Cost estimate data is available to Sentinel policy checks, not OPA policy evaluations. The post now labels the example as Sentinel-specific to avoid implying equivalent OPA behavior.
