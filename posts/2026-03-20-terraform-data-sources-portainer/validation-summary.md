# Validation Summary: How to Use Terraform Data Sources to Read Portainer Resources (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform data sources
- Terraform remote state
- Portainer
- Portainer Terraform provider
- HCL

## Sources Consulted
- Portainer Terraform provider documentation: https://registry.terraform.io/providers/portainer/portainer/latest/docs
- Portainer Terraform provider source, latest release v1.28.0: https://github.com/portainer/terraform-provider-portainer/tree/v1.28.0
- Portainer `portainer_environment` data source documentation: https://raw.githubusercontent.com/portainer/terraform-provider-portainer/v1.28.0/docs/data-sources/environment.md
- Portainer `portainer_user` data source documentation: https://raw.githubusercontent.com/portainer/terraform-provider-portainer/v1.28.0/docs/data-sources/user.md
- Portainer `portainer_team` data source documentation: https://raw.githubusercontent.com/portainer/terraform-provider-portainer/v1.28.0/docs/data-sources/team.md
- Portainer `portainer_registry` data source documentation: https://raw.githubusercontent.com/portainer/terraform-provider-portainer/v1.28.0/docs/data-sources/registry.md
- Portainer `portainer_stack` resource documentation: https://raw.githubusercontent.com/portainer/terraform-provider-portainer/v1.28.0/docs/resources/stack.md
- Portainer `portainer_environment` resource documentation: https://raw.githubusercontent.com/portainer/terraform-provider-portainer/v1.28.0/docs/resources/environment.md
- Terraform data sources documentation: https://developer.hashicorp.com/terraform/language/data-sources
- Terraform `terraform_remote_state` data source documentation: https://developer.hashicorp.com/terraform/language/state/remote-state-data

## Issues Found
- The `portainer_stack` examples omitted required `deployment_type` and `method` arguments, and some snippets did not include a stack definition. Added `deployment_type = "standalone"`, `method = "string"`, and `stack_file_content` where needed.
- The team membership example referenced `portainer_user.new_hire.id`, which was not defined in the post. Changed it to reference the existing `data.portainer_user.alice.id` data source and updated the comment accordingly.
- The registry example used `portainer_environment_registry`, which is not a documented resource in the Portainer provider. Replaced it with a documented `portainer_stack` `registries` example that uses the looked-up registry ID.
- The combined resource example used `url` for `portainer_environment`, but the provider schema requires `environment_address`. Updated the argument and added `team_access_policies` so the example actually grants the referenced DevOps team access as described.
- The post used an unsupported plural `portainer_environments` data source. Replaced that section with a `for_each` pattern over the documented `portainer_environment` data source for reading multiple known environments by name.

## Review Notes
Terraform and OpenTofu are not installed in this environment, so I could not run `terraform fmt` or `terraform validate`. The examples were checked against the Portainer provider v1.28.0 documentation/source and current HashiCorp Terraform language documentation.
