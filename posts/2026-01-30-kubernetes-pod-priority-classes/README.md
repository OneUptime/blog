# How to Implement Kubernetes Pod Priority Classes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kubernetes, Scheduling, Resource Management, DevOps

Description: Configure pod priority classes in Kubernetes for workload prioritization with preemption policies for critical workloads during resource contention.

---

## Introduction

When your Kubernetes cluster runs low on resources, the scheduler needs to make decisions about which pods get resources and which ones wait. Pod Priority Classes give you control over these decisions by assigning priority values to different workloads. Critical services like databases and payment processors can be configured to always get resources, while batch jobs and development workloads wait or get preempted.

This guide covers everything you need to implement priority classes in production, from basic configuration to advanced preemption policies.

## Understanding Pod Priority and Preemption

Pod priority works through two mechanisms:

1. **Scheduling Priority**: Higher priority pods get scheduled before lower priority pods when resources are available
2. **Preemption**: When no resources are available, the scheduler can evict lower priority pods to make room for higher priority ones

The scheduler evaluates priority during the scheduling cycle. If a high priority pod cannot be scheduled due to resource constraints, the scheduler identifies lower priority pods that could be evicted to free up resources.

## The PriorityClass Resource

A PriorityClass is a cluster-scoped resource that defines a priority value and optional preemption policy. Here is the basic structure:

```yaml
# PriorityClass defines a mapping from a priority class name to the priority
# integer value. The value can be any valid integer.
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000000
globalDefault: false
preemptionPolicy: PreemptLowerPriority
description: "Priority class for production critical workloads"
```

### PriorityClass Fields Explained

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `value` | integer | Yes | Priority value, higher means more important. Range: -2147483648 to 1000000000 |
| `globalDefault` | boolean | No | If true, this priority class is used for pods without a priorityClassName |
| `preemptionPolicy` | string | No | Either `PreemptLowerPriority` (default) or `Never` |
| `description` | string | No | Human readable description for documentation |

### Priority Value Ranges

The priority value determines the actual scheduling priority. Here are the recommended ranges:

| Range | Use Case | Examples |
|-------|----------|----------|
| 1000000000 | System critical | system-cluster-critical, system-node-critical |
| 900000000 - 999999999 | Reserved for system | Do not use for user workloads |
| 100000 - 1000000 | Critical production | Databases, payment services, core APIs |
| 10000 - 99999 | Standard production | Web servers, application services |
| 1000 - 9999 | Background tasks | Batch jobs, reports, analytics |
| 0 - 999 | Best effort | Development, testing, experiments |
| Negative values | Lowest priority | Preemptable batch processing |

## Built-in System Priority Classes

Kubernetes ships with two built-in priority classes for system components:

```bash
# List all priority classes in your cluster
kubectl get priorityclasses

# Expected output includes:
# NAME                      VALUE        GLOBAL-DEFAULT   AGE
# system-cluster-critical   2000000000   false            30d
# system-node-critical      2000001000   false            30d
```

### system-cluster-critical

Used for pods that are critical for cluster functioning. Examples include:

- CoreDNS
- Cluster autoscaler
- Metrics server

```yaml
# Example: CoreDNS uses system-cluster-critical
apiVersion: apps/v1
kind: Deployment
metadata:
  name: coredns
  namespace: kube-system
spec:
  template:
    spec:
      priorityClassName: system-cluster-critical
      containers:
      - name: coredns
        image: coredns/coredns:1.11.1
```

### system-node-critical

Used for pods that are critical for node functioning. Examples include:

- kube-proxy
- CNI plugins (Calico, Cilium)
- CSI node drivers

```yaml
# Example: kube-proxy uses system-node-critical
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: kube-proxy
  namespace: kube-system
spec:
  template:
    spec:
      priorityClassName: system-node-critical
      containers:
      - name: kube-proxy
        image: registry.k8s.io/kube-proxy:v1.29.0
```

**Important**: Never assign these system priority classes to user workloads. User workloads should use custom priority classes with values below 1000000000.

## Creating Custom Priority Classes

Let us create a complete set of priority classes for a production environment.

### Critical Priority Class

For workloads that must always run, such as databases and core services:

```yaml
# critical-priority.yaml
# This priority class is for workloads that cannot tolerate interruption.
# Examples: Primary databases, payment processing, authentication services
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: critical
  labels:
    app.kubernetes.io/managed-by: platform-team
    tier: critical
value: 1000000
globalDefault: false
preemptionPolicy: PreemptLowerPriority
description: "Critical workloads that must always run. Use for databases and core services only."
```

### High Priority Class

For important production services that should preempt lower priority workloads:

```yaml
# high-priority.yaml
# Production services that are important but can briefly tolerate disruption.
# Examples: API gateways, web frontends, microservices
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
  labels:
    app.kubernetes.io/managed-by: platform-team
    tier: high
value: 100000
globalDefault: false
preemptionPolicy: PreemptLowerPriority
description: "High priority production workloads. Preempts standard and low priority pods."
```

### Standard Priority Class

For regular production workloads. This is a good candidate for the global default:

```yaml
# standard-priority.yaml
# Default priority for production workloads.
# Set as globalDefault so pods without explicit priority get this value.
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: standard
  labels:
    app.kubernetes.io/managed-by: platform-team
    tier: standard
value: 10000
globalDefault: true
preemptionPolicy: PreemptLowerPriority
description: "Standard priority for regular production workloads. This is the default."
```

### Low Priority Class

For batch jobs and background processing:

```yaml
# low-priority.yaml
# Background jobs that can wait for resources.
# Examples: Batch processing, report generation, data pipelines
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: low-priority
  labels:
    app.kubernetes.io/managed-by: platform-team
    tier: low
value: 1000
globalDefault: false
preemptionPolicy: PreemptLowerPriority
description: "Low priority batch jobs and background tasks."
```

### Best Effort Priority Class (Non-Preempting)

For workloads that should never preempt other pods:

```yaml
# best-effort-priority.yaml
# Lowest priority workloads that should never cause preemption.
# Uses PreemptionPolicy: Never to prevent evicting other pods.
# Examples: Development workloads, testing, experiments
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: best-effort
  labels:
    app.kubernetes.io/managed-by: platform-team
    tier: best-effort
value: 100
globalDefault: false
preemptionPolicy: Never
description: "Best effort workloads that never preempt. For dev and testing."
```

### Apply All Priority Classes

Create a kustomization to apply all priority classes together:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - critical-priority.yaml
  - high-priority.yaml
  - standard-priority.yaml
  - low-priority.yaml
  - best-effort-priority.yaml
```

```bash
# Apply all priority classes
kubectl apply -k ./priority-classes/

# Verify the priority classes were created
kubectl get priorityclasses -l app.kubernetes.io/managed-by=platform-team
```

## Assigning Priority Classes to Pods

Once priority classes exist, assign them to pods using the `priorityClassName` field.

### Direct Pod Assignment

```yaml
# pod-with-priority.yaml
apiVersion: v1
kind: Pod
metadata:
  name: critical-database
  namespace: production
spec:
  # Assign the critical priority class to this pod
  priorityClassName: critical
  containers:
  - name: postgres
    image: postgres:16
    resources:
      requests:
        memory: "4Gi"
        cpu: "2"
      limits:
        memory: "8Gi"
        cpu: "4"
```

### Deployment with Priority Class

```yaml
# deployment-high-priority.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      # All pods in this deployment get high-priority
      priorityClassName: high-priority
      containers:
      - name: api-gateway
        image: myregistry/api-gateway:v2.1.0
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1"
```

### StatefulSet with Critical Priority

```yaml
# statefulset-critical.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
  namespace: production
spec:
  serviceName: redis-cluster
  replicas: 3
  selector:
    matchLabels:
      app: redis-cluster
  template:
    metadata:
      labels:
        app: redis-cluster
    spec:
      # Redis cluster pods are critical
      priorityClassName: critical
      terminationGracePeriodSeconds: 30
      containers:
      - name: redis
        image: redis:7.2
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
          limits:
            memory: "4Gi"
            cpu: "2"
        volumeMounts:
        - name: data
          mountPath: /data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 50Gi
```

### CronJob with Low Priority

```yaml
# cronjob-low-priority.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-report
  namespace: batch
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          # Batch jobs use low priority
          priorityClassName: low-priority
          restartPolicy: OnFailure
          containers:
          - name: report-generator
            image: myregistry/report-generator:v1.0.0
            resources:
              requests:
                memory: "1Gi"
                cpu: "500m"
              limits:
                memory: "2Gi"
                cpu: "1"
```

### DaemonSet with High Priority

```yaml
# daemonset-monitoring.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      # Monitoring agents need high priority to collect metrics
      priorityClassName: high-priority
      tolerations:
      - operator: Exists
      containers:
      - name: node-exporter
        image: prom/node-exporter:v1.7.0
        ports:
        - containerPort: 9100
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
          limits:
            memory: "128Mi"
            cpu: "200m"
```

## Understanding Preemption Behavior

Preemption occurs when a high priority pod cannot be scheduled due to insufficient resources. The scheduler will evict lower priority pods to make room.

### Preemption Flow

1. High priority pod enters the scheduling queue
2. Scheduler attempts to find a node with sufficient resources
3. If no node has resources, scheduler looks for preemption victims
4. Scheduler selects pods with lower priority that would free enough resources
5. Selected pods receive a termination signal
6. Once pods terminate, high priority pod gets scheduled

### Preemption Policies

| Policy | Behavior |
|--------|----------|
| `PreemptLowerPriority` | Can preempt pods with lower priority values (default) |
| `Never` | Never preempts, waits for resources to become available |

### Example: Non-Preempting Priority Class

Use `preemptionPolicy: Never` for workloads that should benefit from higher scheduling priority but should never evict other pods:

```yaml
# non-preempting-priority.yaml
# High scheduling priority but will never preempt other pods.
# Useful for important batch jobs that should not disrupt production.
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority-non-preempting
value: 100000
globalDefault: false
preemptionPolicy: Never
description: "High priority but will never preempt. For important batch jobs."
```

### Preemption Guarantees

The scheduler provides these guarantees during preemption:

1. **Minimum disruption**: Scheduler preempts the minimum number of pods needed
2. **Priority ordering**: Higher priority pods are never preempted for lower priority ones
3. **Graceful termination**: Preempted pods receive SIGTERM and their termination grace period
4. **PodDisruptionBudget respect**: PDBs are respected when possible (but can be violated for critical scheduling)

### Monitoring Preemption Events

Check for preemption events in the cluster:

```bash
# Find preemption events
kubectl get events --all-namespaces --field-selector reason=Preempted

# Watch for preemption in real time
kubectl get events -A --watch --field-selector reason=Preempted

# Check specific pod preemption
kubectl describe pod <pod-name> -n <namespace> | grep -A5 "Events:"
```

## Practical Scenarios

### Scenario 1: Database Priority Over Web Servers

Configure a PostgreSQL database to have higher priority than web servers:

```yaml
# postgres-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      priorityClassName: critical
      containers:
      - name: postgres
        image: postgres:16
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        resources:
          requests:
            memory: "4Gi"
            cpu: "2"
          limits:
            memory: "8Gi"
            cpu: "4"
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-data
        persistentVolumeClaim:
          claimName: postgres-pvc
---
# web-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: web-frontend
  template:
    metadata:
      labels:
        app: web-frontend
    spec:
      # Web servers have lower priority than database
      priorityClassName: high-priority
      containers:
      - name: web
        image: myregistry/web-frontend:v3.0.0
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Scenario 2: Development vs Production Namespaces

Use priority classes to separate development and production workloads:

```yaml
# Create namespace with default priority using LimitRange
# Note: LimitRange does not set priorityClassName, use admission controller instead
---
# production-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    environment: production
---
# development-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: development
  labels:
    environment: development
```

For namespace-level priority defaults, use a mutating admission webhook or policy engine like Kyverno:

```yaml
# kyverno-policy-dev-priority.yaml
# Kyverno policy to automatically set best-effort priority in dev namespace
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-priority-to-dev-pods
spec:
  rules:
  - name: add-best-effort-priority
    match:
      any:
      - resources:
          kinds:
          - Pod
          namespaces:
          - development
    mutate:
      patchStrategicMerge:
        spec:
          # Automatically set best-effort priority for all dev pods
          priorityClassName: best-effort
```

### Scenario 3: Batch Processing with Preemption Protection

Configure batch jobs that have medium priority but protect against cascading preemptions:

```yaml
# batch-job-protected.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-migration
  namespace: batch
spec:
  # Do not retry if preempted
  backoffLimit: 2
  template:
    spec:
      # Use non-preempting priority to avoid disrupting other workloads
      priorityClassName: high-priority-non-preempting
      restartPolicy: OnFailure
      containers:
      - name: migration
        image: myregistry/data-migration:v1.0.0
        resources:
          requests:
            memory: "4Gi"
            cpu: "2"
          limits:
            memory: "8Gi"
            cpu: "4"
---
# Create PodDisruptionBudget to protect running jobs
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: data-migration-pdb
  namespace: batch
spec:
  minAvailable: 1
  selector:
    matchLabels:
      job-name: data-migration
```

## Best Practices

### 1. Define Clear Priority Tiers

Create a documented priority scheme for your organization:

| Tier | Priority Class | Value | Use Case |
|------|---------------|-------|----------|
| T0 | critical | 1000000 | Databases, auth services, payment processing |
| T1 | high-priority | 100000 | Core APIs, web frontends, critical microservices |
| T2 | standard | 10000 | Regular services (global default) |
| T3 | low-priority | 1000 | Batch jobs, background processing |
| T4 | best-effort | 100 | Development, testing, experiments |

### 2. Set a Global Default

Always configure one priority class as `globalDefault: true` to ensure pods without explicit priority get a reasonable value:

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: standard
value: 10000
globalDefault: true
description: "Default priority for workloads without explicit priorityClassName"
```

### 3. Use Non-Preempting for Batch Jobs

Batch jobs that run for hours should use `preemptionPolicy: Never` to avoid disrupting other workloads:

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: batch-non-preempting
value: 5000
preemptionPolicy: Never
description: "For long-running batch jobs that should not preempt"
```

### 4. Protect Critical Workloads with Resource Quotas

Combine priority classes with resource quotas to prevent lower priority workloads from consuming all resources:

```yaml
# resource-quota-by-priority.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: critical-workloads-quota
  namespace: production
spec:
  hard:
    # Limit resources for critical priority pods
    pods: "20"
    requests.cpu: "40"
    requests.memory: "80Gi"
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: PriorityClass
      values:
      - critical
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: standard-workloads-quota
  namespace: production
spec:
  hard:
    pods: "100"
    requests.cpu: "100"
    requests.memory: "200Gi"
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: PriorityClass
      values:
      - standard
      - high-priority
```

### 5. Monitor Priority Distribution

Create monitoring dashboards to track priority class usage:

```yaml
# prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: priority-class-alerts
  namespace: monitoring
spec:
  groups:
  - name: priority-class
    rules:
    # Alert when too many critical pods are pending
    - alert: CriticalPodsPending
      expr: |
        sum(kube_pod_status_phase{phase="Pending"}
        * on(pod, namespace) group_left(priority_class)
        kube_pod_priority_class{priority_class="critical"}) > 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Critical priority pods are pending"
        description: "{{ $value }} critical pods have been pending for more than 5 minutes"

    # Alert on high preemption rate
    - alert: HighPreemptionRate
      expr: |
        rate(scheduler_preemption_victims[5m]) > 1
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High pod preemption rate detected"
        description: "Pods are being preempted at {{ $value }} per second"
```

### 6. Document Priority Class Usage

Add descriptions and labels to priority classes for discoverability:

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: critical
  labels:
    # Use labels for filtering and organization
    tier: critical
    team: platform
    documentation: "https://docs.example.com/priority-classes"
  annotations:
    # Detailed documentation in annotations
    example.com/owner: "platform-team@example.com"
    example.com/slack-channel: "#platform-support"
value: 1000000
description: |
  Critical priority for production databases and core services.
  Approval required from platform team. Contact #platform-support.
```

## Troubleshooting

### Pod Stuck in Pending

Check if the pod has sufficient priority to be scheduled:

```bash
# Check pod priority
kubectl get pod <pod-name> -o jsonpath='{.spec.priority}'

# Check scheduler events
kubectl describe pod <pod-name> | grep -A10 "Events:"

# Check if there are preemption candidates
kubectl get pods --all-namespaces -o custom-columns=\
'NAMESPACE:.metadata.namespace,NAME:.metadata.name,PRIORITY:.spec.priority,NODE:.spec.nodeName' \
| sort -k3 -n
```

### Unexpected Preemption

Investigate why a pod was preempted:

```bash
# Check preemption events for the pod
kubectl get events -n <namespace> --field-selector involvedObject.name=<pod-name>

# Check what high priority pods were scheduled around the same time
kubectl get pods --all-namespaces --sort-by=.metadata.creationTimestamp \
-o custom-columns='NAMESPACE:.metadata.namespace,NAME:.metadata.name,PRIORITY:.spec.priority,CREATED:.metadata.creationTimestamp'
```

### Priority Class Not Applied

Verify the priority class exists and is correctly named:

```bash
# List all priority classes
kubectl get priorityclasses

# Check if pod has the correct priority
kubectl get pod <pod-name> -o yaml | grep -A2 priorityClassName

# Verify the priority value matches
kubectl get priorityclass <class-name> -o jsonpath='{.value}'
```

## Summary

Pod Priority Classes provide a straightforward mechanism for workload prioritization in Kubernetes. The key takeaways are:

1. Create priority classes that match your organization's workload tiers
2. Set a global default to handle pods without explicit priority
3. Use `preemptionPolicy: Never` for workloads that should not disrupt others
4. Combine priority classes with resource quotas for resource governance
5. Monitor preemption events and priority distribution across the cluster
6. Document priority class usage and ownership

With properly configured priority classes, your critical workloads will maintain availability during resource contention while lower priority workloads gracefully yield resources when needed.

## Additional Resources

- [Kubernetes Pod Priority and Preemption Documentation](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/)
- [Scheduler Configuration Reference](https://kubernetes.io/docs/reference/scheduling/config/)
- [Resource Quotas with Priority Classes](https://kubernetes.io/docs/concepts/policy/resource-quotas/#resource-quota-per-priorityclass)
