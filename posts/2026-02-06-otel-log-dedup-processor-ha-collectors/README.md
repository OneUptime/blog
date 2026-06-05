# How to Build a Telemetry Deduplication Pipeline Using the Log Dedup Processor

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Deduplication, High Availability, Log Dedup, Collector

Description: Build a deduplication pipeline using the log dedup processor to handle duplicate telemetry from high-availability collector pair deployments.

Running a single collector is a single point of failure. The natural solution is running two collectors in parallel, both receiving the same telemetry through client-side fan-out. But now you have a new problem: every piece of data arrives twice. The log dedup processor removes these duplicates so your backend stores clean, deduplicated data.

## Why Duplicate Collectors?

In a high-availability setup, applications send telemetry to two collectors simultaneously. If one collector goes down, the other keeps receiving data. No gap in observability.

```text
                    +--> [Collector A] --\
[Application] ---->|                     +--> [Dedup Collector] --> [Backend]
                    +--> [Collector B] --/
```

The dedup collector sits downstream and removes the duplicates before exporting.

## How the Log Dedup Processor Works

The log dedup processor identifies duplicate log records by comparing their body, resource attributes, scope, severity, event name, and log attributes. Timestamps are not part of the identity check. Within each interval, it aggregates identical records and emits one log with a count.

## Configuring the HA Pair

First, set up two collectors from the same template. Each collector receives the same telemetry from the application:

```yaml
# collector-a-config.yaml and collector-b-config.yaml (identical)

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

processors:
  # Tag which collector processed this record
  attributes/collector_id:
    actions:
      - key: collector.instance
        value: "${env:COLLECTOR_ID}"
        action: insert

  batch:
    send_batch_size: 256
    timeout: 3s

exporters:
  otlp/dedup:
    endpoint: "dedup-collector.monitoring.svc:4317"
    tls:
      insecure: true

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [attributes/collector_id, batch]
      exporters: [otlp/dedup]
```

Applications must send each log record to both collectors. A normal Kubernetes Service load-balances each connection to one backend; it does not duplicate traffic. Use client-side fan-out, or expose each collector behind its own endpoint and configure the client, sidecar, or local agent to export to both:

```yaml
# Pseudocode: use the fan-out mechanism supported by your SDK,
# sidecar, or local collector.
otlp_fanout:
  endpoints:
    - "http://otel-ha-a.monitoring.svc:4317"
    - "http://otel-ha-b.monitoring.svc:4317"
```

## The Deduplication Collector

The downstream dedup collector receives from both HA collectors and removes duplicates:

```yaml
# dedup-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 1024
    spike_limit_mib: 256

  # Deduplicate log records
  log_dedup:
    # Interval at which to aggregate deduplicated logs
    log_count_attribute: dedup.count
    interval: 10s
    # Only deduplicate application logs. Logs that do not match pass through.
    conditions:
      - resource.attributes["service.name"] != nil
    # Exclude the collector instance tag from dedup comparison
    # because it will differ between the two HA collectors
    exclude_fields:
      - attributes.collector\.instance

  # Remove the collector instance tag after dedup
  attributes/cleanup:
    actions:
      - key: collector.instance
        action: delete

  batch:
    send_batch_size: 512
    timeout: 5s

exporters:
  otlp:
    endpoint: "https://otlp.oneuptime.com:4317"
    headers:
      x-oneuptime-token: "${env:ONEUPTIME_TOKEN}"

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [memory_limiter, log_dedup, attributes/cleanup, batch]
      exporters: [otlp]
```

## Deduplicating Traces

For traces, deduplication is different. You cannot use the log dedup processor, and the groupbytrace processor only waits for spans with the same trace ID before releasing them to the next processor. It does not identify duplicate spans by itself. If you need trace deduplication, handle it in a backend that can de-duplicate by trace ID and span ID, or build a custom Collector component with that stateful logic.

## Kubernetes Deployment

Deploy the HA pair with a headless service for service discovery. The application or local agent still needs fan-out logic; the headless service only publishes the backing pod addresses.

```yaml
# ha-collectors.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-ha
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: otel-ha
  template:
    metadata:
      labels:
        app: otel-ha
    spec:
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:latest
          env:
            - name: COLLECTOR_ID
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
---
apiVersion: v1
kind: Service
metadata:
  name: otel-ha
  namespace: monitoring
spec:
  clusterIP: None
  selector:
    app: otel-ha
  ports:
    - port: 4317
      targetPort: 4317
```

## Monitoring Deduplication

Track how many duplicates are being removed:

```bash
# Check dedup processor metrics
curl -s http://dedup-collector:8888/metrics | grep dedup

# otelcol_dedup_processor_aggregated_logs_bucket - histogram of
# the number of records aggregated into each emitted log
# otelcol_processor_accepted_log_records{processor="log_dedup"} -
# log records accepted by the processor
```

For a perfect HA pair, most aggregated records should represent two input records. If the aggregation size frequently drops to one, one of the HA collectors might be failing to forward data, or the two paths are adding different attributes that are still part of the dedup comparison.

## Trade-Offs

The dedup collector adds latency because it needs to buffer data for the dedup interval (10 seconds in our example). It also consumes memory proportional to the number of unique log records in the interval. Size the memory limiter accordingly. For most setups, the reliability gain from the HA pair far outweighs these costs.

## Wrapping Up

High-availability collector pairs eliminate single points of failure in your telemetry pipeline. The log dedup processor handles the resulting duplicate data cleanly. Deploy two parallel collectors, point them at a dedup collector, and you get reliability without data duplication in your backend.
