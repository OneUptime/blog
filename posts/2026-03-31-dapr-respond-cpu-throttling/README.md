# How to Respond to Dapr CPU Throttling Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CPU, Performance, Kubernetes, Troubleshooting

Description: Diagnose and resolve Dapr sidecar CPU throttling by identifying throttled containers, adjusting CPU limits, and profiling high-CPU operations.

---

## What is CPU Throttling in Dapr?

CPU throttling occurs when a container exceeds its configured CPU limit. The Linux kernel enforces the limit by pausing the process, causing uneven, bursty latency spikes. For Dapr sidecars, throttling increases service invocation latency and can cause health check timeouts.

## Step 1 - Detect CPU Throttling

Check the CPU throttling ratio using cgroup stats:

```bash
kubectl exec -it my-pod -c daprd -- \
  cat /sys/fs/cgroup/cpu/cpu.stat
```

Look for `throttled_time` increasing over time. A high `throttled_time` confirms throttling.

Alternatively, use Prometheus:

```text
rate(container_cpu_cfs_throttled_periods_total{container="daprd"}[5m])
  / rate(container_cpu_cfs_periods_total{container="daprd"}[5m])
```

Values above 0.25 (25% throttled) indicate a problem.

## Step 2 - Review Current CPU Limits

```bash
kubectl describe pod my-pod -n my-namespace | grep -A 10 "daprd"
# Limits:
#   cpu:     200m
# Requests:
#   cpu:     50m
```

A limit of `200m` (0.2 cores) may be too low for services under load.

## Step 3 - Increase the CPU Limit

Update the Dapr sidecar CPU limit in the deployment annotations:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "orders-api"
  dapr.io/sidecar-cpu-request: "100m"
  dapr.io/sidecar-cpu-limit: "1000m"
```

Apply with a rolling restart:

```bash
kubectl rollout restart deployment/orders-api -n my-namespace
kubectl rollout status deployment/orders-api -n my-namespace
```

## Step 4 - Profile Sidecar CPU Usage

Identify what is consuming CPU in the sidecar. Common causes:
- High request throughput causing serialization overhead
- mTLS handshakes at high connection rates
- Tracing with 100% sampling rate

Reduce trace sampling to lower CPU consumption:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: my-config
spec:
  tracing:
    samplingRate: "0.01"
```

## Step 5 - Switch to gRPC

HTTP/JSON parsing is more CPU-intensive than gRPC/protobuf. Switch app protocol for internal services:

```yaml
annotations:
  dapr.io/app-protocol: "grpc"
  dapr.io/app-port: "50051"
```

The Dapr sidecar communicates internally using gRPC regardless, but enabling gRPC for the app-to-sidecar leg eliminates HTTP overhead.

## Step 6 - Set CPU-Based HPA

Automatically scale out when CPU is high to distribute load:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: orders-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: orders-api
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Summary

Dapr CPU throttling is diagnosed via cgroup throttle stats or Prometheus metrics. Fix it by increasing the CPU limit annotation on the deployment, reducing trace sampling, switching to gRPC protocol, and using HPA to scale out under sustained load. Removing the CPU limit entirely is an option for critical services where predictable latency outweighs cost control concerns.
