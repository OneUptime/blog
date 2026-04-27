# Validation Summary: How to Override Stack Configuration for Different Environments - Part 2

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (CE/BE)
- Docker Compose (Compose Spec / v2)
- Docker / Docker Swarm
- YAML anchors and merge keys
- PostgreSQL (postgres:15-alpine)
- Redis (redis:7-alpine)
- NFS volumes
- tmpfs volumes
- Docker Compose profiles

## Sources Consulted
- Docker Compose specification: https://docs.docker.com/compose/compose-file/
- Docker Compose merge / YAML anchors: https://docs.docker.com/compose/compose-file/10-fragments/
- Docker Compose profiles: https://docs.docker.com/compose/how-tos/profiles/
- Docker Compose deploy.resources: https://docs.docker.com/reference/compose-file/deploy/#resources
- Docker Compose healthcheck: https://docs.docker.com/reference/compose-file/services/#healthcheck
- Docker Compose volumes / driver_opts (NFS): https://docs.docker.com/engine/storage/volumes/#use-a-volume-driver
- Portainer Stacks documentation: https://docs.portainer.io/user/docker/stacks
- PostgreSQL `pg_isready` reference: https://www.postgresql.org/docs/current/app-pg-isready.html
- Redis `redis-cli ping` reference: https://redis.io/docs/latest/commands/ping/
- YAML 1.1 merge key spec: https://yaml.org/type/merge.html

## Issues Found
- **Bad YAML anchor structure for `x-common-healthcheck`** — The anchor was defined as a mapping with a top-level `healthcheck:` key wrapping the timing fields. It was then merged via `<<: *common-healthcheck` *inside* a service's `healthcheck:` block. Because the YAML merge key performs a shallow merge of top-level keys, the result would have been a nested `healthcheck.healthcheck` key, which is not a valid Compose service field — the timing values (interval, timeout, retries, start_period) would never reach the actual healthcheck. Fixed by removing the wrapper `healthcheck:` key from the anchor so the merge produces the intended flat fields under each service's `healthcheck:` block.

## Review Notes
- `version: "3.8"` is no longer required by the Compose Specification (the top-level `version` field is obsolete in current Compose v2), but it is still accepted and ignored — leaving it as written.
- The `<<:` YAML merge key is a YAML 1.1 feature (not in the YAML 1.2 core spec) but is supported by Docker Compose's parser; usage is fine.
- `deploy.resources.limits/reservations` is honored in Swarm mode and is also recognized by `docker compose` for resource limits since Compose v2 (the `reservations.cpus`/`memory` only fully apply in Swarm). The Prerequisites section already mentions Swarm, so this is appropriate.
- `internal: false` on `backend-net` is the default and is redundant, but not incorrect.
- The `tmpfs`-as-a-local-volume pattern (`type: tmpfs`, `device: tmpfs`) works but Compose also offers a service-level `tmpfs:` directive that is often simpler — left as-is since both are valid.
