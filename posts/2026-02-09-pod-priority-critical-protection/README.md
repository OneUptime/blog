# How to Configure Pod Priority for Critical Workload Protection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Pod Priority, Preemption, Resource Management, High Availability

Description: Implement pod priority classes to protect critical workloads from eviction and ensure essential services maintain resources during cluster pressure.

---

Pod priority determines which pods get scheduled first and influences which pods can be preempted or evicted during resource pressure. Without priorities, Kubernetes treats pods at the same priority level equally, potentially evicting critical services during node pressure. Priority classes solve this by establishing a hierarchy of importance.

## Creating Priority Classes

Define priority classes with integer values. Higher numbers indicate higher priority:

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: critical-priority
value: 1000000
globalDefault: false
preemptionPolicy: PreemptLowerPriority
description: "Critical production services that should be protected from lower-priority workloads"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 10000
globalDefault: false
preemptionPolicy: PreemptLowerPriority
description: "Important production services"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: normal-priority
value: 1000
globalDefault: true
preemptionPolicy: PreemptLowerPriority
description: "Standard workloads"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: low-priority
value: 100
globalDefault: false
preemptionPolicy: PreemptLowerPriority
description: "Batch jobs and non-critical workloads"
```

Setting globalDefault: true on normal-priority means pods without explicit priority get this level by default.

The preemptionPolicy determines whether pods of this priority can preempt lower-priority pods. Set to Never for priorities that should not trigger preemption.

## Assigning Priorities to Workloads

Apply priority classes to pod specifications:

```yaml
# Critical database

apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: production
spec:
  selector:
    matchLabels:
      app: postgres
  serviceName: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      priorityClassName: critical-priority
      containers:
      - name: postgres
        image: postgres:14
        resources:
          requests:
            memory: "4Gi"
            cpu: "2000m"
---
# Important API service
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      priorityClassName: high-priority
      containers:
      - name: gateway
        image: api-gateway:v1
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
---
# Batch processing job
apiVersion: batch/v1
kind: Job
metadata:
  name: data-export
  namespace: production
spec:
  template:
    spec:
      priorityClassName: low-priority
      restartPolicy: OnFailure
      containers:
      - name: exporter
        image: data-exporter:v1
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
```

Critical services like databases get the highest priority. Standard services use high priority. Batch jobs use low priority.

## Understanding Preemption Behavior

When a high-priority pod cannot schedule due to insufficient resources, Kubernetes checks if evicting lower-priority pods would free enough space. If yes, it preempts (evicts) lower-priority pods to make room.

Preemption considers:
- Pod priority values
- Pod disruption budgets
- Inter-pod affinities

The scheduler selects victims to minimize disruption while satisfying the pending pod's requirements. Preempted pods receive their graceful termination period before they are killed, so there can be a delay before the pending pod starts.

Example scenario:
- Node has 4 CPU cores, all allocated
- Low-priority job uses 2 cores
- High-priority API pod requesting 2 cores arrives
- Scheduler preempts the job
- API pod schedules after the preempted job exits

Without priorities, the API pod would wait until resources became available naturally.

## Combining with Quality of Service

Pod priority and QoS classes work together. During eviction from resource pressure:

1. Pods using more than their requests are eviction candidates first
2. Among those candidates, lower-priority pods are evicted before higher-priority pods
3. If priorities are equal, pods using the most resources relative to their requests are evicted first
4. QoS class helps estimate eviction likelihood: BestEffort pods have no requests, Burstable pods may exceed requests, and Guaranteed pods are least likely to be candidates unless they exceed limits or no lower-priority candidates remain

Protect critical services with both Guaranteed QoS and high priority:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
    spec:
      priorityClassName: critical-priority
      containers:
      - name: payment
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "2Gi"  # Equals requests = Guaranteed QoS
            cpu: "1000m"
```

This service is protected from scheduler preemption by lower-priority workloads and is less likely to be selected during kubelet eviction pressure.

## System-Critical Priority Classes

Kubernetes reserves priority values above 1 billion for system components. User-created priority classes can use values up to 1 billion:

```yaml
# This will fail - user-created PriorityClass values must be <= 1000000000
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: invalid-priority
value: 2000000000
```

System components like kube-proxy and CoreDNS use these ultra-high priorities to ensure cluster functionality.

View system priority classes:

```bash
kubectl get priorityclass
```

You will see system-cluster-critical and system-node-critical with very high values.

## Pod Disruption Budgets with Priorities

Combine priorities with PDBs for comprehensive protection:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-pdb
  namespace: production
spec:
  minAvailable: 3
  selector:
    matchLabels:
      app: api-gateway
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      priorityClassName: high-priority
      containers:
      - name: gateway
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
```

The PDB ensures at least 3 replicas stay running during voluntary disruptions. The priority protects against involuntary evictions. Together they provide multi-layered availability.

## Priority for StatefulSets

StatefulSets benefit greatly from priorities due to their stateful nature:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: kafka
spec:
  replicas: 3
  selector:
    matchLabels:
      app: kafka
  serviceName: kafka
  template:
    metadata:
      labels:
        app: kafka
    spec:
      priorityClassName: critical-priority
      containers:
      - name: kafka
        resources:
          requests:
            memory: "8Gi"
            cpu: "4000m"
          limits:
            memory: "8Gi"
            cpu: "4000m"
```

Kafka brokers should not be displaced for lower-priority workloads. High priority prevents scheduler preemption by lower-priority pods and reduces eviction risk during node pressure.

## Monitoring Priority-Based Preemption

Track preemption events:

```bash
kubectl get events --field-selector reason=Preempted -A
```

High preemption rates indicate either:
- Insufficient cluster capacity
- Too many high-priority workloads
- Priority class misuse

Monitor preemption metrics:

```promql
# Pods marked for scheduler preemption
kube_pod_status_reason{reason="PreemptionByScheduler"} == 1

# Pods by priority class
count by (priority_class) (kube_pod_info)
```

Alert on unexpected preemptions of important services:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: priority-alerts
spec:
  groups:
  - name: priority
    rules:
    - alert: HighPriorityPodPreempted
      expr: |
        max_over_time(kube_pod_status_reason{
          reason="PreemptionByScheduler"
        }[5m])
        * on(namespace, pod, uid) group_left(priority_class)
        kube_pod_info{priority_class=~"critical-priority|high-priority"}
        > 0
      annotations:
        summary: "High priority pod was preempted"
```

High-priority pods being preempted signals serious capacity issues.

## Priority Inheritance

Priorities do not inherit. Each pod must specify its priority class explicitly:

```yaml
# Parent Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      priorityClassName: high-priority
      initContainers:
      - name: init
        image: busybox
      containers:
      - name: app
        image: web-app:v1
```

Both init containers and regular containers run as part of the same prioritized pod. But if this deployment creates jobs, those jobs need their own priority class assignments.

## Namespace-Level Priority Policies

Enforce priority classes at the namespace level with admission controllers:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-priority-class
spec:
  rules:
  - name: check-priority-production
    match:
      any:
      - resources:
          kinds:
          - Pod
          namespaces:
          - production
    validate:
      failureAction: Enforce
      message: "Production pods must have high or critical priority"
      pattern:
        spec:
          priorityClassName: "high-priority | critical-priority"
  - name: check-priority-development
    match:
      any:
      - resources:
          kinds:
          - Pod
          namespaces:
          - development
    validate:
      failureAction: Enforce
      message: "Development pods must have normal or low priority"
      pattern:
        spec:
          priorityClassName: "normal-priority | low-priority"
```

This prevents developers from assigning critical priority to development workloads.

## Cost Implications

Higher priority does not reserve capacity by itself. Priority protection usually comes from pairing high priority with accurate resource requests and enough cluster headroom. This can reduce cluster efficiency but improves reliability.

Calculate the cost of priority protection:

```text
Without priorities:
- 100% cluster utilization possible
- Higher risk of service disruption

With priorities:
- 80% effective utilization (20% reserved for critical services)
- Lower risk of service disruption

Cost: 25% more infrastructure for 20% less utilization
Benefit: Reserved headroom and preemption protection for critical services
```

The tradeoff is often worthwhile for production systems where availability exceeds cost concerns.

## Testing Priority Behavior

Simulate resource pressure to verify priorities work correctly:

```bash
# Create resource-hungry low-priority pods
kubectl apply -f - <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: stress-test
spec:
  replicas: 10
  selector:
    matchLabels:
      app: stress-test
  template:
    metadata:
      labels:
        app: stress-test
    spec:
      priorityClassName: low-priority
      containers:
      - name: stress
        image: polinux/stress
        args: ["stress", "--cpu", "2"]
        resources:
          requests:
            cpu: "2"
EOF

# Try scheduling a high-priority pod
kubectl run important-app --image=nginx \
  --overrides='{"spec":{"priorityClassName":"high-priority","containers":[{"name":"important-app","image":"nginx","resources":{"requests":{"cpu":"2"}}}]}}'

# Verify preemption occurred
kubectl get events --field-selector reason=Preempted
```

The high-priority pod should preempt one or more stress-test pods.

## Common Pitfalls

Overusing high priorities defeats their purpose. If everything is critical, nothing is critical. Limit critical-priority to truly essential services - typically less than 10% of workloads.

Not setting a global default priority class means pods without explicit priorities get priority 0. These pods cannot preempt equal-priority pods, but they can preempt pods with negative priority and can be preempted by higher-priority pods.

Ignoring resource requests while setting priorities provides incomplete protection. Priorities help with scheduling and preemption, but without proper requests, pods still face OOM kills.

Pod priorities are essential for reliable multi-tenant clusters and mixed workload environments. They ensure critical services maintain resources during cluster pressure while allowing efficient utilization of available capacity for less important workloads.
