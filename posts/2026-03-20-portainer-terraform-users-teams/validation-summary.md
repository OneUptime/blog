# Validation Summary: How to Manage Portainer Users and Teams with Terraform - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Portainer Terraform provider
- Terraform
- Portainer RBAC for users, teams, team memberships, and environment access

## Sources Consulted
- Portainer Terraform provider repository: https://github.com/portainer/terraform-provider-portainer
- `portainer_user` resource docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/user.md
- `portainer_team` resource docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/team.md
- `portainer_team_membership` resource docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/team_membership.md
- `portainer_environment` resource docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/environment.md
- `portainer_role` data source docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/data-sources/role.md
- Official provider source for schema verification: https://github.com/portainer/terraform-provider-portainer/blob/main/internal/resource_user.go
- Official provider source for schema verification: https://github.com/portainer/terraform-provider-portainer/blob/main/internal/resource_team_membership.go
- Official provider source for schema verification: https://github.com/portainer/terraform-provider-portainer/blob/main/internal/resource_environment.go
- Portainer roles documentation: https://docs.portainer.io/sts/admin/user/roles
- Portainer environment access documentation: https://docs.portainer.io/sts/admin/environments/access
- Portainer environments overview: https://docs.portainer.io/admin/environments/environments

## Issues Found
- The post used `portainer_environment_access_policy`, but the official Portainer provider does not expose that resource. I replaced Step 6 with the supported `team_access_policies` argument on `portainer_environment`.
- The original Step 6 hard-coded `access_level` values (`1=admin`, `2=operator`, `3=read-only`), but Portainer environment access uses role IDs rather than that fixed schema. I changed the example to resolve role IDs through the official `portainer_role` data source.
- The `initial_passwords` variable had `default = {}`, which would fail with key lookups like `var.initial_passwords["alice"]` unless values were separately supplied. I removed the unusable default.
- The admin user example omitted `lifecycle { ignore_changes = [password] }`, which conflicted with the guide’s own recommendation and would allow later applies to reset that password. I added the lifecycle block.
- The offboarding example said `terraform plan` would destroy only `portainer_user.diana`, but removing both resources from configuration would also destroy the membership resource. I corrected the example comment.
- The prerequisites listed only an API access token, while the official provider supports `api_key` or `api_user`/`api_password`. I clarified the prerequisite wording.

## Review Notes
- Per-environment RBAC roles such as `HelpDesk` and `Environment Administrator` are Portainer Business Edition features, so Step 6 now calls that out explicitly.
- Terraform CLI was not installed in the workspace on 2026-04-24, so command verification was documentation-based rather than local `terraform --help` output.
