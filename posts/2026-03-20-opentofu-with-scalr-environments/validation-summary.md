# Validation Summary: How to Use OpenTofu with Scalr Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- Scalr (Terraform/OpenTofu collaboration platform)
- Scalr Terraform Provider (`Scalr/scalr`)
- Open Policy Agent (OPA)
- AWS (referenced via provider configurations and `aws_security_group`)

## Sources Consulted
- [scalr_environment | Terraform Registry](https://registry.terraform.io/providers/Scalr/scalr/latest/docs/resources/environment)
- [scalr_variable | Terraform Registry](https://registry.terraform.io/providers/Scalr/scalr/latest/docs/resources/variable)
- [scalr_policy_group | Terraform Registry](https://registry.terraform.io/providers/Scalr/scalr/latest/docs/resources/policy_group)
- [scalr_policy_group_linkage | Terraform Registry](https://registry.terraform.io/providers/Scalr/scalr/latest/docs/resources/policy_group_linkage)
- [scalr_iam_team | Terraform Registry](https://registry.terraform.io/providers/Scalr/scalr/latest/docs/resources/iam_team)
- [scalr_access_policy | Terraform Registry](https://registry.terraform.io/providers/Scalr/scalr/latest/docs/resources/access_policy)
- [Scalr Identity & Access Management Docs](https://docs.scalr.io/docs/identity-and-access-management)
- [Scalr Remote Backend Options](https://docs.scalr.io/docs/remote-backends)
- [Scalr Provider Configurations](https://docs.scalr.io/docs/provider-configurations)
- [Scalr Policy as Code Docs](https://docs.scalr.io/docs/policy-as-code)

## Issues Found
1. **`scalr_environment` misleading comment** — The comment "Default OpenTofu version for all workspaces in this environment" was attached to the `default_provider_configurations` argument, which actually assigns provider configurations, not OpenTofu versions. Updated the comment to accurately describe the argument's purpose.
2. **`scalr_policy_group` invalid schema** — The original example used an inline `policies = [...]` list with `name`/`module`/`enabled` fields. The Scalr provider's `scalr_policy_group` resource does not accept inline policies; it is backed by a VCS repository and requires `vcs_provider_id`, `opa_version`, and a `vcs_repo` block (with `identifier`, `path`, `branch`). Replaced the example with the correct VCS-backed schema.
3. **`scalr_team` resource does not exist** — The Scalr provider's team resource is `scalr_iam_team`, not `scalr_team`. Renamed the resource and updated downstream references.
4. **`scalr_environment_allowed_account` resource does not exist** — The post used a fictitious resource for granting team access to an environment. The correct mechanism is `scalr_access_policy` with a `subject` (team), `scope` (environment), and `role_ids`. Replaced the example with a proper `scalr_access_policy` referencing the team and environment scope.

## Review Notes
- The `scalr_variable` example is correct (`key`, `value`, `category`, `environment_id`, `description` are all valid arguments). Note that for HCL-encoded values like `jsonencode(...)`, users may also need to set `hcl = true` depending on how the variable is consumed inside Terraform code.
- The `terraform_remote_state` backend example is consistent with Scalr's documented remote backend usage (`hostname`, `organization`, `workspaces.name`).
- `opa_version` was set to a plausible recent OPA version (`0.59.0`); readers should pin to a version supported by their Scalr account.
- The example introduces new variables (`scalr_vcs_provider_id`, `scalr_admin_role_id`) without explicit declarations, but this is consistent with the post's existing pattern (e.g., `scalr_token`, `scalr_account_id`, `platform_team_user_ids`).
