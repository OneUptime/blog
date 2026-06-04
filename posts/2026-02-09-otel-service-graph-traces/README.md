# Service Graph post

## How to implement OpenTelemetry service graph generation from traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Service Graph, Distributed Tracing, Observability, Microservice

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
  service_graph:
    # Duration buckets for request latency histograms
    latency_histogram_buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2s, 5s, 10s]
    dimensions:
      - deployment.environment
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
      exporters: [service_graph, otlp/traces]
    
    metrics/servicegraph:
      receivers: [service_graph]
      processors: [batch]
      exporters: [prometheusremotewrite]
```

This configuration generates service graph metrics and exports them to Prometheus. When exporting directly to Prometheus with remote write, start Prometheus with the remote write receiver enabled.

## Service Graph Metrics

The connector generates several metrics that describe service interactions.

```yaml
# Generated metrics:

# Request count between services
traces_service_graph_request_total{client="service-a", server="service-b", connection_type="unset"}

# Failed requests count
traces_service_graph_request_failed_total{client="service-a", server="service-b", connection_type="unset"}

# Server duration histogram
traces_service_graph_request_server{client="service-a", server="service-b", connection_type="unset"}

# Client duration histogram
traces_service_graph_request_client{client="service-a", server="service-b", connection_type="unset"}
```

These metrics power service graph visualizations and RED (Rate, Errors, Duration) dashboards.

## Visualizing with Grafana

Configure Grafana's Tempo data source to use the Prometheus backend where service graph metrics are stored.

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    uid: prometheus
    url: http://prometheus:9090
    jsonData:
      httpMethod: GET
    version: 1

  - name: Tempo
    type: tempo
    uid: tempo
    url: http://tempo:3200
    jsonData:
      httpMethod: GET
      serviceMap:
        datasourceUid: prometheus
    version: 1
```

## Enhancing with Custom Dimensions

Add custom dimensions to service graph metrics for richer analysis.

```yaml
connectors:
  service_graph:
    latency_histogram_buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2s, 5s]
    dimensions:
      - cloud.region
      - deployment.environment
    store:
      ttl: 2s
      max_items: 10000
```

Custom dimensions enable filtering and grouping service graph metrics by environment, region, or other attributes. The connector adds prefixes such as `client_` and `server_` to labels from client and server spans.

## Best Practices

First, configure appropriate latency buckets based on your service latency profiles.

Second, set store TTL based on maximum expected trace duration to ensure complete span collection.

Third, limit dimensions to avoid metric cardinality explosion.

Fourth, use service graph metrics alongside traces for comprehensive system understanding.

Fifth, create alerts on service graph metrics for automated anomaly detection in service interactions.

OpenTelemetry service graphs provide powerful visualization of microservice architectures derived from trace data. The service graph connector transforms traces into actionable metrics that reveal system dependencies and interaction patterns.
