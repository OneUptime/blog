# How to Build a Telemetry Deduplication Pipeline Using the Log Dedup Processor for High-Availability Collector Pairs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Deduplication, High Availability, Log Dedup, Collector

Description: Build a deduplication pipeline using the log dedup processor to handle duplicate telemetry from high-availability collector pair deployments.

Running a single collector is a single point of failure. The natural solution is running two collectors in parallel, both receiving the same telemetry. But now you have a new problem: every piece of data arrives twice. The log dedup processor removes these duplicates so your backend stores clean, deduplicated data.

## Why Duplicate Collectors?

In a high-availability setup, applications send telemetry to two collectors simultaneously. If one collector goes down, the other keeps receiving data. No gap in observability.

```
                    +--> [Collector A] --\
[Application] ---->|                     +--> [Dedup Collector] --> [Backend]
                    +--> [Collector B] --/
```

The dedup collector sits downstream and removes the duplicates before exporting.

## How the Log Dedup Processor Works

The log dedup processor identifies duplicate log records by comparing specific fields. When it sees two records with the same body, severity, and resource attributes within a time window, it keeps one and drops the other. It can also aggregate duplicates and emit a count.

## Configuring the HA Pair

First, set up two identical collectors that both receive from the same source:

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
        value: "collector-a"  # Change to "collector-b" for the second one
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

Applications send to both collectors using a client-side fan-out or a load balancer:

```yaml
# Application OTLP config
# Use a load balancer that sends to both collectors
OTEL_EXPORTER_OTLP_ENDPOINT: "http://otel-ha-lb.monitoring.svc:4317"
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
  logdedup:
    # Time window to look for duplicates
    log_count_attribute: dedup.count
    # Interval at which to flush deduplicated logs
    interval: 10s
    # Which fields to use for identifying duplicates
    conditions:
      - body
      - severity_text
      - resource["service.name"]
      - attributes["log.file.path"]
    # Exclude the collector instance tag from dedup comparison
    # because it will differ between the two HA collectors
    exclude_keys:
      - collector.instance

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
      x-oneuptime-token: "${ONEUPTIME_TOKEN}"

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [memory_limiter, logdedup, attributes/cleanup, batch]
      exporters: [otlp]
```

## Deduplicating Traces

For traces, deduplication is different. You cannot use the log dedup processor. Instead, use a combination of the groupbytrace processor and custom logic:

```yaml
processors:
  # Group spans by trace ID to detect duplicates
  groupbytrace:
    wait_duration: 15s
    num_traces: 50000

  # Use transform to mark and filter duplicates
  transform/dedup_traces:
    trace_statements:
      - context: span
        statements:
          # If we see the same span ID twice, the second one is a duplicate
          # The groupbytrace processor collects them together
          - set(attributes["dedup.is_duplicate"], true)
            where attributes["collector.instance"] == "collector-b"
            and SpanID() != nil

  filter/drop_dupes:
    traces:
      span:
        - 'attributes["dedup.is_duplicate"] == true'
```

## Kubernetes Deployment

Deploy the HA pair with a headless service so both pods receive traffic:

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
  name: otel-ha-lb
  namespace: monitoring
spec:
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

# otelcol_processor_logdedup_total_logs_in - total logs received
# otelcol_processor_logdedup_total_logs_out - logs after dedup
# Dedup ratio = 1 - (out / in)
# For a perfect HA pair, this should be close to 50%
```

If the dedup ratio drops significantly below 50%, one of the HA collectors might be failing to forward data, which defeats the purpose of the HA setup.

## Trade-Offs

The dedup collector adds latency because it needs to buffer data for the dedup window (10 seconds in our example). It also consumes memory proportional to the number of unique log records in the window. Size the memory limiter accordingly. For most setups, the reliability gain from the HA pair far outweighs these costs.

## Wrapping Up

High-availability collector pairs eliminate single points of failure in your telemetry pipeline. The log dedup processor handles the resulting duplicate data cleanly. Deploy two parallel collectors, point them at a dedup collector, and you get reliability without data duplication in your backend.
