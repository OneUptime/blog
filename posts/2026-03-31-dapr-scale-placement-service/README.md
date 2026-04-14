# How to Scale Dapr Placement Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Placement Service, Scaling, Actor, Kubernetes

Description: Scale the Dapr placement service to handle growing actor workloads by adding replicas, tuning Raft parameters, and optimizing actor table dissemination for large clusters.

---

The Dapr placement service becomes a scaling concern when you have thousands of actor instances, hundreds of application replicas, or frequent actor rebalancing events. Understanding how to scale the placement service prevents it from becoming a bottleneck.

## Placement Service Scaling Characteristics

The placement service scales differently from stateless services:
- Adding replicas increases availability but does not increase throughput (Raft consensus requires the leader to handle all writes)
- The leader handles actor table updates and dissemination to all connected sidecars
- Network traffic grows with the number of connected sidecars

## Recommended Replica Counts

| Cluster Size | Recommended Replicas |
|-------------|---------------------|
| Development | 1 |
| Small production (<50 nodes) | 3 |
| Large production (50-200 nodes) | 3 |
| Very large (200+ nodes) | 5 |

Note: Raft requires an odd number of replicas to maintain quorum (1, 3, 5...). 5 replicas is rarely needed as a single leader still handles all writes.

## Scaling via Helm

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set dapr_placement.ha=true \
  --wait
```

## Resource Limits for Large Clusters

In clusters with many actor instances, the placement service holds the full actor table in memory. Increase memory limits for large deployments:

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set dapr_placement.resources.requests.cpu=200m \
  --set dapr_placement.resources.requests.memory=512Mi \
  --set dapr_placement.resources.limits.cpu=1000m \
  --set dapr_placement.resources.limits.memory=1Gi
```

## Tuning Actor Table Dissemination

The placement service disseminates actor table updates to all connected sidecars. You can adjust the dissemination timeout via the Helm chart:

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set dapr_placement.disseminateTimeout=10s \
  --wait
```

## Reducing Sidecar Reconnections

Frequent sidecar reconnections cause load spikes on the placement service. Make the Kubernetes liveness probe more tolerant to reduce unnecessary sidecar restarts and reconnections:

```yaml
annotations:
  dapr.io/sidecar-liveness-probe-period-seconds: "30"
  dapr.io/sidecar-liveness-probe-threshold: "5"
```

## Monitoring Placement Load

Watch for signs of placement service overload:

```bash
# Check placement service CPU and memory
kubectl top pod -n dapr-system -l app=dapr-placement-server

# Watch for slow dissemination in logs
kubectl logs -l app=dapr-placement-server -n dapr-system | grep -i "dissemination\|slow\|timeout"
```

## Separating Actor Workloads

For very large clusters, consider separating actor types across different Dapr deployments (each with their own placement service) to partition the actor table:

```yaml
# Placement service for order actors
annotations:
  dapr.io/placement-host-address: "order-placement:50005"

# Placement service for user actors
annotations:
  dapr.io/placement-host-address: "user-placement:50005"
```

## Summary

Scaling the Dapr placement service primarily means running 3 replicas for HA and ensuring adequate CPU and memory for the actor table size. Unlike stateless services, adding more placement replicas beyond 3-5 does not increase write throughput - instead, optimize dissemination performance and reduce unnecessary reconnections to lower placement service load.
