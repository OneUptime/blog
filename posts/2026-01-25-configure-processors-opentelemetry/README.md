# How to Configure Processors in OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Processors, Collector, Observability, Data Processing, Telemetry, Configuration

Description: A practical guide to configuring OpenTelemetry Collector processors for filtering, transforming, and enriching telemetry data before export.

---

Processors in the OpenTelemetry Collector transform telemetry data between receiving and exporting. They filter unwanted data, enrich spans with additional context, modify attributes, and control memory usage. Understanding how to configure processors effectively is essential for building a maintainable observability pipeline.

## Processor Execution Order

Processors execute in the order they appear in the pipeline definition. This order matters because each processor sees the output of the previous one.

```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch, attributes, filter]
      exporters: [otlp]
```

In this example, data flows: `otlp receiver -> memory_limiter -> batch -> attributes -> filter -> otlp exporter`.

A common best practice is to put `memory_limiter` first (to protect against OOM), followed by data manipulation processors, and `batch` near the end (to optimize export efficiency).

## Memory Limiter Processor

The memory limiter prevents the collector from consuming too much memory and crashing. It should be the first processor in every pipeline.

```yaml
processors:
  memory_limiter:
    # How often to check memory usage
    check_interval: 5s
    # Maximum memory before dropping data
    limit_mib: 2048
    # Memory level at which to start dropping data aggressively
    spike_limit_mib: 512
```

When memory exceeds `limit_mib - spike_limit_mib`, the processor starts refusing data. When it exceeds `limit_mib`, it drops data more aggressively.

## Batch Processor

The batch processor groups telemetry data into batches before export. This reduces the number of network calls and improves throughput.

```yaml
processors:
  batch:
    # Maximum items in a batch
    send_batch_size: 1024
    # Hard limit on batch size
    send_batch_max_size: 2048
    # Maximum time to wait before sending a partial batch
    timeout: 5s
```

Tune these values based on your export backend:
- High-throughput backends: larger batches (2048-8192)
- Low-latency requirements: smaller batches, shorter timeouts
- Cost-sensitive backends: larger batches to reduce API calls

## Attributes Processor

The attributes processor adds, modifies, or removes attributes from spans, metrics, and logs.

### Adding Attributes

```yaml
processors:
  attributes:
    actions:
      # Add a static value
      - key: environment
        value: production
        action: insert

      # Add from environment variable
      - key: deployment.version
        value: ${DEPLOY_VERSION}
        action: insert

      # Upsert (insert or update)
      - key: collector.name
        value: gateway-collector
        action: upsert
```

### Extracting from Existing Attributes

```yaml
processors:
  attributes:
    actions:
      # Copy value from another attribute
      - key: service.namespace
        from_attribute: k8s.namespace.name
        action: insert

      # Extract using regex
      - key: user.id
        pattern: "user_(?P<user_id>[0-9]+)"
        from_attribute: http.url
        action: extract
```

### Removing Sensitive Data

```yaml
processors:
  attributes:
    actions:
      # Delete specific attributes
      - key: http.request.header.authorization
        action: delete

      # Hash sensitive values
      - key: user.email
        action: hash

      # Delete matching pattern
      - key: "password"
        action: delete
        pattern: ".*password.*"
```

### Conditional Processing

Apply actions only to specific telemetry:

```yaml
processors:
  attributes:
    # Only apply to spans from auth-service
    include:
      match_type: strict
      services:
        - auth-service
    actions:
      - key: security.level
        value: high
        action: insert
```

## Resource Processor

The resource processor modifies resource attributes, which describe the entity producing telemetry (service, host, container).

```yaml
processors:
  resource:
    attributes:
      # Add deployment information
      - key: deployment.environment
        value: production
        action: upsert

      - key: cloud.provider
        value: aws
        action: insert

      - key: cloud.region
        value: us-east-1
        action: insert

      # Remove internal attributes
      - key: internal.node.id
        action: delete
```

## Filter Processor

The filter processor drops telemetry based on conditions. This reduces data volume before export.

### Filtering Spans

```yaml
processors:
  filter:
    error_mode: ignore  # Continue processing on errors
    traces:
      span:
        # Drop health check spans
        - 'attributes["http.route"] == "/health"'
        - 'attributes["http.route"] == "/ready"'

        # Drop spans shorter than 1ms
        - 'duration < 1000000'  # nanoseconds

        # Drop spans from specific services
        - 'resource.attributes["service.name"] == "internal-poller"'
```

### Filtering Metrics

```yaml
processors:
  filter:
    metrics:
      metric:
        # Drop specific metric names
        - 'name == "process.runtime.go.gc.pause_ns"'

        # Drop metrics with high cardinality labels
        - 'HasLabel(attributes, "request_id")'

      datapoint:
        # Drop zero values
        - 'value == 0'
```

### Filtering Logs

```yaml
processors:
  filter:
    logs:
      log_record:
        # Drop debug logs
        - 'severity_number < 9'  # Below INFO

        # Drop logs from noisy component
        - 'attributes["component"] == "health-checker"'

        # Drop logs matching pattern
        - 'IsMatch(body, ".*heartbeat.*")'
```

## Transform Processor

The transform processor provides powerful data manipulation using the OpenTelemetry Transformation Language (OTTL).

### Modifying Span Names

```yaml
processors:
  transform:
    error_mode: ignore
    trace_statements:
      - context: span
        statements:
          # Normalize span names
          - set(name, "HTTP GET") where name == "GET"
          - set(name, "HTTP POST") where name == "POST"

          # Combine route and method
          - set(name, Concat([attributes["http.method"], " ", attributes["http.route"]], ""))
            where attributes["http.route"] != nil
```

### Truncating Large Attributes

```yaml
processors:
  transform:
    trace_statements:
      - context: span
        statements:
          # Truncate large attribute values
          - truncate_all(attributes, 256)

          # Limit specific attribute
          - set(attributes["http.request.body"],
                Substring(attributes["http.request.body"], 0, 1000))
            where Len(attributes["http.request.body"]) > 1000
```

### Adding Computed Attributes

```yaml
processors:
  transform:
    trace_statements:
      - context: span
        statements:
          # Add duration in milliseconds
          - set(attributes["duration_ms"], duration / 1000000)

          # Classify response times
          - set(attributes["latency_bucket"], "fast") where duration < 100000000
          - set(attributes["latency_bucket"], "medium")
            where duration >= 100000000 and duration < 1000000000
          - set(attributes["latency_bucket"], "slow") where duration >= 1000000000
```

## Span Processor

The span processor modifies span names and extracts attributes from span names.

```yaml
processors:
  span:
    name:
      # Extract parts of span name to attributes
      from_attributes: [http.method, http.route]
      separator: " "

    # Set span status based on attributes
    status:
      code: error
      description: "HTTP error response"
```

## Probabilistic Sampler Processor

For head-based sampling (before trace completion):

```yaml
processors:
  probabilistic_sampler:
    # Sample 10% of traces
    sampling_percentage: 10

    # Use trace ID for consistent sampling
    hash_seed: 22
```

## Grouping Processors

The `groupbyattrs` processor reorganizes telemetry by moving span attributes to resource attributes, useful for backends that prefer resource-level grouping.

```yaml
processors:
  groupbyattrs:
    keys:
      - service.name
      - deployment.environment
      - host.name
```

## Complete Pipeline Example

Here is a production-ready pipeline combining multiple processors:

```yaml
processors:
  # Protect against memory issues
  memory_limiter:
    check_interval: 5s
    limit_mib: 2048
    spike_limit_mib: 512

  # Add environment context
  resource:
    attributes:
      - key: deployment.environment
        value: ${ENVIRONMENT}
        action: upsert
      - key: collector.version
        value: "1.2.0"
        action: insert

  # Filter unwanted data
  filter:
    traces:
      span:
        - 'attributes["http.route"] == "/health"'
        - 'attributes["http.route"] == "/metrics"'

  # Transform and enrich
  transform:
    trace_statements:
      - context: span
        statements:
          - truncate_all(attributes, 512)
          - set(attributes["duration_ms"], duration / 1000000)

  # Remove sensitive attributes
  attributes:
    actions:
      - key: http.request.header.authorization
        action: delete
      - key: user.password
        action: delete
      - key: credit_card
        action: hash

  # Batch for efficient export
  batch:
    send_batch_size: 1024
    timeout: 5s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors:
        - memory_limiter
        - filter
        - resource
        - transform
        - attributes
        - batch
      exporters: [otlphttp]
```

## Debugging Processors

When processors do not behave as expected, use the debug exporter to inspect data at each stage:

```yaml
exporters:
  debug:
    verbosity: detailed
    sampling_initial: 10
    sampling_thereafter: 100

service:
  pipelines:
    traces/debug:
      receivers: [otlp]
      processors: [memory_limiter, filter]  # Test specific processors
      exporters: [debug]
```

Check collector logs for processor-specific metrics and errors.

## Performance Considerations

1. **Filter early**: Place filter processors before transform processors to reduce work on data that will be dropped.

2. **Batch efficiently**: Larger batches reduce overhead but increase latency. Find the right balance for your use case.

3. **Limit transforms**: Complex OTTL statements add CPU overhead. Keep transformations simple when possible.

4. **Monitor processor metrics**: Track `otelcol_processor_*` metrics to identify bottlenecks.

## Conclusion

Processors are the workhorses of the OpenTelemetry Collector pipeline. They give you control over what data reaches your backends, how it looks, and how much of it you pay to store. Start with the essential processors (memory limiter, batch, filter), then add transformation and enrichment as your needs evolve. Always test processor configurations with representative data before deploying to production.
