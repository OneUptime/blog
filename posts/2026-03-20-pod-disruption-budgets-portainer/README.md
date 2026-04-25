# How to Set Up Pod Disruption Budgets via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, PDB, High Availability, Reliability, Infrastructure

Description: Configure Kubernetes Pod Disruption Budgets through Portainer to ensure minimum application availability during node drains, cluster upgrades, and maintenance operations.

---

A Pod Disruption Budget (PDB) tells Kubernetes how many pods for a workload must remain available during voluntary disruptions such as node drains, cluster upgrades, and maintenance operations. Without PDBs, a cluster upgrade could simultaneously evict all replicas of a service and cause an outage. Portainer's manifest workflow makes PDB management straightforward.

## When PDBs Are Critical

- Node maintenance and drains: `kubectl drain node-1`
- Cluster version upgrades
- Horizontal node autoscaling (scale-down)
- Manual administrator operations

## Step 1: Understand Your Availability Requirements

Before creating a PDB, decide whether to express availability as:

- `minAvailable` - minimum pods that must remain available
- `maxUnavailable` - maximum pods that can be simultaneously unavailable

## Step 2: Create a PDB via Portainer Manifest

Go to **Applications > Create from code** in Portainer and use the **Web editor**:

```yaml
# web-api-pdb.yaml

apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-api-pdb
  namespace: production
spec:
  # Ensure at least 2 replicas are always available
  minAvailable: 2
  selector:
    matchLabels:
      app: web-api
```

Alternatively, express as a percentage:

```yaml
spec:
  # At most 20% of pods can be unavailable at any time
  maxUnavailable: "20%"
  selector:
    matchLabels:
      app: web-api
```

## Step 3: PDB for a StatefulSet

Databases and stateful services need more conservative PDBs:

```yaml
# postgres-pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: postgres-pdb
  namespace: production
spec:
  # For a 3-pod Postgres StatefulSet, keep at least 2 available
  minAvailable: 2
  selector:
    matchLabels:
      app: postgres
```

## Step 4: PDB Rules and Limits

A few important constraints:

- `minAvailable: 100%` (or equal to total replicas) will block all voluntary disruptions - drains will not complete until the budget is relaxed or more healthy replicas are available
- PDBs do not protect against hardware failures (involuntary disruptions)
- Setting `minAvailable: 0` or `maxUnavailable: 100%` effectively disables the PDB

## Step 5: Verify PDB Status in Portainer

Check PDB enforcement through Portainer's `kubectl shell` or any terminal configured for the cluster:

```bash
# Check PDB status
kubectl get poddisruptionbudgets -n production

# Detailed view showing current and desired healthy pod counts
kubectl get poddisruptionbudget web-api-pdb -n production -o yaml
```

The output shows:

```yaml
status:
  currentHealthy: 3
  desiredHealthy: 2
  disruptionsAllowed: 1
  expectedPods: 3
```

`disruptionsAllowed: 1` means exactly one pod can be voluntarily evicted right now.

## Step 6: Test with a Node Drain

Simulate a maintenance event:

```bash
# Drain a node - PDB will prevent eviction if it would violate budget
kubectl drain node-worker-1 --ignore-daemonsets --delete-emptydir-data
```

If the drain would violate the PDB, `kubectl drain` keeps retrying the eviction until enough healthy replicas exist or the command times out.

## Summary

Pod Disruption Budgets are a lightweight but essential safety mechanism for production Kubernetes workloads. Deploying them via Portainer's manifest workflow lets you manage them alongside your Deployments and StatefulSets, giving your operations team confidence that maintenance windows will not cause unexpected service disruptions.
