# How to Configure Kubernetes Pod Disruption Budgets That Account for Maintenance Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Pod Disruption Budget, Maintenance, High Availability

Description: Configure Pod Disruption Budgets that balance service availability with operational needs, enabling safe maintenance operations while protecting critical workloads from excessive disruption.

---

Maintenance operations like node upgrades, cluster migrations, and infrastructure changes require evicting pods from nodes. Without proper safeguards, these operations can take down your entire application at once. Pod Disruption Budgets provide the mechanism to ensure minimum availability during voluntary disruptions.

The challenge is configuring PDBs that are restrictive enough to prevent outages but flexible enough to allow necessary maintenance. Too restrictive and your maintenance windows extend indefinitely. Too permissive and you risk service degradation during operations.

Understanding how PDBs interact with maintenance operations allows you to design policies that protect availability while enabling operational agility.

## Understanding Pod Disruption Budget Basics

A Pod Disruption Budget specifies the minimum number of pods that must remain available during voluntary disruptions. Kubernetes respects these budgets when evicting pods during node drains, rolling updates, and cluster autoscaling.

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-app-pdb
  namespace: production
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: web-app
```

This PDB ensures at least two pods matching the selector remain available during disruptions. Operations that would violate this budget are blocked until conditions change.

Alternatively, specify the maximum number of unavailable pods:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-service-pdb
  namespace: production
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: api-service
```

This PDB allows at most one pod to be unavailable at any time. For a deployment with five replicas, four must remain available during disruptions.

Choose between `minAvailable` and `maxUnavailable` based on your scaling patterns. `minAvailable` works well for fixed-size deployments while `maxUnavailable` adapts better to autoscaling workloads.

## Configuring PDBs for Different Service Tiers

Not all services require the same availability guarantees. Configure PDBs based on service criticality and impact of disruption.

For critical services requiring maximum availability:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: payment-service-pdb
  namespace: production
spec:
  minAvailable: 80%
  selector:
    matchLabels:
      app: payment-service
      tier: critical
```

This PDB maintains 80% of payment service pods during disruptions, allowing operations to proceed while preserving substantial capacity.

For less critical services that tolerate more disruption:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: analytics-worker-pdb
  namespace: production
spec:
  maxUnavailable: 50%
  selector:
    matchLabels:
      app: analytics-worker
      tier: standard
```

Analytics workers can tolerate higher disruption rates, allowing faster maintenance operations without risking critical service availability.

## Time-Based PDB Adjustments for Maintenance Windows

During scheduled maintenance windows, you may want to temporarily relax PDB constraints to accelerate operations. Implement time-based PDB adjustments using a controller or manual updates.

Create relaxed PDB configurations for maintenance windows:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-app-pdb-maintenance
  namespace: production
spec:
  maxUnavailable: 3
  selector:
    matchLabels:
      app: web-app
```

Before maintenance, replace the normal PDB:

```bash
# Save current PDB
kubectl get pdb web-app-pdb -n production -o yaml > web-app-pdb-backup.yaml

# Apply maintenance PDB
kubectl delete pdb web-app-pdb -n production
kubectl apply -f web-app-pdb-maintenance.yaml

# Perform maintenance operations
kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data

# Restore original PDB after maintenance
kubectl delete pdb web-app-pdb-maintenance -n production
kubectl apply -f web-app-pdb-backup.yaml
```

Automate this process with a script:

```bash
#!/bin/bash
# maintenance-mode.sh - Toggle PDB for maintenance

NAMESPACE="production"
SERVICE="web-app"
ACTION=${1:-enable}

if [ "$ACTION" = "enable" ]; then
  echo "Enabling maintenance mode for $SERVICE"
  kubectl get pdb ${SERVICE}-pdb -n $NAMESPACE -o yaml > /tmp/${SERVICE}-pdb-backup.yaml
  kubectl patch pdb ${SERVICE}-pdb -n $NAMESPACE -p '{"spec":{"maxUnavailable":3}}'
  echo "Maintenance mode enabled"
elif [ "$ACTION" = "disable" ]; then
  echo "Disabling maintenance mode for $SERVICE"
  kubectl apply -f /tmp/${SERVICE}-pdb-backup.yaml
  echo "Maintenance mode disabled"
else
  echo "Usage: $0 {enable|disable}"
  exit 1
fi
```

## PDBs for StatefulSets and Databases

Stateful applications require careful PDB configuration to prevent data inconsistency during disruptions. Databases and other stateful services need more conservative policies.

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: postgres-pdb
  namespace: production
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: postgres
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: production
spec:
  replicas: 3
  serviceName: postgres
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
        ports:
        - containerPort: 5432
```

This configuration allows disrupting one database pod at a time, ensuring quorum is maintained during maintenance. With three replicas, two always remain available.

For applications requiring leader election or consensus:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: etcd-pdb
  namespace: production
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: etcd
```

Maintaining at least two pods preserves quorum in a three-node etcd cluster, allowing safe disruption of one node.

## Handling PDB Violations During Maintenance

Sometimes PDB constraints prevent necessary maintenance operations. When drain operations hang due to PDB violations, investigate and resolve systematically.

Check which PDBs are blocking operations:

```bash
# View all PDBs and their current status
kubectl get pdb --all-namespaces

# Check specific PDB details
kubectl describe pdb web-app-pdb -n production

# See which pods are affected
kubectl get pods -n production -l app=web-app
```

If maintenance must proceed despite PDB constraints:

```bash
# Option 1: Temporarily scale up replicas
kubectl scale deployment web-app -n production --replicas=8

# Wait for new pods to become ready
kubectl wait --for=condition=ready pod -l app=web-app -n production --timeout=300s

# Proceed with drain
kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data

# Scale back to original count
kubectl scale deployment web-app -n production --replicas=5

# Option 2: Temporarily delete PDB (use with caution)
kubectl delete pdb web-app-pdb -n production

# Perform maintenance
kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data

# Recreate PDB
kubectl apply -f web-app-pdb.yaml
```

## PDB Monitoring and Alerting

Monitor PDB status to detect situations where disruption budgets prevent necessary operations:

```bash
# Check PDBs that are currently violated
kubectl get pdb --all-namespaces -o json | \
  jq -r '.items[] | select(.status.disruptionsAllowed == 0) | "\(.metadata.namespace)/\(.metadata.name)"'

# View disruptions allowed for each PDB
kubectl get pdb --all-namespaces -o custom-columns=\
NAMESPACE:.metadata.namespace,\
NAME:.metadata.name,\
MIN:.spec.minAvailable,\
MAX:.spec.maxUnavailable,\
ALLOWED:.status.disruptionsAllowed,\
CURRENT:.status.currentHealthy
```

Create Prometheus alerts for PDB issues:

```yaml
groups:
- name: pdb-alerts
  rules:
  - alert: PDBDisruptionsNotAllowed
    expr: kube_poddisruptionbudget_status_pod_disruptions_allowed == 0
    for: 30m
    labels:
      severity: warning
    annotations:
      summary: "PDB {{ $labels.namespace }}/{{ $labels.poddisruptionbudget }} allows no disruptions"
      description: "This PDB has been blocking disruptions for 30 minutes"

  - alert: PDBUnhealthyPods
    expr: |
      kube_poddisruptionbudget_status_desired_healthy -
      kube_poddisruptionbudget_status_current_healthy > 0
    for: 15m
    labels:
      severity: warning
    annotations:
      summary: "PDB {{ $labels.namespace }}/{{ $labels.poddisruptionbudget }} has unhealthy pods"
```

## Testing PDB Configurations

Before relying on PDBs in production, test their behavior during simulated maintenance:

```bash
# Create test deployment and PDB
kubectl create namespace pdb-test

kubectl apply -f - << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-app
  namespace: pdb-test
spec:
  replicas: 5
  selector:
    matchLabels:
      app: test-app
  template:
    metadata:
      labels:
        app: test-app
    spec:
      containers:
      - name: nginx
        image: nginx
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: test-app-pdb
  namespace: pdb-test
spec:
  minAvailable: 3
  selector:
    matchLabels:
      app: test-app
EOF

# Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app=test-app -n pdb-test --timeout=60s

# Attempt to drain a node running test pods
NODE=$(kubectl get pods -n pdb-test -l app=test-app -o jsonpath='{.items[0].spec.nodeName}')
kubectl drain $NODE --ignore-daemonsets --delete-emptydir-data --timeout=60s

# Observe that drain respects PDB
# Check PDB status during operation
kubectl describe pdb test-app-pdb -n pdb-test
```

Pod Disruption Budgets are essential for maintaining availability during maintenance operations. By carefully configuring PDBs based on service criticality and operational requirements, you enable safe infrastructure changes while protecting your applications from excessive disruption. The key is finding the balance between restrictive policies that prevent outages and flexible policies that allow necessary operational work.
