# How to Create Service Dependency Maps from Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Service Dependency, Kiali, Observability, Kubernetes

Description: Generate accurate service dependency maps from Istio telemetry data to visualize how your microservices communicate and depend on each other.

---

One of the most valuable things a service mesh gives you is visibility into how your services actually communicate. Not how they're supposed to communicate based on architecture diagrams someone drew six months ago, but how they're communicating right now in production. Istio collects telemetry on every request that flows through the mesh, and you can use that data to build accurate, real-time service dependency maps.

## The Data Sources

Istio provides dependency information from two places:

1. **Metrics (Prometheus)**: `istio_requests_total` and `istio_tcp_connections_opened_total` metrics contain source and destination labels that show service-to-service communication patterns.

2. **Traces (Jaeger/Zipkin)**: Distributed traces show the full call chain for individual requests, including timing and hierarchy.

3. **Configuration (VirtualServices, ServiceEntries)**: Routing rules show intended communication patterns, including external dependencies.

Each source tells a different part of the story. Metrics show volume and patterns. Traces show call chains and latency. Configuration shows intent.

## Extracting Dependencies from Prometheus

The simplest way to build a dependency map is from Istio's metrics in Prometheus:

```bash
# Get all service-to-service communication pairs
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant http://localhost:9090 \
  'sum(istio_requests_total) by (source_workload, source_workload_namespace, destination_service, destination_service_namespace)'
```

This gives you every pair of services that have communicated. Turn it into a dependency map:

```bash
#!/bin/bash
# generate-dependency-map.sh

echo "# Service Dependency Map"
echo "Generated: $(date -u +%FT%TZ)"
echo "Data window: Last 24 hours"
echo ""

kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant http://localhost:9090 \
  'sum(rate(istio_requests_total[24h])) by (source_workload, source_workload_namespace, destination_service) > 0' \
  2>/dev/null | grep -oP '"source_workload":"[^"]*"|"destination_service":"[^"]*"' | \
  paste - - | sort -u | while read line; do
    SRC=$(echo $line | grep -oP 'source_workload":"(\K[^"]*)')
    DST=$(echo $line | grep -oP 'destination_service":"(\K[^"]*)')
    echo "- $SRC -> $DST"
  done
```

## Generating a Mermaid Diagram

For a visual dependency map, generate Mermaid syntax:

```python
#!/usr/bin/env python3
# dependency-map.py

import json
import subprocess

def query_prometheus(query):
    cmd = [
        "kubectl", "exec", "-n", "istio-system", "deploy/prometheus", "--",
        "promtool", "query", "instant", "http://localhost:9090", query
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        return []
    # Parse the output
    lines = result.stdout.strip().split('\n')
    return lines

def build_dependency_map():
    query = 'sum(rate(istio_requests_total[24h])) by (source_workload, source_workload_namespace, destination_service, destination_service_namespace) > 0'
    results = query_prometheus(query)

    edges = []
    nodes = set()

    for line in results:
        try:
            # Parse the metric labels
            parts = line.split('{')[1].split('}')[0] if '{' in line else ""
            labels = {}
            for pair in parts.split(','):
                if '=' in pair:
                    k, v = pair.split('=', 1)
                    labels[k.strip()] = v.strip().strip('"')

            src = labels.get('source_workload', 'unknown')
            src_ns = labels.get('source_workload_namespace', 'unknown')
            dst = labels.get('destination_service', 'unknown')
            dst_ns = labels.get('destination_service_namespace', 'unknown')

            if src and dst and src != 'unknown':
                src_id = f"{src_ns}/{src}"
                dst_id = dst.split('.')[0] if '.' in dst else dst
                nodes.add(src_id)
                nodes.add(dst_id)
                edges.append((src_id, dst_id))
        except (IndexError, ValueError):
            continue

    return nodes, edges

def render_mermaid(nodes, edges):
    lines = ["```mermaid", "graph LR"]

    for node in sorted(nodes):
        safe_id = node.replace('/', '_').replace('-', '_')
        lines.append(f"    {safe_id}[{node}]")

    for src, dst in sorted(set(edges)):
        src_id = src.replace('/', '_').replace('-', '_')
        dst_id = dst.replace('/', '_').replace('-', '_')
        lines.append(f"    {src_id} --> {dst_id}")

    lines.append("```")
    return '\n'.join(lines)

if __name__ == "__main__":
    nodes, edges = build_dependency_map()
    print("# Service Dependency Map\n")
    print(render_mermaid(nodes, edges))
```

## Using Kiali for Interactive Maps

Kiali is the de facto UI for Istio service mesh visualization. If you have it installed, it generates dependency graphs automatically from Istio telemetry:

```bash
# Install Kiali if not already present
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/kiali.yaml

# Access the Kiali dashboard
istioctl dashboard kiali
```

Kiali's graph view shows:

- Service-to-service connections with request rates
- Error rates on each edge
- TCP vs HTTP traffic
- Traffic animation showing real-time flow
- Grouping by namespace, app, or version

To export the graph data from Kiali's API:

```bash
# Get the graph data as JSON
kubectl exec -n istio-system deploy/kiali -- \
  curl -s "http://localhost:20001/kiali/api/namespaces/graph?duration=86400s&graphType=workload" | \
  python3 -m json.tool > dependency-graph.json
```

## Identifying Critical Dependencies

Not all dependencies are equal. Some are critical (the service breaks without them) and some are optional (degraded experience but still functional). Use traffic volume and error rates to categorize:

```bash
# High-volume dependencies (critical paths)
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant http://localhost:9090 \
  'topk(20, sum(rate(istio_requests_total[24h])) by (source_workload, destination_service))'

# Dependencies with high error rates (problematic paths)
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant http://localhost:9090 \
  'topk(10,
    sum(rate(istio_requests_total{response_code=~"5.."}[24h])) by (source_workload, destination_service)
    /
    sum(rate(istio_requests_total[24h])) by (source_workload, destination_service)
  )'
```

## Including External Dependencies

ServiceEntry resources define external dependencies. Include them in your map:

```bash
#!/bin/bash
# external-deps.sh

echo "## External Dependencies"
echo ""
echo "| Service | External Host | Port | Protocol |"
echo "|---------|--------------|------|----------|"

kubectl get serviceentries -A -o json | jq -r '
  .items[] |
  .metadata.namespace as $ns |
  .spec.hosts[] as $host |
  .spec.ports[] |
  "| " + $ns + " | " + $host + " | " + (.number | tostring) + " | " + .protocol + " |"
'
```

## Generating a DOT Graph for Graphviz

For more control over visualization, generate a DOT file:

```bash
#!/bin/bash
# generate-dot.sh

echo "digraph dependencies {"
echo '  rankdir=LR;'
echo '  node [shape=box, style=filled, fillcolor=lightblue];'

# Internal dependencies from metrics
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant http://localhost:9090 \
  'sum(rate(istio_requests_total[24h])) by (source_workload, destination_service) > 0' \
  2>/dev/null | while read line; do
    SRC=$(echo $line | grep -oP 'source_workload="(\K[^"]*)')
    DST=$(echo $line | grep -oP 'destination_service="(\K[^"]*)')
    RPS=$(echo $line | grep -oP '=> (\K[\d.]+)')
    if [ -n "$SRC" ] && [ -n "$DST" ]; then
      echo "  \"$SRC\" -> \"$DST\" [label=\"${RPS} rps\"];"
    fi
  done

# External dependencies from ServiceEntries
kubectl get serviceentries -A -o json | jq -r '
  .items[] |
  .metadata.namespace as $ns |
  .spec.hosts[] |
  "  \"" + $ns + "\" -> \"" + . + "\" [style=dashed, color=red];"
'

echo "}"
```

Render it with Graphviz:

```bash
bash generate-dot.sh > dependencies.dot
dot -Tpng dependencies.dot -o dependencies.png
dot -Tsvg dependencies.dot -o dependencies.svg
```

## Automating Map Generation

Run the map generator on a schedule and publish updates:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: dep-map-generator
  namespace: istio-system
spec:
  schedule: "0 6 * * *"
  jobTemplate:
    spec:
      template:
        metadata:
          annotations:
            sidecar.istio.io/inject: "false"
        spec:
          serviceAccountName: dep-map-generator
          containers:
          - name: generator
            image: python:3.11-slim
            command: ["python3", "/scripts/dependency-map.py"]
            volumeMounts:
            - name: scripts
              mountPath: /scripts
          volumes:
          - name: scripts
            configMap:
              name: dep-map-scripts
          restartPolicy: OnFailure
```

## Comparing Intended vs. Actual Dependencies

The most interesting insight comes from comparing what your architecture says should happen with what actually happens. Configuration-based dependencies (from VirtualServices and DestinationRules) represent intent. Metrics-based dependencies represent reality.

If a service is communicating with something that isn't in the routing configuration, that's either:
- Traffic bypassing the mesh (port exclusions, sidecar disabled)
- Direct pod-to-pod communication using pod IPs
- A configuration gap that should be documented

And if a configured route has zero traffic, the route might be dead code that should be cleaned up.

Service dependency maps from Istio telemetry are living documentation. They update automatically as your system evolves, and they reflect what's actually happening, not what someone thinks is happening. Use them for architecture reviews, incident response, and capacity planning.
