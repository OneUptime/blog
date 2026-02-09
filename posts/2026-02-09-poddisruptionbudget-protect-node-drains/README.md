# How to Use PodDisruptionBudget to Protect Workloads During Node Drains

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, PodDisruptionBudget, High Availability

Description: Master PodDisruptionBudgets to protect your applications during voluntary disruptions like node drains, cluster upgrades, and autoscaling events while maintaining availability.

---

When Kubernetes needs to drain a node for maintenance, upgrades, or autoscaling, it evicts all pods from that node. Without PodDisruptionBudgets (PDBs), this can take down too many replicas at once, causing service outages. PDBs ensure a minimum number of pods remain available during voluntary disruptions.

## Understanding PodDisruptionBudgets

A PodDisruptionBudget specifies:
- **minAvailable**: Minimum number of pods that must remain available
- **maxUnavailable**: Maximum number of pods that can be unavailable
- **selector**: Which pods the PDB applies to

PDBs only protect against voluntary disruptions like node drains, not involuntary ones like node failures.

## Basic PodDisruptionBudget

Create a simple PDB:

```yaml
# basic-pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-app-pdb
  namespace: production
spec:
  minAvailable: 2  # Keep at least 2 pods running
  selector:
    matchLabels:
      app: web-app
```

This ensures at least 2 pods with label `app=web-app` remain running during drains.

## PDB with maxUnavailable

Specify maximum disruption instead:

```yaml
# max-unavailable-pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-server-pdb
  namespace: production
spec:
  maxUnavailable: 1  # Allow only 1 pod to be unavailable at a time
  selector:
    matchLabels:
      app: api-server
      tier: backend
```

This allows draining one pod at a time, useful for rolling node drains.

## Percentage-Based PDB

Use percentages for dynamic replica counts:

```yaml
# percentage-pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: worker-pdb
  namespace: production
spec:
  minAvailable: 75%  # Keep 75% of pods available
  selector:
    matchLabels:
      app: worker
```

If you have 20 worker pods, at least 15 must remain available during drains.

## Critical Service PDB

Protect critical services:

```yaml
# critical-service-pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: payment-processor-pdb
  namespace: production
spec:
  minAvailable: 3  # Always keep at least 3 running
  selector:
    matchLabels:
      app: payment-processor
      criticality: high
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-processor
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: payment-processor
      criticality: high
  template:
    metadata:
      labels:
        app: payment-processor
        criticality: high
    spec:
      containers:
      - name: processor
        image: payment-processor:v2.1
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
```

## StatefulSet PDB

Protect stateful workloads:

```yaml
# statefulset-pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: database-pdb
  namespace: databases
spec:
  minAvailable: 2  # Keep majority available for quorum
  selector:
    matchLabels:
      app: postgres-cluster
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-cluster
  namespace: databases
spec:
  serviceName: postgres
  replicas: 3
  selector:
    matchLabels:
      app: postgres-cluster
  template:
    metadata:
      labels:
        app: postgres-cluster
    spec:
      containers:
      - name: postgres
        image: postgres:15
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 500Gi
```

## Multiple PDBs for Same Pods

Use different PDBs for different scenarios:

```yaml
# multi-pdb.yaml
# PDB for normal operations
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: app-normal-pdb
  namespace: production
spec:
  minAvailable: 3
  selector:
    matchLabels:
      app: multi-replica-app
---
# More restrictive PDB for critical times
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: app-critical-pdb
  namespace: production
spec:
  minAvailable: 5  # More conservative
  selector:
    matchLabels:
      app: multi-replica-app
      critical-window: "true"
```

Toggle criticality during peak hours:

```bash
# During peak hours, label pods as critical
kubectl label pods -l app=multi-replica-app critical-window=true

# After peak, remove label
kubectl label pods -l app=multi-replica-app critical-window-
```

## Testing PDB Protection

Test that PDB prevents excessive disruption:

```bash
# Deploy an app with PDB
kubectl apply -f web-app-deployment.yaml
kubectl apply -f web-app-pdb.yaml

# Try to drain a node
kubectl drain worker-node-1 --ignore-daemonsets --delete-emptydir-data

# Watch the drain process
# It will wait if draining would violate the PDB

# Check PDB status
kubectl get pdb web-app-pdb -o yaml

# Look for status
# status:
#   currentHealthy: 5
#   desiredHealthy: 2
#   disruptionsAllowed: 3
#   expectedPods: 5
```

## PDB for Multi-Zone HA

Combine PDB with topology spread:

```yaml
# zone-aware-pdb.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ha-app
spec:
  replicas: 9
  selector:
    matchLabels:
      app: ha-app
  template:
    metadata:
      labels:
        app: ha-app
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: ha-app
      containers:
      - name: app
        image: ha-app:v1.0
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: ha-app-pdb
spec:
  minAvailable: 6  # 2 per zone minimum
  selector:
    matchLabels:
      app: ha-app
```

## Handling PDB Violations

If a drain is blocked by PDB:

```bash
# Check which PDB is blocking
kubectl get pdb --all-namespaces

# View PDB details
kubectl describe pdb web-app-pdb -n production

# Check disruptions allowed
kubectl get pdb web-app-pdb -o jsonpath='{.status.disruptionsAllowed}'

# If you need to force drain (USE CAREFULLY)
kubectl drain worker-node-1 --ignore-daemonsets --delete-emptydir-data --disable-eviction

# Or temporarily lower PDB
kubectl patch pdb web-app-pdb -p '{"spec":{"minAvailable":1}}'

# After drain, restore PDB
kubectl patch pdb web-app-pdb -p '{"spec":{"minAvailable":3}}'
```

## Cluster Upgrade with PDBs

Safely upgrade nodes:

```bash
#!/bin/bash
# safe-node-upgrade.sh

for node in $(kubectl get nodes -o name); do
  echo "Upgrading $node"

  # Cordon the node
  kubectl cordon $node

  # Drain with respect to PDBs
  kubectl drain $node \
    --ignore-daemonsets \
    --delete-emptydir-data \
    --timeout=300s \
    --grace-period=60

  if [ $? -ne 0 ]; then
    echo "Drain failed, possibly due to PDB. Waiting..."
    sleep 30
    # Retry drain
    kubectl drain $node \
      --ignore-daemonsets \
      --delete-emptydir-data \
      --timeout=600s \
      --grace-period=60
  fi

  # Perform upgrade
  echo "Upgrading node software..."
  # Your upgrade commands here

  # Uncordon the node
  kubectl uncordon $node

  # Wait for pods to stabilize
  sleep 30
done
```

## Monitoring PDB Status

Track PDB health:

```bash
# List all PDBs
kubectl get pdb --all-namespaces

# Check PDB status
kubectl get pdb --all-namespaces -o json | \
  jq -r '.items[] | {name: .metadata.name, namespace: .metadata.namespace, allowed: .status.disruptionsAllowed, current: .status.currentHealthy, desired: .status.desiredHealthy}'

# Find PDBs preventing drains
kubectl get pdb --all-namespaces -o json | \
  jq -r '.items[] | select(.status.disruptionsAllowed == 0) | {name: .metadata.name, namespace: .metadata.namespace}'
```

## Prometheus Alerts

Alert on PDB issues:

```yaml
# pdb-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: pdb-alerts
spec:
  groups:
  - name: pdb
    interval: 30s
    rules:
    - alert: PDBViolated
      expr: |
        kube_poddisruptionbudget_status_current_healthy <
        kube_poddisruptionbudget_status_desired_healthy
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "PDB {{ $labels.namespace }}/{{ $labels.poddisruptionbudget }} is violated"

    - alert: PDBDisruptionsNotAllowed
      expr: kube_poddisruptionbudget_status_pod_disruptions_allowed == 0
      for: 1h
      labels:
        severity: info
      annotations:
        summary: "PDB {{ $labels.namespace }}/{{ $labels.poddisruptionbudget }} allows no disruptions"
```

## Best Practices

1. **Always Use PDBs**: Create PDBs for all production services
2. **Set Realistic Values**: Ensure minAvailable allows for some disruption
3. **Use Percentages**: For dynamic scaling, use percentage-based PDBs
4. **Test Drains**: Regularly test node drains to validate PDBs work
5. **Monitor Status**: Alert when disruptionsAllowed is 0 for extended periods
6. **Plan Capacity**: Ensure cluster can handle minAvailable requirement
7. **Document Overrides**: If you must override PDB, document why
8. **Combine with Topology**: Use PDBs with topology spread for better HA

## Troubleshooting

If drain hangs indefinitely:

```bash
# Check PDB status
kubectl get pdb --all-namespaces -o wide

# Find pods blocking drain
kubectl get pods --field-selector spec.nodeName=worker-node-1

# Check if any PDBs affect these pods
for pod in $(kubectl get pods --field-selector spec.nodeName=worker-node-1 -o name); do
  labels=$(kubectl get $pod -o jsonpath='{.metadata.labels}')
  echo "Pod: $pod"
  echo "Labels: $labels"
  kubectl get pdb --all-namespaces -o json | \
    jq -r --argjson labels "$labels" '.items[] | select(.spec.selector.matchLabels as $sel | $labels | contains($sel))'
done
```

PodDisruptionBudgets are essential for maintaining application availability during cluster maintenance. By carefully configuring PDBs, you ensure that voluntary disruptions never take down too many pods at once, keeping your services running smoothly through upgrades and scaling events.

