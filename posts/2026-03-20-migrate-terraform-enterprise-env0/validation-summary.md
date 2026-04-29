# Validation Summary: How to Migrate from Terraform Enterprise to env0 with OpenTofu

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- env0 (cloud management platform)
- env0 Terraform provider (`env0/env0`)
- OpenTofu (open-source Terraform fork)
- Terraform Enterprise / HCP Terraform (TFE) API v2
- AWS S3 backend (with native S3 locking)
- HCL configuration language
- Bash, `curl`, `jq`

## Sources Consulted
- env0 Terraform provider registry: https://registry.terraform.io/providers/env0/env0/latest/docs
- env0 Terraform provider source: https://github.com/env0/terraform-provider-env0
  - `resource_template.go`, `resource_environment.go`, `resource_project.go`, `resource_project_policy.go`, `resource_approval_policy.go`, `resource_approval_policy_assignment.go`, `resource_team.go`, `resource_team_project_assignment.go`
- env0 docs: https://docs.env0.com/
- HCP Terraform / TFE state versions API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/state-versions
- OpenTofu S3 backend docs: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu CLI `init` docs: https://opentofu.org/docs/cli/commands/init/
- OpenTofu v1.10 changelog: https://github.com/opentofu/opentofu/blob/v1.10/CHANGELOG.md

## Issues Found

1. **`env0_template` used `terraform_version` with `type = "opentofu"`.** The provider exposes a separate `opentofu_version` attribute that should be used when the template type is `opentofu`. Changed `terraform_version = "1.9.0"` to `opentofu_version = "1.10.0"` (1.10.0 is also the version that introduces native S3 locking, which the post uses later).

2. **`env0_environment` configuration block used `is_secret`.** The actual provider field is `is_sensitive`. Renamed accordingly.

3. **TFE state download endpoint was wrong.** The post called `GET /api/v2/workspaces/$WORKSPACE_ID/current-state-version/download`, which is not a documented endpoint. The documented flow is two steps: fetch `current-state-version` metadata, extract `data.attributes."hosted-state-download-url"`, then GET that archivist URL. Replaced with the correct two-step `curl | jq` pipeline.

4. **`env0_approval_policy` used `requires_approval_default`.** That attribute belongs on `env0_project_policy` (which is correctly used in Phase 6), not on the approval-policy resource. `env0_approval_policy` is a reference to an OPA policy stored in a Git repo and requires `name`, `repository`, and `path`. Rewrote the resource to use those attributes.

5. **`env0_approval_policy_assignment` used `approval_policy_id` and `scope = "ENVIRONMENT"`.** The provider field is `blueprint_id`, and the supported `scope` values are `PROJECT` (default) and `BLUEPRINT`. Renamed the field to `blueprint_id` and switched the scope to `PROJECT` with `scope_id = env0_project.app.id`, which matches the surrounding example.

## Review Notes

- `tofu init -migrate-state` is correct.
- The OpenTofu S3 backend `use_lockfile = true` was introduced in OpenTofu v1.10.0 (May 2025) and can fully replace `dynamodb_table` for state locking; the post's usage is correct.
- The `env0_team_project_assignment` `role = "Deployer"` value is a valid built-in role (`Admin`, `Planner`, `Viewer`, `Deployer`).
- The `env0_template` `type` attribute does accept `"opentofu"` as documented in the provider source.
- A future improvement could mention that env0 supports an OIDC-based credential model so static AWS keys (as shown in the `AWS_ACCESS_KEY_ID` example) can be avoided, but that is a stylistic suggestion, not a correctness issue.
