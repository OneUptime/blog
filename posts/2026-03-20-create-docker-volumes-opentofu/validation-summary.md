# Validation Summary: How to Create Docker Volumes with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC tool)
- HCL (HashiCorp Configuration Language)
- Docker (containers, images, volumes, networks)
- kreuzwerker/docker Terraform/OpenTofu provider (v3.x)

## Sources Consulted
- kreuzwerker/docker provider docs — `docker_volume` resource: https://github.com/kreuzwerker/terraform-provider-docker/blob/master/docs/resources/volume.md
- kreuzwerker/docker provider docs — `docker_container` resource: https://github.com/kreuzwerker/terraform-provider-docker/blob/master/docs/resources/container.md
- kreuzwerker/docker provider registry page: https://registry.terraform.io/providers/kreuzwerker/docker/latest

## Issues Found
No technical issues found.

Verified all elements of the configuration against the official kreuzwerker/docker v3.x provider documentation:

- Provider source `kreuzwerker/docker` and version constraint `~> 3.0` — valid.
- `docker_image` with `name` and `keep_locally` arguments — valid.
- `docker_container.image = docker_image.app.image_id` — correct usage; the `image_id` attribute is the documented way to reference the image (the older `latest` attribute was removed in v3.0).
- `ports` block with `internal` and `external` — valid (these are the correct field names).
- `env` as a list of `KEY=VALUE` strings — valid.
- `volumes` block with `container_path` and `volume_name` — valid.
- `networks_advanced` block with `name` — valid (`name` is the required field).
- `restart = "unless-stopped"` — valid; documented allowed values are `no`, `on-failure`, `always`, `unless-stopped`.
- `docker_network` with `name` and `driver = "bridge"` — valid.
- `docker_volume` with `name` — valid.
- Single-line variable blocks using `;` as a separator — valid HCL2 syntax.
- Unix socket host `unix:///var/run/docker.sock` — standard Docker daemon socket path.

## Review Notes
- The "Resource Configuration" line is rendered as plain text rather than a markdown heading (missing `##` prefix). This is a stylistic/markdown formatting issue rather than a technical error, so it was left unchanged per the review scope.
- The post title focuses on "Docker Volumes" but the content covers a fuller stack (image, container, network, volume). This is an editorial concern, not a technical one.
- `keep_locally = false` will cause the image to be removed when the resource is destroyed; this is intentional but worth noting for readers who run repeated apply/destroy cycles on slow networks.
- The Docker provider runs against the local Docker daemon by default; for remote hosts users would need to set `host` to a TCP/SSH endpoint and configure TLS — out of scope for this introductory post.
