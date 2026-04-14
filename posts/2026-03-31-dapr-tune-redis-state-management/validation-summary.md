# Validation Summary: How to Tune Redis Performance for Dapr State Management

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (state management, component configuration)
- Redis (server configuration, persistence, eviction policies, monitoring)
- Kubernetes (ConfigMap for Redis configuration)
- hey (HTTP load testing tool)
- redis-benchmark (Redis native benchmarking)

## Sources Consulted
- Dapr Redis State Store Component Reference — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr State Management API Reference — https://docs.dapr.io/reference/api/state_api/
- Dapr State Key Prefix / Sharing State — https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-share-state/
- Dapr Component Spec Schema — https://docs.dapr.io/reference/resource-specs/component-schema/
- Redis Persistence Documentation — https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis Key Eviction Documentation — https://redis.io/docs/latest/develop/reference/eviction/
- Redis Configuration Documentation — https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis CLI Documentation — https://redis.io/docs/latest/develop/tools/cli/
- Redis INFO Command — https://redis.io/commands/INFO
- Redis SLOWLOG GET Command — https://redis.io/docs/latest/commands/slowlog-get/
- Redis Benchmark Documentation — https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/benchmarks/

## Issues Found
- **Incorrect Dapr Redis key format in benchmark command**: The `redis-benchmark` example used `SET "dapr||myapp||key" value`, implying a three-segment key format with a `dapr||` prefix. Dapr's actual default key format is `<appId>||<key>` (e.g., `myapp||key`) with no `dapr` prefix segment. Fixed to `SET "myapp||key" value`.

## Review Notes
- The RDB snapshotting values `save 900 1` and `save 300 10` are the pre-Redis 7.0 defaults. Redis 7.0+ changed the defaults to `save 3600 1` and `save 300 100`. The blog presents these as recommended values rather than defaults, and more aggressive snapshotting is a reasonable choice for a state store, so this is not incorrect — but readers on Redis 7.0+ should be aware that these differ from the current defaults.
- All 10 Dapr Redis component metadata fields (redisHost, redisPassword, maxRetries, maxRetryBackoff, enableTLS, idleCheckFrequency, idleTimeout, maxConnAge, poolSize, minIdleConns) are verified correct and current.
- The `apiVersion: dapr.io/v1alpha1` remains correct for Dapr Component resources.
- The Dapr state API endpoint format, HTTP method, and JSON body format are all correct.
- All Redis CLI commands, flags, and CONFIG SET operations are syntactically correct.
- All three eviction policies and their described use cases are accurate.
- The `slowlog-log-slower-than` value of 1000 is in microseconds (1ms threshold), which is correct.
