# Validation Summary: How to Deploy Applications to Intermittent-Connectivity Edge Devices

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Portainer Edge Agent Async mode
- Portainer Edge Stacks and Edge Groups
- Docker Engine
- Docker Compose
- systemd
- PostgreSQL
- Eclipse Mosquitto
- Python

## Sources Consulted
- Portainer Docs: Install Edge Agent Async on Docker Standalone - https://docs.portainer.io/sts/admin/environments/add/docker/edge-async
- Portainer Docs: Updating the Edge Agent - https://docs.portainer.io/start/upgrade/edge
- Portainer Agent repository README - https://github.com/portainer/agent
- Portainer Docs: Add a new Edge Stack - https://docs.portainer.io/user/edge/stacks/add
- Docker Docs: Services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Volumes reference - https://docs.docker.com/reference/compose-file/volumes/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Interpolation reference - https://docs.docker.com/reference/compose-file/interpolation/
- Docker Docs: Live restore - https://docs.docker.com/engine/daemon/live-restore/
- Docker Docs: Linux post-installation steps - https://docs.docker.com/engine/install/linux-postinstall/
- PostgreSQL Docs: `pg_isready` - https://www.postgresql.org/docs/current/app-pg-isready.html
- Docker Hub Official Image Docs: Eclipse Mosquitto - https://hub.docker.com/_/eclipse-mosquitto/

## Issues Found
- The async Edge Agent `docker run` example was not a valid current Portainer async deployment. It omitted required Edge mode settings (`EDGE=1` and `EDGE_ID`), used an undocumented `EDGE_POLL_FREQUENCY` variable, used `EDGE_INSECURE_POLL` for the wrong purpose, and included inline shell comments that break the command when executed. I replaced it with a current Docker Standalone example and clarified that async Ping, Snapshot, and Command intervals are configured in Portainer.
- The Edge Agent example used `portainer/agent:latest`, which conflicted with the post's own version-pinning guidance and with Portainer's recommendation to match the agent version to the Portainer Server version. I changed the example to `portainer/agent:lts` and added guidance to use the exact Portainer-generated command.
- The Compose example used the obsolete top-level `version` field. I removed it to align with the current Compose specification.
- The Compose example mounted `mosquitto_logs` but did not declare it in the top-level `volumes` section. I added the missing named volume declaration.
- The pre-pull script included `prom/node-exporter:v1.7.0`, which was not part of the stack shown in the article. I removed it so the script matches the example deployment.
- The Docker boot/recovery section used a less precise `systemctl enable docker` example and restarted Docker after enabling `live-restore`. I updated it to the current Docker guidance by enabling `docker.service` and `containerd.service` explicitly and reloading Docker after writing `daemon.json`.
- The store-and-forward pseudo-code comment was inaccurate about `queue.Queue.put()`. I corrected the comment to reflect that it blocks when full and added a note that production buffers should be persisted.

## Review Notes
- After the above fixes, the post is technically accurate for Portainer Business Edition Edge Async on Docker Standalone.
- `live-restore` applies to standalone containers, not Swarm services; the revised wording now reflects that scope.
- The HTTP healthcheck example assumes the application image includes `wget`. If the final runtime image is minimal, the probe command should be adjusted to a tool that is actually present.
