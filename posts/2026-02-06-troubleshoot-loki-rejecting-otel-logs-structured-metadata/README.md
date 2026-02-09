# How to Troubleshoot Loki Rejecting OpenTelemetry Logs Because allow_structured_metadata Is Not Enabled

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Grafana Loki, Logs, Structured Metadata

Description: Fix Grafana Loki rejecting OpenTelemetry log records because the allow_structured_metadata configuration option is not enabled.

You configure the OpenTelemetry Collector to send logs to Grafana Loki via OTLP. The Collector reports export failures, and Loki returns errors like:

```
server returned HTTP status 400 Bad Request:
  structured metadata is not allowed for tenant
```

Or:

```
err="structured metadata feature is not enabled"
```

Loki is rejecting the logs because OpenTelemetry log records include structured metadata (attributes), and Loki needs to be explicitly configured to accept it.

## What Is Structured Metadata

OpenTelemetry log records contain attributes as key-value pairs alongside the log body. When Loki receives these via OTLP, it stores the attributes as "structured metadata" - a feature introduced in Loki 3.0 that allows querying on metadata fields without using them as labels.

By default, this feature is disabled because it changes how data is stored and indexed.

## The Fix: Enable Structured Metadata in Loki

### Loki Configuration File

```yaml
# loki-config.yaml
limits_config:
  allow_structured_metadata: true
  max_structured_metadata_entries_count: 128
  max_structured_metadata_size: 64KB

schema_config:
  configs:
  - from: "2024-01-01"
    store: tsdb
    object_store: filesystem
    schema: v13    # must be v13 or later for structured metadata
    index:
      prefix: index_
      period: 24h
```

Two things must be configured:
1. `allow_structured_metadata: true` in `limits_config`
2. Schema version must be `v13` or later (older schemas do not support it)

### Helm Chart Values

If using the Grafana Loki Helm chart:

```yaml
# loki-values.yaml
loki:
  limits_config:
    allow_structured_metadata: true
  schemaConfig:
    configs:
    - from: "2024-01-01"
      store: tsdb
      object_store: s3
      schema: v13
      index:
        prefix: index_
        period: 24h
```

### Docker Compose

```yaml
services:
  loki:
    image: grafana/loki:3.3.0
    command: -config.file=/etc/loki/loki-config.yaml
    volumes:
    - ./loki-config.yaml:/etc/loki/loki-config.yaml
```

## Schema Version Requirements

Structured metadata requires schema v13. If you have an older schema, you need to add a new schema config entry:

```yaml
schema_config:
  configs:
  # Keep old schema for historical data
  - from: "2023-01-01"
    store: tsdb
    object_store: filesystem
    schema: v12
    index:
      prefix: index_
      period: 24h
  # New schema for structured metadata support
  - from: "2024-06-01"    # start date for new schema
    store: tsdb
    object_store: filesystem
    schema: v13
    index:
      prefix: index_v13_
      period: 24h
```

The new schema applies to data ingested after the `from` date. Historical data remains on the old schema.

## Configuring the Collector to Send Logs to Loki

### Option 1: Use the OTLP Exporter (Loki OTLP endpoint)

```yaml
# Collector config
exporters:
  otlphttp/loki:
    endpoint: http://loki:3100/otlp
    tls:
      insecure: true

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/loki]
```

The `/otlp` endpoint is Loki's native OTLP receiver (available in Loki 3.0+).

### Option 2: Use the Loki Exporter

```yaml
exporters:
  loki:
    endpoint: http://loki:3100/loki/api/v1/push
    default_labels_enabled:
      exporter: false
      job: true
      instance: true
      level: true

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [loki]
```

The Loki exporter converts OTLP logs to Loki's push format. Structured metadata handling depends on the exporter version.

## Controlling What Becomes Labels vs Metadata

By default, Loki OTLP ingestion maps certain attributes to labels and everything else to structured metadata. You can control this with Loki's configuration:

```yaml
# Loki config
limits_config:
  allow_structured_metadata: true
  otlp_config:
    resource_attributes:
      attributes_config:
      - action: index_label
        attributes:
        - service.name
        - deployment.environment
      - action: structured_metadata
        attributes:
        - host.name
        - container.id
```

Only explicitly indexed attributes become Loki labels. Everything else goes to structured metadata.

## Querying Structured Metadata in Grafana

In Grafana Explore, you can query structured metadata using LogQL:

```
# Filter by structured metadata
{service_name="my-service"} | trace_id="abc123"

# Extract structured metadata fields
{service_name="my-service"} | json | trace_id != ""
```

## Verifying the Fix

After enabling structured metadata:

```bash
# Check Loki is accepting logs
curl -s http://loki:3100/ready
# Should return: ready

# Query recent logs
curl -s "http://loki:3100/loki/api/v1/query?query={service_name=\"my-service\"}&limit=5" | jq .
```

If logs appear with structured metadata fields, the configuration is working.

## Summary

Loki rejects OpenTelemetry logs when `allow_structured_metadata` is not enabled because OTLP log records carry attributes that Loki stores as structured metadata. Enable the feature in Loki's `limits_config`, ensure schema version is v13 or later, and use either the OTLP endpoint or the Loki exporter in the Collector to send logs.
