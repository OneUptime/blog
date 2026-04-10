# How to Handle Redis Pod Disruption Budgets in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Kubernetes, Pod Disruption Budget, High Availability, StatefulSet

Description: Learn how to configure Pod Disruption Budgets for Redis in Kubernetes to ensure availability during node maintenance, cluster upgrades, and voluntary disruptions.

---

Pod Disruption Budgets (PDBs) let you define the minimum number of Redis pods that must remain available during voluntary disruptions like node drains, cluster upgrades, or rolling restarts. Without a PDB, Kubernetes can evict all your Redis pods simultaneously, causing downtime.

## Why Redis Needs a PDB

Redis deployments - especially clusters and sentinel setups - rely on quorum. Evicting too many pods at once can cause a cluster to lose quorum, making the data store unavailable. A PDB prevents this by limiting how many pods Kubernetes can evict at once.

## Creating a Basic PDB for Redis

A simple PDB that ensures at least one Redis pod is always running:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: redis-pdb
  namespace: redis
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: redis
```

Apply it:

```bash
kubectl apply -f redis-pdb.yaml
kubectl get pdb -n redis
```

## PDB for Redis Cluster (3-node)

For a Redis Cluster with 3 masters, you want at least 2 available at all times to maintain quorum:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: redis-cluster-pdb
  namespace: redis
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: redis-cluster
```

Alternatively, use `maxUnavailable` to allow no more than 1 pod to be down:

```yaml
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: redis-cluster
```

## PDB for Redis Sentinel

Sentinel requires a majority to elect a new primary. With 3 sentinels, at least 2 must remain running:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: redis-sentinel-pdb
  namespace: redis
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: redis-sentinel
```

## Checking PDB Status During Drains

When you drain a node, Kubernetes respects the PDB. You can monitor the status:

```bash
# Drain a node - Kubernetes honors the PDB
kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data

# Check PDB status
kubectl describe pdb redis-cluster-pdb -n redis
```

Sample output showing PDB status during a drain:

```text
Status:
  Observed Generation:  1
  Disruptions Allowed:  1
  Current Healthy:      3
  Desired Healthy:      2
  Expected Pods:        3
```

Here, `Disruptions Allowed: 1` means one more pod can be evicted while still meeting the `minAvailable` requirement. When it reaches `0`, Kubernetes blocks further evictions.

## Testing PDB Enforcement

Verify that Kubernetes blocks eviction when the PDB would be violated:

```bash
# List pods to find a target
kubectl get pods -n redis -l app=redis-cluster

# Try to evict a pod via the Eviction API
kubectl proxy &
curl -X POST "http://localhost:8001/api/v1/namespaces/redis/pods/redis-cluster-0/eviction" \
  -H "Content-Type: application/json" \
  -d '{"apiVersion":"policy/v1","kind":"Eviction","metadata":{"name":"redis-cluster-0","namespace":"redis"}}'
```

If the PDB would be violated, the API returns a `429 Too Many Requests` error:

```json
{
  "kind": "Status",
  "apiVersion": "v1",
  "status": "Failure",
  "message": "Cannot evict pod as it would violate the pod's disruption budget.",
  "reason": "TooManyRequests",
  "code": 429
}
```

## PDB with Helm (Bitnami Redis Chart)

If you use the Bitnami Redis Helm chart, configure PDBs via values:

```yaml
# values.yaml
master:
  pdb:
    create: true
    minAvailable: 1

replica:
  pdb:
    create: true
    minAvailable: 1
```

```bash
helm upgrade redis bitnami/redis -f values.yaml -n redis
```

## Best Practices

- Set `minAvailable` based on quorum requirements: more than half for cluster/sentinel setups.
- Avoid setting `minAvailable` equal to the total replica count - this prevents all voluntary disruptions.
- Combine PDBs with `topologySpreadConstraints` to spread Redis pods across nodes and zones.
- Always test PDBs in staging by simulating node drains before applying to production.

## Summary

Pod Disruption Budgets are essential for production Redis deployments in Kubernetes. They prevent quorum loss during maintenance by limiting how many pods Kubernetes can evict simultaneously. Set `minAvailable` to a majority of your cluster or sentinel nodes, and pair with proper anti-affinity rules for maximum resilience.
