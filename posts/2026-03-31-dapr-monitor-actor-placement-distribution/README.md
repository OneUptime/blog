# How to Monitor Actor Placement Distribution in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Placement, Monitoring, Prometheus

Description: Monitor Dapr actor placement distribution across pods using metrics and the placement service API to detect uneven load distribution and rebalancing events.

---

## Overview

Dapr's placement service distributes actors across pods using consistent hashing. Monitoring placement distribution reveals hot spots, uneven load, and helps you size your actor service correctly.

## How Dapr Actor Placement Works

The placement service uses a consistent hash ring to assign actor types to specific pods. Each actor ID maps deterministically to a pod, and when pods are added or removed, a portion of actors are reassigned (rebalanced).

## Enabling Placement Metrics

The placement service exposes metrics on port 9090 by default:

```bash
# Check placement service metrics
kubectl port-forward svc/dapr-placement-server 9090:9090 -n dapr-system

curl http://localhost:9090/metrics | grep dapr_placement
```

Key placement service metrics:

```bash
# Connected Dapr sidecars
dapr_placement_runtimes_total

# Actor runtimes reported to placement
dapr_placement_actorruntimes_total
```

Key sidecar actor metrics (exposed by each daprd sidecar on its metrics port):

```bash
# Total actor activations
dapr_runtime_actor_activated_total

# Total actor deactivations
dapr_runtime_actor_deactivated_total

# Rebalancing events
dapr_runtime_actor_rebalanced_total
```

## Prometheus Queries for Placement Health

```bash
# Active actors per pod (approximate using activation/deactivation counters)
sum by (pod) (increase(dapr_runtime_actor_activated_total[1h]) - increase(dapr_runtime_actor_deactivated_total[1h]))

# Actor distribution coefficient of variation (lower = more even)
stddev by () (sum by (pod) (increase(dapr_runtime_actor_activated_total[1h]) - increase(dapr_runtime_actor_deactivated_total[1h]))) / avg by () (sum by (pod) (increase(dapr_runtime_actor_activated_total[1h]) - increase(dapr_runtime_actor_deactivated_total[1h])))

# Rebalancing rate (should be low outside deployments)
rate(dapr_runtime_actor_rebalanced_total[5m])

# Activation rate per actor type
sum by (actor_type) (rate(dapr_runtime_actor_activated_total[5m]))
```

## Grafana Dashboard for Placement

```json
{
  "title": "Actor Placement Distribution",
  "panels": [
    {
      "title": "Actors per Pod",
      "type": "bar",
      "targets": [{
        "expr": "sum by (pod) (increase(dapr_runtime_actor_activated_total[1h]) - increase(dapr_runtime_actor_deactivated_total[1h]))"
      }],
      "fieldConfig": {
        "thresholds": {
          "steps": [
            {"color": "green", "value": 0},
            {"color": "yellow", "value": 1000},
            {"color": "red", "value": 2000}
          ]
        }
      }
    },
    {
      "title": "Rebalancing Events/min",
      "type": "stat",
      "targets": [{
        "expr": "sum(rate(dapr_runtime_actor_rebalanced_total[1m])) * 60"
      }]
    }
  ]
}
```

## Detecting Hot Spots

```yaml
# Alert when one pod has more than 2x the average actor count
- alert: ActorHotSpot
  expr: |
    max(sum by (pod) (increase(dapr_runtime_actor_activated_total[1h]) - increase(dapr_runtime_actor_deactivated_total[1h]))) >
    2 * avg(sum by (pod) (increase(dapr_runtime_actor_activated_total[1h]) - increase(dapr_runtime_actor_deactivated_total[1h])))
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Actor placement is uneven - possible hot spot"
```

## Actor Type Distribution

Check per-type counts to find which actor types are concentrated:

```bash
# Activation rate per type
sum by (actor_type) (
  rate(dapr_runtime_actor_activated_total[5m])
)
```

## Inspecting Placement via Dapr Metadata API

```bash
# Get active actor types for your app
curl http://localhost:3500/v1.0/metadata | jq '.actorRuntime.activeActors'

# Response shows registered actor types and their counts
[
  {"type": "OrderActor", "count": 142},
  {"type": "CustomerActor", "count": 87}
]
```

## Scaling Recommendations

| Actors per Pod | Action |
|---------------|--------|
| < 500 | Healthy |
| 500-2000 | Monitor state store load |
| > 2000 | Scale out actor service replicas |
| Skewed > 2x | Investigate actor ID distribution |

## Summary

Monitor Dapr actor placement distribution using the placement service Prometheus metrics. Track actor count per pod to detect hot spots, watch rebalancing rate to understand deployment impact, and use the Dapr metadata API for a quick view of active actor counts by type. Alert on distribution skew ratios exceeding 2x to catch placement issues before they cause performance degradation.
