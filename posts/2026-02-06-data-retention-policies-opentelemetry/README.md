# How to Set Up Data Retention Policies for OpenTelemetry Traces, Metrics, and Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Data Retention, Storage Management, Observability Operations

Description: Configure practical data retention policies for each OpenTelemetry signal type based on value, compliance needs, and cost constraints.

Without explicit retention policies, telemetry data accumulates indefinitely. Storage costs climb every month. Queries slow down as backends scan through terabytes of stale data. Eventually someone notices the bill and the response is a panicked "delete everything older than 7 days" - which inevitably happens right before someone needs last month's traces for an incident review.

Retention policies should be deliberate. Each signal type - traces, metrics, and logs - has different value curves over time, and your retention should reflect that.

## Retention Guidelines by Signal Type

Different signals have different shelf lives. Here is a practical starting point:

| Signal | Hot Retention | Warm Retention | Cold/Archive | Total |
|--------|-------------|----------------|--------------|-------|
| Traces | 2 days | 14 days | 90 days | ~106 days |
| Metrics | 7 days (full res) | 90 days (downsampled) | 1 year (aggregated) | ~1 year |
| Logs | 3 days | 30 days | 90 days | ~123 days |

**Traces** lose value quickly. After a few days, you rarely need individual span-level detail. Keep them at full resolution for active debugging, then archive or delete.

**Metrics** retain value much longer because they are aggregated. A metric showing request latency p99 over the last 6 months is useful for capacity planning. Downsample older metrics to reduce storage while preserving trends.

**Logs** fall between traces and metrics. Structured logs correlating to specific incidents are valuable for weeks. Routine informational logs are rarely useful after a few days.

## Implementing Retention at the Collector Level

The OpenTelemetry Collector can enforce retention-like behavior by routing data to different exporters with different backend configurations.

This Collector config routes recent high-priority data to the primary backend and archives everything to cheap storage:

```yaml
# retention-aware-collector.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

  # Filter out traces older than expected
  # (useful if services send delayed/replayed data)
  filter/stale_traces:
    traces:
      span:
        - 'end_time_unix_nano < 1000000000 * (UnixNano() - 86400000000000 * 3)'

exporters:
  # Primary backend with short retention
  otlphttp/primary:
    endpoint: https://primary-backend:4318

  # Archive backend for long-term storage
  otlphttp/archive:
    endpoint: https://archive-backend:4318
    sending_queue:
      enabled: true
      queue_size: 10000

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [filter/stale_traces, batch]
      exporters: [otlphttp/primary, otlphttp/archive]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/primary, otlphttp/archive]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/primary, otlphttp/archive]
```

## Backend-Level Retention Configuration

Most storage backends have native retention controls. Here are configurations for common backends.

### ClickHouse TTL

ClickHouse uses TTL (Time-To-Live) expressions on tables to automatically delete old data.

This SQL sets up different retention periods for each signal type:

```sql
-- Traces table: 14-day retention on primary
ALTER TABLE otel_traces
    MODIFY TTL Timestamp + INTERVAL 14 DAY DELETE;

-- Metrics table: 90-day retention with downsampling at 30 days
-- Keep raw metrics for 30 days
ALTER TABLE otel_metrics
    MODIFY TTL Timestamp + INTERVAL 90 DAY DELETE;

-- Create a downsampled metrics table for long-term retention
CREATE TABLE otel_metrics_downsampled (
    Timestamp DateTime64(9),
    MetricName LowCardinality(String),
    ServiceName LowCardinality(String),
    Value Float64,
    Count UInt64
)
ENGINE = MergeTree()
PARTITION BY toYearWeek(Timestamp)
ORDER BY (MetricName, ServiceName, Timestamp)
TTL Timestamp + INTERVAL 365 DAY DELETE;

-- Materialized view to populate downsampled table
-- Aggregates to 5-minute windows
CREATE MATERIALIZED VIEW otel_metrics_downsampled_mv
TO otel_metrics_downsampled
AS SELECT
    toStartOfFiveMinutes(Timestamp) AS Timestamp,
    MetricName,
    ServiceName,
    avg(Value) AS Value,
    count() AS Count
FROM otel_metrics
GROUP BY Timestamp, MetricName, ServiceName;

-- Logs table: 30-day retention
ALTER TABLE otel_logs
    MODIFY TTL Timestamp + INTERVAL 30 DAY DELETE;
```

### Elasticsearch Index Lifecycle Management

If you use Elasticsearch for logs, configure ILM (Index Lifecycle Management) policies.

This ILM policy manages log index retention through hot, warm, and delete phases:

```json
{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": {
            "max_primary_shard_size": "50gb",
            "max_age": "1d"
          }
        }
      },
      "warm": {
        "min_age": "3d",
        "actions": {
          "shrink": {
            "number_of_shards": 1
          },
          "forcemerge": {
            "max_num_segments": 1
          }
        }
      },
      "delete": {
        "min_age": "30d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

## Service-Specific Retention Overrides

Not all services deserve the same retention. Payment processing traces might need 90-day retention for compliance, while internal tooling traces can be deleted after 3 days.

Implement overrides by routing data through different pipelines based on service attributes:

```yaml
# service-specific-retention.yaml
processors:
  # Route compliance-sensitive services to longer-retention backend
  routing:
    from_attribute: service.name
    table:
      - value: payment-service
        exporters: [otlphttp/compliance]
      - value: billing-service
        exporters: [otlphttp/compliance]
      - value: auth-service
        exporters: [otlphttp/compliance]
    default_exporters: [otlphttp/standard]

exporters:
  otlphttp/standard:
    endpoint: https://standard-backend:4318  # 14-day retention
  otlphttp/compliance:
    endpoint: https://compliance-backend:4318  # 90-day retention
```

## Automating Retention Enforcement

Do not rely on manual cleanup. Automate retention enforcement with a scheduled job that verifies data is being deleted on schedule.

This script checks that retention policies are being enforced correctly:

```python
# retention_checker.py - Run daily to verify retention compliance
import requests
from datetime import datetime, timedelta

BACKENDS = {
    "traces": {"url": "https://primary-backend:8123", "max_age_days": 14},
    "metrics": {"url": "https://primary-backend:8123", "max_age_days": 90},
    "logs": {"url": "https://primary-backend:8123", "max_age_days": 30},
}

def check_retention(signal: str, config: dict):
    """Verify that data older than the retention period has been deleted."""
    cutoff = datetime.utcnow() - timedelta(days=config["max_age_days"] + 1)

    query = f"""
        SELECT count() as stale_rows
        FROM otel_{signal}
        WHERE Timestamp < '{cutoff.isoformat()}'
    """

    response = requests.post(
        config["url"],
        params={"query": query},
    )
    stale_count = int(response.text.strip())

    if stale_count > 0:
        print(f"WARNING: {signal} has {stale_count} rows past retention period")
    else:
        print(f"OK: {signal} retention is enforced correctly")

for signal, config in BACKENDS.items():
    check_retention(signal, config)
```

## Communicating Retention Policies

Write down your retention policies and share them with engineering teams. Engineers need to know:

- How long they can expect their telemetry data to be available
- Which services have extended retention for compliance
- How to request a retention exception for a specific investigation
- The process for retrieving data from cold/archive storage

A simple table in your internal wiki is sufficient. Update it whenever policies change, and reference it in your on-call runbooks so incident responders know what data is available for any given time window.

Retention policies are not exciting, but they are the difference between sustainable observability costs and runaway storage bills. Set them early, automate enforcement, and review them quarterly.
