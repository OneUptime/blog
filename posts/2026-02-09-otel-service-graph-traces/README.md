# Service Graph post

# How to implement OpenTelemetry service graph generation from traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Service Graph, Distributed Tracing, Observability, Microservices

Description: Learn how to generate service dependency graphs from OpenTelemetry traces using the service graph connector in the collector to visualize microservice architectures and call patterns.

---

OpenTelemetry service graphs provide visual representations of service dependencies derived from trace data. The service graph connector in the collector analyzes span relationships to generate metrics showing which services communicate and how frequently they interact.

## Understanding Service Graphs

Service graphs show services as nodes and their interactions as edges. Each edge represents requests flowing between services, with metrics like request rate, error rate, and latency. This visualization helps identify bottlenecks, understand system architecture, and troubleshoot distributed systems.

The service graph connector processes trace spans to extract client-server relationships. It generates metrics that backends can use to render dependency graphs and calculate service-level indicators.

## Configuring Service Graph Connector

Enable the service graph connector in the OpenTelemetry Collector to generate service dependency metrics.

```yaml
# collector-servicegraph.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

connectors:
  servicegraph:
    # Time to wait for spans to arrive
    latency_histogram_buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2s, 5s, 10s]
    dimensions:
      - client
      - server
      - connection_type
    store:
      ttl: 2s
      max_items: 1000

processors:
  batch:
    timeout: 10s

exporters:
  # Export traces
  otlp/traces:
    endpoint: tempo:4317
    tls:
      insecure: true
  
  # Export service graph metrics
  prometheusremotewrite:
    endpoint: http://prometheus:9090/api/v1/write
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [servicegraph, otlp/traces]
    
    metrics/servicegraph:
      receivers: [servicegraph]
      processors: [batch]
      exporters: [prometheusremotewrite]
```

This configuration generates service graph metrics and exports them to Prometheus.

## Service Graph Metrics

The connector generates several metrics that describe service interactions.

```yaml
# Generated metrics:

# Request count between services
traces_service_graph_request_total{client="service-a", server="service-b", connection_type="virtual_node"}

# Request duration histogram
traces_service_graph_request_duration_seconds{client="service-a", server="service-b"}

# Failed requests count
traces_service_graph_request_failed_total{client="service-a", server="service-b"}

# Server duration histogram
traces_service_graph_request_server_seconds{server="service-b"}

# Client duration histogram
traces_service_graph_request_client_seconds{client="service-a"}
```

These metrics power service graph visualizations and RED (Rate, Errors, Duration) dashboards.

## Visualizing with Grafana

Create Grafana dashboards using service graph metrics.

```json
{
  "title": "Service Graph",
  "panels": [
    {
      "title": "Service Dependencies",
      "type": "nodeGraph",
      "targets": [
        {
          "expr": "sum by (client, server) (rate(traces_service_graph_request_total[5m]))",
          "format": "table"
        }
      ]
    },
    {
      "title": "Request Rate by Service Pair",
      "type": "graph",
      "targets": [
        {
          "expr": "sum by (client, server) (rate(traces_service_graph_request_total[5m]))"
        }
      ]
    },
    {
      "title": "Error Rate by Service Pair",
      "type": "graph",
      "targets": [
        {
          "expr": "sum by (client, server) (rate(traces_service_graph_request_failed_total[5m])) / sum by (client, server) (rate(traces_service_graph_request_total[5m]))"
        }
      ]
    }
  ]
}
```

## Enhancing with Custom Dimensions

Add custom dimensions to service graph metrics for richer analysis.

```yaml
connectors:
  servicegraph:
    latency_histogram_buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2s, 5s]
    dimensions:
      - client
      - server
      - connection_type
      - client_region
      - server_region
      - environment
    store:
      ttl: 2s
      max_items: 10000
```

Custom dimensions enable filtering and grouping service graphs by environment, region, or other attributes.

## Best Practices

First, configure appropriate latency buckets based on your service latency profiles.

Second, set store TTL based on maximum expected trace duration to ensure complete span collection.

Third, limit dimensions to avoid metric cardinality explosion.

Fourth, use service graph metrics alongside traces for comprehensive system understanding.

Fifth, create alerts on service graph metrics for automated anomaly detection in service interactions.

OpenTelemetry service graphs provide powerful visualization of microservice architectures derived from trace data. The service graph connector transforms traces into actionable metrics that reveal system dependencies and interaction patterns.
