# Validation Summary: How to Manage Docker Resources via Portainer Terraform Provider

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Terraform Provider
- Terraform
- Docker networks
- Docker volumes
- Docker Compose stacks in Portainer

## Sources Consulted
- Portainer Terraform Provider repository and supported resources list: https://github.com/portainer/terraform-provider-portainer
- `portainer_docker_network` resource docs: https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/docs/resources/docker_network.md
- `portainer_docker_volume` resource docs: https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/docs/resources/docker_volume.md
- `portainer_stack` resource docs: https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/docs/resources/stack.md
- `portainer_deploy` resource docs: https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/docs/resources/deploy.md
- `portainer_container_exec` resource docs: https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/docs/resources/container_exec.md
- Portainer provider source for `portainer_docker_network`: https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/internal/resource_docker_network.go
- Portainer provider source for `portainer_docker_volume`: https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/internal/resource_docker_volume.go
- Terraform string template escaping (`$${...}`): https://developer.hashicorp.com/terraform/language/expressions/strings
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Compose volumes reference: https://docs.docker.com/reference/compose-file/volumes/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/

## Issues Found
1. The post claimed the provider supports standalone containers through a `portainer_container` resource. The current official provider does not expose that resource, so I replaced those examples with the supported `portainer_stack` workflow and updated the surrounding explanation.
2. The Docker network example used `ipam_config = [ ... ]`, but the provider defines `ipam_config` as a nested block. I changed it to block syntax to match the provider schema and documentation.
3. The Swarm overlay network example used `driver_options`, but the provider resource uses `options`. I changed the field name and added `scope = "swarm"` to align the example with Swarm overlay usage.
4. The Docker volume example used `driver_options`, but the provider resource uses `driver_opts`. I corrected the argument name to match the provider schema.
5. The original container examples referenced unsupported arguments such as `restart_policy`, `port_bindings`, `volumes`, `env`, `network_mode`, `networks`, `memory_limit`, and `cpu_limit` on a nonexistent `portainer_container` resource. These were removed as part of the shift to `portainer_stack`.
6. The original Redis example referenced `portainer_docker_volume.redis_data`, which was never defined in the post. The replacement stack example no longer contains that broken reference.
7. The full application example depended on unsupported `portainer_container` resources and a direct container-to-container workflow. I replaced it with a supported `portainer_stack` example that reuses the separately managed Docker network and volume.
8. The embedded Compose content needed Terraform literal escaping for Compose variables. I used `$${...}` where appropriate and supplied the values through `env` blocks so the example remains valid Terraform and valid Compose input.

## Review Notes
- The post is now technically accurate for the current Portainer Terraform provider, but container lifecycle management in this provider is stack-centric rather than direct container-resource-centric.
- The examples use Compose external network and volume references so the stack can attach to resources created separately by `portainer_docker_network` and `portainer_docker_volume`.
