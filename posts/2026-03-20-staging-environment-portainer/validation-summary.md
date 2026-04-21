# Validation Summary: How to Set Up a Staging Environment with Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Portainer
- Portainer Agent
- Portainer API
- Docker
- Docker Compose
- Traefik
- PostgreSQL
- Redis
- MailHog
- Mockoon CLI
- Bash
- SQL

## Sources Consulted
- Portainer documentation: Install Portainer Agent on Docker Standalone - https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer documentation: API documentation - https://docs.portainer.io/api/docs
- Portainer CE 2.39.1 OpenAPI specification - https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Docker documentation: Compose `version` top-level element - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker documentation: CLI `--host` option - https://docs.docker.com/engine/reference/commandline/cli/
- Docker documentation: `docker container ls` / `docker ps --format` - https://docs.docker.com/reference/cli/docker/container/ls/
- Docker documentation: PostgreSQL initialization scripts - https://docs.docker.com/guides/postgresql/advanced-configuration-and-initialization/
- Docker documentation: PostgreSQL environment variables - https://docs.docker.com/guides/postgresql/immediate-setup-and-data-persistence/
- Traefik documentation: HTTP router labels and TLS configuration - https://doc.traefik.io/traefik/reference/routing-configuration/http/routing/router/
- Traefik documentation: Docker provider labels - https://doc.traefik.io/traefik/reference/routing-configuration/other-providers/docker/
- Docker Hub: Redis Official Image - https://hub.docker.com/_/redis
- Docker Hub: Mockoon CLI image - https://hub.docker.com/r/mockoon/cli

## Issues Found
- The introduction described staging as an "exact copy" of production, but the article intentionally uses staging-only settings, seeded data, MailHog, and mocks. Changed this to "close replica" for technical accuracy.
- The Portainer Agent environment URL used `tcp://staging-server:9001`. Portainer's Agent setup requires selecting the Agent option and entering `host:9001` without a protocol. Updated the UI steps accordingly.
- The Compose example used the obsolete top-level `version: "3.8"` field. Removed it to match the current Compose Specification.
- The Traefik labels routed traffic through `websecure` but did not explicitly enable TLS on the router. Added `traefik.http.routers.staging-api.tls=true`.
- The PostgreSQL seed mount comment implied that seed data loads every time. The official image only runs `/docker-entrypoint-initdb.d` scripts during first database initialization. Clarified the comment.
- The image comparison command used `docker -H staging-server:9001`, but port 9001 is the Portainer Agent endpoint, not a Docker daemon endpoint. Replaced it with Docker CLI SSH connections to the hosts.
- The Portainer API update script used lowercase `env` and deprecated/incorrect `pullImage` payload fields, and omitted stack file content for a file-based stack update. Updated it to send `Env`, `StackFileContent`, and `RepullImageAndRedeploy` using a `jq`-built JSON payload.
- The "Environment Comparison Dashboard" section showed an empty Compose `services:` block and said to deploy it. Replaced it with a text note because Portainer's environment selector does not require deploying a stack.

## Review Notes
- The Bash deployment script passed `bash -n`, and the Compose block parsed successfully as YAML. Docker is not installed in this workspace, so `docker compose config` could not be run.
- Portainer documents the Docker Standalone Agent path as a legacy option and recommends the Edge Agent for most use cases. The Agent example remains technically valid for this guide.
- The examples still assume Traefik is already deployed and connected to a network that can reach the application containers.
- The SQL seed data assumes the `users` and `products` tables already exist before the seed script runs.
- For production-like reproducibility, future improvements could pin image tags instead of using `latest`.
