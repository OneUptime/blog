# Validation Summary: How to Deploy Redis via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer stacks
- Docker Compose syntax
- Docker CLI (`docker exec`, `docker cp`, `docker stop`, `docker start`)
- Redis
- Redis Commander

## Sources Consulted
- Portainer Documentation: Add a new stack — https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Portainer Documentation: Access a container's console — https://docs.portainer.io/2.33-lts/user/docker/containers/console
- Docker Docs: Define services in Docker Compose — https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Control startup and shutdown order in Compose — https://docs.docker.com/compose/how-tos/startup-order/
- Docker Docs: Interpolation — https://docs.docker.com/reference/compose-file/interpolation/
- Docker Docs: Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: docker container exec — https://docs.docker.com/reference/cli/docker/container/exec/
- Docker Docs: docker container cp — https://docs.docker.com/reference/cli/docker/container/cp/
- Redis Docs: Redis persistence — https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis Docs: SETEX — https://redis.io/docs/latest/commands/setex/
- Redis Docs: Key eviction — https://redis.io/docs/latest/develop/reference/eviction/
- Redis Docs: Redis security — https://redis.io/docs/latest/operate/oss_and_stack/management/security/
- Redis Commander upstream README — https://github.com/joeferner/redis-commander

## Issues Found
- The stack used the obsolete top-level `version` field. I removed it because current Compose spec treats it as obsolete.
- The `redis-commander` image referenced the old Docker Hub image. I changed it to `ghcr.io/joeferner/redis-commander:latest`, which the upstream project now documents, and added `user: redis` to match the upstream Compose example and avoid startup permission issues.
- The read-through cache example used string-form `command` with `--save ""`. I changed it to list form so Redis receives an actual empty argument for `--save`, which reliably disables RDB snapshotting.
- The Redis CLI example assumed a container literally named `redis` and used `docker exec` even though the section is specifically about Portainer Console. I changed it to run `redis-cli` from the container console directly.
- The example used `SETEX`, which Redis documents as deprecated. I replaced it with `SET session:user123 '{"userId":123}' EX 30`.
- The backup and restore section was incorrect for the configured `appendonly yes` setup. Redis uses AOF data on restart when both AOF and RDB are present, and Redis 7 stores AOF data in `appendonlydir`, so restoring only `dump.rdb` was incomplete. I updated the commands to back up and restore both `dump.rdb` and the AOF directory, and I replaced the hard-coded `redis` container name with a placeholder container name.

## Review Notes
- The post's use of `depends_on` with `condition: service_healthy` is valid Compose syntax and matches current Docker documentation for health-gated startup ordering.
- `allkeys-lru` and `noeviction` are accurately characterized for cache-oriented and write-sensitive workloads respectively.
- `--requirepass` is still valid for password protection, but Redis documents ACLs as the preferred authentication model when you need multiple users or finer-grained permissions.
- `redis:7.2-alpine` remains a valid pinned example, but it is a version-specific choice and should be revisited periodically as newer Redis major releases become standard.
- `docker` is not installed in this workspace, so I could not run `docker compose config`; I validated the updated YAML snippets structurally instead.
