# How to Configure the Round Robin Connector for Even Distribution Across Multiple Export Destinations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Round Robin, Connector, Load Distribution, Collector

Description: Configure the OpenTelemetry round robin connector to evenly distribute telemetry data across multiple export destinations and pipelines.

Sometimes you want to spread telemetry evenly across multiple backends without caring about trace affinity. Maybe you have multiple storage clusters and want even load distribution, or you are sharding logs across partitions. The round robin connector cycles through downstream pipelines one at a time, sending each batch to the next destination in sequence.

## When to Use Round Robin vs. Load Balancing

The load balancing exporter uses consistent hashing to ensure trace affinity (all spans from one trace go to the same destination). Round robin does not care about that. It just distributes evenly.

Use round robin when:
- You do not need trace-complete data at each destination (e.g., metrics, logs)
- You are distributing across storage shards
- You want truly even distribution regardless of content

Use load balancing when:
- You need tail sampling (requires complete traces)
- You need trace affinity for any reason

## Basic Round Robin Configuration

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

connectors:
  # Round robin across three downstream pipelines
  roundrobin:

processors:
  batch:
    send_batch_size: 512
    timeout: 5s

exporters:
  otlp/shard1:
    endpoint: "storage-shard-1.internal:4317"
    tls:
      insecure: true

  otlp/shard2:
    endpoint: "storage-shard-2.internal:4317"
    tls:
      insecure: true

  otlp/shard3:
    endpoint: "storage-shard-3.internal:4317"
    tls:
      insecure: true

service:
  pipelines:
    # Ingestion pipeline sends to round robin connector
    logs:
      receivers: [otlp]
      processors: []
      exporters: [roundrobin]

    # Three downstream pipelines, each targeting a shard
    logs/shard1:
      receivers: [roundrobin]
      processors: [batch]
      exporters: [otlp/shard1]

    logs/shard2:
      receivers: [roundrobin]
      processors: [batch]
      exporters: [otlp/shard2]

    logs/shard3:
      receivers: [roundrobin]
      processors: [batch]
      exporters: [otlp/shard3]
```

## Round Robin for Metrics Across ClickHouse Shards

A common use case is distributing metrics across ClickHouse shards for parallel query execution:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
  prometheus:
    config:
      scrape_configs:
        - job_name: "kubernetes-pods"
          kubernetes_sd_configs:
            - role: pod

connectors:
  roundrobin/metrics:

processors:
  batch/small:
    send_batch_size: 256
    timeout: 3s

exporters:
  # ClickHouse shards
  clickhouse/shard0:
    endpoint: "tcp://clickhouse-0.clickhouse.svc:9000"
    database: "otel"
    ttl_days: 30

  clickhouse/shard1:
    endpoint: "tcp://clickhouse-1.clickhouse.svc:9000"
    database: "otel"
    ttl_days: 30

  clickhouse/shard2:
    endpoint: "tcp://clickhouse-2.clickhouse.svc:9000"
    database: "otel"
    ttl_days: 30

service:
  pipelines:
    metrics:
      receivers: [otlp, prometheus]
      processors: []
      exporters: [roundrobin/metrics]

    metrics/shard0:
      receivers: [roundrobin/metrics]
      processors: [batch/small]
      exporters: [clickhouse/shard0]

    metrics/shard1:
      receivers: [roundrobin/metrics]
      processors: [batch/small]
      exporters: [clickhouse/shard1]

    metrics/shard2:
      receivers: [roundrobin/metrics]
      processors: [batch/small]
      exporters: [clickhouse/shard2]
```

## Combining Round Robin with Per-Shard Processing

You can apply different processors to each shard pipeline. For example, you might want to add a shard identifier:

```yaml
processors:
  attributes/shard0:
    actions:
      - key: storage.shard
        value: "0"
        action: insert

  attributes/shard1:
    actions:
      - key: storage.shard
        value: "1"
        action: insert

  attributes/shard2:
    actions:
      - key: storage.shard
        value: "2"
        action: insert

service:
  pipelines:
    logs/shard0:
      receivers: [roundrobin]
      processors: [attributes/shard0, batch]
      exporters: [otlp/shard0]

    logs/shard1:
      receivers: [roundrobin]
      processors: [attributes/shard1, batch]
      exporters: [otlp/shard1]

    logs/shard2:
      receivers: [roundrobin]
      processors: [attributes/shard2, batch]
      exporters: [otlp/shard2]
```

## Monitoring Distribution Evenness

To verify that the distribution is actually even, compare the sent counts across exporters:

```bash
# Check per-exporter sent counts
curl -s http://localhost:8888/metrics | grep otelcol_exporter_sent

# Example output:
# otelcol_exporter_sent_log_records{exporter="otlp/shard0"} 150234
# otelcol_exporter_sent_log_records{exporter="otlp/shard1"} 150198
# otelcol_exporter_sent_log_records{exporter="otlp/shard2"} 150201
```

The counts should be very close to each other. If one shard is significantly behind, it might be experiencing backpressure, which would cause the round robin to skip it.

## Handling Shard Failures

Unlike the failover connector, round robin does not automatically skip failed shards. If one shard goes down, data sent to it will queue up and eventually drop. To handle this, combine round robin with per-pipeline sending queues and retry logic:

```yaml
exporters:
  otlp/shard1:
    endpoint: "storage-shard-1.internal:4317"
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s
    sending_queue:
      enabled: true
      queue_size: 5000
      num_consumers: 5
```

This gives each shard a 5-minute buffer to recover before data starts dropping. For longer outages, you would need to add a failover connector per shard or implement a dead letter queue.

## Wrapping Up

The round robin connector is the simplest way to distribute telemetry evenly across multiple destinations. It works great for log and metric sharding where trace affinity does not matter. Just remember to configure proper retry and queue settings on each downstream exporter to handle individual shard failures gracefully.
