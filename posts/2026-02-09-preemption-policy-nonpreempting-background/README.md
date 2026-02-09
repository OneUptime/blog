# How to Configure preemptionPolicy to NonPreemptingPriority for Background Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Scheduling, Resource Management

Description: Learn how to use preemptionPolicy with NonPreempting priority classes in Kubernetes to run background workloads that don't evict other pods but still benefit from priority-based scheduling.

---

Kubernetes priority and preemption allow high-priority pods to evict lower-priority pods when resources are scarce. However, some workloads like batch jobs, data processing, or background tasks should use spare capacity without disrupting existing pods. The `preemptionPolicy: Never` setting (also called NonPreempting priority) enables this pattern by allowing pods to wait for resources rather than evicting others.

This feature is essential for running opportunistic workloads that fill unused cluster capacity without affecting production services.

## Understanding Preemption Policy

By default, priority classes have `preemptionPolicy: PreemptLowerPriority`, meaning higher-priority pods can evict lower-priority ones. Setting `preemptionPolicy: Never` changes this behavior:

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority-non-preempting
value: 1000000
preemptionPolicy: Never
globalDefault: false
description: "High priority but won't preempt other pods"
```

Pods using this priority class will:
- Be scheduled before lower-priority pods when resources are available
- Wait in Pending state if no resources are available
- Never evict other pods to make room

## Creating Priority Classes

Set up a hierarchy of priority classes:

```yaml
# Production workloads - can preempt
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: production
value: 1000000
preemptionPolicy: PreemptLowerPriority
globalDefault: false
description: "Production services that can preempt lower priority"
---
# Background tasks - non-preempting
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: batch-high
value: 900000
preemptionPolicy: Never
globalDefault: false
description: "High priority batch jobs that don't preempt"
---
# Low priority batch - non-preempting
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: batch-low
value: 100000
preemptionPolicy: Never
globalDefault: false
description: "Low priority batch jobs"
---
# Best effort - can be preempted by anything
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: best-effort
value: 0
preemptionPolicy: PreemptLowerPriority
globalDefault: true
description: "Default priority for pods"
```

## Using NonPreempting for Batch Jobs

Configure batch jobs to use spare capacity:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-processing
spec:
  parallelism: 10
  completions: 100
  template:
    metadata:
      labels:
        app: data-processing
    spec:
      priorityClassName: batch-high
      restartPolicy: OnFailure
      containers:
      - name: processor
        image: data-processor:1.0
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        env:
        - name: BATCH_SIZE
          value: "1000"
```

These job pods will use available resources but won't disrupt running production pods.

## CronJob with NonPreempting Priority

Schedule regular background tasks:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-analytics
spec:
  schedule: "0 2 * * *"  # Run at 2 AM
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        metadata:
          labels:
            type: analytics
        spec:
          priorityClassName: batch-low
          restartPolicy: OnFailure
          containers:
          - name: analytics
            image: analytics-engine:1.0
            resources:
              requests:
                memory: "4Gi"
                cpu: "2000m"
              limits:
                memory: "8Gi"
                cpu: "4000m"
            command:
            - /bin/bash
            - -c
            - |
              # Long-running analytics that uses spare capacity
              echo "Starting analytics job..."
              python /app/analyze.py --full-dataset
              echo "Analytics complete"
```

This job runs during off-peak hours and uses available capacity without affecting daytime workloads.

## Machine Learning Training Workloads

ML training benefits from NonPreempting priority:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ml-training
spec:
  priorityClassName: batch-high
  containers:
  - name: trainer
    image: pytorch:2.0
    resources:
      requests:
        nvidia.com/gpu: 2
        memory: "16Gi"
        cpu: "4000m"
      limits:
        nvidia.com/gpu: 2
        memory: "32Gi"
        cpu: "8000m"
    command:
    - python
    - train.py
    - --epochs=100
    - --checkpoint-interval=10
    volumeMounts:
    - name: dataset
      mountPath: /data
    - name: checkpoints
      mountPath: /checkpoints
  volumes:
  - name: dataset
    persistentVolumeClaim:
      claimName: ml-dataset
  - name: checkpoints
    persistentVolumeClaim:
      claimName: ml-checkpoints
```

The training job will wait for GPU resources rather than evicting other pods.

## Combining with Cluster Autoscaling

NonPreempting pods work well with cluster autoscaler:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scalable-batch-workers
spec:
  replicas: 20
  selector:
    matchLabels:
      app: batch-worker
  template:
    metadata:
      labels:
        app: batch-worker
      annotations:
        cluster-autoscaler.kubernetes.io/safe-to-evict: "true"
    spec:
      priorityClassName: batch-low
      containers:
      - name: worker
        image: worker:1.0
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
```

These pods will:
1. Use existing node capacity if available
2. Trigger node scale-up if resources aren't available
3. Be evicted during scale-down to consolidate workloads

## Monitoring NonPreempting Workloads

Track pending pods and resource utilization:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: preemption-alerts
data:
  alerts.yaml: |
    groups:
    - name: preemption-monitoring
      rules:
      - alert: NonPreemptingPodsPending
        expr: kube_pod_status_phase{phase="Pending", priority_class="batch-high"} > 10
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "{{ $value }} non-preempting pods pending >30min"
          description: "Batch workloads waiting for resources"

      - alert: ClusterCapacityLow
        expr: sum(kube_node_status_allocatable{resource="cpu"}) -
              sum(kube_pod_container_resource_requests{resource="cpu"}) < 10
        labels:
          severity: warning
        annotations:
          summary: "Less than 10 CPU cores available for batch workloads"
```

Create a monitoring dashboard:

```python
#!/usr/bin/env python3
from kubernetes import client, config
import time

config.load_kube_config()
v1 = client.CoreV1Api()

def monitor_priority_classes():
    """Monitor pod distribution across priority classes."""
    while True:
        pods = v1.list_pod_for_all_namespaces()

        priority_stats = {}
        for pod in pods.items:
            pc = pod.spec.priority_class_name or "default"
            phase = pod.status.phase

            if pc not in priority_stats:
                priority_stats[pc] = {"Pending": 0, "Running": 0, "Succeeded": 0, "Failed": 0}

            if phase in priority_stats[pc]:
                priority_stats[pc][phase] += 1

        print("\n=== Priority Class Distribution ===")
        for pc, stats in sorted(priority_stats.items()):
            print(f"{pc}:")
            print(f"  Pending: {stats['Pending']}")
            print(f"  Running: {stats['Running']}")
            print(f"  Succeeded: {stats['Succeeded']}")
            print(f"  Failed: {stats['Failed']}")

        time.sleep(60)

if __name__ == "__main__":
    monitor_priority_classes()
```

## Handling Pending NonPreempting Pods

When NonPreempting pods remain pending, you have several options:

```bash
# Check why pods are pending
kubectl describe pod <pod-name> | grep -A 10 Events

# View pending pods by priority
kubectl get pods --all-namespaces --field-selector status.phase=Pending \
  -o custom-columns=NAME:.metadata.name,NAMESPACE:.metadata.namespace,PRIORITY:.spec.priorityClassName

# Manually scale down lower priority workloads if needed
kubectl scale deployment batch-workers --replicas=10

# Or trigger cluster autoscaling
kubectl get nodes
```

## Best Practices

Use NonPreempting priority for truly background workloads. Don't use it for time-sensitive jobs.

Set appropriate resource requests. NonPreempting pods still consume resources and affect scheduling.

Combine with pod disruption budgets for production workloads:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: production-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      priority: production
```

Monitor pending pod metrics. Adjust cluster size or reduce batch workload if they're pending too long.

Use different priority values within NonPreempting classes. Higher value NonPreempting pods are scheduled before lower value ones.

Document your priority class hierarchy. Make it clear which workloads should use which priority.

Test preemption scenarios in staging:

```bash
# Create production pod
kubectl run prod-app --image=nginx --overrides='{"spec":{"priorityClassName":"production"}}'

# Create batch pod that should wait
kubectl run batch-job --image=busybox --overrides='{"spec":{"priorityClassName":"batch-high"}}' -- sleep 3600

# Verify batch pod doesn't evict production pod
kubectl get pods -w
```

Consider using separate node pools for batch workloads if your cluster is large enough.

Implement automatic cleanup of completed batch jobs:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: batch-job
spec:
  ttlSecondsAfterFinished: 3600  # Clean up 1 hour after completion
  template:
    spec:
      priorityClassName: batch-low
      containers:
      - name: worker
        image: worker:1.0
```

The NonPreempting preemption policy enables efficient use of cluster resources by allowing background workloads to run opportunistically without disrupting production services, making your cluster more cost-effective while maintaining service quality for critical applications.
