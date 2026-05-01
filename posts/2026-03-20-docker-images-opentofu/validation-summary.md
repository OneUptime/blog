# Validation Summary: How to Pull Docker Images with OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu
- Docker
- `kreuzwerker/docker` provider
- `docker_registry_image` data source
- `docker_image` resource

## Sources Consulted
- OpenTofu official documentation, Provider Configuration: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu official documentation, Provider Requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu official documentation, Initializing Working Directories / `tofu init`: https://opentofu.org/docs/cli/init/
- OpenTofu official documentation, `tofu plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu official documentation, `tofu apply`: https://opentofu.org/docs/v1.11/cli/commands/apply/
- Docker provider official documentation in the provider repository, Provider overview: https://github.com/kreuzwerker/terraform-provider-docker/blob/master/docs/index.md
- Docker provider official documentation in the provider repository, `docker_image` resource: https://github.com/kreuzwerker/terraform-provider-docker/blob/master/docs/resources/image.md
- Docker provider official documentation in the provider repository, `docker_registry_image` data source: https://github.com/kreuzwerker/terraform-provider-docker/blob/master/docs/data-sources/registry_image.md

## Issues Found
1. **The post did not actually show how to pull Docker images with OpenTofu**: the original content configured the Kubernetes provider and created Kubernetes namespaces, quotas, deployments, and services. That does not demonstrate Docker image pulls with OpenTofu. I replaced the Kubernetes example with the documented Docker provider workflow using `docker_registry_image` and `docker_image`.
2. **The original prerequisites were incorrect for the example**: the post said you needed a Kubernetes cluster or Docker daemon, but the title and description were about pulling Docker images. I corrected the prerequisites to require a Docker daemon and added an accurate note about private-registry authentication.
3. **The original configuration referenced an undefined variable**: `var.container_image` was used in the deployment but never declared. I replaced the broken Kubernetes variables with defined Docker-oriented variables: `docker_host`, `image_name`, `keep_locally`, and `registry_address`.
4. **The best-practices section was Kubernetes-specific rather than Docker-specific**: it discussed resource quotas, probes, and security contexts, which are unrelated to pulling Docker images with the Docker provider. I updated the guidance to cover pinned tags or digests, `pull_triggers`, credential handling, `keep_locally`, and correct registry addressing.
5. **The conclusion described Kubernetes and GitOps behavior rather than Docker image management**: I rewrote it so it accurately reflects digest-aware image pulls with the Docker provider and private-registry authentication.

## Review Notes
- The corrected post now aligns with the documented Docker provider behavior: `docker_image` can pull images, and pairing it with `docker_registry_image` plus `pull_triggers` is the documented way to refresh when the remote digest changes.
- The OpenTofu configuration correctly uses a top-level `terraform` block; OpenTofu retains this block name.
- Local CLI execution validation was not possible in this environment because `tofu`, `terraform`, and `docker` were not installed. Validation was completed against official documentation instead.
