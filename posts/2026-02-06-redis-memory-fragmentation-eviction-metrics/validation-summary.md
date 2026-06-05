# Validation Summary: How to Track Redis Memory Fragmentation, Eviction Rates,

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Redis Open Source
- Redis INFO, CONFIG GET, CONFIG SET, and MEMORY STATS commands
- Redis memory fragmentation and key eviction
- OpenTelemetry Collector Contrib Redis receiver
- Docker Compose

## Sources Consulted
- OpenTelemetry Collector Contrib Redis receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/redisreceiver
- OpenTelemetry Collector Contrib Redis receiver metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/redisreceiver/metadata.yaml
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- Redis INFO command docs: https://redis.io/docs/latest/commands/info/
- Redis key eviction docs: https://redis.io/docs/latest/develop/reference/eviction/
- Redis client handling docs: https://redis.io/docs/latest/develop/reference/clients/
- Redis CONFIG SET command docs: https://redis.io/docs/latest/commands/config-set/

## Issues Found
- The Collector config used `${REDIS_PASSWORD}` for environment substitution. Updated it to `${env:REDIS_PASSWORD}`, which matches the current OpenTelemetry Collector configuration documentation and the Redis receiver examples.
- The alert for memory usage referenced `redis.memory.maxmemory`, which is not the Redis receiver metric name. Enabled and referenced `redis.maxmemory`, the metric exposed by the Redis receiver for the Redis `maxmemory` directive.
- The active defragmentation commands included `active-defrag-enabled`, which is not a Redis Open Source configuration parameter. Removed it and kept `activedefrag yes` plus the valid `active-defrag-*` tuning parameters.
- The fragmentation description treated high `used_memory_rss / used_memory` strictly as fragmentation. Adjusted it to match Redis documentation: high RSS compared to allocator usage can indicate fragmentation or memory not yet returned to the operating system.

## Review Notes
- The alert condition examples are presented as illustrative pseudo-YAML rather than a complete rules file for a specific alerting engine.
- Redis documentation notes that `mem_fragmentation_ratio` includes more than allocator fragmentation; allocator-specific metrics such as `allocator_frag_ratio` are more precise when available from `INFO memory`.
