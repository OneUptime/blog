# Validation Summary: How to Deploy Multi-Service Applications as Stacks in Portainer

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker Compose
- Docker Swarm
- Docker Standalone
- PostgreSQL
- Redis
- NGINX
- Node.js

## Sources Consulted
- Portainer stack deployment documentation: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer stack duplication and migration documentation: https://docs.portainer.io/user/docker/stacks/migrate
- Portainer Kubernetes application deployment documentation: https://docs.portainer.io/sts/user/kubernetes/applications/manifest
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose secrets documentation: https://docs.docker.com/compose/how-tos/use-secrets/
- Docker Compose environment variable best practices: https://docs.docker.com/compose/how-tos/environment-variables/best-practices/
- Docker Swarm stack deployment documentation: https://docs.docker.com/engine/swarm/stack-deploy/

## Issues Found
- The post stated that Portainer Stacks deploy to Kubernetes by converting Compose files. Current Portainer documentation separates Kubernetes deployments under Applications using manifests or Helm charts, so the platform description was corrected.
- The original Compose example was not runnable as written because it depended on a local `nginx.conf`, a missing `server.js`, and an external secret that the article never instructed the reader to create. The example was replaced with a self-contained stack that runs as shown.
- The example used a top-level `version: "3.8"` field. Current Docker Compose documentation marks the `version` field as obsolete, so it was removed.
- The environment-variable section described Portainer environment variables as secrets. This was corrected to describe them as configuration values, with a note that Docker secrets are preferable for sensitive data when supported.

## Review Notes
- Portainer supports defining environment variables directly in the UI or loading them from a `.env` file. On Docker Swarm, `env_file` support differs because Portainer deploys stacks with `docker stack deploy`, so variables may need to be defined individually.
- Docker documents that `docker stack deploy` uses the legacy Compose v3 format, so behavior on Swarm can differ from standalone Docker for some Compose features.
