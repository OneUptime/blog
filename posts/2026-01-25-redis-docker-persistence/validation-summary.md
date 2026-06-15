# Validation Summary: How to Run Redis in Docker with Persistence

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis Open Source 7
- Redis persistence with RDB and AOF
- Docker and Docker volumes
- Docker Compose
- Kubernetes StatefulSets and PersistentVolumeClaims
- Python redis-py client

## Sources Consulted
- Redis persistence documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis configuration reference (`redis.conf`): https://download.redis.io/redis-stable/redis.conf
- Docker Official Image for Redis: https://hub.docker.com/_/redis
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose deploy specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker container resource constraints: https://docs.docker.com/engine/containers/resource_constraints/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes StatefulSet API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Redis redis-py client documentation: https://redis.io/docs/latest/develop/clients/redis-py/connect/

## Issues Found
- The persistence problem section overstated Redis data loss behavior by saying all data is gone when a container stops. Redis serves data from memory but can persist to disk, and the Docker image uses `/data`; the text now distinguishes memory storage, persistence configuration, and persistent volume use.
- The combined persistence section said RDB provides fast restarts when RDB and AOF are enabled together. Redis uses AOF to reconstruct data on restart when both are enabled, so the wording now says RDB provides backup snapshots while AOF is used on restart.
- The Docker Compose example used the obsolete top-level `version: '3.8'` field. The current Compose Specification does not require it, so it was removed.
- The Compose and Dockerfile health checks did not authenticate even though the sample `redis.conf` enables `requirepass`. The health checks now pass the configured password to `redis-cli`.
- The Python monitoring example did not authenticate despite the password-protected configuration. The Redis client now includes the sample password.
- The Python monitoring example always treated RDB as enabled because `rdb_bgsave_in_progress` is normally present in `INFO persistence`. It now checks the Redis `save` configuration and only evaluates RDB health checks when RDB is enabled.
- The summary table described `appendfsync always` as "No data loss." That is too absolute for real systems, so it now says "Lowest data-loss risk."
- The graceful shutdown section said proper shutdown ensures Redis saves all data. The wording now says it gives Redis time to flush pending persistence work, which is more accurate.

## Review Notes
- The Docker commands and Redis configuration options are valid for the Redis 7 Docker image. Local Docker validation was limited because the host filesystem was full and Redis could not create AOF files in Docker storage.
- The Compose `deploy.resources` block is valid under the Compose Deploy Specification, but support can vary across Compose implementations.
- The examples use inline passwords for clarity. In production, use Docker or Kubernetes secrets and avoid passing passwords directly on command lines where possible.
