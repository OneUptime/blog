# Validation Summary: How to Use Portainer Environment Variables for Secrets

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker Swarm
- Docker secrets
- Portainer API
- PostgreSQL Docker image

## Sources Consulted
- Portainer Docs: Add a new stack - https://docs.portainer.io/user/docker/stacks/add
- Portainer Docs: Inspect or edit a stack - https://docs.portainer.io/user/docker/stacks/edit
- Portainer Docs: Environment Variable Management in Docker: .env vs. stack.env - https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/environment-variable-management-in-docker-.env-vs.-stack.env
- Portainer Docs: Accessing the Portainer API - https://docs.portainer.io/2.21/api/access
- Portainer source: `stack_update.go` - https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/stacks/stack_update.go
- Portainer source: `stack_update_git_redeploy.go` - https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/stacks/stack_update_git_redeploy.go
- Docker Docs: Manage sensitive data with Docker secrets - https://docs.docker.com/engine/swarm/secrets/
- Docker Docs: `docker secret create` - https://docs.docker.com/reference/cli/docker/secret/create/
- Docker Docs: Variable interpolation in Compose - https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
- Docker Official Image docs: Postgres README - https://github.com/docker-library/docs/blob/master/postgres/README.md

## Issues Found
- The post said Portainer stack environment variables are "stored securely" and "not exposed in the UI after saving". I changed this to say they are kept out of the Compose file and version control, but users who can edit the stack can still view and change them in Portainer. This matches Portainer's stack editing documentation.
- The `.env` section incorrectly claimed Portainer loads a `.env` file from the Git repository root and supports uploading a `.env.production` override. I replaced this with the documented Portainer workflow: use **Load variables from .env file** in the stack editor to import variables, including for Git-deployed stacks.
- The Docker Swarm secrets example used a generic `myapp:latest` container with `DB_PASSWORD_FILE`, which is not guaranteed to work unless the image explicitly supports file-based secret variables. I changed the example to `postgres:15` with `POSTGRES_PASSWORD_FILE`, which is documented by the official Postgres image.
- The Portainer API example used the wrong update flow for the stated use case. `GET /api/stacks/{id}` does not provide `StackFileContent`, `PUT /api/stacks/{id}` is for file-based stacks, and the example omitted the `endpointId` query parameter. I replaced it with the correct Git-stack redeploy pattern using `PUT /api/stacks/{id}/git/redeploy?endpointId=...` and an `Env` payload.

## Review Notes
- Portainer distinguishes Docker Compose `.env` handling from Portainer-managed `stack.env` behavior. In Docker Swarm, `docker stack deploy` does not support `env_file`, so stack variables should be defined in Portainer or handled through Docker secrets / external secret management.
