# Validation Summary: How to Manage Docker Resources via Portainer Terraform Provider (2)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Terraform
- Terraform HCL
- Docker Engine
- Docker Compose / Compose Specification

## Sources Consulted
- Portainer Terraform provider repository (official): https://github.com/portainer/terraform-provider-portainer
- Portainer Terraform provider README (official): https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/README.md
- Portainer Terraform provider `portainer_docker_image` docs (official): https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/docs/resources/docker_image.md
- Portainer Terraform provider `portainer_docker_network` docs (official): https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/docs/resources/docker_network.md
- Portainer Terraform provider `portainer_docker_volume` docs (official): https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/docs/resources/docker_volume.md
- Portainer Terraform provider `portainer_stack` docs (official): https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/docs/resources/stack.md
- Portainer Terraform provider source for current resource schemas (official): https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/internal/resource_docker_image.go
- Portainer Terraform provider source for current resource schemas (official): https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/internal/resource_docker_network.go
- Portainer Terraform provider source for current resource schemas (official): https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/internal/resource_docker_volume.go
- Portainer Terraform provider source for current resource schemas (official): https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/internal/resource_stack.go
- Terraform CLI `validate` command docs (official): https://developer.hashicorp.com/terraform/cli/commands/validate
- Docker Compose networks docs (official): https://docs.docker.com/reference/compose-file/networks/
- Docker Compose volumes docs (official): https://docs.docker.com/reference/compose-file/volumes/
- Docker CLI docs for `docker container ls` / `docker ps` (official): https://docs.docker.com/reference/cli/docker/container/ls/
- Docker CLI docs for `docker network ls` (official): https://docs.docker.com/reference/cli/docker/network/ls/
- Docker CLI docs for `docker volume ls` (official): https://docs.docker.com/reference/cli/docker/volume/ls/
- Latest Portainer Terraform provider release metadata (official): https://github.com/portainer/terraform-provider-portainer/releases/tag/v1.28.0

## Issues Found
- The post used nonexistent resources `portainer_container`, `portainer_network`, and `portainer_volume`. I replaced them with the current supported resources `portainer_docker_image`, `portainer_docker_network`, `portainer_docker_volume`, and `portainer_stack` where container deployment was intended.
- The original Step 1 claimed direct container creation through the provider. The current provider does not document or implement a first-class container-creation resource, so I rewrote that section to cover Docker image management, which is officially supported.
- The network examples used `ipam_config = { ... }`, but the provider schema defines `ipam_config` as nested blocks. I corrected both examples to `ipam_config { ... }`.
- The complete application example attempted to deploy database and app containers with unsupported Terraform resources. I replaced that with a valid `portainer_stack` example that consumes Terraform-managed external networks and volumes and uses Portainer stack environment variables.
- The inline Compose content in the stack example needed Terraform escaping for Compose variable placeholders. I changed those references to `$${...}` so the HCL is syntactically valid while still passing `${...}` through to the Compose stack.
- The validation workflow omitted `terraform init`, which the official Terraform docs require before `terraform validate`. I added `terraform init` ahead of validation.
- The Docker verification commands were technically valid but context-free. I clarified that `docker ps`, `docker network ls`, and `docker volume ls` should be run on the target Docker host.
- The article reused the same Terraform local resource name for two Docker image resources across example files. I renamed them to avoid a duplicate resource declaration if a reader combines the snippets into one module.

## Review Notes
- The current official provider supports Docker images, networks, volumes, configs, secrets, nodes, and stack-oriented workflows; direct standalone container creation is not exposed as a documented first-class resource as of April 24, 2026.
- The Step 4 example now uses Docker Compose external networks and volumes so those resources remain managed by Terraform rather than by the stack lifecycle.
- The latest official Portainer Terraform provider release at review time is `v1.28.0`, published on April 12, 2026.
