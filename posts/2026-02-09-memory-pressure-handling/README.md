# How to Implement Memory Pressure Handling Strategies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Memory Management, Reliability

Description: Learn effective strategies for handling memory pressure in Kubernetes to prevent OOMKills, manage evictions gracefully, and maintain cluster stability under resource constraints.

---

Memory pressure crashes applications and destabilizes clusters. Unlike CPU, which can be throttled, memory overcommitment leads to OOMKills (Out Of Memory kills) where the kernel terminates processes to free memory. A single memory leak can cascade into cluster-wide issues. Proper memory pressure handling keeps your cluster stable when memory runs tight.

Memory pressure occurs when node memory usage exceeds thresholds configured in the kubelet. The kubelet begins evicting pods to reclaim memory, starting with BestEffort pods, then Burstable pods exceeding requests, and finally Guaranteed pods. Understanding this eviction order and implementing protective strategies prevents critical workloads from being killed.

## Understanding Kubelet Eviction Thresholds

The kubelet monitors memory pressure using configurable thresholds. When thresholds are crossed, it begins evicting pods:

```yaml
# kubelet-config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
evictionHard:
  memory.available: "500Mi"
  nodefs.available: "10%"
  nodefs.inodesFree: "5%"
evictionSoft:
  memory.available: "1Gi"
  nodefs.available: "15%"
evictionSoftGracePeriod:
  memory.available: "1m30s"
  nodefs.available: "2m"
evictionMaxPodGracePeriod: 90
evictionPressureTransitionPeriod: "30s"
```

Hard eviction thresholds trigger immediate eviction when crossed. Soft eviction thresholds allow a grace period before evicting pods. This gives applications time to shut down cleanly.

The `memory.available` threshold accounts for:
- Available memory from the kernel's perspective
- Memory that can be reclaimed from caches
- Active and inactive file-backed pages

## Detecting Memory Pressure Before It Hits

Monitor memory metrics to catch pressure before evictions start:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: memory-pressure-alerts
  namespace: monitoring
spec:
  groups:
  - name: memory-pressure
    rules:
    - alert: NodeApproachingMemoryPressure
      expr: |
        (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) > 0.85
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Node {{ $labels.node }} at {{ $value | humanizePercentage }} memory usage"
        description: "Memory pressure likely if usage continues growing"

    - alert: NodeMemoryPressure
      expr: |
        kube_node_status_condition{condition="MemoryPressure",status="true"} == 1
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Node {{ $labels.node }} under memory pressure"
        description: "Kubelet is evicting pods to reclaim memory"

    - alert: ContainerMemoryNearLimit
      expr: |
        (container_memory_working_set_bytes{container!=""}
        /
        kube_pod_container_resource_limits{resource="memory"}) > 0.9
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Container {{ $labels.namespace }}/{{ $labels.pod }}/{{ $labels.container }} using {{ $value | humanizePercentage }} of memory limit"
```

These alerts give you advance warning to take action before the kubelet starts evicting pods.

## Setting Appropriate Memory Limits

Proper memory limits prevent containers from consuming unbounded memory:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  template:
    spec:
      containers:
      - name: app
        image: web-app:latest
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"  # Prevent unlimited growth
            cpu: "1000m"
```

Set limits based on:
- P95 memory usage from production metrics
- 30-50% headroom for spikes
- Application-specific memory patterns (caches, buffers, etc.)

For Java applications, set the heap size below the container limit:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: java-app
spec:
  template:
    spec:
      containers:
      - name: app
        image: java-app:latest
        env:
        - name: JAVA_OPTS
          value: "-Xmx1536m -Xms1024m"  # Leave ~512Mi for non-heap
        resources:
          requests:
            memory: "2Gi"
          limits:
            memory: "2Gi"
```

This prevents the JVM from allocating more memory than the container limit, avoiding OOMKills.

## Implementing Quality of Service Classes

QoS classes determine eviction order during memory pressure:

**Guaranteed QoS** - requests equal limits:
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: critical-pod
spec:
  containers:
  - name: app
    image: critical-app:latest
    resources:
      requests:
        memory: "4Gi"
        cpu: "2000m"
      limits:
        memory: "4Gi"
        cpu: "2000m"
```

**Burstable QoS** - requests less than limits:
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: standard-pod
spec:
  containers:
  - name: app
    image: standard-app:latest
    resources:
      requests:
        memory: "1Gi"
        cpu: "500m"
      limits:
        memory: "2Gi"
        cpu: "1000m"
```

**BestEffort QoS** - no requests or limits:
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: batch-job
spec:
  containers:
  - name: worker
    image: batch-worker:latest
    # No resource specifications
```

During memory pressure, the kubelet evicts in this order:
1. BestEffort pods first
2. Burstable pods exceeding their requests
3. Burstable pods within requests
4. Guaranteed pods (last resort)

Use Guaranteed QoS for critical workloads that must not be evicted during memory pressure.

## Using Priority Classes for Eviction Protection

Priority classes provide additional eviction protection beyond QoS:

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: critical-priority
value: 1000000
globalDefault: false
description: "Critical workloads that should never be evicted"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: standard-priority
value: 1000
globalDefault: true
description: "Standard workload priority"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: batch-priority
value: 100
globalDefault: false
description: "Low priority batch jobs"
```

Apply priority classes to pods:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  template:
    spec:
      priorityClassName: critical-priority
      containers:
      - name: payments
        image: payment-service:latest
        resources:
          requests:
            memory: "2Gi"
          limits:
            memory: "2Gi"
```

The kubelet considers priority when choosing which pods to evict. Lower priority pods are evicted before higher priority ones with the same QoS class.

## Implementing Graceful Shutdown

Configure pods to handle termination gracefully:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: stateful-app
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: app
        image: stateful-app:latest
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 5 && /app/graceful-shutdown.sh"]
```

The preStop hook runs before the container receives SIGTERM, allowing you to:
- Drain connections
- Flush caches to disk
- Complete in-flight transactions
- Notify load balancers

Monitor termination reasons to identify memory-related evictions:

```promql
# Rate of pods terminated due to eviction
rate(kube_pod_container_status_terminated_reason{reason="Evicted"}[5m])

# Pods terminated due to OOMKill
kube_pod_container_status_terminated_reason{reason="OOMKilled"}
```

## Using Memory Reservations

Reserve memory for system daemons to prevent node-level OOMs:

```yaml
# kubelet-config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
systemReserved:
  memory: "1Gi"
  cpu: "500m"
kubeReserved:
  memory: "512Mi"
  cpu: "250m"
evictionHard:
  memory.available: "500Mi"
```

This ensures the system and Kubernetes components have guaranteed memory, reducing the chance of node-level failures.

## Handling Memory Leaks

Detect memory leaks before they cause pressure:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: memory-leak-detection
spec:
  groups:
  - name: memory-leaks
    rules:
    - alert: SuspectedMemoryLeak
      expr: |
        (
          rate(container_memory_working_set_bytes{container!=""}[1h]) > 0
        ) and (
          predict_linear(container_memory_working_set_bytes{container!=""}[6h], 3600 * 24)
          >
          kube_pod_container_resource_limits{resource="memory"}
        )
      for: 30m
      labels:
        severity: warning
      annotations:
        summary: "Possible memory leak in {{ $labels.namespace }}/{{ $labels.pod }}/{{ $labels.container }}"
        description: "Memory usage growing steadily, will hit limit in <24h"
```

When leaks are detected, implement automatic restarts:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: leaky-app
spec:
  template:
    spec:
      containers:
      - name: app
        image: app-with-known-leak:latest
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          failureThreshold: 3
        # Memory-based health check
        startupProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - |
              MEMORY_USAGE=$(cat /sys/fs/cgroup/memory/memory.usage_in_bytes)
              MEMORY_LIMIT=$(cat /sys/fs/cgroup/memory/memory.limit_in_bytes)
              USAGE_PERCENT=$((MEMORY_USAGE * 100 / MEMORY_LIMIT))
              [ $USAGE_PERCENT -lt 95 ]
          periodSeconds: 60
```

## Implementing Pod Disruption Budgets

PDBs prevent too many pods from being evicted simultaneously:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-app-pdb
spec:
  minAvailable: 3
  selector:
    matchLabels:
      app: web-app
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: database-pdb
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: database
```

PDBs ensure minimum availability even during memory pressure evictions. The kubelet will respect PDBs when choosing pods to evict, though critical pressure can override them.

## Monitoring Memory Pressure Impact

Track the impact of memory pressure on your workloads:

```promql
# Eviction rate by node
rate(kube_pod_status_reason{reason="Evicted"}[5m]) by (node)

# OOMKill rate
rate(container_oom_events_total[5m]) by (namespace, pod)

# Memory pressure duration
changes(kube_node_status_condition{condition="MemoryPressure"}[1h])

# Pod restart rate (may indicate OOMKills)
rate(kube_pod_container_status_restarts_total[5m]) by (namespace, pod)
```

Create a dashboard showing memory health:

```json
{
  "title": "Memory Pressure Dashboard",
  "panels": [
    {
      "title": "Node Memory Usage",
      "targets": [{
        "expr": "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100"
      }]
    },
    {
      "title": "Pods Under Memory Pressure",
      "targets": [{
        "expr": "kube_node_status_condition{condition=\"MemoryPressure\",status=\"true\"}"
      }]
    },
    {
      "title": "OOMKills Over Time",
      "targets": [{
        "expr": "sum(rate(container_oom_events_total[5m])) by (namespace)"
      }]
    }
  ]
}
```

## Conclusion

Memory pressure handling requires a multi-layered strategy combining appropriate resource limits, QoS class selection, priority classes, eviction threshold configuration, and proactive monitoring. By implementing these strategies, you prevent memory issues from escalating into cluster-wide problems, ensure critical workloads survive pressure events, and maintain stable operations even when memory runs tight. The key is detecting pressure early and having automated responses in place before the kubelet starts aggressively evicting pods.
