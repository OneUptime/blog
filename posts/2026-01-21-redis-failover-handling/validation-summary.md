# Validation Summary: How to Handle Redis Failover in Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis
- Redis Sentinel
- Redis Cluster
- redis-py
- ioredis
- Python
- Node.js
- Prometheus client metrics
- Circuit breaker and retry patterns

## Sources Consulted
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis Cluster specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- redis-py connection, Sentinel, and RedisCluster documentation: https://redis.readthedocs.io/en/stable/connections.html
- redis-py production usage documentation: https://redis.io/docs/latest/develop/clients/redis-py/produsage/
- redis-py retry helper documentation: https://redis.readthedocs.io/en/stable/retry.html
- redis-py exceptions documentation: https://redis.readthedocs.io/en/stable/exceptions.html
- ioredis README and official API docs: https://github.com/redis/ioredis and https://redis.github.io/ioredis/interfaces/CommonRedisOptions.html

## Issues Found
- Several Python snippets referenced `redis` or `time` without importing them. Added the missing imports to keep the examples syntactically complete when copied independently.
- The ioredis example used `redis.on('+switch-master', ...)` as if `+switch-master` were a normal ioredis client event. Redis Sentinel publishes `+switch-master` via Sentinel Pub/Sub, while ioredis connection events are things like `connect`, `ready`, `error`, and `reconnecting`. Replaced the handler with a supported `ready` event.
- The Redis Cluster example used `cluster_error_retry_attempts`; current redis-py documentation recommends configuring retries with a `Retry` object. Replaced it with `Retry(ExponentialBackoff(), 3)`.
- The Redis Cluster example imported cluster exceptions from `redis.cluster` and called `rc.reinitialize_steps()` as a method. Current redis-py documents these exceptions under `redis.exceptions`, and `reinitialize_steps` is a constructor parameter rather than a refresh method. Updated the imports, configured `reinitialize_steps=1`, removed the invalid method call, and raised `ClusterError` directly.

## Review Notes
The failover timelines are illustrative rather than guaranteed timings; actual Sentinel and Cluster failover duration depends on configuration, quorum/majority availability, network conditions, and client retry behavior. The buffering example is technically plausible but should be treated carefully in production because optimistic write buffering can reorder or duplicate writes without idempotency controls.
