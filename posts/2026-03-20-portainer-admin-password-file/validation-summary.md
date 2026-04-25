# Validation Summary: How to Use an Admin Password File for Portainer Setup

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer CE
- Docker and the Docker CLI
- Docker Compose
- Docker Swarm secrets
- Kubernetes Secrets and Deployments
- YAML
- `curl` and the Portainer API

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer CE Docker install on Linux: https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer initial setup requirements: https://docs.portainer.io/start/install-ce/server/setup
- Portainer API usage example for `/api/auth`: https://docs.portainer.io/admin/environments/add/api
- Docker `inspect` reference: https://docs.docker.com/reference/cli/docker/inspect/
- Docker `secret create` reference: https://docs.docker.com/reference/cli/docker/secret/create/
- Docker secrets overview: https://docs.docker.com/engine/swarm/secrets/
- Docker Compose `version` top-level element (obsolete): https://docs.docker.com/reference/compose-file/version-and-name/
- Docker stack deploy / legacy Compose v3 note: https://docs.docker.com/engine/swarm/stack-deploy/
- Kubernetes Deployment spec: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- `--admin-password` was described as accepting a plaintext password. Portainer documents it as a bcrypt-hash flag, so I updated the explanation and example to use a bcrypt hash and clarified what would actually be exposed in command arguments.
- The Docker, Compose, and Swarm examples published Portainer on host port `443` but the verification step tested `https://localhost:9443`. I changed the published port mappings to `9443:9443` so the examples and verification step match.
- The examples used `portainer/portainer-ce:latest`, while current Portainer documentation uses release-stream tags such as `:sts` and `:lts`. I updated the snippets to `:sts` to match the current official CLI examples.
- The standalone Docker Compose example used the obsolete top-level `version` field. I removed it to match current Docker Compose guidance.
- The `--trusted-origins` example used a full URL. Portainer documents this flag as a comma-separated list of domains, so I changed the example to `portainer.example.com`.
- The Kubernetes `Deployment` manifest was invalid because `apps/v1` Deployments require `.spec.selector` and matching pod template labels. I added the required selector and labels and updated the image tag in that snippet.

## Review Notes
- The Swarm stack file intentionally keeps `version: "3.8"` because `docker stack deploy` still uses the legacy Compose file version 3 format.
- Portainer currently publishes both `sts` and `lts` release streams. `:sts` matches the current admin-password CLI examples; for production-focused guidance, `:lts` is usually the safer default.
