# How to Generate Service Graph Metrics from Traces in the Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Service Graph, Trace, Metric, Distributed Tracing, Microservice

Description: Learn how to use the Service Graph connector in OpenTelemetry Collector to automatically generate service dependency metrics and visualize microservice relationships from distributed traces.

Understanding service dependencies and communication patterns is critical in microservices architectures. The Service Graph connector in the OpenTelemetry Collector automatically analyzes distributed traces to generate metrics that describe how services interact with each other. These metrics reveal request rates, latency distributions, and error rates between service pairs, providing invaluable insights for troubleshooting, capacity planning, and architectural decisions.

## What is the Service Graph Connector?

The Service Graph connector is a specialized connector that analyzes parent-child relationships within distributed traces to infer service-to-service communication patterns. By examining span relationships, the connector identifies which services call which other services and generates metrics representing these interactions.

When a trace flows through your system, it creates a chain of spans. A span representing a service calling another service has a parent-child relationship where the parent is the calling service and the child is the called service. The Service Graph connector tracks these relationships and aggregates them into metrics that represent edges in your service dependency graph.

## Core Concepts

Understanding the fundamental concepts helps clarify how service graph metrics work:

**Service Node**: A distinct service in your architecture, identified from resource attributes like `service.name`.

**Service Edge**: A connection between two services, representing that one service calls another. This is the fundamental unit the connector tracks.

**Client and Server**: In each edge, the client is the calling service and the server is the called service. Metrics are labeled with both.

**Span Relationship Analysis**: The connector examines parent-child span relationships to determine service edges. A client span (span.kind = CLIENT) whose child is a server span (span.kind = SERVER) indicates an inter-service call.

## Basic Service Graph Configuration

Here's a foundational configuration to generate service graph metrics:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

connectors:
  service_graph:
    # Configure the trace relationship store
    store:
      # Maximum number of edges to track
      max_items: 10000
      # How long to keep edge information (must be >= 2x expected trace duration)
      ttl: 5s

    # Define histogram buckets for latency metrics
    latency_histogram_buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s]

    # Span attributes to include as additional dimensions in generated metrics
    dimensions:
      - http.method
      - rpc.system

exporters:
  otlp/traces:
    endpoint: jaeger:4317

  prometheusremotewrite:
    endpoint: http://prometheus:9090/api/v1/write

service:
  pipelines:
    # Traces pipeline feeds the service graph connector
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [service_graph, otlp/traces]

    # Metrics pipeline receives service graph metrics
    metrics/service-graph:
      receivers: [service_graph]
      processors: [batch]
      exporters: [prometheusremotewrite]
```

This configuration analyzes all incoming traces and generates metrics describing service-to-service communication patterns.

## Understanding Generated Metrics

The Service Graph connector generates several types of metrics:

**Request Total**: `traces_service_graph_request_total{client="service-a", server="service-b"}` counts the total number of requests from service-a to service-b.

**Request Failed Total**: `traces_service_graph_request_failed_total{client="service-a", server="service-b"}` counts failed requests between services.

**Request Client Duration**: `traces_service_graph_request_client{client="service-a", server="service-b"}` provides a histogram of request latency between services as seen from the client span.

**Request Server Duration**: `traces_service_graph_request_server{client="service-a", server="service-b"}` provides a histogram of request latency between services as seen from the server span.

**Unpaired Spans Total**: `traces_service_graph_unpaired_spans_total{client="service-a", server="service-b"}` counts spans that could not be paired before they expired from the store.

**Dropped Spans Total**: `traces_service_graph_dropped_spans_total{client="service-a", server="service-b"}` counts spans dropped when the connector cannot add them to the store.

## Service Graph Data Flow

Understanding how the connector processes traces is essential:

```mermaid
graph TB
    A[Distributed Trace] --> B[Service Graph Connector]
    B --> C[Span Relationship Analyzer]
    C --> D[Edge Store]
    D --> E[Metrics Generator]
    E --> F[Request Total]
    E --> G[Client/Server Request Duration]
    E --> H[Request Failed]
    E --> I[Unpaired/Dropped Spans]
    F --> J[Metrics Pipeline]
    G --> J
    H --> J
    I --> J
```

As traces arrive, the connector examines span relationships, stores edge information temporarily, and periodically emits aggregated metrics.

## Configuring Store Parameters

The store configuration is critical for accurate metric generation:

```yaml
connectors:
  service_graph:
    store:
      # Maximum edges to track in memory
      # Set based on: (number of services)^2 * expected dimension cardinality
      max_items: 50000

      # Time-to-live for edge data
      # Must be at least 2x your longest expected trace duration
      # Too short: incomplete traces won't be properly analyzed
      # Too long: higher memory usage
      ttl: 10s

    # How often to remove expired edge data
    store_expiration_loop: 5s
```

The TTL is particularly important. If a trace takes 3 seconds to complete, but your TTL is only 2 seconds, the connector might not see all spans before the relationship expires, resulting in incomplete service graph metrics.

## Customizing Dimensions

Dimensions determine how granular your service graph metrics are:

```yaml
connectors:
  service_graph/detailed:
    store:
      max_items: 100000
      ttl: 10s

    latency_histogram_buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s]

    # Include additional span attributes as dimensions
    dimensions:
      - http.method
      - http.route
      - http.status_code
      - messaging.system
      - rpc.method
```

More dimensions provide finer granularity but increase cardinality. For a service graph, keep additional span-attribute dimensions low-cardinality to avoid creating too many metric series.

## Configuring Latency Histogram Buckets

Tailor histogram buckets to your service latency characteristics:

```yaml
connectors:
  # Fast microservices (APIs, caches)
  service_graph/fast:
    latency_histogram_buckets: [1ms, 5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s]

  # Standard web services
  service_graph/standard:
    latency_histogram_buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s]

  # Slow batch processing or external APIs
  service_graph/slow:
    latency_histogram_buckets: [100ms, 500ms, 1s, 5s, 10s, 30s, 60s, 120s, 300s]
```

Choose buckets that capture the distribution of your service latencies. Too few buckets lose detail; too many buckets increase storage costs without adding value.

## Filtering Traces for Service Graph Generation

You can selectively process traces to focus on specific service interactions:

```yaml
processors:
  # Only analyze production traffic
  filter/production:
    error_mode: ignore
    traces:
      span:
        - 'resource.attributes["deployment.environment"] != "production"'

  # Exclude internal health checks
  filter/exclude-health:
    error_mode: ignore
    traces:
      span:
        - 'attributes["http.route"] == "/health"'
        - 'attributes["http.route"] == "/readiness"'

  # Only analyze specific services
  filter/critical-services:
    error_mode: ignore
    traces:
      span:
        - 'not IsMatch(resource.attributes["service.name"], "^(payment|auth|checkout).*")'

connectors:
  service_graph:
    store:
      max_items: 10000
      ttl: 5s
    latency_histogram_buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s]

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [filter/production, filter/exclude-health, batch]
      exporters: [service_graph, otlp/traces]

    metrics/service-graph:
      receivers: [service_graph]
      exporters: [prometheusremotewrite]
```

Filtering reduces the volume of data processed and focuses metrics on relevant service interactions.

## Handling Virtual Services and Edge Cases

In complex architectures, you may need to handle special cases:

```yaml
processors:
  # Normalize service names
  transform/normalize:
    trace_statements:
      - context: resource
        statements:
          # Remove version numbers from service names
          - replace_pattern(attributes["service.name"], "^(.+)-v\\d+$", "$$1")

          # Map load balancers to backend services
          - set(attributes["service.name"], "api-backend") where attributes["service.name"] == "nginx-lb"

connectors:
  service_graph:
    store:
      max_items: 10000
      ttl: 5s
    latency_histogram_buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s]
    dimensions:
      - http.method
      - rpc.system
    virtual_node_peer_attributes:
      - peer.service
      - server.address
      - db.name
      - db.system

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [transform/normalize, batch]
      exporters: [service_graph, otlp/traces]

    metrics/service-graph:
      receivers: [service_graph]
      exporters: [prometheusremotewrite]
```

These transformations ensure your service graph accurately represents your architecture, even with complex routing, versioning, or external dependencies.

## Multi-Cluster Service Graph

For multi-cluster deployments, create separate service graphs per cluster:

```yaml
receivers:
  otlp/cluster-a:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

  otlp/cluster-b:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4318

processors:
  # Tag with cluster identifier
  resource/cluster-a:
    attributes:
      - key: k8s.cluster.name
        value: "production-us-east"
        action: insert

  resource/cluster-b:
    attributes:
      - key: k8s.cluster.name
        value: "production-eu-west"
        action: insert

connectors:
  # Separate service graph per cluster
  service_graph/cluster-a:
    store:
      max_items: 50000
      ttl: 10s
    latency_histogram_buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s]
    dimensions:
      - http.method

  service_graph/cluster-b:
    store:
      max_items: 50000
      ttl: 10s
    latency_histogram_buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s]
    dimensions:
      - http.method

exporters:
  prometheusremotewrite:
    endpoint: http://prometheus:9090/api/v1/write

service:
  pipelines:
    traces/cluster-a:
      receivers: [otlp/cluster-a]
      processors: [resource/cluster-a, batch]
      exporters: [service_graph/cluster-a]

    traces/cluster-b:
      receivers: [otlp/cluster-b]
      processors: [resource/cluster-b, batch]
      exporters: [service_graph/cluster-b]

    metrics/service-graph:
      receivers: [service_graph/cluster-a, service_graph/cluster-b]
      exporters: [prometheusremotewrite]
```

This approach maintains separate service graphs per cluster. If you need cluster labels on the exported metric series, configure your metrics exporter or resource-to-telemetry strategy to promote the `k8s.cluster.name` resource attribute.

## Combining Service Graph with Span Metrics

Use both connectors for comprehensive service monitoring:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

connectors:
  # Generate service graph metrics
  service_graph:
    store:
      max_items: 10000
      ttl: 5s
    latency_histogram_buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s]
    dimensions:
      - http.method
      - rpc.system

  # Generate per-service RED metrics
  span_metrics:
    histogram:
      explicit:
        buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s]
    dimensions:
      - name: service.name
      - name: http.method
      - name: http.status_code
    namespace: span

exporters:
  otlp/traces:
    endpoint: jaeger:4317

  prometheusremotewrite:
    endpoint: http://prometheus:9090/api/v1/write

service:
  pipelines:
    # Traces feed both connectors
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [service_graph, span_metrics, otlp/traces]

    # Service graph metrics
    metrics/service-graph:
      receivers: [service_graph]
      exporters: [prometheusremotewrite]

    # Span metrics
    metrics/spans:
      receivers: [span_metrics]
      exporters: [prometheusremotewrite]
```

Service graph metrics show inter-service communication, while span metrics provide detailed RED metrics for each service. Together, they offer complete observability.

## Real-World Example: E-Commerce Platform

Here's a comprehensive configuration for an e-commerce platform:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Resource detection
  resourcedetection:
    detectors: [env, system, docker, k8snode]
    timeout: 5s

  # Memory protection
  memory_limiter:
    check_interval: 1s
    limit_mib: 1024

  # Batch processing
  batch:
    timeout: 10s
    send_batch_size: 1024

  # Filter out health checks and internal traffic
  filter/meaningful:
    error_mode: ignore
    traces:
      span:
        - 'attributes["http.route"] == "/health"'
        - 'attributes["http.route"] == "/metrics"'
        - 'resource.attributes["service.name"] == "istio-proxy"'

  # Normalize service names
  transform/normalize:
    trace_statements:
      - context: resource
        statements:
          # Remove replica identifiers
          - replace_pattern(attributes["service.name"], "^(.+)-[a-f0-9]{8,}$", "$$1")

connectors:
  service_graph/platform:
    store:
      # Large e-commerce platform with many services
      max_items: 100000
      # Long TTL for slow payment/shipping processes
      ttl: 30s
    store_expiration_loop: 10s

    # Buckets covering fast APIs to slow payment processing
    latency_histogram_buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s, 30s, 60s]

    dimensions:
      - http.method
      - http.route
      - messaging.system
      - rpc.system

exporters:
  # Export traces to Tempo
  otlp/tempo:
    endpoint: tempo:4317
    compression: gzip
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000

  # Export service graph metrics to Prometheus
  prometheusremotewrite/graph:
    endpoint: http://prometheus:9090/api/v1/write
    compression: snappy
    external_labels:
      source: service-graph
      platform: ecommerce

service:
  telemetry:
    logs:
      level: info
    metrics:
      level: detailed

  pipelines:
    # Main traces pipeline
    traces/platform:
      receivers: [otlp]
      processors:
        - memory_limiter
        - resourcedetection
        - filter/meaningful
        - transform/normalize
        - batch
      exporters: [service_graph/platform, otlp/tempo]

    # Service graph metrics pipeline
    metrics/service-graph:
      receivers: [service_graph/platform]
      processors: [batch]
      exporters: [prometheusremotewrite/graph]
```

This configuration creates a comprehensive service graph for a complex e-commerce platform, capturing:

- Frontend to API gateway communication
- API gateway to microservice calls
- Microservice to database interactions
- Service to external payment processor calls
- Async service to message queue interactions

## Visualizing Service Graph Metrics

Once metrics are generated, you can query them in Prometheus and visualize in Grafana:

```promql
# Request rate between services

rate(traces_service_graph_request_total[5m])

# Error rate between specific services
rate(traces_service_graph_request_failed_total{client="frontend", server="api-gateway"}[5m])

# P95 latency between services
histogram_quantile(0.95,
  sum by (le, client, server) (rate(traces_service_graph_request_server_bucket[5m]))
)

# Top service dependencies by request volume
topk(10,
  sum by (client, server) (rate(traces_service_graph_request_total[5m]))
)

# Services with highest error rates
topk(5,
  sum by (server) (rate(traces_service_graph_request_failed_total[5m]))
)
```

These queries power dashboards showing:

- Service dependency maps
- Traffic flow visualization
- Latency heatmaps
- Error hotspots
- Request volume trends

## Performance Optimization

Service graph generation can be memory-intensive. Optimize with these strategies:

**Right-Size max_items**: Calculate based on your service count. For N services, you may have up to N^2 edges, multiplied by dimension cardinality.

```yaml
# Formula: max_items >= (num_services)^2 * dimension_cardinality * safety_factor
# Example: 50 services, 5 dimensions, 2x safety = 50*50*5*2 = 25,000

connectors:
  service_graph:
    store:
      max_items: 25000
```

**Optimize TTL**: Set TTL based on your p99 trace duration, not average. If p99 is 5 seconds, use TTL of 10-15 seconds.

**Filter Aggressively**: Remove health checks, internal monitoring, and other noise before service graph processing.

**Control Dimensions**: Fewer dimensions mean fewer unique metric series and lower memory usage.

```yaml
connectors:
  service_graph/optimized:
    store:
      max_items: 10000
      ttl: 10s

    # Minimal dimensions for lower cardinality
    dimensions:
      - http.method
      # Consider removing:
      # - http.route (if too high cardinality)
      # - messaging.destination.name (if too high cardinality)

    # Wider buckets reduce histogram overhead
    latency_histogram_buckets: [100ms, 500ms, 1s, 5s, 10s]
```

## Monitoring Service Graph Generation

Track the health of your service graph connector:

```yaml
service:
  telemetry:
    logs:
      level: info
      initial_fields:
        service: otel-collector
    metrics:
      level: detailed
```

Key metrics to monitor:

- `otelcol_connector_servicegraph_total_edges`: Total number of unique edges
- `otelcol_connector_servicegraph_expired_edges`: Edges that expired before finding a matching span
- `otelcol_connector_servicegraph_dropped_spans`: Spans dropped when trying to add edges
- `otelcol_processor_batch_batch_send_size_bytes_bucket`: Batch sizes for metrics when exported in Prometheus format

If `expired_edges` is high relative to `total_edges`, increase your TTL.

## Troubleshooting Common Issues

**No Metrics Generated**: Verify traces contain proper span.kind attributes (CLIENT/SERVER). Service graph requires these to determine service boundaries.

**Incomplete Service Graph**: Check TTL configuration. If traces take longer than TTL to complete, relationships won't be captured.

**High Memory Usage**: Reduce max_items, decrease TTL, or filter traces before service graph processing. Also consider reducing dimensions.

**Missing Service Relationships**: Ensure traces properly link parent and child spans with trace context propagation. Broken trace context prevents relationship detection.

## Related Resources

For more information about connectors and trace-to-metrics conversion:

- [How to Use Connectors to Link Traces and Metrics Pipelines](https://oneuptime.com/blog/post/2026-02-06-connectors-link-traces-metrics-pipelines-opentelemetry/view)
- [How to Convert Spans to Metrics Using the Span Metrics Connector](https://oneuptime.com/blog/post/2026-02-06-convert-spans-to-metrics-span-metrics-connector/view)
- [How to Configure the Signal to Metrics Connector in the OpenTelemetry Collector](https://oneuptime.com/blog/post/2026-02-06-signal-to-metrics-connector-opentelemetry-collector/view)

The Service Graph connector transforms your distributed traces into a clear picture of service dependencies, communication patterns, and interaction health, providing essential insights for operating and evolving microservices architectures.
