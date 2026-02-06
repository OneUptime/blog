# How to Build a Living Architecture Diagram from OpenTelemetry Service Graph Connector Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Service Graph, Architecture, Visualization

Description: Build a living, auto-updating architecture diagram from OpenTelemetry Service Graph Connector data that always reflects your actual production topology.

Architecture diagrams are usually wrong. Someone drew one in Lucidchart six months ago, and since then three services were added, two were renamed, and one was decommissioned. The diagram still shows the old topology. OpenTelemetry's Service Graph Connector solves this by generating a real-time service dependency graph directly from trace data.

## How the Service Graph Connector Works

The Service Graph Connector is an OpenTelemetry Collector component that analyzes trace data to identify service-to-service relationships. When it sees a client span from Service A and a corresponding server span from Service B within the same trace, it records that relationship and generates metrics about it.

The output is a set of metrics that describe edges in your service graph:

- `traces_service_graph_request_total` - Request count between services
- `traces_service_graph_request_duration_seconds` - Latency between services
- `traces_service_graph_request_failed_total` - Failed requests between services

## Configuring the Collector

Add the Service Graph Connector to your OpenTelemetry Collector configuration:

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

connectors:
  servicegraph:
    # How long to wait for matching client/server spans
    latency_histogram_buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2s, 5s]
    dimensions:
      - http.request.method
      - http.response.status_code
    # Store configuration for in-flight traces
    store:
      ttl: 30s
      max_items: 10000

exporters:
  otlp/traces:
    endpoint: tempo:4317
    tls:
      insecure: true
  prometheus:
    endpoint: 0.0.0.0:8889

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [otlp/traces, servicegraph]
    # The servicegraph connector produces metrics
    # that feed into a metrics pipeline
    metrics/servicegraph:
      receivers: [servicegraph]
      exporters: [prometheus]
```

The key insight: the `servicegraph` connector appears as an exporter in the traces pipeline and as a receiver in the metrics pipeline. It bridges the two signal types.

## Querying the Service Graph

Once the connector is running, you can query the generated metrics in Prometheus or any compatible backend:

```promql
# Show all service-to-service edges with request rates
sum by (client, server) (
  rate(traces_service_graph_request_total[5m])
)

# Find the slowest service-to-service connections
histogram_quantile(0.95,
  sum by (client, server, le) (
    rate(traces_service_graph_request_duration_seconds_bucket[5m])
  )
)

# Find connections with the highest error rates
sum by (client, server) (
  rate(traces_service_graph_request_failed_total[5m])
) /
sum by (client, server) (
  rate(traces_service_graph_request_total[5m])
)
```

## Building the Visualization

### Option 1: Grafana Node Graph Panel

Grafana has a built-in Node Graph panel that can visualize service graph data:

```json
{
  "panels": [
    {
      "type": "nodeGraph",
      "title": "Service Dependency Map",
      "datasource": "Prometheus",
      "targets": [
        {
          "expr": "sum by (client, server) (rate(traces_service_graph_request_total[5m]))",
          "legendFormat": "{{client}} -> {{server}}"
        }
      ]
    }
  ]
}
```

### Option 2: Custom Visualization with D3.js

For a more tailored view, export the graph data and render it with D3.js:

```python
#!/usr/bin/env python3
"""
Generate a service graph JSON file from Prometheus metrics.
This can be consumed by a D3.js force-directed graph visualization.
"""

import requests
import json

PROMETHEUS_URL = "http://prometheus.internal:9090"

def fetch_service_graph():
    # Query for all service-to-service edges
    response = requests.get(f"{PROMETHEUS_URL}/api/v1/query", params={
        "query": 'sum by (client, server) (rate(traces_service_graph_request_total[5m]))'
    })
    data = response.json()

    nodes = set()
    edges = []

    for result in data["data"]["result"]:
        client = result["metric"]["client"]
        server = result["metric"]["server"]
        rate_value = float(result["value"][1])

        nodes.add(client)
        nodes.add(server)
        edges.append({
            "source": client,
            "target": server,
            "requests_per_second": round(rate_value, 2)
        })

    graph = {
        "nodes": [{"id": n} for n in sorted(nodes)],
        "edges": edges
    }

    return graph

def enrich_with_error_rates(graph):
    """Add error rate information to edges."""
    response = requests.get(f"{PROMETHEUS_URL}/api/v1/query", params={
        "query": """
            sum by (client, server) (rate(traces_service_graph_request_failed_total[5m]))
            / sum by (client, server) (rate(traces_service_graph_request_total[5m]))
        """
    })
    data = response.json()

    error_rates = {}
    for result in data["data"]["result"]:
        key = f"{result['metric']['client']}->{result['metric']['server']}"
        error_rates[key] = float(result["value"][1])

    for edge in graph["edges"]:
        key = f"{edge['source']}->{edge['target']}"
        edge["error_rate"] = error_rates.get(key, 0.0)

    return graph

if __name__ == "__main__":
    graph = fetch_service_graph()
    graph = enrich_with_error_rates(graph)
    print(json.dumps(graph, indent=2))
```

## Automating Updates

Run the graph generation on a schedule so your architecture diagram always reflects reality:

```yaml
# Kubernetes CronJob to regenerate the service graph every hour
apiVersion: batch/v1
kind: CronJob
metadata:
  name: service-graph-generator
spec:
  schedule: "0 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: generator
              image: your-registry/service-graph-generator:latest
              command: ["python", "generate_graph.py"]
              env:
                - name: PROMETHEUS_URL
                  value: "http://prometheus.internal:9090"
                - name: OUTPUT_PATH
                  value: "/output/service-graph.json"
          restartPolicy: OnFailure
```

## Detecting Changes

Compare the current graph with the previous version to detect topology changes:

```python
def detect_changes(previous_graph, current_graph):
    """Find new, removed, and changed edges."""
    prev_edges = {(e["source"], e["target"]) for e in previous_graph["edges"]}
    curr_edges = {(e["source"], e["target"]) for e in current_graph["edges"]}

    new_edges = curr_edges - prev_edges
    removed_edges = prev_edges - curr_edges

    if new_edges:
        print("New connections detected:")
        for source, target in new_edges:
            print(f"  {source} -> {target}")

    if removed_edges:
        print("Removed connections:")
        for source, target in removed_edges:
            print(f"  {source} -> {target}")
```

Send notifications when the graph changes. This catches unexpected dependencies, retired services, and rogue connections that might indicate a misconfiguration.

## Practical Tips

The Service Graph Connector needs complete traces to work properly. If you are using aggressive head sampling, some edges might be missing. Tail sampling preserves trace completeness better for this use case.

Set the `store.ttl` value high enough to capture your slowest traces. If some requests take 30 seconds, a 10-second TTL will miss those edges.

Start with the Grafana Node Graph panel for a quick win. Move to a custom visualization only if you need features like change detection, annotations, or integration with your internal tools.

A living architecture diagram is not just a nice visualization. It is an operational tool that helps you understand blast radius during incidents, plan capacity, and onboard new engineers who need to understand how services connect. Let your traces build it for you.
