# How to Set Up Pod Disruption Budgets for High Availability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Pod Disruption Budget, High Availability, DevOps, Reliability

Description: Learn how to configure Pod Disruption Budgets (PDBs) in Kubernetes to maintain application availability during node maintenance, cluster upgrades, and autoscaling operations.

---

Pod Disruption Budgets protect your applications from going down during planned cluster operations. Without them, a node drain could terminate all your pods simultaneously, causing an outage. This guide shows you how to configure PDBs correctly for high availability.

## What PDBs Protect Against

PDBs guard against voluntary disruptions:

- kubectl drain operations
- Cluster autoscaler scale-down
- Node maintenance and updates
- Kubernetes version upgrades
- Pod eviction API calls

PDBs cannot prevent involuntary disruptions like hardware failures or kernel crashes.

## Basic PDB Configuration

### Using minAvailable

Guarantee a minimum number of pods stay running:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-pdb
  namespace: production
spec:
  minAvailable: 2    # Keep at least 2 pods running
  selector:
    matchLabels:
      app: web
```

### Using maxUnavailable

Allow a maximum number of pods to be unavailable:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-pdb
  namespace: production
spec:
  maxUnavailable: 1    # Allow at most 1 pod to be down
  selector:
    matchLabels:
      app: api
```

### Using Percentages

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: workers-pdb
spec:
  maxUnavailable: 25%    # Allow 25% of pods to be unavailable
  selector:
    matchLabels:
      app: workers
```

## Choosing the Right Strategy

| Scenario | Recommended Setting | Example |
|----------|-------------------|---------|
| 3-replica web app | minAvailable: 2 | Keep 2 of 3 running |
| Large deployment (20+ pods) | maxUnavailable: 25% | Flexible percentage |
| Stateful quorum (etcd, ZK) | minAvailable: (n/2)+1 | Maintain quorum |
| Batch processing | maxUnavailable: 50% | Allow aggressive eviction |
| Single replica | No PDB or maxUnavailable: 1 | Allow disruption |

## Complete Examples

### Web Application

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend
  namespace: production
spec:
  replicas: 4
  selector:
    matchLabels:
      app: web-frontend
  template:
    metadata:
      labels:
        app: web-frontend
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  app: web-frontend
              topologyKey: kubernetes.io/hostname
      containers:
        - name: nginx
          image: nginx:1.24
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-frontend-pdb
  namespace: production
spec:
  minAvailable: 3    # Keep 3 of 4 pods running
  selector:
    matchLabels:
      app: web-frontend
```

### Database Cluster

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: database
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
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: postgres-pdb
  namespace: database
spec:
  minAvailable: 2    # Maintain majority for quorum
  selector:
    matchLabels:
      app: postgres
```

### Microservices with Multiple Deployments

```yaml
# Single PDB covering multiple deployments with same label
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: backend-pdb
  namespace: production
spec:
  minAvailable: 5    # Across all matched pods
  selector:
    matchLabels:
      tier: backend    # Matches multiple deployments
```

Or separate PDBs per deployment:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: auth-service-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: auth-service
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: user-service-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: user-service
```

## Checking PDB Status

```bash
# List all PDBs
kubectl get pdb -A

# Output:
# NAMESPACE    NAME              MIN AVAILABLE   MAX UNAVAILABLE   ALLOWED DISRUPTIONS   AGE
# production   web-frontend-pdb  3               N/A               1                     24h
# database     postgres-pdb      2               N/A               1                     24h

# Detailed status
kubectl describe pdb web-frontend-pdb -n production

# Key fields:
# Allowed disruptions: 1     # How many pods can be evicted now
# Current:            4      # Current healthy pods
# Desired:            4      # Desired pods
# Expected:           4      # Expected pods (scheduled + running)
```

## PDB Behavior During Operations

### Node Drain

```bash
# Attempt to drain node
kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data

# Output with PDB:
# evicting pod production/web-frontend-xyz
# error when evicting pod "web-frontend-abc": Cannot evict pod as it would violate the pod's disruption budget
# evicting pod production/web-frontend-abc
# pod/web-frontend-xyz evicted
# pod/web-frontend-abc evicted
```

Kubernetes evicts pods one at a time, waiting for each to be replaced before evicting the next.

### Cluster Autoscaler

The cluster autoscaler respects PDBs when removing nodes:

```bash
# Node won't be removed if it would violate PDB
kubectl get events -n kube-system | grep -i "scale down"

# Event: Scale-down blocked by pod disruption budget
```

## Troubleshooting PDB Issues

### Drain Stuck

```bash
# Check what is blocking
kubectl get pdb -A

# If Allowed disruptions is 0, no pods can be evicted
# Check why pods are not healthy

kubectl get pods -l app=web-frontend -o wide
kubectl describe pod web-frontend-xyz
```

Solutions:

```bash
# Scale up temporarily
kubectl scale deployment web-frontend --replicas=5 -n production

# Drain node
kubectl drain node-1 --ignore-daemonsets

# Scale back down
kubectl scale deployment web-frontend --replicas=4 -n production
```

### PDB Blocking Cluster Upgrade

```bash
# Check for blocking PDBs
kubectl get pdb -A -o wide

# Look for:
# - minAvailable equal to replica count
# - Pods spread across single node
```

Prevention:

```yaml
# Ensure minAvailable < replicas
spec:
  minAvailable: 2    # With 3 replicas, allows 1 disruption

# Or use maxUnavailable
spec:
  maxUnavailable: 1    # Always allows at least 1 eviction
```

### PDB Not Matching Pods

```bash
# Check selector matches
kubectl get pods -l app=web-frontend -n production

# Verify PDB status shows correct counts
kubectl describe pdb web-frontend-pdb -n production

# Ensure labels match exactly
kubectl get pods -n production --show-labels
```

## Best Practices

### 1. Always Create PDBs for Production Workloads

```yaml
# Even if allowing 100% unavailable
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: batch-pdb
spec:
  maxUnavailable: 100%    # Documents disruption tolerance
  selector:
    matchLabels:
      app: batch-processor
```

### 2. Use Pod Anti-Affinity with PDBs

```yaml
spec:
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchLabels:
              app: web
          topologyKey: kubernetes.io/hostname
```

This spreads pods across nodes so draining one node does not affect multiple pods.

### 3. Set minAvailable Below Replica Count

```yaml
# With 3 replicas
spec:
  minAvailable: 2    # Allows 1 disruption

# NOT this - blocks all operations
spec:
  minAvailable: 3    # No disruptions allowed
```

### 4. Consider HPA Interaction

```yaml
# HPA min replicas should exceed PDB minAvailable
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  minReplicas: 3    # Higher than PDB minAvailable

---
apiVersion: policy/v1
kind: PodDisruptionBudget
spec:
  minAvailable: 2    # Lower than HPA minReplicas
```

### 5. Use Percentages for Variable Workloads

```yaml
# Works regardless of current replica count
spec:
  maxUnavailable: 25%
```

### 6. Combine with Graceful Termination

```yaml
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 60
      containers:
        - name: app
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 30"]
```

## Monitoring PDBs

### Prometheus Metrics

```yaml
# Key metrics
kube_poddisruptionbudget_status_current_healthy
kube_poddisruptionbudget_status_desired_healthy
kube_poddisruptionbudget_status_pod_disruptions_allowed
kube_poddisruptionbudget_status_expected_pods
```

### Alert Rules

```yaml
groups:
  - name: pdb
    rules:
      - alert: PDBNoAllowedDisruptions
        expr: kube_poddisruptionbudget_status_pod_disruptions_allowed == 0
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "PDB {{ $labels.poddisruptionbudget }} has no allowed disruptions"
          description: "This may block cluster operations"

      - alert: PDBBelowDesired
        expr: |
          kube_poddisruptionbudget_status_current_healthy
          <
          kube_poddisruptionbudget_status_desired_healthy
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "PDB {{ $labels.poddisruptionbudget }} has fewer healthy pods than desired"
```

## PDB Quick Reference

```bash
# Create PDB
kubectl apply -f pdb.yaml

# Check PDB status
kubectl get pdb -n production

# Describe PDB
kubectl describe pdb web-pdb -n production

# Delete PDB (for emergency operations)
kubectl delete pdb web-pdb -n production

# Dry-run drain to test PDB
kubectl drain node-1 --ignore-daemonsets --dry-run=client
```

---

Pod Disruption Budgets are essential for production Kubernetes clusters. They ensure your applications stay available during maintenance, upgrades, and autoscaling. Start by adding PDBs to all critical workloads, combine them with pod anti-affinity for better distribution, and monitor for situations where PDBs might block necessary operations.
