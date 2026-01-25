# How to Troubleshoot OOMKilled Errors in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, OOMKilled, Memory, Troubleshooting, Performance

Description: A comprehensive guide to diagnosing and fixing OOMKilled errors in Kubernetes, including memory profiling, limit configuration, and preventing out-of-memory container terminations.

---

OOMKilled is one of the most common reasons for pod restarts in Kubernetes. It happens when a container exceeds its memory limit, and the kernel's Out-Of-Memory (OOM) killer terminates it. This guide covers how to identify, diagnose, and fix these errors.

## Understanding OOMKilled

When a container uses more memory than its limit allows, the Linux kernel terminates it with an OOMKilled status. Unlike CPU throttling (which just slows down the container), memory overuse results in immediate termination.

```bash
# Check if a pod was OOMKilled
kubectl describe pod myapp-xyz

# Look for:
# Last State:     Terminated
#   Reason:       OOMKilled
#   Exit Code:    137

# Or check container status directly
kubectl get pod myapp-xyz -o jsonpath='{.status.containerStatuses[0].lastState}'
```

## Diagnosing OOMKilled

### Step 1: Check Pod Status

```bash
# Get pod status
kubectl get pod myapp-xyz

# Output shows restarts:
# NAME         READY   STATUS    RESTARTS   AGE
# myapp-xyz    1/1     Running   5          2h

# Describe for details
kubectl describe pod myapp-xyz | grep -A 10 "Last State"
```

### Step 2: Check Memory Usage

```bash
# Current memory usage
kubectl top pod myapp-xyz

# Output:
# NAME         CPU(cores)   MEMORY(bytes)
# myapp-xyz    50m          450Mi

# Check against limits
kubectl get pod myapp-xyz -o jsonpath='{.spec.containers[0].resources.limits.memory}'
# Output: 512Mi
```

### Step 3: Review Memory Configuration

```bash
# Get full resource configuration
kubectl get pod myapp-xyz -o yaml | grep -A 6 resources:

# Output:
# resources:
#   limits:
#     memory: 512Mi
#   requests:
#     memory: 256Mi
```

### Step 4: Check Historical Usage

```bash
# Using Prometheus
# Query: container_memory_usage_bytes{pod="myapp-xyz"}

# Using kubectl top over time (manual sampling)
watch -n 5 kubectl top pod myapp-xyz
```

## Common Causes and Solutions

### Cause 1: Memory Limit Too Low

The most common issue. Your application legitimately needs more memory than allocated.

```yaml
# Increase memory limit
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: app
      resources:
        requests:
          memory: "512Mi"    # Increased from 256Mi
        limits:
          memory: "1Gi"      # Increased from 512Mi
```

### Cause 2: Memory Leak

Application gradually consumes more memory until OOMKilled.

```bash
# Check memory growth over time
# Watch memory increase steadily until restart
kubectl top pod myapp-xyz --containers

# Check application logs for leak indicators
kubectl logs myapp-xyz | grep -i "memory\|heap\|gc"
```

Solution: Profile and fix the application code.

### Cause 3: Large Traffic Spike

Application handles more requests than anticipated.

```bash
# Check if OOMKilled correlates with traffic
# Review metrics around the time of OOMKilled

# Solutions:
# 1. Increase memory limits
# 2. Add HPA to scale out
# 3. Implement request queuing
```

### Cause 4: JVM Heap Misconfiguration

Java applications need heap size configured independently:

```yaml
containers:
  - name: java-app
    image: java-app:v1
    env:
      # Set JVM heap to 75% of container limit
      - name: JAVA_OPTS
        value: "-Xmx768m -Xms384m"
    resources:
      limits:
        memory: "1Gi"    # Container limit
```

### Cause 5: Node Memory Pressure

Node running out of memory causes pod evictions:

```bash
# Check node conditions
kubectl describe node node-1 | grep -A 5 Conditions

# Look for:
# MemoryPressure   True

# Check node allocatable memory
kubectl describe node node-1 | grep -A 5 Allocatable
```

## Profiling Memory Usage

### In-Container Profiling

```bash
# Get shell in container
kubectl exec -it myapp-xyz -- /bin/sh

# Check process memory
cat /proc/1/status | grep -i "VmRSS\|VmSize"

# Check cgroup memory usage
cat /sys/fs/cgroup/memory/memory.usage_in_bytes

# Check memory limit
cat /sys/fs/cgroup/memory/memory.limit_in_bytes
```

### Application-Level Profiling

For Python:

```python
import tracemalloc
import gc

# Start tracing
tracemalloc.start()

# Your application code here

# Get statistics
snapshot = tracemalloc.take_snapshot()
top_stats = snapshot.statistics('lineno')

print("Top 10 memory consumers:")
for stat in top_stats[:10]:
    print(stat)
```

For Node.js:

```javascript
// Add to your application
const v8 = require('v8');

setInterval(() => {
  const heapStats = v8.getHeapStatistics();
  console.log('Heap used:', heapStats.used_heap_size / 1024 / 1024, 'MB');
  console.log('Heap total:', heapStats.total_heap_size / 1024 / 1024, 'MB');
}, 30000);
```

For Java:

```bash
# Enable GC logging
JAVA_OPTS="-Xmx768m -Xlog:gc*:file=/tmp/gc.log"

# Check heap dump on OOM
JAVA_OPTS="-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp/heapdump.hprof"
```

## Prevention Strategies

### Strategy 1: Set Appropriate Limits

```yaml
# Base limits on actual usage plus headroom
resources:
  requests:
    memory: "256Mi"    # Typical usage
  limits:
    memory: "384Mi"    # Add 50% buffer
```

### Strategy 2: Use Vertical Pod Autoscaler

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: myapp-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  updatePolicy:
    updateMode: "Auto"    # Automatically adjust limits
  resourcePolicy:
    containerPolicies:
      - containerName: app
        minAllowed:
          memory: "128Mi"
        maxAllowed:
          memory: "2Gi"
```

### Strategy 3: Implement Graceful Degradation

```python
import psutil
import os

def check_memory_pressure():
    """Check if approaching memory limit"""
    process = psutil.Process(os.getpid())
    memory_info = process.memory_info()

    # Get cgroup limit
    with open('/sys/fs/cgroup/memory/memory.limit_in_bytes') as f:
        limit = int(f.read())

    usage_percent = (memory_info.rss / limit) * 100

    if usage_percent > 80:
        # Clear caches, reject new requests, etc.
        clear_caches()
        return True
    return False
```

### Strategy 4: Configure Quality of Service

```yaml
# Guaranteed QoS - least likely to be OOMKilled
resources:
  requests:
    memory: "512Mi"
  limits:
    memory: "512Mi"    # Same as request

# Burstable QoS - middle priority
resources:
  requests:
    memory: "256Mi"
  limits:
    memory: "512Mi"    # Higher than request

# BestEffort QoS - first to be OOMKilled
resources: {}           # No limits set
```

### Strategy 5: Horizontal Scaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 70
```

## Monitoring and Alerting

### Prometheus Queries

```promql
# Memory usage vs limit
container_memory_usage_bytes{pod="myapp-xyz"}
/
container_spec_memory_limit_bytes{pod="myapp-xyz"}

# OOMKilled events
kube_pod_container_status_last_terminated_reason{reason="OOMKilled"}

# Memory usage trend
rate(container_memory_usage_bytes{pod=~"myapp.*"}[5m])
```

### Alert Rules

```yaml
groups:
  - name: memory
    rules:
      - alert: ContainerMemoryHigh
        expr: |
          (container_memory_usage_bytes / container_spec_memory_limit_bytes) > 0.85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Container {{ $labels.container }} memory usage above 85%"

      - alert: PodOOMKilled
        expr: |
          kube_pod_container_status_last_terminated_reason{reason="OOMKilled"} == 1
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "Pod {{ $labels.pod }} was OOMKilled"
```

## Quick Fixes

### Immediate: Increase Limits

```bash
# Quick fix via patch
kubectl patch deployment myapp -p '{"spec":{"template":{"spec":{"containers":[{"name":"app","resources":{"limits":{"memory":"1Gi"}}}]}}}}'
```

### Temporary: Add More Replicas

```bash
# Scale up to handle load
kubectl scale deployment myapp --replicas=5
```

### Emergency: Remove Limits

```bash
# Not recommended for production, but useful for debugging
kubectl patch deployment myapp -p '{"spec":{"template":{"spec":{"containers":[{"name":"app","resources":{"limits":{}}}]}}}}'
```

## Debugging Tools

### Memory Debug Container

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: memory-debug
spec:
  containers:
    - name: debug
      image: nicolaka/netshoot
      command: ["sleep", "infinity"]
      resources:
        limits:
          memory: "128Mi"
```

```bash
# Run memory stress test
kubectl exec -it memory-debug -- stress --vm 1 --vm-bytes 100M --timeout 60s
```

### Using kubectl debug

```bash
# Debug a running pod
kubectl debug myapp-xyz -it --image=nicolaka/netshoot -- /bin/sh

# Check memory from debug container
cat /proc/1/status | grep Vm
```

## Best Practices Checklist

1. Always set memory requests and limits
2. Set limits based on profiled usage plus 25-50% buffer
3. Monitor memory usage trends over time
4. Set up alerts for memory pressure
5. Use VPA for automatic sizing recommendations
6. Configure proper JVM/runtime memory settings
7. Implement graceful degradation under memory pressure
8. Use appropriate QoS class for workload importance
9. Review OOMKilled events in postmortems
10. Test memory behavior under load before production

---

OOMKilled errors indicate your application is using more memory than allocated. The fix might be increasing limits, fixing memory leaks, or optimizing your application. Start with proper monitoring to understand actual usage patterns, then adjust limits or fix application issues accordingly. Prevention through proper sizing and monitoring is always better than reacting to production OOMKilled events.
