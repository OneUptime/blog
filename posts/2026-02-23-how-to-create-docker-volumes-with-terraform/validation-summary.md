# Validation Summary: How to Create Docker Volumes with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Docker Engine
- Docker volumes
- Docker bind mounts
- Docker tmpfs-backed local volumes
- NFS-backed Docker volumes
- kreuzwerker/docker Terraform provider

## Sources Consulted
- Docker Docs: Volumes: https://docs.docker.com/engine/storage/volumes/
- Docker Docs: Storage drivers: https://docs.docker.com/engine/storage/drivers/
- Terraform Registry: kreuzwerker/docker `docker_volume` resource: https://registry.terraform.io/providers/kreuzwerker/docker/latest/docs/resources/volume
- Terraform Registry: kreuzwerker/docker `docker_container` resource: https://registry.terraform.io/providers/kreuzwerker/docker/latest/docs/resources/container
- kreuzwerker/terraform-provider-docker generated `docker_volume` docs: https://raw.githubusercontent.com/kreuzwerker/terraform-provider-docker/master/docs/resources/volume.md
- kreuzwerker/terraform-provider-docker generated `docker_container` docs: https://raw.githubusercontent.com/kreuzwerker/terraform-provider-docker/master/docs/resources/container.md
- kreuzwerker/terraform-provider-docker generated `docker_image` docs: https://raw.githubusercontent.com/kreuzwerker/terraform-provider-docker/master/docs/resources/image.md
- HashiCorp Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- HashiCorp Terraform `for_each` documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each

## Issues Found
- The introduction said all data written inside a container is lost when the container is removed. This was too broad because data written to mounted volumes or bind mounts persists. Changed it to specify data written to the container writable layer.
- The "Why Docker Volumes Matter" section said database containers lose their data on restart. Docker container writable-layer data normally survives a restart and is lost when the container is removed or recreated. Updated the wording accordingly.
- Several examples referenced `docker_image.app.image_id` before the post defined a `docker_image.app` resource. Added a simple `docker_image "app"` example before the first use so the later examples have a defined image reference.
- The dynamic multiple-volume example defined `driver_opts` in the input variable but did not pass it to the `docker_volume` resource. Added `driver_opts = each.value.driver_opts` so custom driver options are actually applied.

## Review Notes
Terraform CLI was not installed in the local environment, so I could not run `terraform validate`. The snippets were reviewed against the current kreuzwerker/docker provider schema and Docker's official volume documentation. Examples that publish fixed host ports or use local/NFS/tmpfs mounts may still require host-specific setup and available ports when applied.
