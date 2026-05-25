# Validation Summary: How to Create Docker Containers with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform Docker provider (`kreuzwerker/docker`)
- Docker Engine
- Docker containers
- Docker images
- Docker networks
- Docker volumes
- Docker health checks
- Docker restart policies

## Sources Consulted
- Terraform Registry: `kreuzwerker/docker` provider latest documentation, https://registry.terraform.io/providers/kreuzwerker/docker/latest/docs
- Terraform Registry: `docker_container` resource documentation, https://registry.terraform.io/providers/kreuzwerker/docker/latest/docs/resources/container
- Terraform Registry: `docker_container` resource documentation for provider 3.6.1, https://registry.terraform.io/providers/kreuzwerker/docker/3.6.1/docs/resources/container
- HashiCorp Developer: Docker provider tutorial, https://developer.hashicorp.com/terraform/tutorials/docker-get-started/docker-build
- HashiCorp Developer: Provider requirements, https://developer.hashicorp.com/terraform/language/providers/requirements
- HashiCorp Developer: Terraform output values, https://developer.hashicorp.com/terraform/language/values/outputs
- Docker Docs: Volumes, https://docs.docker.com/engine/storage/volumes/
- Docker Docs: Start containers automatically, https://docs.docker.com/engine/containers/start-containers-automatically/
- Docker Docs: Running containers and health check flags, https://docs.docker.com/engine/containers/run/

## Issues Found
- The provider constraint used `~> 3.0`, while the current official Docker provider major version is 4.x. Updated the provider constraint to `~> 4.0` so new readers use the current major provider line.
- Several Node.js container examples used the base `node:20-alpine` image without a runnable application command, or referenced files such as `server.js` and `worker.js` that were not created in the tutorial. Replaced those commands with inline Node.js examples so the containers have valid long-running processes.
- The health check example used `wget` inside the Node.js image, which depends on image-specific tooling. Replaced it with a Node.js-based HTTP check so it works with the selected image.
- The multi-container stack referenced `docker_container.db_networked`, which was attached to a different Docker network and did not provide the `postgres` alias used by the application. Added a `stack_postgres` container on the stack network and updated `depends_on` to reference it.

## Review Notes
Terraform is not installed in the local workspace, so `terraform validate` could not be run. The snippets were reviewed against the official Terraform Docker provider schema and Docker documentation.
