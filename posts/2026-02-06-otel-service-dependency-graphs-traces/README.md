# How to Build Service Dependency Graphs from OpenTelemetry Traces Using the Service Graph Connector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Service Graph, Dependency Mapping, Collector, Microservices

Description: Build automatic service dependency graphs from your OpenTelemetry trace data using the Service Graph Connector in the Collector.

Understanding which services talk to each other, and how healthy those connections are, is fundamental to operating microservices. Instead of manually maintaining a service dependency map that is always out of date, you can generate one automatically from trace data. The OpenTelemetry Collector's Service Graph Connector analyzes client-server span pairs and produces metrics that describe the edges of your service topology.

## How the Service Graph Connector Works

When Service A calls Service B, the trace contains two spans:

1. A **client span** in Service A (e.g., `HTTP GET` with `span.kind = CLIENT`)
2. A **server span** in Service B (e.g., `GET /api/products` with `span.kind = SERVER`)

The Service Graph Connector matches these client-server pairs using their parent-child span relationship and generates metrics for each edge. The result is a set of metrics that describe every service-to-service connection, including request rate, error rate, and latency.

## Collector Configuration

Here is how to set up the Service Graph Connector:

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

connectors:
  servicegraph:
    # How long to wait for matching client/server spans
    # Spans from different services may arrive at different times
    latency_histogram_buckets: [2ms, 5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s]
    dimensions:
      - "http.request.method"
      - "http.response.status_code"

    # Store settings for matching spans
    store:
      ttl: 10s          # how long to hold unmatched spans
      max_items: 100000  # max pending span pairs in memory

    # Which resource attributes identify a service
    # Used as the node labels in the graph
    cache_loop: 2m
    store_expiration_loop: 10s

    # Virtual node configuration for external services
    virtual_node_peer_attributes:
      - "db.name"
      - "peer.service"
      - "server.address"

processors:
  batch:
    send_batch_size: 1024
    timeout: 5s

exporters:
  # Traces to your trace backend
  otlp/traces:
    endpoint: "http://tempo:4317"
    tls:
      insecure: true

  # Service graph metrics to Prometheus/Mimir
  prometheusremotewrite:
    endpoint: "http://mimir:9009/api/v1/push"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/traces, servicegraph]

    metrics:
      receivers: [servicegraph]
      processors: [batch]
      exporters: [prometheusremotewrite]
```

## Generated Metrics

The Service Graph Connector produces these metrics for each service-to-service edge:

```
# Request count between services
traces_service_graph_request_total{
  client="checkout-service",
  server="payment-service",
  connection_type="",
  failed="false"
}

# Failed request count
traces_service_graph_request_total{
  client="checkout-service",
  server="payment-service",
  connection_type="",
  failed="true"
}

# Request duration histogram (client perspective)
traces_service_graph_request_client_seconds_bucket{
  client="checkout-service",
  server="payment-service",
  le="0.1"
}

# Request duration histogram (server perspective)
traces_service_graph_request_server_seconds_bucket{
  client="checkout-service",
  server="payment-service",
  le="0.1"
}

# Unmatched spans (useful for debugging the connector itself)
traces_service_graph_request_failed_total{
  client="checkout-service",
  server="unknown"
}
```

## Querying the Service Graph

Use PromQL to explore your service topology:

```promql
# All service-to-service connections with request rate
sum(rate(traces_service_graph_request_total[5m])) by (client, server)

# Error rate between specific services
sum(rate(traces_service_graph_request_total{failed="true"}[5m])) by (client, server)
/
sum(rate(traces_service_graph_request_total[5m])) by (client, server)

# p99 latency between two specific services
histogram_quantile(0.99,
  sum(rate(traces_service_graph_request_server_seconds_bucket{
    client="checkout-service",
    server="payment-service"
  }[5m])) by (le)
)

# Find the slowest edges in your system
topk(10,
  histogram_quantile(0.99,
    sum(rate(traces_service_graph_request_server_seconds_bucket[5m])) by (le, client, server)
  )
)
```

## Visualizing in Grafana

Grafana has native support for service graph visualization. Configure a Tempo data source with service graph enabled:

```yaml
# Grafana datasource provisioning
apiVersion: 1
datasources:
  - name: Tempo
    type: tempo
    url: http://tempo:3200
    jsonData:
      serviceMap:
        datasourceUid: "mimir"  # points to your Prometheus/Mimir data source
      nodeGraph:
        enabled: true
```

In Grafana, go to the Tempo data source Explore view and select the "Service Graph" tab. You will see an interactive graph where:

- Each node is a service
- Each edge shows request rate and error rate
- Edge thickness indicates traffic volume
- Colors indicate health (green for healthy, red for high error rate)

## Handling External Dependencies

Services often call databases, caches, and third-party APIs that are not instrumented with OpenTelemetry. The `virtual_node_peer_attributes` configuration creates virtual nodes for these:

```yaml
connectors:
  servicegraph:
    virtual_node_peer_attributes:
      - "db.name"           # database connections
      - "db.system"         # database type (postgresql, redis, etc.)
      - "peer.service"      # explicitly named peer services
      - "server.address"    # raw server address
      - "messaging.system"  # message brokers (kafka, rabbitmq)
```

This means your service graph will show edges like:

```
checkout-service -> postgresql (db.name="orders")
checkout-service -> redis (db.system="redis")
order-service -> kafka (messaging.system="kafka")
```

## Tuning the Store

The connector needs to hold unmatched spans in memory until their pair arrives. Tune the store settings based on your traffic patterns:

```yaml
connectors:
  servicegraph:
    store:
      ttl: 10s           # increase if spans from different services arrive with delay
      max_items: 100000   # increase for high-throughput systems

    # How often to check for expired items
    store_expiration_loop: 10s
```

If you see many `request_failed_total` metrics with `server="unknown"`, it means client spans are not being matched with server spans. Common causes:

- The server span arrives after the TTL expires
- The server is not instrumented (use virtual nodes instead)
- Context propagation is broken between services

## Complete Production Example

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

connectors:
  servicegraph:
    latency_histogram_buckets: [5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 5s]
    dimensions:
      - "http.request.method"
    store:
      ttl: 15s
      max_items: 200000
    virtual_node_peer_attributes:
      - "db.name"
      - "peer.service"
      - "messaging.system"

processors:
  batch:
    timeout: 5s

exporters:
  otlp/traces:
    endpoint: "http://tempo:4317"
    tls:
      insecure: true
  prometheusremotewrite:
    endpoint: "http://mimir:9009/api/v1/push"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/traces, servicegraph]
    metrics:
      receivers: [servicegraph]
      processors: [batch]
      exporters: [prometheusremotewrite]
```

## Wrapping Up

The Service Graph Connector turns your trace data into a live dependency map of your entire system. You stop guessing which services depend on which, and you start measuring the health of every connection. Deploy the connector in your collector, configure virtual nodes for external dependencies, and visualize the result in Grafana. When something breaks, the service graph shows you exactly which edge is degraded.
