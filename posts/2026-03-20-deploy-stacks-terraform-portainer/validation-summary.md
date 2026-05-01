# Validation Summary: How to Deploy Stacks with Terraform and Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- Portainer
- Portainer Terraform provider
- Docker Compose
- Docker Swarm
- Git-based stack deployment

## Sources Consulted
- Portainer Terraform provider `portainer_stack` resource docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/stack.md
- Portainer Terraform provider `resource_stack.go` schema and implementation: https://github.com/portainer/terraform-provider-portainer/blob/main/internal/resource_stack.go
- Portainer Terraform provider example stack configuration: https://github.com/portainer/terraform-provider-portainer/blob/main/examples/stack/stack.tf
- Portainer documentation, Add a new stack: https://docs.portainer.io/user/docker/stacks/add
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Hub tag metadata for `nginx:1.25-alpine`: https://registry.hub.docker.com/v2/repositories/library/nginx/tags/1.25-alpine
- Terraform `file` function docs: https://developer.hashicorp.com/terraform/language/functions/file
- Terraform `templatefile` function docs: https://developer.hashicorp.com/terraform/language/functions/templatefile

## Issues Found
- All `portainer_stack` examples omitted the required `deployment_type` and `method` arguments. I added them throughout the post to match the current provider schema.
- The post used `env = [...]` list syntax for stack environment variables. The provider schema and official examples use repeated `env { ... }` nested blocks, so I converted each example accordingly.
- The file-based stack examples were written against `stack_file_content` even where the post was demonstrating the provider's file-based workflow. I changed those snippets to `method = "file"` with `stack_file_path`, which matches the documented resource arguments.
- The Git repository example used outdated or invalid argument names: `repository_authentication`, `auto_update`, and `force_pull_image`. I replaced them with the current provider fields `git_repository_authentication`, `stack_webhook`, and `pull_image`.
- The template example used `deploy.replicas` while implying a regular Docker Compose deployment. Docker documents the `deploy` section as optional and ignored when not implemented, so I changed that example to a Swarm stack where `deploy.replicas` is the appropriate fit.

## Review Notes
- The Compose snippets still use top-level `version` fields. Docker's current Compose documentation marks this key as obsolete but still accepted for backward compatibility, so it was not necessary to remove it to make the examples correct.
- The `nginx:1.25-alpine` tag used in the post still exists as of 2026-05-01.
