# How to Configure the Datadog Receiver in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Datadog, Migration, Metric, Trace, APM

Description: Complete guide to configuring the Datadog receiver in OpenTelemetry Collector for seamless migration from Datadog agents while maintaining compatibility with existing instrumentation.

---

The Datadog receiver in the OpenTelemetry Collector enables you to accept telemetry data from Datadog agents and APM libraries, then route it to any backend that supports OpenTelemetry. This receiver is particularly valuable when migrating from Datadog to open-source or vendor-neutral observability solutions, as it allows you to preserve your existing instrumentation while switching backends.

If you're looking to break free from Datadog's pricing model or want to centralize telemetry from multiple sources, the Datadog receiver provides a smooth transition path without requiring immediate code changes across your entire infrastructure.

---

## What is the Datadog Receiver?

The Datadog receiver is an OpenTelemetry Collector component that implements Datadog Agent intake APIs, allowing it to accept traces, metrics, and logs in Datadog's native formats. It translates this data into OpenTelemetry's data model, making it available for processing by standard OpenTelemetry processors and export to any OTLP-compatible backend.

The receiver supports multiple Datadog protocols:
- **APM traces** via the Datadog trace agent API
- **Datadog metrics API** for custom metrics
- **Datadog logs API** for log intake

For DogStatsD metrics on port 8125, use the Collector's separate StatsD receiver alongside the Datadog receiver.

**Key benefits:**

- Migrate from Datadog without changing application code
- Use OpenTelemetry's ecosystem while keeping Datadog instrumentation
- Run Datadog agents alongside OpenTelemetry-native instrumentation
- Compare Datadog and alternative backends side-by-side during evaluation
- Eliminate per-host agent licensing costs

---

## Architecture Overview

The Datadog receiver acts as a drop-in replacement for Datadog trace and intake API endpoints. Your applications continue to use Datadog's client libraries, but instead of sending data to Datadog's SaaS, they send to your OpenTelemetry Collector:

```mermaid
graph LR
    A[App with Datadog APM] -->|Datadog Trace Format| B[OpenTelemetry Collector]
    C[App with DogStatsD] -->|DogStatsD| B
    D[Datadog Agent] -->|Datadog API| B

    B -->|Convert to OTLP| E[Processors]
    E -->|OTLP| F[(OneUptime)]
    E -->|OTLP| G[(Prometheus)]
    E -->|OTLP| H[(Other Backends)]

    style B fill:#f9f,stroke:#333,stroke-width:2px
    style A fill:#f96,stroke:#333,stroke-width:2px
    style C fill:#f96,stroke:#333,stroke-width:2px
    style D fill:#f96,stroke:#333,stroke-width:2px
```

This architecture allows you to maintain Datadog instrumentation while gaining the flexibility of OpenTelemetry's vendor-neutral ecosystem. You can route data to multiple backends, apply custom processing, and avoid vendor lock-in.

---

## Prerequisites

Before configuring the Datadog receiver, ensure you have:

1. **OpenTelemetry Collector Contrib** with the Datadog receiver and, if you need DogStatsD, the StatsD receiver
2. **Applications instrumented with Datadog libraries** (dd-trace-py, dd-trace-java, dd-trace-js, etc.)
3. **Network connectivity** from your applications to the Collector
4. **Understanding of your current Datadog configuration** (agent endpoints, ports, API keys)

---

## Basic Configuration

The Datadog receiver listens for Datadog trace and intake API traffic, while DogStatsD metrics use the separate StatsD receiver. Here's a minimal working configuration:

```yaml
# RECEIVERS: Define how telemetry enters the Collector

receivers:
  # Datadog receiver implements Datadog trace and intake APIs
  datadog:
    # Endpoint for APM traces (Datadog trace agent API)
    endpoint: 0.0.0.0:8126

  # StatsD receiver accepts StatsD and DogStatsD metrics
  statsd:
    endpoint: 0.0.0.0:8125
    aggregation_interval: 60s

# EXPORTERS: Define where telemetry is sent
exporters:
  # Export traces and metrics to OneUptime
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    encoding: json
    headers:
      Content-Type: application/json
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

# SERVICE: Wire receivers to exporters
service:
  pipelines:
    # Traces pipeline: receive from Datadog APM, export to OneUptime
    traces:
      receivers: [datadog]
      exporters: [otlphttp]

    # Metrics pipeline: receive from DogStatsD, export to OneUptime
    metrics:
      receivers: [statsd]
      exporters: [otlphttp]
```

**Configuration breakdown:**

- `endpoint`: The address and port where the receiver listens for Datadog APM traces (default Datadog agent port is 8126)
- `statsd.endpoint`: The address and port where the StatsD receiver listens for StatsD and DogStatsD metrics (default DogStatsD port is 8125)

---

## Comprehensive Configuration with All Protocols

In a production environment, you'll want to enable the Datadog receiver, the StatsD receiver for DogStatsD, and configure proper processing. Here's a complete configuration:

```yaml
receivers:
  datadog:
    # APM traces endpoint (Datadog trace agent API)
    endpoint: 0.0.0.0:8126
    read_timeout: 60s

  # StatsD/DogStatsD metrics endpoint
  statsd:
    endpoint: 0.0.0.0:8125
    aggregation_interval: 60s
    enable_metric_type: true

    # Enable parsing DogStatsD tags without values, such as #canary
    enable_simple_tags: true

    # Timer histogram configuration
    timer_histogram_mapping:
      - statsd_type: "timing"
        observer_type: "histogram"
      - statsd_type: "histogram"
        observer_type: "histogram"

processors:
  # Protect Collector from memory exhaustion
  memory_limiter:
    limit_mib: 1024
    spike_limit_mib: 256
    check_interval: 2s

  # Batch telemetry to reduce network overhead
  batch:
    send_batch_size: 1024
    send_batch_max_size: 2048
    timeout: 10s

  # Add resource attributes to identify the source
  resource:
    attributes:
      - key: deployment.environment
        value: production
        action: upsert
      - key: telemetry.source
        value: datadog-migration
        action: upsert

  # Transform Datadog-specific attributes to OpenTelemetry semantic conventions
  transform/normalize:
    error_mode: ignore
    trace_statements:
      - set(resource.attributes["service.name"], span.attributes["service"]) where resource.attributes["service.name"] == nil and span.attributes["service"] != nil
      - set(resource.attributes["deployment.environment"], span.attributes["env"]) where resource.attributes["deployment.environment"] == nil and span.attributes["env"] != nil

exporters:
  # Export to OneUptime with retry configuration
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    encoding: json
    headers:
      Content-Type: application/json
      x-oneuptime-token: ${ONEUPTIME_TOKEN}
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s
    timeout: 30s
    compression: gzip

  # Debug exporter for troubleshooting (logs telemetry to console)
  debug:
    verbosity: detailed

service:
  # Enable telemetry for the Collector itself
  telemetry:
    logs:
      level: info
    metrics:
      readers:
        - pull:
            exporter:
              prometheus:
                host: localhost
                port: 8888

  pipelines:
    # Traces pipeline with full processing
    traces:
      receivers: [datadog]
      processors: [memory_limiter, resource, transform/normalize, batch]
      exporters: [otlphttp]

    # Metrics pipeline with processing
    metrics:
      receivers: [statsd]
      processors: [memory_limiter, resource, batch]
      exporters: [otlphttp]
```

**Key processing steps:**

1. **Memory limiter** prevents the Collector from consuming excessive memory under load
2. **Resource processor** adds identifying attributes to all telemetry
3. **Transform processor** normalizes Datadog-specific field names to OpenTelemetry semantic conventions
4. **Batch processor** groups telemetry into batches for efficient export

---

## Configuring Applications to Use the Collector

After setting up the receiver, point your Datadog-instrumented applications to the Collector instead of the Datadog Agent or SaaS endpoint.

**Python (ddtrace):**

```python
# Before: Sending to Datadog Agent on localhost
# No configuration needed - ddtrace defaults to localhost:8126

# After: Sending to OpenTelemetry Collector
import os
os.environ['DD_AGENT_HOST'] = 'otel-collector.example.com'
os.environ['DD_TRACE_AGENT_PORT'] = '8126'

from ddtrace import tracer
# Your application code remains unchanged
```

**Java (dd-trace-java):**

```bash
# Before: JVM arguments for Datadog Agent
java -javaagent:dd-java-agent.jar \
  -Ddd.service=my-service \
  -Ddd.env=production \
  -jar myapp.jar

# After: Point to OpenTelemetry Collector
java -javaagent:dd-java-agent.jar \
  -Ddd.service=my-service \
  -Ddd.env=production \
  -Ddd.agent.host=otel-collector.example.com \
  -Ddd.trace.agent.port=8126 \
  -jar myapp.jar
```

**Node.js (dd-trace-js):**

```javascript
// Before: Default Datadog configuration
require('dd-trace').init();

// After: Point to OpenTelemetry Collector
require('dd-trace').init({
  hostname: 'otel-collector.example.com',
  port: 8126
});

// Your application code remains unchanged
```

**Environment variables (works for all languages):**

```bash
# Set these environment variables to redirect Datadog instrumentation
export DD_AGENT_HOST=otel-collector.example.com
export DD_TRACE_AGENT_PORT=8126
export DD_DOGSTATSD_PORT=8125
```

---

## DogStatsD Configuration

DogStatsD is Datadog's extension of StatsD that supports tags and additional metric types. The OpenTelemetry Collector's StatsD receiver supports DogStatsD format and can be used alongside the Datadog receiver.

**Application code example (Python):**

```python
from datadog import initialize, statsd

# Initialize DogStatsD client pointing to Collector
initialize(
    statsd_host='otel-collector.example.com',
    statsd_port=8125
)

# Send metrics with tags
statsd.increment('api.requests', tags=['endpoint:/users', 'method:GET'])
statsd.histogram('api.latency', 245, tags=['endpoint:/users'])
statsd.gauge('database.connections', 42, tags=['pool:primary'])
```

**Collector configuration for DogStatsD:**

```yaml
receivers:
  statsd:
    endpoint: 0.0.0.0:8125
    aggregation_interval: 60s

    # DogStatsD key:value tags are parsed by default

    # Enable parsing DogStatsD tags without values, such as #canary
    enable_simple_tags: true

    # Enable extended metric type metadata
    enable_metric_type: true

    # Timer histogram configuration
    timer_histogram_mapping:
      - statsd_type: "timing"
        observer_type: "summary"
      - statsd_type: "histogram"
        observer_type: "histogram"
```

The StatsD receiver parses DogStatsD tags (formatted as `key:value`) and converts them to OpenTelemetry metric attributes, preserving the rich metadata that DogStatsD provides.

---

## Migration Strategies

When migrating from Datadog to OpenTelemetry, you have several strategic approaches:

**1. Big Bang Migration:**

Replace all Datadog Agent endpoints with the OpenTelemetry Collector in one deployment:

```yaml
# Single Collector configuration accepting all Datadog traffic
receivers:
  datadog:
    endpoint: 0.0.0.0:8126
  statsd:
    endpoint: 0.0.0.0:8125

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    encoding: json
    headers:
      Content-Type: application/json
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

service:
  pipelines:
    traces:
      receivers: [datadog]
      exporters: [otlphttp]
    metrics:
      receivers: [statsd]
      exporters: [otlphttp]
```

**2. Gradual Migration with Dual Export:**

Send data to both Datadog and your new backend during the transition:

```yaml
receivers:
  datadog:
    endpoint: 0.0.0.0:8126
  statsd:
    endpoint: 0.0.0.0:8125

exporters:
  # Continue sending to Datadog during migration
  datadog:
    api:
      key: ${DATADOG_API_KEY}

  # Start sending to OneUptime
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    encoding: json
    headers:
      Content-Type: application/json
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

service:
  pipelines:
    traces:
      receivers: [datadog]
      exporters: [datadog, otlphttp]  # Dual export
    metrics:
      receivers: [statsd]
      exporters: [datadog, otlphttp]  # Dual export
```

This approach allows you to compare data quality and validate your new setup before fully cutting over.

**3. Service-by-Service Migration:**

Use filter processors to migrate services incrementally:

```yaml
receivers:
  datadog:
    endpoint: 0.0.0.0:8126

processors:
  # Drop services that are not part of the migrated set
  filter/migrated:
    error_mode: ignore
    trace_conditions:
      - resource.attributes["service.name"] != "service-a" and resource.attributes["service.name"] != "service-b"

  # Drop services already migrated to OneUptime
  filter/datadog:
    error_mode: ignore
    trace_conditions:
      - resource.attributes["service.name"] == "service-a" or resource.attributes["service.name"] == "service-b"

  batch:

exporters:
  datadog:
    api:
      key: ${DATADOG_API_KEY}

  otlphttp:
    endpoint: https://oneuptime.com/otlp
    encoding: json
    headers:
      Content-Type: application/json
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

service:
  pipelines:
    # Migrated services go to OneUptime
    traces/migrated:
      receivers: [datadog]
      processors: [filter/migrated, batch]
      exporters: [otlphttp]

    # Other services stay on Datadog
    traces/datadog:
      receivers: [datadog]
      processors: [filter/datadog, batch]
      exporters: [datadog]
```

---

## Data Transformation and Semantic Conventions

The Datadog receiver automatically converts Datadog-specific data formats to OpenTelemetry standards, but you may want additional transformations.

**Trace transformation example:**

```yaml
receivers:
  datadog:
    endpoint: 0.0.0.0:8126

processors:
  # Transform Datadog span names to OpenTelemetry conventions
  transform:
    error_mode: ignore
    trace_statements:
      # Datadog keeps the resource name in dd.span.Resource
      - set(span.name, span.attributes["dd.span.Resource"]) where span.attributes["dd.span.Resource"] != nil

      # Normalize HTTP method attribute
      - set(span.attributes["http.request.method"], span.attributes["http.method"]) where span.attributes["http.method"] != nil
      - delete_key(span.attributes, "http.method")

      # Add span kind if not present
      - set(span.kind, SPAN_KIND_SERVER) where span.attributes["span.type"] == "web"

  batch:

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    encoding: json
    headers:
      Content-Type: application/json
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

service:
  pipelines:
    traces:
      receivers: [datadog]
      processors: [transform, batch]
      exporters: [otlphttp]
```

This transformation ensures that your telemetry adheres to OpenTelemetry semantic conventions, improving compatibility with OpenTelemetry-native tools and backends.

---

## Monitoring the Migration

During migration, monitor both the Collector and your applications to ensure data flows correctly.

**Collector metrics to watch:**

Expose the Collector's internal Prometheus metrics to track receiver performance:

```yaml
service:
  telemetry:
    metrics:
      readers:
        - pull:
            exporter:
              prometheus:
                host: 0.0.0.0
                port: 8888
```

**Key metrics:**

- `otelcol_receiver_accepted_spans`: Traces successfully received from Datadog clients
- `otelcol_receiver_refused_spans`: Traces rejected (indicates configuration issues)
- `otelcol_receiver_accepted_metric_points`: Metrics successfully received from DogStatsD
- `otelcol_exporter_send_failed_spans`: Traces that failed to export to backends

**Application health checks:**

Ensure your Datadog-instrumented applications can reach the Collector:

```bash
# Test APM endpoint connectivity
curl -v http://otel-collector.example.com:8126/info

# Test StatsD endpoint (send a test metric)
echo "test.metric:1|c" | nc -u -w1 otel-collector.example.com 8125
```

---

## Performance and Scaling

The Datadog receiver can handle high throughput, but proper configuration is essential for production workloads.

**Tuning for high volume:**

```yaml
receivers:
  datadog:
    endpoint: 0.0.0.0:8126

  statsd:
    endpoint: 0.0.0.0:8125
    # Reduce aggregation interval for more frequent exports
    aggregation_interval: 30s

processors:
  # Increase memory limit for high-volume environments
  memory_limiter:
    limit_mib: 2048
    spike_limit_mib: 512
    check_interval: 1s

  # Larger batch sizes for better throughput
  batch:
    send_batch_size: 2048
    send_batch_max_size: 4096
    timeout: 5s

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    encoding: json
    headers:
      Content-Type: application/json
      x-oneuptime-token: ${ONEUPTIME_TOKEN}
    # Increase concurrency for faster exports
    sending_queue:
      num_consumers: 10
      queue_size: 5000
```

**Horizontal scaling:**

For very high trace volumes, deploy multiple Collector instances behind a load balancer:

```mermaid
graph LR
    A[Datadog Clients] -->|Round Robin| B[Load Balancer]
    B --> C[Collector 1]
    B --> D[Collector 2]
    B --> E[Collector 3]

    C --> F[(OneUptime)]
    D --> F
    E --> F

    style B fill:#9f9,stroke:#333,stroke-width:2px
```

Configure your applications to use the load balancer endpoint, and the load balancer will distribute traffic across multiple Collectors. For DogStatsD metrics, prefer an agent-mode Collector near each application host or shard traffic deliberately; the StatsD receiver is not designed for naive horizontal scaling behind a load balancer.

---

## Troubleshooting Common Issues

**1. Traces not appearing in backend:**

Check Collector logs for export errors:

```bash
# View Collector logs
docker logs otel-collector 2>&1 | grep -i error

# Look for export failures
docker logs otel-collector 2>&1 | grep -i "failed to export"
```

**2. Missing tags or attributes:**

Enable debug logging to see raw data:

```yaml
service:
  telemetry:
    logs:
      level: debug

exporters:
  debug:
    verbosity: detailed
```

**3. High memory usage:**

Reduce batch sizes and enable memory limiting:

```yaml
processors:
  memory_limiter:
    limit_mib: 512
    spike_limit_mib: 128
    check_interval: 1s

  batch:
    send_batch_size: 512
    send_batch_max_size: 1024
    timeout: 10s
```

**4. Connection refused errors from applications:**

Verify the Collector is listening on the correct interface:

```bash
# Check if Collector is listening on port 8126
netstat -an | grep 8126

# Test connectivity from application host
telnet otel-collector.example.com 8126
```

---

## Cost Considerations

One primary driver for migrating from Datadog is cost reduction. The Datadog and StatsD receivers enable you to maintain your existing instrumentation while eliminating Datadog's per-host, per-metric, and per-span pricing.

**Cost optimization strategies:**

1. **Sampling:** Apply tail sampling to reduce span volume while keeping errors and slow requests:

```yaml
receivers:
  datadog:
    endpoint: 0.0.0.0:8126

processors:
  tail_sampling:
    decision_wait: 10s
    num_traces: 10000
    policies:
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: slow
        type: latency
        latency:
          threshold_ms: 500
      - name: sample-success
        type: probabilistic
        probabilistic:
          sampling_percentage: 10

  batch:

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    encoding: json
    headers:
      Content-Type: application/json
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

service:
  pipelines:
    traces:
      receivers: [datadog]
      processors: [tail_sampling, batch]
      exporters: [otlphttp]
```

2. **Filtering:** Drop high-volume, low-value metrics:

```yaml
processors:
  filter:
    error_mode: ignore
    metric_conditions:
      - IsMatch(metric.name, "^system\\..*")  # Drop system metrics if not needed
```

3. **Aggregation:** Pre-aggregate metrics before export to reduce data points:

```yaml
receivers:
  statsd:
    aggregation_interval: 60s  # Aggregate for 60 seconds before exporting
```

---

## Integration with OneUptime

OneUptime provides native OpenTelemetry support, making it an ideal destination for migrated Datadog telemetry:

```yaml
receivers:
  datadog:
    endpoint: 0.0.0.0:8126
  statsd:
    endpoint: 0.0.0.0:8125

processors:
  batch:

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    encoding: json
    headers:
      Content-Type: application/json
      x-oneuptime-token: ${ONEUPTIME_TOKEN}
    compression: gzip

service:
  pipelines:
    traces:
      receivers: [datadog]
      processors: [batch]
      exporters: [otlphttp]

    metrics:
      receivers: [statsd]
      processors: [batch]
      exporters: [otlphttp]
```

Once data flows into OneUptime, you gain access to:
- Distributed tracing with service maps
- Metrics dashboards and alerting
- Log correlation with traces and metrics
- Cost-effective storage without per-host pricing
- Full data ownership and retention control

---

## Related Topics

For more information on OpenTelemetry Collector configuration and migration strategies:

- [OpenTelemetry Collector: What It Is, When You Need It, and When You Don't](https://oneuptime.com/blog/post/2025-09-18-what-is-opentelemetry-collector-and-why-use-one/view)
- [How to Configure the Cloudflare Receiver in the OpenTelemetry Collector](https://oneuptime.com/blog/post/2026-02-06-cloudflare-receiver-opentelemetry-collector/view)
- [How to Reduce Noise in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-25-how-to-reduce-noise-in-opentelemetry/view)
- [10 Best Datadog Alternatives in 2026](https://oneuptime.com/blog/post/2026-02-06-best-datadog-alternatives/view)

---

## Conclusion

The Datadog receiver provides a practical migration path from Datadog to OpenTelemetry-based observability. By accepting Datadog's native formats and converting them to OpenTelemetry standards, it allows you to preserve existing instrumentation while gaining the benefits of vendor neutrality, cost control, and ecosystem flexibility.

Whether you're conducting a gradual migration or an immediate cutover, the Datadog receiver minimizes risk by allowing applications to remain unchanged. Configure proper processing and batching, monitor the Collector's performance, and route your telemetry to cost-effective backends like OneUptime.

This approach delivers the observability you need without the constraints of vendor lock-in or unpredictable pricing escalation.
