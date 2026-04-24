# Validation Summary: How to Set Environment Variables for Stacks in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker Swarm
- Docker secrets
- Traefik labels

## Sources Consulted
- Portainer docs: Add a new stack - https://docs.portainer.io/user/docker/stacks/add
- Portainer docs: Environment Variable Management in Docker: .env vs. stack.env - https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/environment-variable-management-in-docker-.env-vs.-stack.env
- Docker docs: Set, use, and manage variables in a Compose file with interpolation - https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
- Docker docs: Set environment variables - https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/
- Docker docs: Secrets in Compose - https://docs.docker.com/compose/how-tos/use-secrets/
- Docker docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker docs: docker compose up - https://docs.docker.com/reference/cli/docker/compose/up/
- Docker docs: docker service update - https://docs.docker.com/reference/cli/docker/service/update/

## Issues Found
- The introduction and stack-variable explanation said Portainer stack variables are passed directly to containers as runtime environment. I corrected this to match Portainer and Docker behavior: they are primarily used for Compose interpolation, and values only reach containers when referenced under a service `environment:` section or, on Docker Standalone and Podman, through `env_file: - stack.env`.
- The example Compose file used a top-level `version: "3.8"` key. I removed it because current Docker Compose treats the `version` field as obsolete and validates against the latest Compose Specification automatically.
- The post described an `Advanced mode` / `Simple mode` paste workflow for stack environment variables. I replaced that with Portainer's documented `Load variables from .env file` flow.
- The stack update section claimed all services restart after updating variables. I corrected that to the more accurate behavior: services that use the changed values are recreated or redeployed.
- The secret-handling guidance implied Portainer environment variables are the preferred place for passwords and tokens. I corrected this to prefer Docker secrets where supported, while still recommending Portainer-managed variables over hardcoding when an application only supports environment variables.

## Review Notes
- Portainer's stack variable behavior differs by environment. The `stack.env` convenience is documented for Docker Standalone and Podman, while Docker Swarm does not support `env_file` with `docker stack deploy`.
- The post's Compose snippets are now aligned with current Docker Compose syntax, but the secret-file environment variable pattern in examples remains application-specific. Images such as official MySQL and Postgres images commonly support `_FILE` conventions; custom applications must support the referenced variable names themselves.
