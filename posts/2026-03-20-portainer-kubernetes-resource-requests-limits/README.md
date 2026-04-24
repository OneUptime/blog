# How to Set Resource Requests and Limits for Kubernetes Apps in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Resource, Performance, DevOps

Description: Learn how to configure CPU and memory resource requests and limits for Kubernetes applications in Portainer for efficient cluster utilization.

## Introduction

Setting appropriate resource requests and limits for Kubernetes applications is crucial for cluster stability and efficient resource utilization. Without limits, a single application can starve other workloads. Without requests, the scheduler cannot make good placement decisions. Portainer makes it easy to configure these values through its application form. This guide covers resource configuration in depth.

## Prerequisites

- Portainer with Kubernetes environment
- Understanding of CPU and memory units in Kubernetes

Resource Units

### CPU Units

```text
1 CPU = 1000m (millicores)

Examples:
  0.5 = 500m (half a CPU core)
  1   = 1000m (one full CPU core)
  0.1 = 100m (1/10 of a CPU core)
```

### Memory Units

```text
Ki = Kibibytes (1024 bytes)
Mi = Mebibytes (1024 Ki)
Gi = Gibibytes (1024 Mi)

Examples:
  128Mi = 128 Mebibytes
  512Mi = 512 Mebibytes
  1Gi   = 1 Gibibyte
  4Gi   = 4 Gibibytes
```

## Step 1: Configure Resources via Portainer Form

When creating/editing an application in Portainer:

1. Scroll to the **Resource reservations** section
2. Set values:

```text
Resource requests:
  Memory: 256Mi     (guaranteed minimum)
  CPU:    200m      (guaranteed minimum)

Resource limits:
  Memory: 512Mi     (maximum allowed)
  CPU:    500m      (maximum allowed)
```

## Step 2: Configure via YAML

In a Pod spec, set resources on each container:

```yaml
spec:
  containers:
    - name: web-app
      image: nginx:alpine
      resources:
        requests:
          memory: "256Mi"    # Scheduler uses this for placement
          cpu: "200m"        # Scheduler uses this for placement
        limits:
          memory: "512Mi"    # OOM-killed if exceeded
          cpu: "500m"        # Throttled if exceeded (not killed)
```

## Step 3: Right-Sizing Resources

Use actual metrics to determine appropriate values:

```bash
# View current resource usage

kubectl top pod --namespace=production

# Output:
# NAME                    CPU(cores)   MEMORY(bytes)
# web-app-xxx             45m          180Mi
# api-xxx                 250m         320Mi
# postgres-xxx            120m         850Mi

# Starting point:
# Request: close to typical steady-state usage
# Limit:   above observed peaks if the workload needs burst headroom
```

For `web-app` (using 45m CPU, 180Mi memory):
```text
requests.cpu:    100m    (2x average, but leave room)
requests.memory: 192Mi   (~average)
limits.cpu:      300m    (for burst handling)
limits.memory:   384Mi   (~2x average)
```

## Step 4: Understanding OOM Kills vs CPU Throttling

### Memory (OOM Kill)

When a container uses more memory than its limit, the kernel can terminate it with an **OOM kill**:

```text
Container memory usage > limits.memory → Container may be OOM-killed (often exit code 137)
```

Memory limits are enforced reactively, so the kill happens when the kernel detects memory pressure, not necessarily the instant the limit is crossed.

Watch for OOM kills:

```bash
kubectl describe pod <pod-name> -n production
kubectl get pod <pod-name> -n production -o yaml
```

### CPU (Throttling)

When a container exceeds its CPU limit, it is **throttled** (slowed down), NOT killed:

```text
Container CPU usage > limits.cpu → Container CPU throttled (runs slower)
```

Check CPU throttling:

```bash
# View current CPU usage (usage, not direct throttling data)
kubectl top pod <pod-name> --containers -n production
```

Direct throttling data typically comes from your monitoring stack rather than `kubectl top`. CPU throttling can cause latency issues but won't crash your application.

## Step 5: Common Resource Profiles

### Lightweight Utility

```yaml
resources:
  requests:
    cpu: 50m
    memory: 64Mi
  limits:
    cpu: 100m
    memory: 128Mi
```

### Standard Web Service

```yaml
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 256Mi
```

### API Service

```yaml
resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: 1000m
    memory: 512Mi
```

### CPU-Intensive Worker

```yaml
resources:
  requests:
    cpu: 1000m
    memory: 512Mi
  limits:
    cpu: 4000m
    memory: 2Gi
```

### Memory-Intensive (Database, Cache)

```yaml
resources:
  requests:
    cpu: 500m
    memory: 2Gi
  limits:
    cpu: 2000m
    memory: 4Gi
```

## Step 6: Quality of Service (QoS) Classes

Kubernetes assigns QoS classes based on resource settings:

| Class | Condition | Eviction Priority |
|-------|-----------|------------------|
| **Guaranteed** | Every container has CPU and memory requests and limits set, and each request equals its limit | Last to be evicted |
| **Burstable** | Pod is not Guaranteed, but at least one container has a CPU or memory request or limit | Middle priority |
| **BestEffort** | No CPU or memory requests or limits set | First to be evicted |

```yaml
# Guaranteed QoS (set requests == limits)
resources:
  requests:
    cpu: "500m"
    memory: "512Mi"
  limits:
    cpu: "500m"    # Same as request
    memory: "512Mi"  # Same as request
```

For critical applications, use Guaranteed QoS.

## Step 7: Configure Namespace LimitRange for Defaults

If developers often forget to set resources, configure a LimitRange:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: production
spec:
  limits:
    - type: Container
      default:           # Applied if limits are not set
        cpu: 500m
        memory: 256Mi
      defaultRequest:    # Applied if requests are not set
        cpu: 100m
        memory: 128Mi
```

## Step 8: Monitor and Tune Resources

```bash
# Install metrics-server if not present
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Monitor in real-time
kubectl top pod -n production
kubectl top node

# Historical usage (requires Prometheus)
# Use Portainer's Grafana integration or deploy your own monitoring
```

## Conclusion

Proper resource requests and limits are fundamental to running Kubernetes workloads reliably. Set requests based on typical usage for accurate scheduling, and set limits based on peak usage to prevent resource hogging. Monitor actual usage regularly and adjust values as your application's resource needs change. Portainer's form interface makes it easy to set and update these values without editing YAML directly.
