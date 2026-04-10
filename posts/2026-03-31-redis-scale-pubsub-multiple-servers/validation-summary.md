# Validation Summary: How to Scale Redis Pub/Sub Across Multiple Servers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (Pub/Sub, Cluster, Sharded Pub/Sub)
- Python (`redis-py` library)
- Python async (`redis.asyncio`)
- Redis CLI commands (`CLIENT LIST`, `PUBSUB`, `INFO`)

## Sources Consulted
- Redis official documentation on Pub/Sub: https://redis.io/docs/latest/develop/interact/pubsub/
- Redis official documentation on Cluster: https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- Redis official documentation on Sharded Pub/Sub (Redis 7.0): https://redis.io/docs/latest/commands/ssubscribe/
- redis-py (Python Redis client) documentation: https://redis-py.readthedocs.io/
- redis-py changelog for aioredis merge (v4.2.0) and cluster support (v4.1.0)
- Redis replication documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/

## Issues Found

### Issue 1: Deprecated `aioredis` package
- **What was wrong:** The "Scaling Subscriber Count" section used `import aioredis` and `aioredis.from_url()`. The standalone `aioredis` package is deprecated; its async functionality was merged into `redis-py` starting with version 4.2.0.
- **What was changed:** Replaced `import aioredis` with `from redis.asyncio import Redis` and updated `aioredis.from_url()` to `Redis.from_url()`.
- **Why:** The `aioredis` package is no longer maintained. The official `redis` package's `redis.asyncio` module is the supported replacement.

### Issue 2: Deprecated `redis-py-cluster` package
- **What was wrong:** The "Redis Cluster and Pub/Sub" section used `from rediscluster import RedisCluster` with dict-based `startup_nodes`. The standalone `redis-py-cluster` package is deprecated; cluster support was merged into `redis-py` starting with version 4.1.0.
- **What was changed:** Replaced `from rediscluster import RedisCluster` with `from redis.cluster import RedisCluster` and updated the constructor to use `host`/`port` keyword arguments instead of dict-based `startup_nodes`.
- **Why:** The `redis-py-cluster` package is archived and unmaintained. The `redis.cluster` module in `redis-py` >= 4.1.0 is the supported replacement, and it does not accept dict-based startup nodes.

### Issue 3: Incorrect Load Balancing Subscribers pattern
- **What was wrong:** The "Load Balancing Subscribers" section recommended subscribing on Redis replicas while publishing on the primary. This is incorrect — Redis Pub/Sub is node-local. Messages published on the primary are **not** propagated to replicas via the replication stream. Subscribers connected to replicas would never receive those messages.
- **What was changed:** Rewrote the section to explain the node-local constraint, corrected the code example to show that all subscribers must connect to the same instance as publishers, and pointed readers toward the application-level fan-out and Redis Cluster patterns covered elsewhere in the post.
- **Why:** The original pattern would silently fail — subscribers on replicas would connect successfully but never receive any messages, leading to hard-to-debug issues in production.

## Review Notes
- The Redis CLI commands in the "Monitoring Pub/Sub Scale" section (`CLIENT LIST TYPE pubsub`, `PUBSUB CHANNELS *`, `PUBSUB NUMPAT`, `INFO clients`) are all correct.
- The Sharded Pub/Sub section correctly describes Redis 7.0+ behavior, including the `SSUBSCRIBE`/`SPUBLISH` commands and the `smessage` type in the Python listener.
- The `sharded_pubsub()` method is available on `redis.cluster.RedisCluster` since `redis-py` 4.3.0+.
- The first section's basic `redis-py` usage (synchronous `redis.Redis`, `publish`, `pubsub`, `subscribe`, `listen`) is correct and current.
