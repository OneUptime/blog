# Validation Summary: How to Remove a Stack in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker volumes
- Docker networks
- Portainer HTTP API
- Bash
- `jq`

## Sources Consulted
- Docker Docs: `docker compose down` https://docs.docker.com/reference/cli/docker/compose/down/
- Docker Docs: `docker volume ls` https://docs.docker.com/reference/cli/docker/volume/ls/
- Docker Docs: `docker network ls` https://docs.docker.com/reference/cli/docker/network/ls/
- Docker Docs: `docker network prune` https://docs.docker.com/reference/cli/docker/network/prune/
- Docker Docs: How Compose works https://docs.docker.com/compose/intro/compose-application-model/
- Docker Docs: Compose file `services` reference https://docs.docker.com/reference/compose-file/services/
- Portainer Docs: Remove a stack https://docs.portainer.io/user/docker/stacks/remove
- Portainer Docs: Stacks overview https://docs.portainer.io/user/docker/stacks
- Portainer Docs: Accessing the Portainer API https://docs.portainer.io/2.21/api/access
- Portainer Docs: API documentation https://docs.portainer.io/api/docs
- Portainer OpenAPI spec (CE 2.39.1) https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer Docs: What does Portainer's backup include? https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- Portainer Docs: Access control https://docs.portainer.io/sts/advanced/access-control
- Portainer source: stack delete UI https://github.com/portainer/portainer/blob/742523de1728af0bda6454362ac4945d014c6f3c/app/react/docker/stacks/ItemView/StackInfoTab/StackActions.tsx
- Portainer source: stack delete handler https://github.com/portainer/portainer/blob/742523de1728af0bda6454362ac4945d014c6f3c/api/http/handler/stacks/stack_delete.go
- Portainer source: compose undeploy path https://github.com/portainer/portainer/blob/742523de1728af0bda6454362ac4945d014c6f3c/api/stacks/deployments/deployer.go
- Portainer source: compose stack manager down behavior https://github.com/portainer/portainer/blob/742523de1728af0bda6454362ac4945d014c6f3c/api/exec/compose_stack.go
- Portainer source: compose down options passed to Docker Compose https://github.com/portainer/portainer/blob/742523de1728af0bda6454362ac4945d014c6f3c/pkg/libstack/compose/composeplugin.go

## Issues Found
- The post said Portainer stack removal could optionally delete volumes via a UI checkbox. I corrected this because current Portainer documentation and source show a simple delete confirmation flow, and the current delete path does not pass a volume-removal flag to Compose.
- The post treated Portainer deletion as equivalent to `docker compose down` with configurable volume handling. I corrected the introduction, matrix, CLI step, and conclusion to distinguish Portainer deletion from host-side Compose cleanup. `docker compose down --volumes` removes Compose-managed resources on the Docker host, but it does not remove Portainer's stack metadata; deleting through Portainer or the Portainer API does.
- The resource-removal table incorrectly implied Portainer metadata would also be removed by the CLI path. I corrected the table so the Portainer metadata row reflects Portainer deletion versus `docker compose down --volumes`.
- The volume-identification command relied on local Compose-file context. I updated it to use the `com.docker.compose.project` label so it matches Portainer-managed Compose resources on the Docker host more reliably.
- The scheduled cleanup script claimed to remove stacks older than N days, but the original `jq` filter deleted every `review-` stack regardless of age. I added real age filtering using Portainer's `CreationDate` field and parameterized the `ENDPOINT_ID`.

## Review Notes
- The post now matches current Portainer behavior for Docker Compose stacks as verified against Portainer 2.39.x documentation and source.
- `docker compose down --volumes` still does not remove bind mounts, and Docker's docs also state that external networks and external volumes are not removed.
- Docker was not installed in the review workspace, so local `docker --help` output could not be used; verification relied on official Docker documentation and Portainer's published documentation and source.
