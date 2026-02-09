# How to Track Redis Memory Fragmentation, Eviction Rates, and Connected Client Count with OpenTelemetry Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Redis, Memory, Eviction Metrics

Description: Track Redis memory fragmentation ratio, eviction rates, and connected client count using the OpenTelemetry Collector Redis receiver for resource monitoring.

Redis stores everything in memory, making memory management critical. High fragmentation wastes memory, evictions indicate the dataset exceeds available RAM, and too many connected clients can exhaust file descriptors. The OpenTelemetry Collector's Redis receiver captures all these metrics directly from Redis INFO output.

## Collector Configuration

```yaml
receivers:
  redis:
    endpoint: "redis:6379"
    password: "${REDIS_PASSWORD}"
    collection_interval: 15s
    metrics:
      redis.memory.used:
        enabled: true
      redis.memory.rss:
        enabled: true
      redis.memory.peak:
        enabled: true
      redis.memory.fragmentation_ratio:
        enabled: true
      redis.clients.connected:
        enabled: true
      redis.clients.blocked:
        enabled: true
      redis.keys.evicted:
        enabled: true
      redis.keyspace.hits:
        enabled: true
      redis.keyspace.misses:
        enabled: true
      redis.commands.processed:
        enabled: true
      redis.connections.rejected:
        enabled: true

processors:
  batch:
    timeout: 10s
  resource:
    attributes:
      - key: service.name
        value: redis
        action: upsert

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    metrics:
      receivers: [redis]
      processors: [resource, batch]
      exporters: [otlp]
```

## Memory Fragmentation

### Understanding Fragmentation Ratio

```
fragmentation_ratio = redis.memory.rss / redis.memory.used
```

- **Ratio > 1.5**: High fragmentation. Redis has allocated more OS memory than it actually uses for data. This wastes RAM.
- **Ratio 1.0 - 1.5**: Normal range. Some fragmentation is expected.
- **Ratio < 1.0**: Redis is using swap. This is very bad for performance.

### What Causes Fragmentation

Fragmentation happens when Redis deletes keys. The freed memory has gaps that cannot be reused for new, differently-sized allocations. Common scenarios:
- Frequently deleting and creating keys of different sizes
- Large keys being expired
- Sorted sets with heavy member turnover

### Reducing Fragmentation

Redis 4.0+ includes an active defragmentation feature:

```bash
# Enable active defragmentation
redis-cli CONFIG SET activedefrag yes
redis-cli CONFIG SET active-defrag-enabled yes
redis-cli CONFIG SET active-defrag-cycle-min 5
redis-cli CONFIG SET active-defrag-cycle-max 75
redis-cli CONFIG SET active-defrag-threshold-lower 10
```

Monitor the defragmentation process:

```
redis.memory.fragmentation_ratio  - Should decrease after enabling defrag
```

## Eviction Metrics

### Eviction Rate

```
redis.keys.evicted - Total keys evicted (cumulative counter)
eviction_rate = rate(redis.keys.evicted[5m])
```

Any evictions mean Redis is at its `maxmemory` limit and is removing keys according to its eviction policy. This is a clear signal to either increase memory or reduce the dataset.

### Eviction Policies

Redis supports several eviction policies. Common ones:

```
allkeys-lru        - Remove least recently used keys
volatile-lru       - Remove LRU keys that have an expire set
allkeys-lfu        - Remove least frequently used keys
noeviction         - Return errors when memory is full (no eviction)
```

Check your current policy:

```bash
redis-cli CONFIG GET maxmemory-policy
```

### Memory Usage Breakdown

For deeper memory analysis, use the `MEMORY STATS` command:

```bash
redis-cli MEMORY STATS
```

This shows memory usage by category: datasets, overhead, replication buffers, etc.

## Connected Client Monitoring

### Client Count

```
redis.clients.connected - Current number of connected clients
redis.clients.blocked   - Clients blocked on BLPOP/BRPOP
redis.connections.rejected - Connections rejected (maxclients reached)
```

### Connection Limits

Redis has a default `maxclients` of 10,000. When this limit is hit, new connections are rejected:

```bash
redis-cli CONFIG GET maxclients
# Returns: maxclients 10000
```

Monitor the ratio of connected clients to maxclients:

```
client_utilization = redis.clients.connected / maxclients * 100
```

### Identifying Client Issues

High client counts often indicate connection leaks in application code. Common causes:
- Applications not closing Redis connections
- Connection pools sized too large
- Many short-lived application instances each creating connections

## Alert Conditions

```yaml
# High memory fragmentation
- alert: RedisHighFragmentation
  condition: redis.memory.fragmentation_ratio > 1.5
  for: 15m
  severity: warning
  message: "Redis fragmentation ratio is {{ value }}. Memory is being wasted."

# Redis using swap
- alert: RedisUsingSwap
  condition: redis.memory.fragmentation_ratio < 1.0
  for: 1m
  severity: critical
  message: "Redis fragmentation ratio is {{ value }}. Redis is likely using swap."

# Evictions occurring
- alert: RedisEvictions
  condition: rate(redis.keys.evicted[5m]) > 0
  for: 5m
  severity: warning
  message: "Redis is evicting {{ value }} keys/sec. Memory limit reached."

# Approaching maxclients
- alert: RedisHighClientCount
  condition: redis.clients.connected > 8000
  for: 5m
  severity: warning
  message: "{{ value }} clients connected. Approaching maxclients limit."

# Connection rejections
- alert: RedisConnectionRejected
  condition: increase(redis.connections.rejected[5m]) > 0
  severity: critical
  message: "Redis is rejecting connections. maxclients limit reached."

# Memory usage above 90%
- alert: RedisMemoryHigh
  condition: redis.memory.used / redis.memory.maxmemory > 0.9
  for: 5m
  severity: warning
  message: "Redis memory usage at {{ value }}% of maxmemory."
```

## Docker Compose Example

```yaml
version: "3.8"

services:
  redis:
    image: redis:latest
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    ports:
      - "6379:6379"

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./otel-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4317:4317"
```

## Summary

Redis memory management requires monitoring three key areas: fragmentation ratio (to detect wasted memory or swap usage), eviction rates (to detect when the dataset exceeds available memory), and connected client count (to prevent connection exhaustion). The OpenTelemetry Collector Redis receiver captures all these metrics directly from Redis. Set alerts on fragmentation above 1.5, any evictions, and client count approaching maxclients to maintain Redis performance and availability.
