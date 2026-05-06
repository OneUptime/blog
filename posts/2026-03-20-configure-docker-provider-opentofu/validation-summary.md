# Validation Summary: How to Configure Docker Provider with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Docker
- `kreuzwerker/docker` provider
- HCL

## Sources Consulted
- OpenTofu Settings: https://opentofu.org/docs/language/settings/
- OpenTofu Provider Requirements: https://opentofu.org/docs/language/providers/requirements/
- Docker provider repository and current release information: https://github.com/kreuzwerker/terraform-provider-docker
- Docker provider documentation index: https://github.com/kreuzwerker/terraform-provider-docker/blob/master/docs/index.md
- Docker provider `docker_container` resource documentation: https://github.com/kreuzwerker/terraform-provider-docker/blob/master/docs/resources/container.md
- Docker provider `docker_image` resource documentation: https://github.com/kreuzwerker/terraform-provider-docker/blob/master/docs/resources/image.md
- Docker provider `docker_network` resource documentation: https://github.com/kreuzwerker/terraform-provider-docker/blob/master/docs/resources/network.md
- Docker provider `docker_volume` resource documentation: https://github.com/kreuzwerker/terraform-provider-docker/blob/master/docs/resources/volume.md

## Issues Found
- The provider version in the `required_providers` block was pinned to `~> 3.0`, which is outdated. The current provider release is `4.2.0`, and the current provider docs use the v4 line. I updated the example to `version = "4.2.0"` so the post reflects the current supported provider series.
- The introduction referred to an "OpenTofu Docker provider," which is imprecise. The provider in use is the Docker provider (`kreuzwerker/docker`) used by OpenTofu. I updated the sentence to describe that relationship accurately.

## Review Notes
- The use of the `terraform` block is correct in OpenTofu; OpenTofu v1.x keeps the `terraform` block name for compatibility.
- The `docker_container` example is technically valid with current docs: `image_id`, `ports`, `env`, `volumes.volume_name`, `networks_advanced.name`, and `restart = "unless-stopped"` are all supported.
- `host = "unix:///var/run/docker.sock"` is valid for Unix-like Docker hosts. Other environments, such as Windows or remote Docker hosts over `ssh://` or `tcp://`, require different provider configuration.
