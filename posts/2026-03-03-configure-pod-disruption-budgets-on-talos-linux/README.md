# How to Configure Pod Disruption Budgets on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Pod Disruption Budget, Kubernetes, High Availability, Maintenance, Rolling Updates

Description: Learn how to configure Pod Disruption Budgets on Talos Linux to protect application availability during node maintenance, upgrades, and scaling events.

---

Pod Disruption Budgets (PDBs) are one of the most overlooked Kubernetes resources, yet they are critical for maintaining application availability during planned disruptions. Without PDBs, a node drain during a Talos Linux upgrade could take down all replicas of a service simultaneously. With PDBs, Kubernetes guarantees that a minimum number of replicas remain available throughout any voluntary disruption.

On Talos Linux, PDBs are especially important because node upgrades and configuration changes are routine operations that involve draining and rebooting nodes. This guide covers how to design and implement PDBs for different workload patterns.

## What PDBs Protect Against

PDBs protect against voluntary disruptions, which include:

- Node drains during Talos Linux upgrades
- Cluster autoscaler removing underutilized nodes
- Pod preemption by higher-priority pods
- kubectl drain for maintenance
- Rolling updates that overlap with other disruptions

PDBs do not protect against involuntary disruptions like:
- Node hardware failure
- Kernel crash
- Out-of-memory kills
- Network partitions

This distinction matters because PDBs only work when something asks for permission to disrupt a pod. Crashes and failures do not ask for permission.

## Basic PDB Configuration

A PDB can specify either `minAvailable` or `maxUnavailable`, but not both:

```yaml
# pdb-min-available.yaml
# Ensure at least 2 replicas are always running
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

```yaml
# pdb-max-unavailable.yaml
# Allow at most 1 replica to be unavailable at a time
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-server-pdb
  namespace: production
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: api-server
```

You can also use percentages:

```yaml
# pdb-percentage.yaml
# Keep at least 75% of replicas available
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: worker-pdb
  namespace: production
spec:
  minAvailable: "75%"
  selector:
    matchLabels:
      app: task-worker
```

## Choosing Between minAvailable and maxUnavailable

The choice depends on your workload:

**Use minAvailable when:**
- You know the exact minimum number of replicas needed for the service to function
- Your service has a fixed capacity requirement

**Use maxUnavailable when:**
- You want to control the rate of disruption
- Your replica count varies (due to HPA scaling)
- You want to allow rolling disruptions

```yaml
# For a service with 5 replicas:

# minAvailable: 3
# - Always keeps at least 3 running
# - Allows up to 2 to be disrupted
# - If replicas scale to 10, still only guarantees 3

# maxUnavailable: 1
# - Allows only 1 to be disrupted at a time
# - With 5 replicas: keeps at least 4 running
# - With 10 replicas: keeps at least 9 running
# - Scales proportionally with replica count
```

For most workloads, `maxUnavailable: 1` is the safest and most flexible choice.

## PDB Patterns for Common Workloads

### Stateless Web Services

```yaml
# web-service-pdb.yaml
# Web service with multiple replicas behind a load balancer
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-frontend-pdb
  namespace: production
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: web-frontend
---
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
      # Spread across nodes for better fault tolerance
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: web-frontend
      containers:
        - name: web
          image: web-frontend:v2.0
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
```

### StatefulSets (Databases)

```yaml
# database-pdb.yaml
# PostgreSQL with leader-follower replication
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: postgres-pdb
  namespace: database
spec:
  # For a 3-node cluster, keep at least 2 running
  # This ensures quorum is maintained
  minAvailable: 2
  selector:
    matchLabels:
      app: postgres
---
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
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: app
                    operator: In
                    values: ["postgres"]
              topologyKey: kubernetes.io/hostname
      containers:
        - name: postgres
          image: postgres:16
          resources:
            requests:
              cpu: "2"
              memory: "4Gi"
            limits:
              cpu: "2"
              memory: "4Gi"
```

### etcd Clusters

```yaml
# etcd-pdb.yaml
# etcd needs a majority of members to maintain quorum
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: etcd-pdb
  namespace: etcd-system
spec:
  # For a 3-member etcd cluster, you need at least 2 for quorum
  # For a 5-member cluster, you need at least 3
  maxUnavailable: 1
  selector:
    matchLabels:
      app: etcd
```

### Singleton Workloads

For workloads with only one replica, PDBs need special handling:

```yaml
# singleton-pdb.yaml
# Single-replica service that needs graceful migration
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: scheduler-pdb
  namespace: production
spec:
  # This will block node drains until the pod is rescheduled
  # Use with caution - can block upgrades
  minAvailable: 1
  selector:
    matchLabels:
      app: task-scheduler
```

Be careful with singletons. A PDB with `minAvailable: 1` on a single-replica deployment will block any drain operation until the pod is rescheduled elsewhere first. This can slow down Talos upgrades significantly.

A better approach for singletons:

```yaml
# Use maxUnavailable: 1 or do not set a PDB for singletons
# Instead, ensure fast startup and graceful shutdown
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-scheduler
spec:
  replicas: 1
  strategy:
    type: Recreate  # For singletons that cannot have two instances
  template:
    spec:
      terminationGracePeriodSeconds: 60
      containers:
        - name: scheduler
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "kill -SIGTERM 1 && sleep 30"]
```

## PDBs and Talos Linux Upgrades

When you upgrade Talos Linux nodes, each node is drained before being upgraded. PDBs control how this drain proceeds:

```bash
# Talos upgrade process:
# 1. talosctl upgrade --nodes <ip>
# 2. Talos cordons the node (marks it unschedulable)
# 3. Talos drains the node (respecting PDBs)
# 4. Node upgrades and reboots
# 5. Node rejoins the cluster

# If a PDB blocks the drain, the upgrade will wait
# You can monitor the drain progress:
kubectl get events --field-selector reason=Evicted -A --watch
```

To avoid PDBs blocking upgrades indefinitely, configure an unhealthy pod eviction policy:

```yaml
# pdb-with-unhealthy-eviction.yaml
# Allow eviction of unhealthy pods even when PDB would be violated
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-app-pdb
  namespace: production
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: web-app
  unhealthyPodEvictionPolicy: AlwaysAllow
  # This allows evicting pods that are:
  # - Not ready
  # - Stuck in CrashLoopBackOff
  # Even if it would violate the PDB
```

## PDBs and the Cluster Autoscaler

The cluster autoscaler respects PDBs when deciding which nodes to remove:

```yaml
# If a node only has pods protected by PDBs,
# the autoscaler will skip it for scale-down

# To make pods eligible for scale-down, ensure:
# 1. PDBs allow at least 1 pod to be disrupted
# 2. Pods have proper anti-affinity to spread across nodes
# 3. Pods are not using local storage that prevents rescheduling
```

## Monitoring PDB Status

Track PDB health to ensure they are not blocking operations:

```bash
# View all PDBs and their status
kubectl get pdb -A -o custom-columns=\
NAMESPACE:.metadata.namespace,\
NAME:.metadata.name,\
MIN_AVAILABLE:.spec.minAvailable,\
MAX_UNAVAILABLE:.spec.maxUnavailable,\
ALLOWED_DISRUPTIONS:.status.disruptionsAllowed,\
CURRENT_HEALTHY:.status.currentHealthy,\
DESIRED_HEALTHY:.status.desiredHealthy

# Find PDBs that are blocking disruptions
kubectl get pdb -A -o json | jq '
  .items[] |
  select(.status.disruptionsAllowed == 0) |
  {
    namespace: .metadata.namespace,
    name: .metadata.name,
    currentHealthy: .status.currentHealthy,
    desiredHealthy: .status.desiredHealthy,
    reason: "No disruptions allowed - all replicas needed"
  }'
```

Set up alerting for PDB issues:

```yaml
# pdb-alerts.yaml
# Alert when PDBs may block operations
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: pdb-alerts
  namespace: monitoring
spec:
  groups:
    - name: pdb.health
      rules:
        - alert: PDBBlockingDisruptions
          expr: >
            kube_poddisruptionbudget_status_pod_disruptions_allowed == 0
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: >
              PDB {{ $labels.poddisruptionbudget }} in
              {{ $labels.namespace }} is blocking all disruptions
            description: >
              This may prevent node drains and Talos upgrades.
              Check if replicas are healthy.

        - alert: PDBMisconfigured
          expr: >
            kube_poddisruptionbudget_status_desired_healthy >
            kube_poddisruptionbudget_status_expected_pods
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: >
              PDB {{ $labels.poddisruptionbudget }} in
              {{ $labels.namespace }} is misconfigured
```

## Common PDB Mistakes

**Mistake 1: PDB is too restrictive**
```yaml
# Bad: With 3 replicas and minAvailable: 3,
# no disruptions are ever allowed
spec:
  minAvailable: 3  # Blocks all drain operations

# Fix: Use maxUnavailable: 1 instead
spec:
  maxUnavailable: 1
```

**Mistake 2: PDB selector does not match any pods**
```yaml
# Bad: Selector labels do not match deployment labels
spec:
  selector:
    matchLabels:
      app: my-app-typo  # Does not match any pods
# The PDB exists but protects nothing
```

**Mistake 3: No PDB for critical services**
```yaml
# Bad: Critical service with no PDB
# During a node drain, all replicas on that node
# can be evicted simultaneously
```

## Summary

Pod Disruption Budgets are essential for maintaining application availability during Talos Linux node operations. For most workloads, `maxUnavailable: 1` provides a good balance between protection and operational flexibility. Always combine PDBs with proper pod anti-affinity to ensure replicas are spread across nodes, and use topology spread constraints for even distribution. Monitor PDB status to catch configurations that might block operations, and use the `unhealthyPodEvictionPolicy` to prevent stuck pods from blocking upgrades indefinitely. On Talos Linux, where node upgrades are a regular and expected operation, well-configured PDBs ensure these operations proceed smoothly without impacting your users.
