# Validation Summary: How to Manage Portainer Users and Teams with Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Terraform
- HCL
- GitHub Actions

## Sources Consulted
- Portainer Terraform Provider README: https://github.com/portainer/terraform-provider-portainer
- Portainer Terraform provider `portainer_user` resource docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/user.md
- Portainer Terraform provider `portainer_team` resource docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/team.md
- Portainer Terraform provider `portainer_team_membership` resource docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/team_membership.md
- Portainer Terraform provider `portainer_environment` resource docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/environment.md
- Portainer official documentation on roles: https://docs.portainer.io/sts/admin/user/roles
- Portainer official documentation on managing environment access: https://docs.portainer.io/sts/admin/environments/environments
- Terraform `for_each` reference: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform CLI `apply` reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform CLI environment variables reference: https://developer.hashicorp.com/terraform/cli/config/environment-variables

## Issues Found
- The post used a non-existent `portainer_environment_access` resource with unsupported `environment_id`, `team_accesses`, and `user_accesses` arguments. I replaced that example with the current supported pattern on `portainer_environment` using `team_access_policies` and `user_access_policies`, and resolved role IDs through `data "portainer_role"` so the example matches current Portainer RBAC usage.
- The "Managing Users at Scale" section told readers to edit `variables.tf`, but the post defines the relevant data in the `team_members` map shown earlier. I updated those instructions to point to the `team_members` map directly.

## Review Notes
Environment-level role assignment in Portainer uses Portainer roles. Portainer documents the RBAC roles feature under Business Edition, so readers using CE should verify whether the same role-based access controls are available in their installation.
