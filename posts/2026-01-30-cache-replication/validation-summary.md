# Validation Summary: How to Create Cache Replication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis replication
- Redis Sentinel
- Redis Cluster
- Docker Compose
- Node.js
- ioredis

## Sources Consulted
- Redis replication documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis Cluster specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Redis WAIT command documentation: https://redis.io/docs/latest/commands/wait/
- ioredis README and Sentinel documentation: https://github.com/redis/ioredis
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The post stated that reads continue when cache instances fail and that reads "never stop" after primary failure. This was too absolute because failover and client reconnection can cause interruptions. Updated the wording to "can continue" and noted that reads can continue through healthy replicas or resume after failover.
- The post implied Memcached can use the same replication approach as Redis. Memcached does not provide Redis-style built-in replication, so the wording now refers to Memcached behind a replication layer.
- The Docker Compose snippet used the obsolete top-level `version: '3.8'` field. Removed it to match the current Compose Specification.
- The verification commands used `docker-compose` and `docker exec redis-primary`, but Compose v2 uses `docker compose`, and Compose does not normally create a container named exactly `redis-primary`. Updated the commands to `docker compose up -d` and `docker compose exec redis-primary redis-cli INFO replication`.
- The standalone ioredis client used `retryDelayOnFailover`, which is not the documented reconnect option for a standalone Redis connection. Replaced it with the documented `retryStrategy` option.
- The `wait-for-replication.js` snippet referenced `primary` without importing it. Added `const { primary } = require('./cache-client');`.
- The Sentinel ioredis example used `preferredSlaves` without `role: 'slave'` and implied one connection could both discover the primary and read from replicas. Updated it to create a Sentinel-backed primary connection for writes and a separate Sentinel-backed replica connection with `role: 'slave'` for reads.
- The monitoring table used `repl_backlog_size` with an alert threshold of "near zero", which is misleading because it is the configured backlog size. Replaced this with `repl_backlog_active` and `repl_backlog_histlen`, and updated the health-check return object accordingly.
- The health-check text called the snippet an endpoint even though it defines a function. Updated the wording to "health check function."

## Review Notes
- Verified the Docker Compose snippet with `docker compose config`.
- Verified all JavaScript snippets with `node --check`.
- The Redis `WAIT` command improves replication acknowledgment and data safety, but Redis documentation states it does not make Redis strongly consistent.
