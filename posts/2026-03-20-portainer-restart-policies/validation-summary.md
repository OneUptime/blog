# Validation Summary: How to Configure Container Restart Policies in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker restart policies
- Docker Compose / Compose Specification
- `docker inspect`

## Sources Consulted
- Docker Docs: Start containers automatically — https://docs.docker.com/engine/containers/start-containers-automatically/
- Docker Docs: `docker container update` — https://docs.docker.com/reference/cli/docker/container/update/
- Docker Docs: Services in Compose (`restart`) — https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: `docker inspect` — https://docs.docker.com/reference/cli/docker/inspect/
- Docker Docs: Engine API v1.24 reference (`RestartCount`, `State.Status`, and restart-delay note) — https://docs.docker.com/reference/api/engine/version/v1.24/
- Portainer Documentation: Add a new container — https://docs.portainer.io/sts/user/docker/containers/add
- Portainer Documentation: Advanced container settings — https://docs.portainer.io/2.27/user/docker/containers/advanced
- Portainer Documentation: Edit or duplicate a container — https://docs.portainer.io/2.21/user/docker/containers/edit
- Portainer Documentation: Inspect a container — https://docs.portainer.io/user/docker/containers/inspect
- Portainer Documentation: View container logs — https://docs.portainer.io/user/docker/containers/logs

## Issues Found
- The post said restart policies cannot be changed on an existing container without recreating it. I changed this to be Portainer-specific because Docker also supports updating restart policies on an existing container with `docker update --restart`.
- The `always` policy section said a manually stopped container keeps restarting until the daemon stops. I corrected this to Docker's documented behavior: a manual stop suppresses automatic restart until the Docker daemon restarts or the container is started again manually.
- The `unless-stopped` explanation was too broad. I updated it to describe the documented stopped-state behavior across Docker daemon restarts and host reboots.
- The Compose example used a top-level `version: "3.8"` field. I removed it because modern Compose treats the top-level `version` field as obsolete and only keeps it for backward compatibility.
- The backoff section used exact timing values and a one-minute cap that are not emphasized in current restart-policy docs. I simplified the text to the documented increasing-delay behavior and replaced the `jq` pipeline with a Docker-only `docker inspect --format` example.
- The restart-loop section depended on undocumented Portainer UI specifics, including a guaranteed `Restart count` display in container details and a specific `starting` status. I changed it to use Portainer's documented `Inspect` and `Logs` workflows instead.
- The restart-loop section also implied every restart policy has finite restart attempts. I changed that wording because only `on-failure[:max-retries]` has an attempt limit.
- The conclusion overstated `always` by saying it should never stop regardless of operator intervention. I corrected it to describe the actual Docker daemon restart behavior.

## Review Notes
- Docker documents that restart policies only take effect after a container has started successfully and been up for at least 10 seconds. The post does not mention this, but the corrected content no longer conflicts with it.
- Portainer documentation URLs are versioned, so minor UI wording can vary by release even when the underlying Docker behavior is the same.
