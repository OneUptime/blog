# Validation Summary: How to Use Terraform Data Sources to Read Portainer Resources

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Terraform
- Portainer Terraform Provider
- HCL
- Terraform remote state

## Sources Consulted
- Portainer Terraform provider overview: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/index.md
- `portainer_environment` data source: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/data-sources/environment.md
- `portainer_user` data source: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/data-sources/user.md
- `portainer_team` data source: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/data-sources/team.md
- `portainer_registry` data source: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/data-sources/registry.md
- `portainer_role` data source: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/data-sources/role.md
- `portainer_stack` data source: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/data-sources/stack.md
- `portainer_environment` resource: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/environment.md
- `portainer_stack` resource: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/stack.md
- Provider source for environment schema: https://github.com/portainer/terraform-provider-portainer/blob/main/internal/resource_environment.go
- Provider source for stack schema: https://github.com/portainer/terraform-provider-portainer/blob/main/internal/resource_stack.go
- Terraform `terraform_remote_state` data source: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- Terraform conditional expressions: https://developer.hashicorp.com/terraform/language/expressions/conditionals
- Terraform `templatefile` function: https://developer.hashicorp.com/terraform/language/functions/templatefile

## Issues Found
- The introductory resource example used `...`, which is not valid HCL. I replaced it with a valid `portainer_environment` example using the current provider arguments.
- Multiple `portainer_stack` examples omitted required arguments. I added `deployment_type` and `method` everywhere the post creates a stack, because the current provider requires both.
- The environment creation example used unsupported argument names: `environment_url` and `environment_type`. I corrected these to `environment_address` and `type`, which match the current Portainer provider schema.
- The post used a non-existent `portainer_environment_team_access` resource in two places. I replaced that with supported constructs: `team_access_policies` on `portainer_environment` for environment access, and stack ownership controls on `portainer_stack` for stack access.
- The Step 6 example referenced `portainer_environments`, which is not a supported data source in the current provider. I replaced it with a supported discovery-style example using `portainer_role`, which can return a list of roles.
- The complete example used `env = [...]`, but the current `portainer_stack` schema expects `env` nested blocks. I corrected the syntax accordingly.
- The workspace conditional example used backslash line continuations that are not valid Terraform expression syntax. I reformatted the conditional expression to standard HCL.

## Review Notes
- The official provider markdown and provider source are not perfectly aligned in every detail, so the review used provider source files as the final authority where needed.
- Local CLI syntax validation was not run because the Terraform CLI was not installed in this workspace.
