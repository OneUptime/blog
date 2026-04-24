# Validation Summary: How to Deploy Stacks with Terraform and Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- Portainer
- Docker Compose
- Docker Swarm
- Git

## Sources Consulted
- Portainer Terraform provider `portainer_stack` resource docs: https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/docs/resources/stack.md
- Portainer Terraform provider `portainer_environment` resource docs: https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/docs/resources/environment.md
- Portainer Terraform provider source for `portainer_stack`: https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/internal/resource_stack.go
- Portainer Terraform provider stack example: https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/examples/stack/stack.tf
- Terraform `file` function docs: https://developer.hashicorp.com/terraform/language/functions/file
- Terraform `templatefile` function docs: https://developer.hashicorp.com/terraform/language/functions/templatefile
- Terraform variable block reference (`sensitive` values and state): https://developer.hashicorp.com/terraform/language/block/variable
- Terraform sensitive data guidance: https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- Portainer docs on Git-based automatic updates: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer docs on inspecting and editing stacks from Git: https://docs.portainer.io/sts/user/docker/stacks/edit

## Issues Found
- The post omitted the required `deployment_type` and `method` arguments on every `portainer_stack` example. I added them so the examples match the current provider schema.
- The file-based examples used `stack_file_content = file(...)` while describing the provider's file deployment mode. I changed those examples to the documented `method = "file"` plus `stack_file_path`.
- The templated example used `deploy.replicas` without indicating a Swarm deployment. I corrected that example to `deployment_type = "swarm"` and split the `.tftpl` content into its own copyable snippet.
- The Git-connected example used a nonexistent `portainer_stack_git` resource and several invalid attribute names (`repository_reference`, `repository_authentication`, `auto_update`). I replaced it with the current `portainer_stack` repository method and the correct attributes (`repository_reference_name`, `git_repository_authentication`, `update_interval`, `force_update`).
- The secrets section implied secure handling through `sensitive = true` alone. I corrected the wording to note that Terraform redacts sensitive values in CLI output but still persists stack environment variables in state, which matches Terraform's state behavior and the provider's `env` handling.
- The dependency-ordering wording was tightened to clarify that `depends_on` controls Terraform apply order, not application readiness.

## Review Notes
- Validation was performed against the upstream Portainer provider docs and source on GitHub, which were the authoritative references available during review.
