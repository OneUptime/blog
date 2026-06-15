# Validation Summary: How to Deploy a Redis Cluster with Auto Sharding and Failover

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Cluster
- Redis configuration
- redis-cli Cluster Manager
- Docker Compose
- Node.js
- ioredis
- Kubernetes StatefulSet and Headless Service

## Sources Consulted
- Redis Cluster specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Redis Cluster scaling and redis-cli cluster management: https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- Redis configuration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis persistence documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis 7.2 `redis-cli --cluster help` from the official `redis:7.2-alpine` Docker image.
- ioredis Cluster documentation and README: https://github.com/redis/ioredis
- Docker Compose documentation: https://docs.docker.com/compose/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/

## Issues Found
- The Redis config used `dir /var/lib/redis/7001`, but the Docker Compose example mounts persistent storage at `/data`. Changed the Redis data directory to `/data` so AOF files and the cluster config file are written to the mounted volume.
- The Redis config used a log file path under `/var/log/redis`, which is not created or mounted by the Docker Compose example and can prevent Redis from starting if the path is unavailable. Changed `logfile` to `""` so Redis logs to stdout in the container.
- The cluster creation script used `docker exec -it` and omitted `--cluster-yes`. Removed `-it` for script compatibility and added `--cluster-yes` so `redis-cli --cluster create` can run non-interactively.
- The Node.js client section did not mention that Redis Cluster redirects clients to advertised node addresses. Added a Docker NAT caveat and referenced ioredis `natMap` for clients running outside the Docker network.
- The ioredis example enabled replica reads without noting asynchronous replication lag. Added a comment that replica reads may be stale.
- The hash-tag transaction example described the shared tag as a prefix. Corrected the comment to identify the actual Redis Cluster hash tag, `{credits}`.

## Review Notes
- The Kubernetes StatefulSet manifest is a deployment skeleton; it still requires a separate cluster creation step after pods are running.
- `scaleReads: 'slave'` is valid in ioredis, but future cleanup could use "replica" terminology in surrounding prose while preserving the API value expected by ioredis.
