# Validation Summary: How to Set Up Redis Monitoring with New Relic

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- New Relic Infrastructure Agent
- New Relic On-Host Integration (nri-redis)
- NRQL (New Relic Query Language)
- New Relic Python APM Agent
- redis-py (Python Redis client)

## Sources Consulted
- New Relic Redis Integration Documentation: https://docs.newrelic.com/docs/infrastructure/host-integrations/host-integrations-list/redis/redis-integration/
- nri-redis GitHub Repository and spec.csv: https://github.com/newrelic/nri-redis
- New Relic Guided Install Documentation: https://docs.newrelic.com/docs/infrastructure/infrastructure-agent/new-relic-guided-install-overview/
- NRQL Syntax and Functions: https://docs.newrelic.com/docs/nrql/nrql-syntax-clauses-functions/
- New Relic Python Agent Instrumented Packages: https://docs.newrelic.com/docs/apm/agents/python-agent/getting-started/instrumented-python-packages/
- New Relic On-Host Integration Configuration Format: https://docs.newrelic.com/docs/infrastructure/host-integrations/infrastructure-integrations-sdk/specifications/host-integrations-standard-configuration-format/

## Issues Found

### 1. All NRQL metric names were incorrect
**What was wrong:** The post used Redis INFO-style metric names (e.g., `redis.net.instantaneous_ops_per_sec`, `redis.mem.used_memory`, `redis.stats.keyspace_hits`) which do not match the actual nri-redis metric names reported to `RedisSample`.

**What was changed:**
- `redis.net.instantaneous_ops_per_sec` -> `net.commandsProcessedPerSecond`
- `redis.mem.used_memory` -> `system.usedMemoryBytes`
- `redis.stats.keyspace_hits` -> `db.keyspaceHitsPerSecond`
- `redis.stats.keyspace_misses` -> `db.keyspaceMissesPerSecond`
- `redis.stats.evicted_keys` -> `db.evictedKeysPerSecond`

**Why:** The original metric names would return no data in NRQL queries. The nri-redis integration uses its own naming convention (e.g., `net.commandsProcessedPerSecond`) rather than raw Redis INFO field names.

### 2. Memory percentage query used non-existent metric
**What was wrong:** The query used `redis.config.maxmemory` as the denominator for memory percentage. This value is only available as inventory data in nri-redis, not as a queryable metric in `RedisSample`.

**What was changed:** Replaced `latest(redis.config.maxmemory)` with `latest(system.totalSystemMemoryBytes)` and updated the comment to "Memory usage as percentage of total system memory."

**Why:** `system.totalSystemMemoryBytes` is an actual metric available in `RedisSample` and provides a meaningful memory utilization percentage. The original query would have failed due to the non-existent metric (and would also divide by zero if Redis maxmemory is set to 0, meaning no limit).

### 3. Hit ratio query used incorrect aggregation for rate metrics
**What was wrong:** The cache hit ratio query used `rate(sum(...), 1 minute)` which treats the metrics as cumulative counters. However, the nri-redis metrics `db.keyspaceHitsPerSecond` and `db.keyspaceMissesPerSecond` are already reported as rates (per second).

**What was changed:** Replaced `rate(sum(redis.stats.keyspace_hits), 1 minute)` with `average(db.keyspaceHitsPerSecond)` and similarly for misses.

**Why:** Applying `rate(sum(...))` to metrics that are already rates would produce incorrect results. Using `average()` on per-second rate metrics is the correct aggregation approach.

### 4. Eviction alert query used incorrect aggregation
**What was wrong:** The eviction alert query used `rate(sum(redis.stats.evicted_keys), 1 minute)` with the same issues as the hit ratio query.

**What was changed:** Replaced with `average(db.evictedKeysPerSecond) * 60` to convert the per-second rate to a per-minute value, keeping the threshold description (100/minute) consistent.

**Why:** The nri-redis metric `db.evictedKeysPerSecond` is already a rate. Multiplying by 60 converts it to per-minute to match the alert threshold described in the post.

## Review Notes
- The New Relic CLI install command omits the `NEW_RELIC_REGION` environment variable, which defaults to US. EU-based accounts would need to add `NEW_RELIC_REGION=eu`. This is an optional parameter so it was not changed, but could be mentioned for completeness.
- The integration configuration YAML structure, `RedisSample` event type, `keyset()` NRQL function, label-based WHERE clauses, and Python APM auto-instrumentation claims are all correct.
- The `apt-get install nri-redis` command is Debian/Ubuntu-specific. Users on RHEL/CentOS would need `yum install nri-redis` or `dnf install nri-redis`. This is acceptable for a tutorial but could be noted.
