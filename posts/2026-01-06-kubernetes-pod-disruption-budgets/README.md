# How to Implement Pod Disruption Budgets for Zero-Downtime Updates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Reliability, Pod Disruption Budget, High Availability, DevOps

Description: A practical guide to implementing Pod Disruption Budgets (PDBs) in Kubernetes to ensure application availability during voluntary disruptions like node drains and cluster upgrades.

---

Pod Disruption Budgets (PDBs) tell Kubernetes how many pods can be unavailable during voluntary disruptions. Without them, a node drain could take down your entire application.

## Understanding Disruptions

### Voluntary Disruptions

PDBs protect against these:
- Node drains (`kubectl drain`)
- Cluster upgrades
- Node autoscaler scale-down
- Pod eviction API calls
- Deployment rolling updates

### Involuntary Disruptions

PDBs cannot prevent these:
- Node hardware failures
- Kernel panics
- VM deletion
- Out of memory kills
- Network partitions

## Basic PDB Configuration

### minAvailable

Ensure a minimum number of pods stay running:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-pdb
  namespace: production
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: web
```

Or as a percentage:

```yaml
spec:
  minAvailable: 50%
```

### maxUnavailable

Allow a maximum number of pods to be unavailable:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-pdb
  namespace: production
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: api
```

Or as a percentage:

```yaml
spec:
  maxUnavailable: 25%
```

## Choosing Between minAvailable and maxUnavailable

| Use Case | Recommended | Example |
|----------|-------------|---------|
| Critical services | minAvailable | `minAvailable: 2` |
| Large deployments | maxUnavailable % | `maxUnavailable: 25%` |
| Batch jobs | maxUnavailable | `maxUnavailable: 50%` |
| Singleton pods | minAvailable: 0 | Allow disruption |

### Examples for Common Scenarios

**High-availability web service (3 replicas):**

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-pdb
spec:
  minAvailable: 2  # Always keep 2 pods running
  selector:
    matchLabels:
      app: web
```

**Large deployment (20 replicas):**

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: workers-pdb
spec:
  maxUnavailable: 25%  # Allow 5 pods to be down
  selector:
    matchLabels:
      app: workers
```

**Stateful database (3 replicas):**

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: postgres-pdb
spec:
  minAvailable: 2  # Maintain quorum
  selector:
    matchLabels:
      app: postgres
```

## PDB Behavior During Operations

### Node Drain

```bash
kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data

# With PDB, this will:
# 1. Try to evict pods
# 2. Wait if eviction would violate PDB
# 3. Eventually succeed as pods get rescheduled elsewhere
# 4. Timeout and fail if PDB cannot be satisfied
```

### Cluster Autoscaler

Cluster autoscaler respects PDBs when scaling down nodes. A node won't be removed if it would violate a PDB.

### Deployment Rolling Update

Rolling updates also respect PDBs:

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
```

The Deployment's maxUnavailable and the PDB's maxUnavailable both apply. The more restrictive wins.

## Common Patterns

### Pattern 1: Web Application

```yaml
# Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 4
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  app: web
              topologyKey: kubernetes.io/hostname
      containers:
        - name: web
          image: nginx
---
# PDB
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-pdb
spec:
  minAvailable: 3
  selector:
    matchLabels:
      app: web
```

### Pattern 2: Stateful Application (etcd, ZooKeeper)

```yaml
# StatefulSet
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: etcd
spec:
  replicas: 3
  selector:
    matchLabels:
      app: etcd
  template:
    metadata:
      labels:
        app: etcd
---
# PDB - Maintain quorum (2 of 3)
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: etcd-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: etcd
```

### Pattern 3: Batch Processing

```yaml
# Allow aggressive disruption for batch jobs
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: batch-pdb
spec:
  maxUnavailable: 100%  # All pods can be disrupted
  selector:
    matchLabels:
      app: batch-processor
```

### Pattern 4: Singleton Pod

```yaml
# For pods that can tolerate downtime
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: singleton-pdb
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: singleton
```

## PDB with Multiple Deployments

If multiple Deployments share labels, one PDB can cover them:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: frontend-pdb
spec:
  minAvailable: 5
  selector:
    matchLabels:
      tier: frontend  # Matches multiple deployments
```

Or create separate PDBs:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: web
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: api
```

## Monitoring PDBs

### Check PDB Status

```bash
# List PDBs
kubectl get pdb -A

# Describe PDB
kubectl describe pdb web-pdb -n production

# Output:
# Name:           web-pdb
# Min available:  2
# Selector:       app=web
# Status:
#     Allowed disruptions:  2
#     Current:              4
#     Desired:              4
#     Expected:             4
```

### Key Fields

- **Allowed disruptions**: How many pods can be safely evicted now
- **Current**: Current number of healthy pods
- **Desired**: Desired number of pods
- **Expected**: Expected number of pods (scheduled + running)

### Prometheus Alerts

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: pdb-alerts
spec:
  groups:
    - name: pdb
      rules:
        - alert: PDBViolationRisk
          expr: |
            kube_poddisruptionbudget_status_pod_disruptions_allowed == 0
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "PDB {{ $labels.poddisruptionbudget }} has no allowed disruptions"

        - alert: PDBCurrentBelowDesired
          expr: |
            kube_poddisruptionbudget_status_current_healthy
            <
            kube_poddisruptionbudget_status_desired_healthy
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "PDB {{ $labels.poddisruptionbudget }} has fewer healthy pods than desired"
```

## Troubleshooting

### Drain Stuck Due to PDB

```bash
kubectl drain node-1 --ignore-daemonsets
# error: cannot evict pod; would violate PDB
```

**Solutions:**

1. Scale up deployment first:
```bash
kubectl scale deployment web --replicas=5
kubectl drain node-1 --ignore-daemonsets
```

2. Check if pods are unhealthy:
```bash
kubectl get pods -l app=web -o wide
# Fix unhealthy pods first
```

3. Override with force (not recommended for production):
```bash
kubectl drain node-1 --ignore-daemonsets --force --delete-emptydir-data
```

### PDB Blocking Cluster Upgrade

During cluster upgrades, nodes are drained one at a time. A misconfigured PDB can block the upgrade.

**Prevention:**

```yaml
# Ensure replicas > minAvailable
# If minAvailable: 2, have at least 3 replicas

# Or use maxUnavailable
spec:
  maxUnavailable: 1  # Always allows at least 1 disruption
```

### PDB Calculation Issues

```bash
# Check if selector matches pods
kubectl get pods -l app=web -n production

# Verify PDB is targeting correct pods
kubectl describe pdb web-pdb -n production
```

## Best Practices

### 1. Always Create PDBs for Production Workloads

```yaml
# Even if just allowing all disruptions
spec:
  maxUnavailable: "100%"  # Documents that disruption is OK
```

### 2. Set minAvailable Below Replica Count

```yaml
# With 3 replicas, don't set minAvailable: 3
spec:
  minAvailable: 2  # Allows 1 disruption
```

### 3. Use Percentages for Variable Replica Counts

```yaml
# Works regardless of current replica count
spec:
  maxUnavailable: 25%
```

### 4. Combine with Pod Anti-Affinity

```yaml
# Spread pods across nodes
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchLabels:
              app: web
          topologyKey: kubernetes.io/hostname
```

### 5. Consider Graceful Shutdown

```yaml
# Give pods time to finish work
spec:
  terminationGracePeriodSeconds: 60
  containers:
    - name: app
      lifecycle:
        preStop:
          exec:
            command: ["/bin/sh", "-c", "sleep 30"]
```

### 6. Test PDB Behavior

```bash
# Create test pod
kubectl run test-drain --image=nginx -l app=test

# Create PDB
kubectl apply -f - <<EOF
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: test-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: test
EOF

# Try to evict
kubectl drain <node> --ignore-daemonsets --dry-run
```

## PDB and HPA Interaction

HPA scaling interacts with PDBs:

```yaml
# HPA can scale down to minReplicas
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  minReplicas: 3  # Should be > PDB minAvailable
  maxReplicas: 10

---
# PDB
apiVersion: policy/v1
kind: PodDisruptionBudget
spec:
  minAvailable: 2  # Less than HPA minReplicas
```

If HPA scales to 3 and PDB requires 2, you can still drain one pod.

---

PDBs are essential for production Kubernetes. They ensure your applications stay available during maintenance, upgrades, and autoscaling. Start by adding PDBs to all your critical workloads, then tune based on your availability requirements.
