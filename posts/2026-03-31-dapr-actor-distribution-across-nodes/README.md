# How to Monitor Dapr Actor Distribution Across Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Placement, Monitoring, Kubernetes

Description: Monitor how Dapr actors are distributed across cluster nodes to detect imbalances, hotspots, and over-loaded hosts in your actor-based microservices.

---

## Why Monitor Actor Distribution?

Dapr uses a consistent hash ring to distribute actor instances across registered hosts. An uneven distribution can create hotspots where one node handles disproportionately more actor invocations, leading to latency spikes and resource exhaustion. Monitoring distribution helps you identify imbalances early.

## Viewing the Current Placement Table

The Dapr Placement service exposes an HTTP API to view the current placement table. This endpoint is disabled by default and must be enabled by setting `DAPR_PLACEMENT_METADATA_ENABLED=true` on the placement service (or via Helm with `dapr_placement.metadataEnabled=true`):

```bash
# Port-forward to the placement service health/API port
kubectl port-forward -n dapr-system svc/dapr-placement-server 8080:8080

# Query the placement table
curl http://localhost:8080/placement/state
```

You can also query each sidecar's metadata endpoint to see registered actor types and active actor counts:

```bash
curl http://localhost:3500/v1.0/metadata
```

## Scraping Actor Metrics with Prometheus

Dapr sidecars expose Prometheus metrics for actor activity. Scrape these to monitor distribution:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: dapr-actor-metrics
  namespace: dapr-system
spec:
  selector:
    matchLabels:
      app: dapr-sidecar
  endpoints:
    - port: metrics
      path: /metrics
      interval: 15s
```

Key metrics to watch:

```bash
# Pending actor calls per host (waiting to acquire the per-actor lock)
dapr_runtime_actor_pending_actor_calls{app_id="order-service"}

# Actor rebalance events per second
rate(dapr_runtime_actor_rebalanced_total[1m])
```

## Creating a Grafana Dashboard

Use a PromQL query to visualize actor distribution across pods:

```bash
# Pending actor calls per pod
sum by (pod) (dapr_runtime_actor_pending_actor_calls{namespace="production"})
```

Set up a bar chart in Grafana with the above query to quickly spot nodes that have significantly more actors than others.

## Detecting Imbalances Programmatically

Use the Dapr metadata API from your ops tooling to query active actor counts per sidecar:

```python
import requests

def get_actor_counts():
    pods = get_pods_in_namespace("production")
    counts = {}
    for pod in pods:
        url = f"http://{pod.ip}:3500/v1.0/metadata"
        metadata = requests.get(url).json()
        active = metadata.get("actorRuntime", {}).get("activeActors", [])
        counts[pod.name] = sum(a["count"] for a in active)
    return counts

def check_distribution(counts):
    values = list(counts.values())
    avg = sum(values) / len(values)
    for pod, count in counts.items():
        if count > avg * 1.5:
            print(f"WARNING: {pod} has {count} actors - {count/avg:.1f}x average")
```

## Rebalancing Triggers

If you detect consistent imbalance, you can force rebalancing by restarting actor hosts in a rolling fashion:

```bash
kubectl rollout restart deployment/actor-service -n production
```

## Summary

Monitoring Dapr actor distribution across nodes helps prevent hotspots and ensures workloads are evenly spread. By scraping Prometheus metrics, visualizing with Grafana, and setting up programmatic imbalance detection, you can proactively identify and resolve distribution problems before they impact production performance.
