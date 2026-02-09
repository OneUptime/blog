# How to Fix Kubernetes Node CPU Throttling from Incorrect Resource Limits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Performance, Resource Management

Description: Learn how to diagnose and fix CPU throttling issues in Kubernetes caused by incorrect resource limits, with practical examples and optimization strategies.

---

CPU throttling is one of the most insidious performance problems in Kubernetes. Your application runs slowly, requests time out, and latency spikes occur randomly, but CPU usage appears normal. The culprit is often incorrectly configured CPU limits that cause the Linux kernel to throttle your containers aggressively.

## Understanding CPU Throttling

Kubernetes uses cgroups to enforce CPU limits. When a container reaches its CPU limit, the kernel throttles it by preventing it from using more CPU time until the next scheduling period. This happens even when the node has plenty of available CPU capacity.

CPU requests reserve capacity for your pod, but CPU limits cap maximum usage. A pod with a 100m CPU request and 200m CPU limit will be throttled if it tries to use more than 200 millicores, regardless of node availability.

## How Throttling Manifests

Applications experiencing CPU throttling show characteristic symptoms. Response times increase dramatically during load spikes. Background jobs take much longer than expected. Startup times become unpredictable as initialization code gets throttled.

The confusing part is that when you check CPU usage metrics, the container appears to be using less than its limit. This happens because throttling prevents the container from using more CPU, so metrics show the throttled usage, not the demand.

## Checking for Throttling

Container runtime metrics expose throttling statistics. These metrics tell you how often and for how long containers were throttled.

```bash
# Check throttling metrics for a pod using kubectl top
kubectl top pod my-app-pod -n production --containers

# Get detailed metrics from the node
kubectl get --raw "/api/v1/nodes/worker-node-1/proxy/metrics/cadvisor" | \
  grep container_cpu_cfs_throttled_periods_total

# Check cgroup throttling stats directly
kubectl exec my-app-pod -n production -- cat /sys/fs/cgroup/cpu/cpu.stat
```

Look for `nr_throttled` and `throttled_time` values. If these numbers are high, your container is being throttled frequently.

## Prometheus Metrics for Throttling

Monitor throttling using Prometheus metrics. The `container_cpu_cfs_throttled_periods_total` metric counts throttling events.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-rules
  namespace: monitoring
data:
  throttling-rules.yml: |
    groups:
    - name: cpu_throttling
      interval: 30s
      rules:
      - record: container_cpu_throttle_rate
        expr: |
          rate(container_cpu_cfs_throttled_periods_total[5m])
          / rate(container_cpu_cfs_periods_total[5m])

      - alert: HighCPUThrottling
        expr: container_cpu_throttle_rate > 0.25
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Container {{ $labels.container }} throttled 25% of time"
          description: "Pod {{ $labels.pod }} in namespace {{ $labels.namespace }} experiencing significant CPU throttling"

      - alert: ExtremeCPUThrottling
        expr: container_cpu_throttle_rate > 0.75
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Container {{ $labels.container }} throttled 75% of time"
          description: "Pod {{ $labels.pod }} experiencing extreme CPU throttling - increase limits immediately"
```

These alerts help you identify throttling issues before they severely impact performance.

## Example: Overly Conservative Limits

A common mistake is setting CPU limits too close to average usage without accounting for spikes.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: api-server:2.0
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "300m"  # Only 20% headroom above request
```

This configuration throttles the API server during traffic spikes. The container needs more than 300m CPU during peak load, but the limit prevents it from bursting.

Fix this by increasing the limit or removing it entirely.

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "1Gi"
    # No CPU limit - allow bursting to available capacity
```

Removing CPU limits lets containers burst to use available CPU on the node. Memory limits should still be set because OOM kills are worse than throttling.

## The Case Against CPU Limits

Many Kubernetes experts recommend not setting CPU limits at all. CPU is a compressible resource, meaning throttling doesn't crash your application, it just slows it down. The kernel's CPU scheduler can share CPU fairly among containers without hard limits.

Memory is different because it's incompressible. Running out of memory causes the OOM killer to terminate processes. Always set memory limits, but consider omitting CPU limits.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worker
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: worker
  template:
    metadata:
      labels:
        app: worker
    spec:
      containers:
      - name: worker
        image: background-worker:1.5
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"  # Reserve minimum capacity
          limits:
            memory: "512Mi"
            # No CPU limit
```

This configuration ensures the worker gets at least 100m CPU but can use more when available.

## QoS Classes and Throttling

Kubernetes assigns QoS (Quality of Service) classes based on resource configuration. These classes affect scheduling and eviction behavior.

Guaranteed QoS requires requests equal to limits for all resources. BestEffort has no requests or limits. Burstable falls in between.

```yaml
# Guaranteed QoS - most strict
resources:
  requests:
    memory: "1Gi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "500m"

# Burstable QoS - allows CPU bursting
resources:
  requests:
    memory: "1Gi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    # No CPU limit = Burstable
```

Burstable pods with no CPU limit get throttled less aggressively while still receiving their requested CPU allocation.

## Node-Level CPU Pressure

Sometimes throttling occurs at the node level due to overcommitment. If many pods try to burst simultaneously, they compete for CPU and all get throttled.

```bash
# Check node CPU usage
kubectl top nodes

# See CPU allocation vs capacity
kubectl describe node worker-node-1 | grep -A 5 "Allocated resources"

# View pods on a specific node
kubectl get pods -A -o wide --field-selector spec.nodeName=worker-node-1

# Calculate total CPU requests on node
kubectl get pods -A -o wide --field-selector spec.nodeName=worker-node-1 -o json | \
  jq '.items[].spec.containers[].resources.requests.cpu' | \
  sed 's/"//g' | awk '{sum+=$1} END {print sum}'
```

If CPU requests exceed node capacity, the scheduler won't place new pods. If actual usage exceeds capacity, all pods compete and may experience throttling.

## Setting Appropriate Limits

If you must set CPU limits, base them on actual usage patterns plus a safety margin. Profile your application under load to understand real CPU requirements.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: batch-processor
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: processor
  template:
    metadata:
      labels:
        app: processor
    spec:
      containers:
      - name: processor
        image: data-processor:3.0
        resources:
          requests:
            memory: "2Gi"
            cpu: "500m"  # Minimum for steady-state operation
          limits:
            memory: "4Gi"
            cpu: "2000m"  # 4x request for peak load bursts
```

A 4x ratio between limit and request provides headroom for bursts while preventing runaway processes.

## CPU Manager Policy

Kubernetes nodes can use the CPU manager to allocate exclusive CPU cores to Guaranteed pods. This prevents throttling by dedicating cores.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: latency-sensitive-app
  namespace: production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: latency-sensitive
  template:
    metadata:
      labels:
        app: latency-sensitive
    spec:
      containers:
      - name: app
        image: latency-sensitive:1.0
        resources:
          requests:
            memory: "4Gi"
            cpu: "2000m"  # Must be whole number for CPU pinning
          limits:
            memory: "4Gi"
            cpu: "2000m"  # Guaranteed QoS
```

Enable CPU manager policy on nodes by setting `--cpu-manager-policy=static` on the kubelet. Pods with whole-number CPU requests and limits get exclusive cores.

## Analyzing Throttling Impact

Measure the performance impact of throttling by comparing metrics before and after adjusting limits.

```bash
# Get throttling metrics for analysis
kubectl get --raw "/api/v1/nodes/worker-node-1/proxy/metrics/cadvisor" | \
  grep -E "container_cpu_cfs_(throttled_seconds_total|periods_total)" | \
  grep "pod=\"my-app-pod\"" | \
  grep "container=\"api\""

# Calculate throttle percentage
# throttled_seconds / total_seconds * 100
```

Create a Grafana dashboard showing throttling percentage alongside latency metrics. Strong correlation confirms throttling as the root cause.

## HPA and CPU Throttling

Horizontal Pod Autoscaler (HPA) scales based on CPU utilization. Throttling can confuse HPA because throttled containers show lower CPU usage than actual demand.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70  # Target 70% of requests, not limits
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
```

HPA calculates utilization against requests, not limits. If pods are throttled, they might not scale because measured CPU usage stays below the target.

## Vertical Pod Autoscaler

VPA can automatically adjust resource requests and limits based on actual usage patterns.

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  updatePolicy:
    updateMode: "Auto"  # Automatically update pods
  resourcePolicy:
    containerPolicies:
    - containerName: api
      minAllowed:
        cpu: "100m"
        memory: "256Mi"
      maxAllowed:
        cpu: "4000m"
        memory: "8Gi"
      controlledResources: ["cpu", "memory"]
      # Don't set CPU limits
      controlledValues: RequestsOnly
```

VPA monitors actual usage and adjusts requests accordingly. Setting `controlledValues: RequestsOnly` prevents it from setting CPU limits.

## Best Practices

Monitor CPU throttling metrics continuously. Set alerts for throttle rates above 10-25%. Investigate any sustained throttling.

Base CPU requests on minimum required capacity. Don't set CPU limits unless you have a specific reason. Let containers burst to available capacity.

Use memory limits to prevent OOM situations. Memory limits are critical, but CPU limits often cause more problems than they solve.

Test under realistic load before deploying to production. Synthetic benchmarks often miss real-world usage patterns that trigger throttling.

Document your resource allocation decisions. Future maintainers need to understand why specific values were chosen.

## Conclusion

CPU throttling from incorrect resource limits is a common performance problem in Kubernetes. Understanding how cgroups enforce limits and how throttling impacts application behavior helps you make informed decisions about resource configuration. Monitor throttling metrics, consider removing CPU limits entirely, and base requests on actual usage patterns. With proper resource configuration, your applications will perform consistently without unnecessary throttling.
