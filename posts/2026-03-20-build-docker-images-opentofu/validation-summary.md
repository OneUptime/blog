# Validation Summary: How to Build Docker Images with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Docker provider for OpenTofu/Terraform
- Docker images
- Docker containers
- Docker networks
- Docker volumes

## Sources Consulted
- OpenTofu provider configuration docs: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu provider requirements docs: https://opentofu.org/docs/language/providers/requirements/
- Docker provider overview docs: https://raw.githubusercontent.com/kreuzwerker/terraform-provider-docker/master/docs/index.md
- Docker provider `docker_image` resource docs: https://raw.githubusercontent.com/kreuzwerker/terraform-provider-docker/master/docs/resources/image.md
- Docker provider `docker_container` resource docs: https://raw.githubusercontent.com/kreuzwerker/terraform-provider-docker/master/docs/resources/container.md
- Docker provider `docker_network` resource docs: https://raw.githubusercontent.com/kreuzwerker/terraform-provider-docker/master/docs/resources/network.md
- Docker provider `docker_volume` resource docs: https://raw.githubusercontent.com/kreuzwerker/terraform-provider-docker/master/docs/resources/volume.md
- Docker provider v3 to v4 migration guide: https://raw.githubusercontent.com/kreuzwerker/terraform-provider-docker/master/docs/v3_v4_migration.md

## Issues Found
- The post title and description said the example built a Docker image, but the original `docker_image` resource only pulled an image from a registry. I changed the snippet to use the documented `build { context = "." }` block so it now actually builds an image.
- The introduction referred to an "OpenTofu Docker provider," which is imprecise. OpenTofu uses the third-party Docker provider, so I updated the wording to reflect that relationship.
- The provider version constraint was pinned to `~> 3.0`, while the provider now documents a v4 migration path and current v4 schema. I updated the example to `~> 4.0`, which remains compatible with the resource arguments used in the post.

## Review Notes
- The Docker provider's `build` context is resolved on the machine running OpenTofu, and relative paths are resolved from the current working directory.
- In provider v4, image builds use buildx by default on non-Windows platforms. The article's updated example is still valid, but environment-specific buildx behavior may affect execution details.
