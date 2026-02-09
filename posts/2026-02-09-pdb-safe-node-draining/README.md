# How to Configure Pod Disruption Budgets for Safe Node Draining

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Pod Disruption Budget, High Availability, Maintenance, Node Management

Description: Implement Pod Disruption Budgets to protect application availability during node maintenance, upgrades, and voluntary disruptions.

---

Pod Disruption Budgets define minimum availability requirements for applications during voluntary disruptions. When draining nodes for maintenance or upgrades, Kubernetes respects PDBs, ensuring critical services maintain adequate capacity. Without PDBs, node draining can take all replicas of a service offline simultaneously.

## Understanding Voluntary vs Involuntary Disruptions

Kubernetes distinguishes between disruption types. Voluntary disruptions are planned actions you control: node drains, deployments, cluster upgrades. Involuntary disruptions are unplanned: hardware failures, kernel panics, out-of-memory kills.

PDBs protect against voluntary disruptions only. They cannot prevent hardware failures. However, by maintaining minimum replica counts during planned maintenance, PDBs ensure sufficient capacity remains when involuntary disruptions occur.

## Creating Basic PDBs

Define minimum available pods during disruptions:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-frontend-pdb
  namespace: production
spec:
  minAvailable: 3
  selector:
    matchLabels:
      app: web-frontend
```

This PDB prevents any action that would reduce web-frontend pods below 3. If the deployment has 5 replicas, draining can affect at most 2 pods simultaneously.

Alternatively, specify maximum unavailable:

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

This allows disrupting one pod at a time, regardless of total replica count. With 10 replicas, 9 must remain. With 3 replicas, 2 must remain.

## Choosing minAvailable vs maxUnavailable

Use minAvailable when you know the minimum capacity needed for acceptable service:

```yaml
# Need at least 5 instances for load
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: payment-service-pdb
spec:
  minAvailable: 5
  selector:
    matchLabels:
      app: payment-service
```

Even if someone scales the deployment to 100 replicas, the PDB ensures 5 minimum.

Use maxUnavailable when you want disruptions to scale with replica count:

```yaml
# Allow disrupting 25% of replicas
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: worker-pdb
spec:
  maxUnavailable: 25%
  selector:
    matchLabels:
      app: background-worker
```

With 4 replicas, this allows disrupting 1 pod. With 20 replicas, it allows disrupting 5 pods. The percentage scales naturally.

## PDBs for StatefulSets

StatefulSets benefit significantly from PDBs due to their ordered startup requirements:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: kafka-pdb
  namespace: streaming
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: kafka
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: kafka
spec:
  replicas: 3
  serviceName: kafka
  podManagementPolicy: Parallel
  selector:
    matchLabels:
      app: kafka
  template:
    metadata:
      labels:
        app: kafka
    spec:
      containers:
      - name: kafka
        image: confluentinc/cp-kafka:7.4.0
```

The PDB ensures at least 2 Kafka brokers remain during node drains, maintaining quorum and preventing data loss.

## Combining Multiple Selectors

Match pods using complex label selectors:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: critical-services-pdb
spec:
  minAvailable: 1
  selector:
    matchExpressions:
    - key: tier
      operator: In
      values:
      - frontend
      - backend
    - key: environment
      operator: In
      values:
      - production
    - key: critical
      operator: Exists
```

This PDB protects any production frontend or backend pod labeled as critical, ensuring at least one instance remains.

## PDBs During Rolling Updates

Rolling updates count as voluntary disruptions. PDBs affect how deployments roll out:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 2
      maxSurge: 2
  selector:
    matchLabels:
      app: api-gateway
  template:
    spec:
      containers:
      - name: gateway
        image: api-gateway:v2
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-gateway-pdb
spec:
  minAvailable: 8
  selector:
    matchLabels:
      app: api-gateway
```

The deployment's maxUnavailable allows removing 2 pods. The PDB requires 8 minimum. During rollout, Kubernetes terminates old pods while respecting the PDB, ensuring smooth updates without service degradation.

If the PDB is too restrictive (minAvailable: 10 in this example), rolling updates would block because terminating any pod violates the budget.

## Handling Node Drains

When draining nodes, the eviction API respects PDBs:

```bash
kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data
```

Kubernetes attempts to evict pods from node-1. For pods protected by PDBs, eviction succeeds only if the PDB allows it. If evicting a pod would violate the PDB, the drain command waits.

Monitor drain progress:

```bash
kubectl get pdb -A --watch
```

You will see the ALLOWED DISRUPTIONS column decrease as pods are evicted. When it reaches zero, draining pauses until replicas reschedule elsewhere.

Force draining (dangerous):

```bash
kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data --disable-eviction --force
```

The --disable-eviction flag bypasses PDB checks. Use only in emergencies, as it can violate availability requirements.

## PDBs for DaemonSets

DaemonSets run one pod per node by design. PDBs for them need careful consideration:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: node-exporter-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: node-exporter
```

This ensures at least one node-exporter pod remains during cluster-wide operations. However, draining individual nodes still works because DaemonSets reschedule immediately on other nodes.

For critical DaemonSets like monitoring or security agents, consider:

```yaml
spec:
  minAvailable: "90%"
  selector:
    matchLabels:
      app: security-agent
```

This allows disrupting 10% of DaemonSet pods at once, enabling rolling node updates while maintaining broad coverage.

## Cluster Autoscaler Integration

Cluster Autoscaler respects PDBs when scaling down nodes:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: critical-app-pdb
spec:
  minAvailable: 5
  selector:
    matchLabels:
      app: critical-app
```

If scaling down a node would violate this PDB, the autoscaler selects a different node or skips scale-down entirely. This prevents automatic cost optimization from degrading service availability.

Monitor autoscaler decisions:

```bash
kubectl logs -n kube-system deployment/cluster-autoscaler | grep "PodDisruptionBudget"
```

Look for messages indicating PDBs blocked scale-down.

## Unhealthy Pods and PDBs

PDBs consider pod readiness. Unhealthy pods do not count toward the budget:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-pod-1
  labels:
    app: myapp
spec:
  containers:
  - name: app
    image: myapp:v1
    readinessProbe:
      httpGet:
        path: /healthz
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 10
```

If the readiness probe fails, Kubernetes does not count this pod toward minAvailable. This allows draining nodes with unhealthy pods even if the PDB would otherwise prevent it.

This behavior prevents broken pods from blocking maintenance but can cause issues if readiness probes are too sensitive.

## Monitoring PDB Status

Check current PDB state:

```bash
kubectl get pdb -A

# Example output:
NAMESPACE   NAME              MIN AVAILABLE   MAX UNAVAILABLE   ALLOWED DISRUPTIONS   AGE
prod        web-frontend-pdb  3               N/A               2                     10d
prod        api-service-pdb   N/A             1                 1                     10d
```

ALLOWED DISRUPTIONS shows how many pods can be disrupted now without violating the budget.

Monitor PDB violations:

```promql
# PDBs at zero allowed disruptions
kube_poddisruptionbudget_status_current_healthy -
kube_poddisruptionbudget_status_desired_healthy <= 0
```

Alert when PDBs block operations for too long:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: pdb-alerts
spec:
  groups:
  - name: pdb
    rules:
    - alert: PDBBlockingDrain
      expr: |
        kube_poddisruptionbudget_status_current_healthy ==
        kube_poddisruptionbudget_status_desired_healthy
      for: 30m
      annotations:
        summary: "PDB preventing disruptions for 30+ minutes"
```

## Common Misconfiguration Pitfalls

Setting minAvailable too high blocks all disruptions:

```yaml
# Problematic - allows zero disruptions
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: overly-strict-pdb
spec:
  minAvailable: 10  # But deployment only has 10 replicas
  selector:
    matchLabels:
      app: myapp
```

Always leave headroom: minAvailable should be less than total replicas.

Overlapping selectors create conflicts:

```yaml
# PDB 1
spec:
  minAvailable: 5
  selector:
    matchLabels:
      app: myapp

# PDB 2
spec:
  minAvailable: 8
  selector:
    matchLabels:
      tier: frontend
```

If myapp is also labeled tier: frontend, both PDBs apply. Kubernetes uses the most restrictive (8 minimum).

Missing PDBs for critical services is common. Review all production deployments and ensure PDB coverage.

## Testing PDB Configuration

Validate PDBs work correctly:

```bash
# Scale deployment to test PDB
kubectl scale deployment myapp --replicas=5

# Try draining node with 3 replicas
kubectl drain node-1 --ignore-daemonsets

# Verify drain respects PDB (should pause if minAvailable: 3)
kubectl get pdb myapp-pdb -o yaml
```

The status section shows current vs desired healthy pods.

Simulate disruptions:

```bash
# Delete pods manually to test PDB
kubectl delete pod myapp-abc123

# Check if PDB prevented deletion
kubectl get events | grep "PodDisruptionBudget"
```

PDBs do not prevent manual pod deletion with kubectl delete. They only affect eviction API calls used by drain and rollouts.

Pod Disruption Budgets are essential for production Kubernetes clusters. They provide the safety net enabling confident cluster maintenance without service degradation. Combine them with proper replica counts, health checks, and monitoring for comprehensive availability protection.
