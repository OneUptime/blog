# How to Implement Tiered Storage (Hot/Warm/Cold) for OpenTelemetry Data to Cut Storage Costs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tiered Storage, Cost Optimization, Data Management

Description: Set up hot, warm, and cold storage tiers for OpenTelemetry telemetry data to balance query performance against storage cost.

Storing all telemetry data at the same performance tier is wasteful. Traces from last hour need sub-second query times. Traces from last week need to be accessible but can tolerate slower queries. Traces from last month are rarely accessed and can sit in cheap object storage.

Tiered storage matches data to the storage tier that fits its access pattern. The result is dramatically lower costs without sacrificing access to historical data when you need it.

## The Three Tiers

```mermaid
flowchart LR
    subgraph Hot ["Hot Tier (0-24 hours)"]
        H1[SSD-backed storage]
        H2[Sub-second queries]
        H3[Full resolution data]
    end
    subgraph Warm ["Warm Tier (1-30 days)"]
        W1[HDD or networked storage]
        W2[Seconds to query]
        W3[Full resolution data]
    end
    subgraph Cold ["Cold Tier (30-365 days)"]
        C1[Object storage - S3/GCS]
        C2[Minutes to query]
        C3[Optionally downsampled]
    end
    Hot -->|Age out| Warm
    Warm -->|Age out| Cold
```

**Hot tier**: Recent data for active debugging and real-time dashboards. Fast, expensive storage (NVMe SSDs). Retention: 24-48 hours.

**Warm tier**: Recent historical data for incident investigations and trend analysis. Moderate-speed storage (HDDs or network-attached). Retention: 7-30 days.

**Cold tier**: Long-term archive for compliance, audits, and historical analysis. Cheap object storage (S3, GCS, Azure Blob). Retention: 90-365 days.

## Architecture with the OpenTelemetry Collector

The Collector routes data to different backends based on tiering rules. Fresh data goes to the hot tier directly. A background process handles aging data from hot to warm to cold.

This Collector config sends data to the hot tier and a parallel write to cheap long-term storage:

```yaml
# tiered-storage-collector.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 5s
    send_batch_size: 512

exporters:
  # Hot tier - fast backend for real-time queries
  otlphttp/hot:
    endpoint: https://clickhouse-hot.internal:8428
    headers:
      X-Storage-Tier: hot

  # Cold tier - direct write to object storage via a compatible API
  # This gives you an immediate backup even before tiering kicks in
  otlphttp/cold:
    endpoint: https://s3-gateway.internal:4318
    headers:
      X-Storage-Tier: cold
    sending_queue:
      enabled: true
      queue_size: 10000  # Large queue - cold tier writes are less urgent
    retry_on_failure:
      enabled: true
      max_interval: 60s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      # Fan-out to both tiers simultaneously
      exporters: [otlphttp/hot, otlphttp/cold]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/hot, otlphttp/cold]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/hot, otlphttp/cold]
```

## Implementing Tier Migration with ClickHouse

ClickHouse is a popular backend for OpenTelemetry data and has native support for tiered storage through storage policies.

This ClickHouse configuration defines three storage tiers with automatic data movement:

```xml
<!-- clickhouse-storage-config.xml -->
<clickhouse>
  <storage_configuration>
    <disks>
      <!-- Hot tier: local NVMe SSD -->
      <hot_disk>
        <type>local</type>
        <path>/var/lib/clickhouse/hot/</path>
      </hot_disk>

      <!-- Warm tier: network-attached HDD -->
      <warm_disk>
        <type>local</type>
        <path>/mnt/warm-storage/clickhouse/</path>
      </warm_disk>

      <!-- Cold tier: S3-compatible object storage -->
      <cold_disk>
        <type>s3</type>
        <endpoint>https://s3.us-east-1.amazonaws.com/telemetry-cold-tier/</endpoint>
        <access_key_id>AKIAIOSFODNN7EXAMPLE</access_key_id>
        <secret_access_key>wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY</secret_access_key>
      </cold_disk>
    </disks>

    <policies>
      <tiered_policy>
        <volumes>
          <hot>
            <disk>hot_disk</disk>
          </hot>
          <warm>
            <disk>warm_disk</disk>
          </warm>
          <cold>
            <disk>cold_disk</disk>
          </cold>
        </volumes>
        <!-- Data moves between tiers based on age -->
        <move_factor>0.1</move_factor>
      </tiered_policy>
    </policies>
  </storage_configuration>
</clickhouse>
```

Then create your trace table with TTL rules that control tier migration:

```sql
-- Create a traces table with tiered storage TTL rules
CREATE TABLE otel_traces (
    Timestamp DateTime64(9),
    TraceId String,
    SpanId String,
    ParentSpanId String,
    ServiceName LowCardinality(String),
    SpanName String,
    Duration Int64,
    StatusCode LowCardinality(String),
    SpanAttributes Map(LowCardinality(String), String)
)
ENGINE = MergeTree()
PARTITION BY toDate(Timestamp)
ORDER BY (ServiceName, Timestamp)
-- TTL rules control automatic tier migration
TTL
    -- Stay on hot tier for 2 days
    Timestamp + INTERVAL 2 DAY TO VOLUME 'hot',
    -- Move to warm tier after 2 days, stay for 28 days
    Timestamp + INTERVAL 30 DAY TO VOLUME 'warm',
    -- Move to cold tier after 30 days
    Timestamp + INTERVAL 30 DAY TO VOLUME 'cold',
    -- Delete entirely after 365 days
    Timestamp + INTERVAL 365 DAY DELETE
SETTINGS storage_policy = 'tiered_policy';
```

## Downsampling for the Cold Tier

Traces in the cold tier can be stored at reduced fidelity to save even more space. Keep only the root span and service-level summary spans, dropping internal intermediate spans.

This materialized view creates a compact summary of traces for cold storage:

```sql
-- Materialized view that creates downsampled trace summaries
CREATE MATERIALIZED VIEW otel_traces_summary
ENGINE = MergeTree()
PARTITION BY toDate(Timestamp)
ORDER BY (ServiceName, Timestamp)
TTL Timestamp + INTERVAL 365 DAY DELETE
SETTINGS storage_policy = 'tiered_policy'
AS SELECT
    Timestamp,
    TraceId,
    SpanId,
    ServiceName,
    SpanName,
    Duration,
    StatusCode,
    -- Keep only essential attributes
    mapFilter(
        (k, v) -> k IN ('http.method', 'http.status_code', 'http.route', 'rpc.method'),
        SpanAttributes
    ) AS SpanAttributes
FROM otel_traces
WHERE
    -- Only keep root spans and direct service-entry spans
    ParentSpanId = '' OR SpanName LIKE '%server%';
```

## Cost Comparison

Here is a realistic cost comparison for 1 TB/day of trace data across 30 days:

| Approach | Storage Cost (Monthly) |
|----------|----------------------|
| All data on SSDs | ~$6,000 |
| Tiered (2d hot, 28d warm, cold archive) | ~$1,200 |
| Tiered + downsampling for cold | ~$800 |

The exact numbers depend on your cloud provider and instance types, but the ratios are consistent. Tiered storage typically cuts costs by 70-85%.

## Query Routing

The trade-off with tiered storage is query performance. Queries against the cold tier are slower. Your query layer should route queries to the appropriate tier based on the time range.

For queries covering the last hour, hit only the hot tier. For queries spanning multiple days, the query engine needs to merge results across tiers. Most OLAP databases handle this transparently when tiering is configured at the storage level.

## Monitoring Tier Health

Track how much data sits in each tier and whether migrations are keeping up:

- Hot tier disk usage should stay below 80% capacity
- Warm tier should show data arriving from hot on schedule
- Cold tier object count should grow steadily

If the hot tier fills up before data ages out, either increase hot tier capacity or reduce hot tier retention. Running out of hot tier space causes write failures, which means dropped telemetry.

Tiered storage is essential for any organization storing more than a few hundred gigabytes of telemetry per day. Without it, storage costs grow linearly with data volume and eventually become unsustainable.
