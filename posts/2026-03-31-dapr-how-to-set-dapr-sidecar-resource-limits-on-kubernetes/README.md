# How to Set Dapr Sidecar Resource Limits on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Resource Limit, Sidecar, Performance

Description: Learn how to set CPU and memory resource requests and limits for the Dapr sidecar container on Kubernetes to prevent resource contention and ensure predictable performance.

---

## Why Set Sidecar Resource Limits

The Dapr sidecar (daprd) runs as a container alongside your application in each pod. Without resource limits, the sidecar can consume unbounded CPU and memory, potentially starving your application container or causing node resource pressure. Setting appropriate limits ensures predictable behavior and proper pod scheduling.

## Default Sidecar Resource Behavior

By default, Dapr sidecar injection does not set resource requests or limits. This means the sidecar runs in the `BestEffort` QoS class and can be evicted under memory pressure.

## Set Resources via Pod Annotations

The simplest way to set sidecar resources is through Dapr annotations on your pod spec:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "my-service"
        dapr.io/app-port: "3000"
        # CPU and memory requests
        dapr.io/sidecar-cpu-request: "100m"
        dapr.io/sidecar-memory-request: "64Mi"
        # CPU and memory limits
        dapr.io/sidecar-cpu-limit: "500m"
        dapr.io/sidecar-memory-limit: "256Mi"
```

## Set Global Defaults via Helm

Set default sidecar resources for all pods during Dapr installation or upgrade:

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set dapr_sidecar_injector.sidecarCPURequest="50m" \
  --set dapr_sidecar_injector.sidecarMemoryRequest="32Mi" \
  --set dapr_sidecar_injector.sidecarCPULimit="300m" \
  --set dapr_sidecar_injector.sidecarMemoryLimit="128Mi"
```

Pod-level annotations override global defaults.

## Recommended Resource Sizing by Workload Type

```text
Light workloads (simple REST services, low traffic):
  Request: 50m CPU, 32Mi memory
  Limit:   250m CPU, 128Mi memory

Standard workloads (pub/sub, state, bindings):
  Request: 100m CPU, 64Mi memory
  Limit:   500m CPU, 256Mi memory

Heavy workloads (high-throughput, actors, workflows):
  Request: 200m CPU, 128Mi memory
  Limit:   1000m CPU, 512Mi memory

Actor-heavy workloads (many concurrent actors):
  Request: 250m CPU, 256Mi memory
  Limit:   1500m CPU, 1Gi memory
```

## Practical Example - Production Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "payment-service"
        dapr.io/app-port: "8080"
        dapr.io/log-level: "warn"
        # Sidecar resource constraints for payment service
        dapr.io/sidecar-cpu-request: "100m"
        dapr.io/sidecar-memory-request: "64Mi"
        dapr.io/sidecar-cpu-limit: "500m"
        dapr.io/sidecar-memory-limit: "256Mi"
    spec:
      containers:
      - name: payment-service
        image: my-registry/payment-service:v2.1
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: "200m"
            memory: "256Mi"
          limits:
            cpu: "1000m"
            memory: "512Mi"
```

## Monitor Sidecar Resource Usage

Check actual resource usage to right-size your limits:

```bash
# View resource consumption for sidecar containers
kubectl top pods -n production --containers | grep daprd

# Get resource usage over time with metrics server
kubectl top pods -n production --sort-by=memory
```

Use Prometheus and Grafana to track trends:

```bash
# Query sidecar CPU usage (standard process metric exposed by daprd)
process_cpu_seconds_total{app_id="payment-service"}

# Query sidecar memory
container_memory_working_set_bytes{container="daprd", namespace="production"}
```

## Set LimitRange for Namespace-Wide Enforcement

Use a `LimitRange` to enforce minimums and maximums for all containers in a namespace:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: sidecar-limits
  namespace: production
spec:
  limits:
  - type: Container
    default:
      cpu: "500m"
      memory: "256Mi"
    defaultRequest:
      cpu: "100m"
      memory: "64Mi"
    max:
      cpu: "2"
      memory: "1Gi"
    min:
      cpu: "50m"
      memory: "32Mi"
```

## Handle Limit Reached Scenarios

If memory limit is reached, the sidecar OOMs and the pod is restarted. Signs of undersized limits:

```bash
# Check for OOM kills
kubectl get events -n production --field-selector reason=OOMKilled

# Check container restart counts
kubectl get pods -n production -o wide

# Inspect specific pod
kubectl describe pod payment-service-xxx | grep -A5 "OOM\|Limits\|Requests"
```

## Summary

Setting Dapr sidecar resource limits and requests on Kubernetes prevents the sidecar from consuming unbounded resources and ensures pods land in the `Burstable` or `Guaranteed` QoS class for predictable scheduling. Use pod annotations for per-service tuning, Helm values for global defaults, and Kubernetes `LimitRange` for namespace-level enforcement. Monitor actual usage before setting limits to avoid undersizing that leads to OOM kills.
