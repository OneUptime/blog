# How to Monitor Prometheus Server Health (TSDB Compaction, WAL Size, Scrape Duration) with the Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Prometheus, TSDB, Server Health

Description: Monitor Prometheus server health metrics including TSDB compaction, WAL size, and scrape duration using the OpenTelemetry Collector for proactive alerting.

Prometheus exposes metrics about its own health through the same `/metrics` endpoint it uses for service discovery. These self-monitoring metrics cover TSDB performance, WAL (Write-Ahead Log) status, scrape job health, and resource usage. Collecting them with the OpenTelemetry Collector gives you an independent monitoring path that works even if Prometheus itself is struggling.

## Why Monitor Prometheus Separately

If Prometheus is your primary metrics backend and it develops problems, you lose visibility into everything. By collecting Prometheus health metrics through the OpenTelemetry Collector and exporting them to a separate backend, you maintain alerting capability even during Prometheus failures.

## Key Prometheus Health Metrics

### TSDB Metrics

```
prometheus_tsdb_head_series            - Number of active time series
prometheus_tsdb_head_chunks            - Number of chunks in the head block
prometheus_tsdb_compactions_total      - Total compactions
prometheus_tsdb_compaction_duration_seconds - Time spent in compactions
prometheus_tsdb_head_gc_duration_seconds   - Head block GC duration
prometheus_tsdb_blocks_loaded          - Number of loaded data blocks
```

### WAL Metrics

```
prometheus_tsdb_wal_segment_current    - Current WAL segment number
prometheus_tsdb_wal_fsync_duration_seconds - WAL fsync duration
prometheus_tsdb_wal_corruptions_total  - WAL corruption count
prometheus_tsdb_wal_truncations_total  - WAL truncation count
prometheus_tsdb_wal_page_flushes_total - WAL page flush count
```

### Scrape Metrics

```
prometheus_target_scrape_pool_targets  - Number of targets per scrape pool
prometheus_target_scrape_pools_total   - Total scrape pools
scrape_duration_seconds                - Per-target scrape duration
scrape_samples_scraped                 - Per-target samples scraped
up                                     - Target up/down status
```

### Resource Usage

```
process_cpu_seconds_total              - CPU time consumed
process_resident_memory_bytes          - Memory usage
process_open_fds                       - Open file descriptors
go_goroutines                          - Number of goroutines
go_memstats_heap_alloc_bytes           - Heap allocation
```

## Collector Configuration

```yaml
# otel-collector-config.yaml
receivers:
  prometheus/prometheus-self:
    config:
      scrape_configs:
        - job_name: "prometheus-health"
          scrape_interval: 15s
          static_configs:
            - targets: ["prometheus:9090"]
          metrics_path: /metrics
          metric_relabel_configs:
            # Keep only Prometheus internal metrics
            - source_labels: [__name__]
              regex: '(prometheus_tsdb_.*|prometheus_target_.*|process_.*|go_.*|scrape_.*)'
              action: keep

processors:
  batch:
    timeout: 10s

  resource:
    attributes:
      - key: service.name
        value: prometheus
        action: upsert
      - key: monitoring.type
        value: self-monitoring
        action: upsert

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    metrics:
      receivers: [prometheus/prometheus-self]
      processors: [resource, batch]
      exporters: [otlp]
```

## Critical Alerts

### Cardinality Explosion

```yaml
- alert: PrometheusHighCardinality
  condition: prometheus_tsdb_head_series > 2000000
  for: 10m
  severity: warning
  message: "Prometheus has {{ value }} active time series. Consider reducing cardinality."
```

High cardinality slows queries and increases memory usage. Track this metric over time to detect gradual growth.

### WAL Corruption

```yaml
- alert: PrometheusWALCorruption
  condition: increase(prometheus_tsdb_wal_corruptions_total[1h]) > 0
  severity: critical
  message: "WAL corruption detected. Prometheus may lose recent data."
```

### Slow Compactions

```yaml
- alert: PrometheusSlowCompaction
  condition: prometheus_tsdb_compaction_duration_seconds > 600
  for: 5m
  severity: warning
  message: "TSDB compaction taking over 10 minutes."
```

### Scrape Failures

```yaml
- alert: PrometheusScrapeFailures
  condition: up == 0
  for: 5m
  severity: critical
  message: "Target {{ target }} is down."
```

## Docker Compose Example

```yaml
version: "3.8"

services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./otel-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4317:4317"

volumes:
  prometheus-data:
```

## Monitoring TSDB Storage

Track disk usage trends:

```
prometheus_tsdb_storage_blocks_bytes   - Total storage used by blocks
prometheus_tsdb_head_chunks_storage_size_bytes - Head block storage size
```

When storage grows unexpectedly, it usually means a new high-cardinality metric was introduced. Cross-reference with `prometheus_tsdb_head_series` to confirm.

## Checking Query Performance

```
prometheus_engine_query_duration_seconds - Query execution time
prometheus_engine_queries_concurrent_max - Max concurrent queries allowed
prometheus_engine_queries               - Total queries executed
```

If `query_duration_seconds` is consistently high for certain query types, it may indicate that your PromQL queries need optimization or that cardinality is too high.

## Summary

Monitoring Prometheus itself through the OpenTelemetry Collector provides an independent health check that works even when Prometheus is struggling. Focus on TSDB head series count for cardinality, WAL corruption events, compaction duration, and scrape failures. Export these metrics to a separate backend through the Collector so you get alerted before Prometheus issues impact your observability.
