# Validation Summary: How to Monitor Agent Memory Usage in Portainer - Monitoring

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Agent
- Docker Engine
- Docker CLI
- Docker Compose
- Docker Engine API
- Bash
- Python 3

## Sources Consulted
- Portainer documentation: Install Portainer Agent on Docker Standalone - https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer documentation: Updating on Docker Standalone - https://docs.portainer.io/start/upgrade/docker
- Portainer documentation: Upgrading Agent-only deployments - https://docs.portainer.io/start/upgrade/tobe/agent
- Docker Docs: `docker container stats` reference - https://docs.docker.com/reference/cli/docker/container/stats/
- Docker Docs: Running containers (`docker run`) - https://docs.docker.com/engine/containers/run/
- Docker Docs: Runtime metrics - https://docs.docker.com/engine/containers/runmetrics/
- Docker Docs: Compose file services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose Deploy Specification - https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: Docker Engine API - https://docs.docker.com/reference/api/engine/
- Docker Docs: Engine API version history - https://docs.docker.com/reference/api/engine/version-history/
- Portainer Agent repository README - https://github.com/portainer/agent

## Issues Found
- The `docker exec portainer_agent cat /proc/meminfo` example was not a reliable per-container memory breakdown. I replaced it with `docker stats ... --format "{{ json . }}"`, which is documented and container-specific.
- The `portainer/agent:latest` image tag was too loose for Portainer guidance. I changed the examples to `portainer/agent:lts` and clarified that the tag should match the Portainer Server version, which aligns with Portainer's upgrade guidance.
- The Compose snippet used `deploy.resources`, which Compose may ignore when deploy support is not implemented. I replaced it with service-level `mem_limit`, `memswap_limit`, `mem_reservation`, and `cpus` settings that match Docker's Compose services reference for a standard Compose deployment.
- The Docker Engine API example reported raw `memory_stats.usage`, which Docker documents as differing from CLI memory usage because the API does not subtract cache. I updated the Python snippet to subtract the documented cache field so the result matches `docker stats` semantics on Linux.
- The alerting script parsed `docker stats` text output and assumed `MiB`, which would break for other units such as `KiB` or `GiB`. I rewrote it to use the Docker Engine stats API and compare bytes directly.
- The `docker run -e LOG_LEVEL=ERROR portainer/agent:latest` line was not a complete Portainer Agent deployment command. I changed it to accurate guidance to add `-e LOG_LEVEL=ERROR` when recreating the agent.
- The conclusion included unsupported specific memory figures and a reference to "high snapshot frequency", which was too specific for a standard Portainer Agent post and not supported by the reviewed docs. I generalized that guidance to keep it technically accurate.

## Review Notes
- Portainer currently documents the standard Portainer Agent as a legacy option for Docker Standalone environments and recommends the Edge Agent for most new deployments. The post remains technically relevant, but that product positioning may be worth reflecting in a future editorial update.
- I could not run local `docker` CLI help in this workspace because Docker is not installed here, so the validation relied on current official Portainer and Docker documentation instead.
