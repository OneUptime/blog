# Validation Summary: How to Manage Docker Secrets via Portainer on Swarm

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Swarm
- Docker secrets
- Portainer
- Docker Compose stack files
- PostgreSQL Docker Official Image
- Python

## Sources Consulted
- Docker Docs: Manage sensitive data with Docker secrets - https://docs.docker.com/engine/swarm/secrets/
- Docker Docs: Deploy a stack to a swarm - https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Docs: `docker stack deploy` CLI reference - https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker Docs: Define services in Docker Compose - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose Deploy Specification - https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: Secrets top-level element - https://docs.docker.com/reference/compose-file/secrets/
- Docker Docs: Secrets in Compose - https://docs.docker.com/compose/how-tos/use-secrets/
- Portainer Documentation: Secrets - https://docs.portainer.io/user/docker/secrets
- Portainer Documentation: Add a new secret - https://docs.portainer.io/user/docker/secrets/add
- Portainer Documentation: Services - https://docs.portainer.io/user/docker/services
- Portainer Documentation: Configure service options - https://docs.portainer.io/2.21/user/docker/services/configure
- Docker Hub: Postgres Docker Official Image - https://hub.docker.com/_/postgres/

## Issues Found
- The Portainer navigation and field labels were outdated. I changed `Swarm > Secrets` and `Swarm > Services` to `Secrets` and `Services`, and updated the input label from `Value` to `Secret`, to match current Portainer documentation.
- The CLI examples used `echo` for literal secret values. I changed them to `printf '%s' ... | docker secret create ...` so the examples do not add a trailing newline to the stored secret.
- The stack example referenced an external `api_key` secret without showing its creation. I added an `api_key` creation example so the stack can be deployed as written.
- The stack example used short secret syntax while the rotation step changed the secret name. That would also change the mounted filename and break the `*_FILE` paths. I changed the services to long secret syntax with `source` and `target` so the in-container path can stay stable during rotation.
- The Swarm stack example used `restart: unless-stopped`. I moved restart behavior to `deploy.restart_policy`, which is the Swarm-oriented deployment setting documented by Docker.
- The post treated `/run/secrets/...` as universal. I clarified that this path is the default in Linux containers, which keeps the guidance accurate without overstating cross-platform behavior.

## Review Notes
- `docker stack deploy` still uses the legacy Compose file v3 format for Swarm deployments; the example's `version: "3.8"` remains compatible with that model.
- Docker secrets use a different default path in Windows containers, and Docker also supports custom secret targets.
- Docker CLI was not available in this workspace, so command verification was done against official Docker and Portainer documentation rather than local `--help` output.
