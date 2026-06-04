# Validation Summary: How to Run Buildkite Agent in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Buildkite Agent v3
- Docker
- Docker Compose
- Docker-in-Docker
- Buildkite hooks
- Buildkite Docker Compose plugin
- Buildkite REST API

## Sources Consulted
- Buildkite documentation: Running Buildkite agent with Docker - https://buildkite.com/docs/agent/self-hosted/install/docker
- Buildkite documentation: Agent configuration - https://buildkite.com/docs/agent/self-hosted/configure
- Buildkite documentation: Agent hooks - https://buildkite.com/docs/agent/hooks
- Buildkite documentation: Agent tokens - https://buildkite.com/docs/agent/v3/tokens
- Buildkite documentation: Docker Compose plugin - https://buildkite.com/resources/plugins/buildkite-plugins/docker-compose-buildkite-plugin/
- Buildkite documentation: Agents REST API - https://buildkite.com/docs/apis/rest-api/agents
- Docker documentation: Compose Deploy Specification - https://docs.docker.com/reference/compose-file/deploy/
- Docker documentation: History and development of Docker Compose - https://docs.docker.com/compose/intro/history/
- Docker documentation: Docker CLI reference - https://docs.docker.com/reference/cli/docker/
- Docker Hub: Docker Official Image DinD TLS behavior - https://hub.docker.com/_/docker/

## Issues Found
- The agent name examples used `%n`, which is not a supported Buildkite agent name template variable. Changed them to use `%hostname` and `%spawn`, which are documented agent name template variables.
- The Docker socket examples mounted a named volume at `/buildkite/builds`. Buildkite's Docker agent documentation requires the build path to be visible at the same path on the host and in the agent container when using the host Docker socket, otherwise nested Docker volume mounts can silently mount empty directories. Changed the examples to use `/var/lib/buildkite/builds:/var/lib/buildkite/builds` and set `BUILDKITE_BUILD_PATH` accordingly.
- The Docker Compose example used the obsolete top-level `version: "3.8"` field. Removed it so the file follows the current Compose Specification style.
- The build caching section implied that mounting `docker-cache:/var/lib/docker` in the agent container would persist Docker layers. That is only true for a daemon running in that container or a DinD sidecar, not for the host Docker socket approach. Updated the text and snippet to distinguish dependency cache volumes from DinD daemon data.

## Review Notes
- The Docker socket approach is technically valid but grants builds access to the host Docker daemon, which Buildkite documents as a significant security consideration.
- Verified the edited Bash snippets with `bash -n`.
- Verified the main Docker Compose and DinD Compose snippets with `docker compose config`.
- Verified the Buildkite pipeline YAML with PyYAML. An attempted validation with a Dockerized `yq` image could not run because Docker Hub returned an unauthenticated pull rate-limit error.
