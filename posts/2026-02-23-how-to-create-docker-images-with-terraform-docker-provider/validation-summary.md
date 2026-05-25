# Validation Summary: How to Create Docker Images with Terraform Docker Provider

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Docker Engine
- Terraform Docker provider (`kreuzwerker/docker`)
- Docker images and Dockerfiles
- Container registries, including Docker Hub, Amazon ECR, and GitHub Container Registry

## Sources Consulted
- Terraform Docker provider overview: https://github.com/kreuzwerker/terraform-provider-docker/blob/master/docs/index.md
- Terraform Docker provider `docker_image` resource: https://github.com/kreuzwerker/terraform-provider-docker/blob/master/docs/resources/image.md
- Terraform Docker provider `docker_registry_image` resource: https://github.com/kreuzwerker/terraform-provider-docker/blob/master/docs/resources/registry_image.md
- Terraform Docker provider `docker_tag` resource: https://registry.terraform.io/providers/kreuzwerker/docker/latest/docs/resources/tag
- Terraform Docker provider `docker_image` data source: https://github.com/kreuzwerker/terraform-provider-docker/blob/master/docs/data-sources/image.md
- Terraform Docker provider `docker_registry_image` data source: https://github.com/kreuzwerker/terraform-provider-docker/blob/master/docs/data-sources/registry_image.md
- Terraform AWS provider `aws_ecr_authorization_token` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ecr_authorization_token
- Amazon ECR authorization documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html

## Issues Found
- The remote Docker host TLS example said certificates could be configured, but the snippet only showed `host` and `registry_auth`. Added `cert_path = pathexpand("~/.docker")`, which is supported by the Docker provider for TLS certificate configuration.
- The `keep_locally = false` comment incorrectly described keeping the image locally. Updated the comment to match provider behavior: when false, the local image is deleted on resource destroy.
- The image push example described using a provisioner even though it used the `docker_registry_image` resource. Updated the comment to refer to the registry image resource.
- The image push example built `myapp:latest`, created an ECR tag with `docker_tag`, but the registry image resource did not reference or depend on that tag. Changed `name` to reference `docker_tag.app_ecr.target_image` and added `tag_triggers`/`triggers` based on `docker_image.app_build.image_id` so retagging and repushing occur when the local image changes.
- The `keep_remotely = true` comment incorrectly described rebuilding when source changes. Updated it to describe preserving the remote image on destroy.

## Review Notes
- The post uses `version = "~> 3.0"` for the Docker provider. The latest provider documentation reviewed is newer, but the APIs used in the post are still valid in current provider documentation.
- The examples are illustrative snippets and assume supporting variables, AWS data sources, registry repositories, and Dockerfile stages exist where referenced.
