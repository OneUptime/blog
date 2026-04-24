# Validation Summary: How to Fix Duplicate Resources Appearing with Agent Endpoints - Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer Agent
- Portainer HTTP API
- Docker Engine
- Docker Swarm
- Docker CLI
- Docker Compose labels

## Sources Consulted
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer environments management docs: https://docs.portainer.io/admin/environments/environments
- Portainer Docker Standalone agent install docs: https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer Docker Swarm agent install docs: https://docs.portainer.io/admin/environments/add/swarm/agent
- Portainer database encryption docs: https://docs.portainer.io/advanced/db-encryption
- Portainer rollback/database docs: https://docs.portainer.io/faqs/troubleshooting/how-can-i-roll-back-to-a-previous-version-of-portainer
- Portainer source for manual snapshot endpoint: https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_snapshot.go
- Portainer source for snapshot contents: https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Portainer source for Docker snapshot collection: https://github.com/portainer/portainer/blob/develop/pkg/snapshot/docker.go
- Portainer Agent README: https://github.com/portainer/agent/blob/master/README.md
- Docker `docker volume ls` reference: https://docs.docker.com/reference/cli/docker/volume/ls/
- Docker `docker network ls` reference: https://docs.docker.com/reference/cli/docker/network/ls/
- Docker object labels docs: https://docs.docker.com/engine/manage-resources/labels/
- Docker Compose volumes reference: https://docs.docker.com/reference/compose-file/volumes/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/

## Issues Found
- The API examples used `http://localhost:9000`, which is legacy HTTP in Portainer. I updated them to `https://localhost:9443` with `curl -k` so the examples match current default HTTPS installs.
- The manual snapshot API path was incorrect. I changed `/api/endpoints/1/docker/snapshot` to `/api/endpoints/1/snapshot`, which matches Portainer's current server source.
- The introduction and conclusion implied that agent cluster mode itself causes duplicates. I narrowed this to the supported cases: duplicate environment registrations and mixing a Swarm aggregate agent endpoint with separate per-node endpoints.
- The agent recreation example did not mention `AGENT_SECRET`. I added the required note because Portainer documents that a custom server-side `AGENT_SECRET` must also be set on the agent.
- The stale endpoint data section claimed to inspect the database but only listed files in the data volume. I clarified that the command inspects the persisted data volume, identified `/data/portainer.db`, and added the required backup caution before any manual DB work.
- The labels section incorrectly claimed that missing or duplicated labels can make Portainer show duplicate resources. I corrected this to the documented use of labels as metadata for distinguishing separate resources with similar names, and removed the ineffective `grep -v "^$"` filter from the volume command.
- The agent container check depended on a specific container name. I changed the example to grep for the `portainer/agent` image so it works regardless of whether the container is named `portainer-agent` or `portainer_agent`.

## Review Notes
- Portainer's UI uses the term "Environments", but the API still uses `/api/endpoints`; the post now reflects that correctly.
- Portainer documents the classic Agent as a legacy option and recommends the Edge Agent for most new deployments. That does not invalidate this troubleshooting guide, but it is a useful version/current-state caveat.
- Portainer snapshots include raw container, volume, and network data in addition to summary counts, so a forced snapshot refresh is technically relevant after fixing the underlying endpoint duplication issue.
