# How to Use Priority Classes on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Priority Classes, Kubernetes, Pod Scheduling, Resource Management, Preemption

Description: Learn how to configure and use Kubernetes PriorityClasses on Talos Linux to ensure critical workloads always get scheduled, even during resource contention.

---

In a busy Kubernetes cluster, there will be times when not every pod can be scheduled. Maybe a deployment is scaling up during a traffic spike, or a batch job is competing with your production services for resources. Without priority classes, Kubernetes treats all pods equally, and your critical payment processing service has the same scheduling priority as a development test pod.

Priority classes solve this problem by assigning a numerical priority to pods. Higher priority pods get scheduled first, and when resources are scarce, lower priority pods can be preempted (evicted) to make room for higher priority ones. On Talos Linux, where the goal is often to run lean clusters with high utilization, priority classes are essential for ensuring important workloads always have the resources they need.

## How Priority Classes Work

A PriorityClass is a cluster-scoped resource that defines:

1. **A priority value** (integer, higher = more important)
2. **Whether preemption is enabled** (can this priority class evict lower priority pods?)
3. **A description** for documentation

When a pod cannot be scheduled because no node has enough resources, the scheduler looks for lower priority pods that could be preempted to make room. If preemption succeeds, the lower priority pod is evicted and the higher priority pod takes its place.

## Built-In Priority Classes

Kubernetes comes with two built-in priority classes:

```bash
# View built-in priority classes
kubectl get priorityclasses

# system-cluster-critical: 2000000000 (for cluster-critical pods)
# system-node-critical:    2000001000 (for node-critical pods)
```

These are reserved for system components like kube-proxy, CoreDNS, and the CNI plugin. Do not use them for your application workloads.

## Creating Custom Priority Classes

Define priority classes for your workload tiers:

```yaml
# priority-classes.yaml
# Priority class hierarchy for production Talos clusters

# Tier 1: Mission-critical services
# Payment processing, authentication, core API
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: critical
value: 1000000
preemptionPolicy: PreemptLowerPriority
globalDefault: false
description: "Mission-critical production services that must always be running"

---
# Tier 2: Important production services
# Web frontends, background workers, monitoring
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high
value: 750000
preemptionPolicy: PreemptLowerPriority
globalDefault: false
description: "Important production services that should be prioritized"

---
# Tier 3: Standard workloads (default)
# General services, internal tools
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: standard
value: 500000
preemptionPolicy: PreemptLowerPriority
globalDefault: true  # This is the default for pods without a priority class
description: "Standard priority for general workloads"

---
# Tier 4: Low priority workloads
# Batch jobs, reports, non-urgent processing
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: low
value: 250000
preemptionPolicy: PreemptLowerPriority
globalDefault: false
description: "Low priority for batch jobs and non-urgent workloads"

---
# Tier 5: Preemptible workloads
# Development, testing, optional services
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: preemptible
value: 100000
preemptionPolicy: PreemptLowerPriority
globalDefault: false
description: "Preemptible workloads that can be evicted when resources are needed"

---
# Special: Non-preempting priority
# Workloads that should not evict others but get scheduled after higher priority
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: non-preempting-low
value: 50000
preemptionPolicy: Never  # Will not evict other pods
globalDefault: false
description: "Low priority workloads that never preempt other pods"
```

Apply the priority classes:

```bash
# Create all priority classes
kubectl apply -f priority-classes.yaml

# Verify they were created
kubectl get priorityclasses -o custom-columns=\
NAME:.metadata.name,\
VALUE:.value,\
PREEMPTION:.preemptionPolicy,\
DEFAULT:.globalDefault
```

## Assigning Priority Classes to Workloads

Reference the priority class in your pod spec:

```yaml
# critical-service-deployment.yaml
# Payment service with critical priority
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
    spec:
      priorityClassName: critical  # Highest application priority
      containers:
        - name: payment
          image: payment-service:v2.1
          resources:
            requests:
              cpu: "1"
              memory: "2Gi"
            limits:
              cpu: "1"
              memory: "2Gi"
```

```yaml
# batch-job.yaml
# Report generation job with low priority
apiVersion: batch/v1
kind: Job
metadata:
  name: monthly-report
  namespace: analytics
spec:
  template:
    spec:
      priorityClassName: low  # Can be preempted by higher priority pods
      containers:
        - name: report-generator
          image: report-generator:v1.0
          resources:
            requests:
              cpu: "2"
              memory: "4Gi"
            limits:
              cpu: "4"
              memory: "8Gi"
      restartPolicy: OnFailure
```

```yaml
# dev-deployment.yaml
# Development tool with preemptible priority
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dev-environment
  namespace: development
spec:
  replicas: 1
  selector:
    matchLabels:
      app: dev-env
  template:
    metadata:
      labels:
        app: dev-env
    spec:
      priorityClassName: preemptible  # First to be evicted
      containers:
        - name: dev
          image: dev-environment:latest
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
```

## Combining Priority Classes with Autoscaling

Priority classes work well with the cluster autoscaler. When a high-priority pod preempts a lower-priority pod, the evicted pod becomes unschedulable, triggering the cluster autoscaler to add a new node:

```yaml
# cluster-autoscaler-priority-config.yaml
# Autoscaler configuration that respects priority
extraArgs:
  # Consider pod priority when deciding scale-down
  expendable-pods-priority-cutoff: "100000"
  # Pods below this priority value are considered expendable
  # and will not prevent scale-down

  # Do not evict pods above this priority during scale-down
  skip-nodes-with-system-pods: "true"
```

This creates a natural flow:
1. High-priority pod needs scheduling
2. Low-priority pod is preempted to make room
3. Cluster autoscaler adds a node for the evicted pod
4. When demand decreases, low-priority pods are candidates for scale-down

## Enforcing Priority Class Usage

Prevent teams from using priority classes they should not:

```yaml
# restrict-priority-classes.yaml
# Kyverno policy to restrict priority class usage by namespace
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: restrict-priority-classes
spec:
  validationFailureAction: Enforce
  rules:
    # Development namespaces cannot use critical or high priority
    - name: restrict-dev-priority
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - "development"
                - "staging"
      validate:
        message: "Development namespaces can only use 'standard', 'low', or 'preemptible' priority classes"
        pattern:
          spec:
            priorityClassName: "standard | low | preemptible | non-preempting-low"

    # Only specific service accounts can use critical priority
    - name: restrict-critical-priority
      match:
        any:
          - resources:
              kinds:
                - Pod
      preconditions:
        all:
          - key: "{{ request.object.spec.priorityClassName }}"
            operator: Equals
            value: "critical"
      validate:
        message: "Only authorized service accounts can use the 'critical' priority class"
        pattern:
          spec:
            serviceAccountName: "critical-*"
```

## Monitoring Preemption Events

Track when preemption happens to understand resource contention:

```bash
# View recent preemption events
kubectl get events -A --field-selector reason=Preempted

# Check if any pods are in a preemption cycle
kubectl get pods -A --field-selector status.phase=Pending -o custom-columns=\
NAME:.metadata.name,\
NAMESPACE:.metadata.namespace,\
PRIORITY:.spec.priority,\
STATUS:.status.phase
```

Set up Prometheus alerts for preemption:

```yaml
# preemption-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: preemption-alerts
  namespace: monitoring
spec:
  groups:
    - name: priority.preemption
      rules:
        - alert: HighPreemptionRate
          expr: >
            increase(kube_pod_preemption_victims[1h]) > 10
          for: 30m
          labels:
            severity: warning
          annotations:
            summary: "High rate of pod preemptions detected"
            description: >
              More than 10 pods have been preempted in the last hour.
              Consider adding more capacity to the cluster.

        - alert: CriticalPodPending
          expr: >
            kube_pod_status_phase{phase="Pending"} == 1
            and on(pod, namespace)
            kube_pod_spec_priority > 750000
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "Critical priority pod {{ $labels.pod }} is pending"
```

## Best Practices

1. **Keep the priority hierarchy simple.** Three to five levels is usually enough. Too many levels create confusion.

2. **Set a global default.** Make sure there is a sensible default priority class so pods without explicit priority still get a reasonable value.

3. **Use non-preempting priority for sensitive workloads.** If you want ordering without eviction, use `preemptionPolicy: Never`.

4. **Document your priority classes.** Use the description field and maintain documentation about which workloads should use which class.

5. **Combine with Pod Disruption Budgets.** Priority classes handle scheduling priority, but PDBs protect against too many pods being evicted simultaneously.

## Summary

Priority classes on Talos Linux give you explicit control over which workloads get resources first when the cluster is constrained. By creating a clear hierarchy from critical production services down to preemptible development workloads, you ensure that your most important applications always get scheduled. Combined with the cluster autoscaler, priority classes create a natural flow where high-priority pods get immediate resources through preemption while evicted lower-priority pods trigger capacity expansion. Keep your hierarchy simple, enforce it through policies, and monitor preemption events to maintain visibility into resource contention patterns.
