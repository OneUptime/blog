# How to Configure Dapr Sidecar CPU and Memory Requests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Sidecar, Kubernetes, Resource, Configuration

Description: Set appropriate CPU and memory requests and limits for the Dapr sidecar container to ensure stable scheduling and prevent resource starvation in production clusters.

---

Every Dapr-enabled pod runs two containers: your application and the daprd sidecar. If you do not set resource requests and limits on the sidecar, the Kubernetes scheduler may place pods on nodes without enough capacity, leading to OOM kills or CPU throttling that degrades throughput.

## Default Sidecar Resources

By default, the Dapr injector does not set resource requests or limits for the sidecar container. This means the sidecar competes with other containers for node resources without any guarantees.

## Setting Resource Requests via Annotations

The simplest way to configure sidecar resources in Kubernetes is with pod annotations:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "payment-service"
  dapr.io/sidecar-cpu-request: "100m"
  dapr.io/sidecar-memory-request: "128Mi"
  dapr.io/sidecar-cpu-limit: "500m"
  dapr.io/sidecar-memory-limit: "256Mi"
```

These annotations map directly to the Kubernetes resource spec injected into the sidecar container.

## What Gets Injected

The injector translates these annotations into a standard container resources block:

```yaml
resources:
  requests:
    cpu: "100m"
    memory: "128Mi"
  limits:
    cpu: "500m"
    memory: "256Mi"
```

## Choosing Appropriate Values

A typical daprd sidecar uses:
- CPU: 50-200m at idle, spikes to 500m+ under heavy request load
- Memory: 64-150Mi at idle, higher with many components or actors

For services with light traffic:

```yaml
dapr.io/sidecar-cpu-request: "50m"
dapr.io/sidecar-memory-request: "64Mi"
dapr.io/sidecar-cpu-limit: "250m"
dapr.io/sidecar-memory-limit: "128Mi"
```

For services with heavy traffic or many components:

```yaml
dapr.io/sidecar-cpu-request: "200m"
dapr.io/sidecar-memory-request: "256Mi"
dapr.io/sidecar-cpu-limit: "1000m"
dapr.io/sidecar-memory-limit: "512Mi"
```

## Applying Resource Annotations Consistently

Dapr does not support setting global default sidecar resources via Helm. The per-pod annotation approach described above is the only supported method. To apply consistent resource annotations across all your deployments, add them to a shared pod template or use a policy engine like Kyverno to automatically inject the annotations:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: dapr-sidecar-resources
spec:
  rules:
    - name: add-sidecar-resources
      match:
        resources:
          kinds:
            - Pod
      mutate:
        patchStrategicMerge:
          metadata:
            annotations:
              dapr.io/sidecar-cpu-request: "100m"
              dapr.io/sidecar-memory-request: "128Mi"
              dapr.io/sidecar-cpu-limit: "500m"
              dapr.io/sidecar-memory-limit: "256Mi"
```

## Monitor Actual Usage

Use kubectl top to observe real sidecar resource usage and tune your requests accordingly:

```bash
kubectl top pod my-pod --containers
```

Or query Prometheus for sidecar resource metrics:

```bash
rate(container_cpu_usage_seconds_total{container="daprd"}[5m])
```

## Summary

Setting CPU and memory requests and limits on the Dapr sidecar ensures predictable scheduling, prevents resource starvation, and enables the cluster autoscaler to make accurate scaling decisions. Start with conservative values, observe actual usage, and tune based on your workload profile.
