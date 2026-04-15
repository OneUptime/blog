# How to Use ClickHouse as a Backend for SigNoz

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SigNoz, Observability, APM, OpenTelemetry

Description: Learn how SigNoz uses ClickHouse as its storage backend for traces, metrics, and logs, and how to configure and tune it for production deployments.

---

## What Is SigNoz

SigNoz is an open-source APM and observability platform that natively uses ClickHouse as its storage backend. Unlike Jaeger or Prometheus, SigNoz is designed from the ground up with ClickHouse, storing traces, metrics, and logs in a unified data store.

## Architecture

```text
Applications (OpenTelemetry SDKs)
        |
        v
OpenTelemetry Collector (SigNoz OtelCollector)
        |
        v
ClickHouse (traces, metrics, logs tables)
        |
        v
SigNoz Query Service + Frontend
```

## Installing SigNoz with Docker Compose

```bash
git clone https://github.com/SigNoz/signoz.git
cd signoz/deploy/docker
docker compose -f docker-compose.yaml up -d
```

SigNoz automatically provisions ClickHouse with its required schema.

## Key ClickHouse Tables

SigNoz creates these core tables:

```sql
-- Distributed trace spans
signoz_traces.distributed_signoz_index_v3

-- Log entries
signoz_logs.distributed_logs_v2

-- Time-series metrics
signoz_metrics.distributed_samples_v4
```

## Tuning ClickHouse for SigNoz

Increase the ClickHouse memory limit for large deployments:

```xml
<clickhouse>
  <profiles>
    <default>
      <max_memory_usage>32000000000</max_memory_usage>
      <max_bytes_before_external_group_by>20000000000</max_bytes_before_external_group_by>
    </default>
  </profiles>
</clickhouse>
```

Set appropriate TTL for trace data retention:

```sql
ALTER TABLE signoz_traces.distributed_signoz_index_v3
MODIFY TTL toDateTime(timestamp) + INTERVAL 30 DAY
```

## Sending Data to SigNoz via OpenTelemetry

```yaml
exporters:
  otlp:
    endpoint: signoz-otel-collector:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      exporters: [otlp]
    metrics:
      exporters: [otlp]
    logs:
      exporters: [otlp]
```

## Custom ClickHouse Queries in SigNoz

SigNoz's Logs Explorer lets you write raw ClickHouse-compatible filters:

```sql
body ILIKE '%payment failed%'
AND attributes_string['user_id'] = '12345'
AND timestamp >= toDateTime('2025-01-01 00:00:00')
```

## Scaling ClickHouse for High Ingest

For high trace/log volumes, configure ClickHouse with more shards and distributed tables. SigNoz supports ClickHouse clusters via Helm value overrides.

```bash
helm install signoz signoz/signoz \
  --set clickhouse.layout.replicasCount=3 \
  --set clickhouse.layout.shardsCount=2
```

## Summary

SigNoz uses ClickHouse as its native storage backend for traces, metrics, and logs. Tune ClickHouse memory settings and TTL values for your retention requirements. Use the OpenTelemetry Collector to forward spans and logs to SigNoz. For production workloads, deploy ClickHouse in a sharded, replicated cluster using the SigNoz Helm chart.
