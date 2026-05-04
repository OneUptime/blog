# Validation Summary: How to Configure Container Cgroup Limits in Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Portainer (CE/BE)
- Docker
- Docker Compose
- Linux cgroups (CPU, memory, I/O resource limits)
- jq (for JSON parsing of `docker inspect` output)
- Portainer REST API
- curl

## Sources Consulted
- Docker CLI reference: https://docs.docker.com/reference/cli/docker/
- Docker Compose specification (deploy.resources): https://docs.docker.com/reference/compose-file/deploy/#resources
- Docker Compose healthcheck reference: https://docs.docker.com/reference/compose-file/services/#healthcheck
- `docker inspect` output format: https://docs.docker.com/reference/cli/docker/container/inspect/
- Portainer API documentation: https://docs.portainer.io/api/access (and `/api/auth`, `/api/endpoints/{id}/docker/containers/json` Docker proxy endpoints)
- Linux cgroups (v2) documentation: https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html

## Issues Found
No technical issues found.

Verified items:
- All Docker CLI commands (`docker ps -a`, `docker stats`, `docker logs --tail 100`, `docker inspect`, `docker exec -it`, `docker cp`, `docker ps --filter --format`) are syntactically correct and use current, non-deprecated flags.
- The Docker Compose example using `deploy.resources.limits` with `cpus` and `memory` is valid. While `deploy` was originally Swarm-only, Compose V2 supports `deploy.resources.limits/reservations` for `docker compose up` as well.
- The jq queries against `docker inspect` output use correct JSON paths: `.[0].Config`, `.[0].Config.User`, and `.[0].HostConfig | {Memory, CpuShares, CpuQuota}` all match the actual structure returned by `docker inspect`.
- The Portainer API endpoints `/api/auth` (POST with `Username`/`Password`, returns `jwt`) and `/api/endpoints/{id}/docker/containers/json` (Docker proxy passthrough) are correct.
- The healthcheck syntax using `test`, `interval`, `timeout`, and `retries` is valid Compose syntax.
- Compose file version `"3.8"` is a valid (although now legacy) Compose schema version still accepted by Docker Compose.

## Review Notes
- The post title focuses on "cgroup limits" but most of the body covers generic Portainer container management; only the `docker-compose.yml` snippet directly demonstrates cgroup-derived resource limits (`cpus`, `memory`). This is a scope/content concern rather than a technical accuracy issue.
- The `version: "3.8"` top-level key in Compose files is now considered obsolete by Compose V2 (it logs a warning) but remains accepted. Future revisions could drop it.
- The example does not demonstrate I/O limits (e.g., `blkio_config` / `device_read_bps`) despite the introduction mentioning I/O allocation. This is an omission, not an inaccuracy.
- On modern Linux distributions running cgroup v2, `CpuShares` is mapped from `cpu.weight`; the `docker inspect` HostConfig still surfaces `CpuShares`/`CpuQuota` regardless, so the troubleshooting jq query remains valid.
- `docker exec -it container-name /bin/sh` assumes `/bin/sh` exists in the image; for distroless or scratch images this would fail. Acceptable as a generic example.
