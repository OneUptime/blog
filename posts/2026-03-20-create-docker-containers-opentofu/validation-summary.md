# Validation Summary: How to Create Docker Containers with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL2)
- Docker (containers, images, volumes, networks)
- kreuzwerker/docker provider (v3.x)

## Sources Consulted
- kreuzwerker/docker provider registry: https://registry.terraform.io/providers/kreuzwerker/docker/latest/docs
- `docker_image` resource: https://registry.terraform.io/providers/kreuzwerker/docker/latest/docs/resources/image
- `docker_container` resource: https://registry.terraform.io/providers/kreuzwerker/docker/latest/docs/resources/container
- `docker_network` resource: https://registry.terraform.io/providers/kreuzwerker/docker/latest/docs/resources/network
- `docker_volume` resource: https://registry.terraform.io/providers/kreuzwerker/docker/latest/docs/resources/volume
- HCL native syntax specification: https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md

## Issues Found

1. **Invalid HCL one-line block syntax in `## Variables`** — Several variable declarations placed two attributes inside a single-line block separated by `;`, e.g., `variable "image_tag" { type = string; default = "latest" }`. The HCL2 native syntax spec defines `OneLineBlock` as permitting at most one attribute (`(Identifier "=" Expression)?`) and requires `Newline` as the attribute terminator; semicolons are not a defined separator. Configurations using this form fail to parse with `tofu`/`terraform`. **Fix:** Rewrote the multi-attribute one-line blocks as standard multi-line blocks. Single-attribute one-liners (e.g., `variable "app_name" { type = string }`) were left as-is since they are valid `OneLineBlock` forms.

All other technical content was verified against the kreuzwerker/docker v3.x documentation and is correct:

- Provider source `kreuzwerker/docker` and version constraint `~> 3.0` — valid.
- `unix:///var/run/docker.sock` — standard Docker daemon socket.
- `docker_image` with `name` and `keep_locally` arguments — valid.
- `docker_container.image = docker_image.app.image_id` — correct; `image_id` is the documented attribute that replaced the deprecated/removed `latest` in v3.0.
- `ports` block with `internal` / `external` field names — valid.
- `env` as a list of `KEY=VALUE` strings — valid (the underlying type is a Set of String, but list literal syntax is the documented form).
- `volumes` block with `container_path` / `volume_name` — valid.
- `networks_advanced` block with required `name` field — valid.
- `restart = "unless-stopped"` — valid; documented allowed values are `no`, `on-failure`, `always`, `unless-stopped`.
- `docker_network` with `name` and `driver = "bridge"` — valid.
- `docker_volume` with `name` — valid.

## Review Notes
- Line 30 has `Resource Configuration` rendered as plain text rather than a markdown heading (missing `##` prefix). This is a markdown formatting inconsistency rather than a technical error in the code — left untouched per the review scope.
- The post title is "Docker Containers" but the example also covers an image, network, and volume. This is appropriate for showing a working container, but readers focused only on container resources may find the broader example distracting.
- `keep_locally = false` causes the image to be removed on destroy; intentional but worth noting for users who run repeated apply/destroy cycles on slow networks.
- For remote Docker hosts, `host` would need to be set to a TCP/SSH endpoint with TLS configured — out of scope for this introductory post.
- The kreuzwerker/docker provider v3.x is current and actively maintained as of the validation date.
