# How to Handle Pod Eviction Caused by Node Memory Pressure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Resource Management, Troubleshooting

Description: Learn how to detect, prevent, and respond to pod evictions caused by node memory pressure in Kubernetes, including proper resource configuration and monitoring strategies.

---

Node memory pressure is one of the most common causes of pod evictions in Kubernetes clusters. When a node runs low on memory, the kubelet begins evicting pods to reclaim resources and prevent system instability. Understanding how memory pressure works and how to configure your pods to handle it properly is essential for maintaining application availability and cluster health.

Memory pressure evictions can cause cascading failures if not handled correctly, making this a critical operational concern for production clusters.

## Understanding Memory Pressure

Kubernetes monitors memory availability on each node and declares memory pressure when available memory falls below certain thresholds. The kubelet uses two signals:

- `memory.available`: The amount of memory available for new allocations
- `nodefs.available`: Available disk space (can trigger eviction indirectly)

Default eviction thresholds:

```yaml
# Kubelet configuration
evictionHard:
  memory.available: "100Mi"
  nodefs.available: "10%"
evictionSoft:
  memory.available: "500Mi"
evictionSoftGracePeriod:
  memory.available: "1m30s"
```

When hard thresholds are crossed, kubelet immediately begins evicting pods. Soft thresholds allow a grace period before eviction starts.

## Detecting Memory Pressure

Check node conditions:

```bash
# View node memory pressure status
kubectl get nodes -o custom-columns=NAME:.metadata.name,MEMORY_PRESSURE:.status.conditions[?(@.type==\"MemoryPressure\")].status

# Detailed node status
kubectl describe node <node-name> | grep -A 5 "Conditions"
```

Watch for eviction events:

```bash
# See eviction events
kubectl get events --field-selector reason=Evicted --all-namespaces

# Detailed eviction information
kubectl get events --all-namespaces -o json | \
  jq '.items[] | select(.reason == "Evicted") | {pod: .involvedObject.name, namespace: .involvedObject.namespace, message: .message}'
```

Check pod status for eviction:

```bash
# Find evicted pods
kubectl get pods --all-namespaces --field-selector status.phase=Failed -o json | \
  jq -r '.items[] | select(.status.reason == "Evicted") | "\(.metadata.namespace)/\(.metadata.name)"'
```

## Configuring Resource Requests and Limits

Proper resource configuration prevents many eviction scenarios:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: well-configured-pod
spec:
  containers:
  - name: app
    image: myapp:1.0
    resources:
      # Request what you need
      requests:
        memory: "512Mi"
        cpu: "250m"
      # Set limits to prevent runaway usage
      limits:
        memory: "1Gi"
        cpu: "500m"
    livenessProbe:
      httpGet:
        path: /healthz
        port: 8080
      initialDelaySeconds: 30
      periodSeconds: 10
    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 5
```

The memory request guarantees the pod gets that much memory, while the limit prevents it from consuming more than specified.

## Setting QoS Classes

Quality of Service (QoS) classes determine eviction order during memory pressure:

1. **Guaranteed**: Requests equal limits for all resources
2. **Burstable**: Requests are set but less than limits
3. **BestEffort**: No requests or limits set

```yaml
# Guaranteed QoS - evicted last
apiVersion: v1
kind: Pod
metadata:
  name: guaranteed-pod
spec:
  containers:
  - name: critical-app
    image: critical-app:1.0
    resources:
      requests:
        memory: "1Gi"
        cpu: "500m"
      limits:
        memory: "1Gi"  # Same as request
        cpu: "500m"    # Same as request
---
# Burstable QoS - evicted before Guaranteed
apiVersion: v1
kind: Pod
metadata:
  name: burstable-pod
spec:
  containers:
  - name: normal-app
    image: normal-app:1.0
    resources:
      requests:
        memory: "512Mi"
        cpu: "250m"
      limits:
        memory: "2Gi"   # Higher than request
        cpu: "1000m"
---
# BestEffort QoS - evicted first
apiVersion: v1
kind: Pod
metadata:
  name: besteffort-pod
spec:
  containers:
  - name: batch-job
    image: batch-job:1.0
    # No resources specified
```

Critical workloads should use Guaranteed QoS to minimize eviction risk.

## Using Priority Classes

Priority classes influence eviction order:

```yaml
# High priority class
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000000
globalDefault: false
description: "High priority for production workloads"
---
# Low priority class
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: low-priority
value: 100
globalDefault: false
description: "Low priority for batch jobs"
---
# Use priority in pod
apiVersion: v1
kind: Pod
metadata:
  name: high-priority-pod
spec:
  priorityClassName: high-priority
  containers:
  - name: app
    image: production-app:1.0
    resources:
      requests:
        memory: "1Gi"
        cpu: "500m"
      limits:
        memory: "2Gi"
        cpu: "1000m"
```

Lower priority pods are evicted before higher priority ones when memory pressure occurs.

## Implementing Pod Disruption Budgets

Pod Disruption Budgets (PDBs) don't prevent evictions during memory pressure, but they help maintain application availability during voluntary disruptions:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-app-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: web-app
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 4
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      priorityClassName: high-priority
      containers:
      - name: nginx
        image: nginx:1.25
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

Note that PDBs are honored for voluntary evictions but can be violated during node pressure situations.

## Monitoring Memory Usage

Deploy monitoring to detect memory pressure early:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-rules
data:
  memory-alerts.yaml: |
    groups:
    - name: memory-pressure
      rules:
      - alert: NodeMemoryPressure
        expr: kube_node_status_condition{condition="MemoryPressure",status="true"} == 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Node {{ $labels.node }} is under memory pressure"
          description: "Node has been under memory pressure for 5 minutes"

      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Node {{ $labels.instance }} memory usage above 90%"

      - alert: PodEvicted
        expr: kube_pod_status_reason{reason="Evicted"} > 0
        labels:
          severity: critical
        annotations:
          summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} was evicted"
```

Create a monitoring dashboard:

```python
#!/usr/bin/env python3
from kubernetes import client, config
import time

config.load_kube_config()
v1 = client.CoreV1Api()

def monitor_memory_pressure():
    """Monitor nodes for memory pressure."""
    while True:
        nodes = v1.list_node()

        for node in nodes.items:
            # Check memory pressure condition
            for condition in node.status.conditions:
                if condition.type == "MemoryPressure":
                    if condition.status == "True":
                        print(f"WARNING: {node.metadata.name} under memory pressure!")
                        print(f"  Reason: {condition.reason}")
                        print(f"  Message: {condition.message}")

            # Check allocatable vs capacity
            allocatable_mem = node.status.allocatable.get('memory', '0')
            capacity_mem = node.status.capacity.get('memory', '0')

            print(f"{node.metadata.name}:")
            print(f"  Capacity: {capacity_mem}")
            print(f"  Allocatable: {allocatable_mem}")

        time.sleep(60)

if __name__ == "__main__":
    monitor_memory_pressure()
```

## Handling Evicted Pods

Automatically clean up evicted pods:

```bash
#!/bin/bash
# cleanup-evicted.sh

# Delete all evicted pods
kubectl get pods --all-namespaces --field-selector status.phase=Failed -o json | \
  jq -r '.items[] | select(.status.reason == "Evicted") | "kubectl delete pod \(.metadata.name) -n \(.metadata.namespace)"' | \
  bash

# Or use a CronJob
```

CronJob for cleanup:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup-evicted-pods
  namespace: kube-system
spec:
  schedule: "*/30 * * * *"  # Every 30 minutes
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: pod-cleaner
          containers:
          - name: cleanup
            image: bitnami/kubectl:1.28
            command:
            - /bin/bash
            - -c
            - |
              kubectl get pods --all-namespaces --field-selector status.phase=Failed -o json | \
                jq -r '.items[] | select(.status.reason == "Evicted") | "-n \(.metadata.namespace) \(.metadata.name)"' | \
                xargs -r -n 3 kubectl delete pod
          restartPolicy: OnFailure
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: pod-cleaner
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: pod-cleaner
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: pod-cleaner
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: pod-cleaner
subjects:
- kind: ServiceAccount
  name: pod-cleaner
  namespace: kube-system
```

## Preventing Memory Pressure

Right-size your nodes:

```bash
# Check node memory allocation
kubectl top nodes

# See memory requests vs limits
kubectl describe nodes | grep -A 5 "Allocated resources"
```

Use resource quotas to prevent over-commitment:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: memory-quota
  namespace: production
spec:
  hard:
    requests.memory: "100Gi"
    limits.memory: "200Gi"
    pods: "50"
```

Configure limit ranges to enforce defaults:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: memory-limits
  namespace: production
spec:
  limits:
  - max:
      memory: "4Gi"
    min:
      memory: "128Mi"
    default:
      memory: "512Mi"
    defaultRequest:
      memory: "256Mi"
    type: Container
```

## Best Practices

Always set memory requests and limits on production pods. This prevents BestEffort QoS which makes pods first targets for eviction.

Set requests based on actual usage, not arbitrary numbers. Monitor memory usage over time and adjust accordingly.

Use Guaranteed QoS for critical workloads. When requests equal limits, pods get higher eviction protection.

Implement proper health checks. Memory leaks often manifest as slowly increasing memory usage detected by monitoring.

Don't overcommit nodes. Leave headroom for system processes and temporary spikes.

Test eviction scenarios in staging. Verify your applications handle evictions gracefully and recover correctly.

Monitor memory trends:

```bash
# View pod memory usage
kubectl top pods --all-namespaces --sort-by=memory

# Historical usage (requires metrics-server)
kubectl get --raw /apis/metrics.k8s.io/v1beta1/pods | jq
```

Document recovery procedures for critical applications that experience evictions.

Understanding and handling memory pressure evictions is crucial for maintaining stable Kubernetes clusters. By properly configuring resources, implementing monitoring, and following best practices, you can minimize disruptions and ensure your applications remain available even during resource constraints.
