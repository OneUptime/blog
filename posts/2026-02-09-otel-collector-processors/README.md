# How to use OpenTelemetry Collector processors for data transformation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Observability, Data Processing, Transformation, Configuration

Description: Configure OpenTelemetry Collector processors to transform, filter, enrich, and sample telemetry data including batch processing, resource detection, attribute manipulation.

---

Processors sit between receivers and exporters in the OpenTelemetry Collector pipeline, transforming telemetry data before export. They enable filtering sensitive data, adding context, sampling high-volume traces, and batching for efficient transmission. Understanding processors is key to building efficient and cost-effective observability pipelines.

## Understanding Processor Types

Processors fall into several categories. Batching processors group telemetry for efficient transmission. Resource processors add or modify resource attributes. Filtering processors drop unwanted data based on criteria. Sampling processors reduce data volume while preserving statistical significance. Each processor operates on the data stream, allowing complex transformation chains.

Processors execute in the order they appear in the pipeline configuration. A poorly ordered pipeline can negate the benefits of individual processors, so careful planning is essential.

## Configuring Batch Processor

The batch processor is fundamental for performance. It groups telemetry into batches before export, reducing network overhead:

```yaml
processors:
  batch:
    # Maximum time to wait before sending a batch
    timeout: 10s

    # Send batch when it reaches this size
    send_batch_size: 1024

    # Maximum batch size (hard limit)
    send_batch_max_size: 2048

    # Metadata keys to use for batching
    # Items with different metadata go in separate batches
    metadata_keys:
    - tenant_id
    - service_name

exporters:
  otlp:
    endpoint: backend:4317

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
```

Tune batch settings based on your throughput:

```yaml
# Low-volume pipeline (< 100 spans/sec)

processors:
  batch/low-volume:
    timeout: 30s
    send_batch_size: 512

# High-volume pipeline (> 10000 spans/sec)
processors:
  batch/high-volume:
    timeout: 1s
    send_batch_size: 10000
    send_batch_max_size: 20000
```

## Configuring Resource Detection Processor

Automatically detect and add resource attributes from the environment:

```yaml
processors:
  resource_detection:
    # Detector order matters - first detector to add an attribute wins
    detectors:
    - env          # Environment variables
    - system       # System hostname, OS
    - docker       # Docker container info
    - ec2          # AWS EC2 metadata
    - gcp          # Google Cloud metadata
    - azure        # Azure VM metadata
    - eks          # Amazon EKS metadata
    - aks          # Azure AKS metadata

    timeout: 5s
    override: false  # Don't override existing attributes

    # System detector config
    system:
      hostname_sources:
      - os
      - dns
      - cname

    # EC2 detector config
    ec2:
      tags:
      - ^Name$
      - ^Environment$
      - ^Team$

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource_detection, batch]
      exporters: [otlp]
```

## Configuring Resource Processor

Manually add, modify, or delete resource attributes:

```yaml
processors:
  resource/add-cluster:
    attributes:
    - key: cluster.name
      value: production-us-east
      action: insert
    - key: environment
      value: production
      action: upsert

  resource/rename:
    attributes:
    - key: service.name
      from_attribute: app
      action: insert
    - key: app
      action: delete

  resource/drop-sensitive:
    attributes:
    - key: aws.account.id
      action: delete
    - key: gcp.project.id
      action: delete

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource/add-cluster, resource/rename, resource/drop-sensitive, batch]
      exporters: [otlp]
```

## Configuring Attributes Processor

Modify span, metric, or log attributes:

```yaml
processors:
  attributes/add-metadata:
    actions:
    - key: deployment.version
      value: v1.2.3
      action: insert
    - key: team
      value: platform
      action: insert

  attributes/mask-pii:
    actions:
    # Hash email addresses
    - key: user.email
      action: hash
    # Extract user IDs from sensitive paths
    - key: http.target
      pattern: /api/users/(?P<user_id>[0-9]+)/private
      action: extract

  attributes/standardize:
    actions:
    # Extract hostname from URL
    - key: http.url
      pattern: "^https?://(?P<http_host>[^/]+)"
      action: extract

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes/add-metadata, attributes/mask-pii, attributes/standardize, batch]
      exporters: [otlp]
```

## Configuring Filter Processor

Drop unwanted telemetry based on criteria:

```yaml
processors:
  filter/drop-health-checks:
    trace_conditions:
    - 'span.attributes["http.target"] == "/health"'
    - 'span.attributes["http.target"] == "/readiness"'
    - 'span.attributes["http.target"] == "/livez"'

  filter/drop-debug-logs:
    log_conditions:
    - 'log.severity_text == "DEBUG"'
    - 'log.severity_text == "TRACE"'

  filter/drop-low-value-metrics:
    metric_conditions:
    - 'metric.name == "process.runtime.go.mem.heap_idle"'
    - 'metric.name == "process.runtime.go.gc.count"'

  filter/drop-internal:
    trace_conditions:
    - 'resource.attributes["service.namespace"] == "internal"'
    - 'IsMatch(resource.attributes["service.name"], ".*-test")'

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [filter/drop-health-checks, filter/drop-internal, batch]
      exporters: [otlp]
    metrics:
      receivers: [otlp]
      processors: [filter/drop-low-value-metrics, batch]
      exporters: [otlp]
```

## Configuring Tail-Based Sampling Processor

Sample traces based on complete trace information:

```yaml
processors:
  tail_sampling:
    decision_wait: 30s  # Wait for complete trace
    num_traces: 100000  # Number of traces to track
    expected_new_traces_per_sec: 100

    policies:
    # Always sample errors
    - name: error-policy
      type: status_code
      status_code:
        status_codes:
        - ERROR

    # Always sample slow traces
    - name: slow-traces
      type: latency
      latency:
        threshold_ms: 5000

    # Sample 10% of successful fast traces
    - name: normal-traces
      type: probabilistic
      probabilistic:
        sampling_percentage: 10

    # Always sample specific services
    - name: critical-services
      type: string_attribute
      string_attribute:
        key: service.name
        values:
        - payment-service
        - auth-service

    # Sample based on trace state
    - name: trace-id-hash
      type: trace_state
      trace_state:
        key: sampling.priority
        values:
        - "1"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [tail_sampling, batch]
      exporters: [otlp]
```

## Configuring Span Processor

Modify span names and attributes:

```yaml
processors:
  span/rename:
    name:
      from_attributes:
      - http.method
      - http.route
      separator: " "
      to_attributes:
        rules:
        - "^GET /api/users/(?P<id>[0-9]+)$"

  span/add-attributes:
    name:
      to_attributes:
        rules:
        - "^GET /api/users/(?P<id>[0-9]+)$"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [span/rename, span/add-attributes, batch]
      exporters: [otlp]
```

## Configuring Transform Processor

Use OTTL (OpenTelemetry Transformation Language) for complex transformations:

```yaml
processors:
  transform:
    trace_statements:
    - context: span
      statements:
      # Add service version from resource
      - set(span.attributes["service.version"], resource.attributes["service.version"])

      # Normalize HTTP method
      - replace_pattern(span.attributes["http.method"], "(?i)^get$", "GET")

      # Extract user ID from path
      - merge_maps(span.attributes, ExtractPatterns(span.attributes["http.target"], "/users/(?P<user_id>[0-9]+)"), "upsert")

      # Set error flag
      - set(span.attributes["error"], true) where span.status.code == STATUS_CODE_ERROR

    metric_statements:
    - context: datapoint
      statements:
      # Add cluster name to all metrics
      - set(resource.attributes["cluster"], "production")

      # Convert bytes to megabytes
      - set(datapoint.value_double, datapoint.value_double / 1048576) where metric.name == "memory.usage"

    log_statements:
    - context: log
      statements:
      # Parse JSON body
      - merge_maps(log.attributes, ParseJSON(log.body), "upsert")

      # Add timestamp
      - set(log.attributes["processed_at"], Now())

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [transform, batch]
      exporters: [otlp]
```

## Configuring Memory Limiter Processor

Prevent collector from running out of memory:

```yaml
processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 1024  # Hard limit
    spike_limit_mib: 256  # Spike allowance

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp]
```

Monitor memory usage:

```yaml
extensions:
  health_check:
    endpoint: 0.0.0.0:13133
  zpages:
    endpoint: 0.0.0.0:55679

service:
  extensions: [health_check, zpages]
```

## Optimizing Processor Pipelines

Order processors for efficiency:

```yaml
processors:
  # 1. Memory limiter first to prevent OOM
  memory_limiter:
    limit_mib: 1024

  # 2. Filter early to reduce processing
  filter/drop-health:
    trace_conditions:
    - 'span.attributes["http.target"] == "/health"'

  # 3. Sample before expensive operations
  tail_sampling:
    policies:
    - name: errors
      type: status_code
      status_code:
        status_codes: [ERROR]

  # 4. Add attributes/resources
  resource:
    attributes:
    - key: cluster
      value: prod
      action: insert

  # 5. Batch last before export
  batch:
    timeout: 10s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors:
      - memory_limiter
      - filter/drop-health
      - tail_sampling
      - resource
      - batch
      exporters: [otlp]
```

## Troubleshooting Processors

Debug processor issues:

```yaml
# Enable detailed logging
service:
  telemetry:
    logs:
      level: debug
      development: true
      encoding: json
      output_paths:
      - stderr
```

```bash
# Check processor metrics
kubectl port-forward -n observability svc/otel-collector 8888:8888
curl http://localhost:8888/metrics | grep processor

# View zpages for pipeline details
kubectl port-forward -n observability svc/otel-collector 55679:55679
# Open http://localhost:55679/debug/tracez
```

OpenTelemetry Collector processors provide powerful data transformation capabilities. By chaining processors effectively, you can filter sensitive information, enrich telemetry with context, implement intelligent sampling, and optimize data before export, building cost-effective and privacy-compliant observability pipelines.
