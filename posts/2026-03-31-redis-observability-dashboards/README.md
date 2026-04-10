# How to Build Redis Observability Dashboards

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Observability, Grafana

Description: Learn how to build Redis observability dashboards with Prometheus and Grafana covering memory usage, throughput, latency, replication lag, and eviction metrics.

---

Effective Redis observability goes beyond simple up/down checks. This guide covers setting up a full observability stack with Prometheus, redis_exporter, and Grafana dashboards that give you real operational insight.

## Stack Setup

```yaml
# docker-compose.yml
version: "3.8"
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  redis-exporter:
    image: oliver006/redis_exporter:latest
    environment:
      REDIS_ADDR: "redis://redis:6379"
    ports:
      - "9121:9121"
    depends_on:
      - redis

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
```

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: redis
    static_configs:
      - targets: ["redis-exporter:9121"]
```

## Dashboard Panels

### Panel 1: Memory Usage

```text
# Prometheus query
redis_memory_used_bytes / redis_memory_max_bytes * 100

# Visualization: Gauge
# Thresholds: green < 70%, yellow < 85%, red > 85%
```

### Panel 2: Operations Rate

```text
# Ops per second
rate(redis_commands_processed_total[1m])

# Visualization: Time series graph
# Include: total_commands, expired_keys, evicted_keys
```

### Panel 3: Hit Rate (Cache Effectiveness)

```text
# Cache hit ratio
rate(redis_keyspace_hits_total[5m]) /
(rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m]))

# Visualization: Stat panel
# Good hit rate: > 90% for cache workloads
```

### Panel 4: Connected Clients

```text
redis_connected_clients

# Visualization: Time series
# Alert if approaching maxclients
```

### Panel 5: Replication Lag

```text
redis_master_repl_offset - redis_slave_repl_offset

# Visualization: Time series
# Alert if lag > 1MB or > 10 seconds
```

### Panel 6: Latency

```text
# Command latency from INFO commandstats
rate(redis_commands_duration_seconds_total[1m]) /
rate(redis_commands_total[1m]) * 1000

# Visualization: Heatmap or time series in milliseconds
```

## Essential Alerts

```yaml
# alerts.yml
groups:
  - name: redis-observability
    rules:
      - alert: RedisHighMemoryUsage
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.85
        for: 2m
        annotations:
          summary: "Redis memory usage above 85%"

      - alert: RedisLowHitRate
        expr: |
          rate(redis_keyspace_hits_total[10m]) /
          (rate(redis_keyspace_hits_total[10m]) +
           rate(redis_keyspace_misses_total[10m])) < 0.7
        for: 10m
        annotations:
          summary: "Redis cache hit rate dropped below 70%"

      - alert: RedisReplicationDown
        expr: redis_connected_slaves < 1
        for: 1m
        annotations:
          summary: "Redis has no connected replicas"
```

## Keyspace Event Metrics

```bash
# Enable keyspace statistics
redis-cli CONFIG SET notify-keyspace-events "KExg"

# Custom exporter for key pattern metrics
redis-cli --scan --count 100 | sed 's/:[^:]*$//' | \
  sort | uniq -c | sort -rn | head -20
```

## Import Grafana Dashboard

Use the official redis_exporter dashboard:

```bash
# Dashboard ID 763 from grafana.com
# Or import community dashboard 11835 for Redis
curl -X POST http://admin:admin@localhost:3000/api/dashboards/import \
  -H "Content-Type: application/json" \
  -d '{"gnetId":763,"overwrite":true,"inputs":[{"name":"DS_PROMETHEUS","type":"datasource","pluginId":"prometheus","value":"Prometheus"}],"folderId":0}'
```

## Summary

A complete Redis observability dashboard tracks memory pressure, hit rates, operation throughput, connected clients, replication lag, and latency percentiles. Deploy `redis_exporter` alongside Prometheus and import or build Grafana dashboards covering these panels. Set alerts on the metrics most likely to indicate degraded service before your users notice the impact.
