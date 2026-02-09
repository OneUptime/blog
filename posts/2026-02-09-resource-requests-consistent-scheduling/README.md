# How to Configure Kubernetes Resource Requests for Consistent Pod Scheduling in Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Resource Management, Pod Scheduling, Performance

Description: Configure accurate resource requests that enable consistent pod scheduling, prevent resource contention, and ensure predictable application performance in production Kubernetes clusters.

---

Resource requests tell the Kubernetes scheduler how much CPU and memory a pod needs. These values determine where pods can run and prevent overcommitment that leads to performance degradation. Inaccurate requests cause pods to land on undersized nodes or leave capacity unused, both resulting in poor resource utilization and application performance.

Setting requests too low causes resource contention when pods consume more than requested. The scheduler places too many pods on nodes, leading to CPU throttling and OOM kills. Setting requests too high wastes resources and prevents pods from scheduling even when plenty of actual capacity exists.

The goal is configuring requests that accurately reflect actual resource usage, enabling efficient scheduling while preventing contention.

## Understanding Resource Requests vs Limits

Resource requests guarantee minimum resources while limits cap maximum usage. The scheduler uses only requests when placing pods.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: api
        image: api-service:v1.0.0
        resources:
          requests:
            cpu: 500m      # Guaranteed CPU
            memory: 512Mi  # Guaranteed memory
          limits:
            cpu: 1000m     # Maximum CPU
            memory: 1Gi    # Maximum memory
```

Requests ensure the pod gets at least 500m CPU and 512Mi memory. Limits prevent the pod from using more than 1 CPU and 1Gi memory. The scheduler only considers requests when choosing nodes.

If a node has 2 CPUs available and you schedule four pods each requesting 500m CPU, the scheduler accepts them because total requests (2 CPUs) match available capacity. If those pods actually use their full 1 CPU limit, the node becomes oversubscribed with 4 CPUs needed but only 2 available, causing CPU throttling.

## Measuring Actual Resource Usage

Determine appropriate requests by measuring actual resource consumption over time.

```bash
# Check current pod resource usage
kubectl top pods -n production

# View detailed metrics for specific pod
kubectl top pod api-pod-abc123 -n production --containers

# Get historical usage from metrics server
kubectl get --raw /apis/metrics.k8s.io/v1beta1/namespaces/production/pods/api-pod-abc123
```

Use Prometheus to analyze usage patterns:

```promql
# Average CPU usage per pod
avg_over_time(container_cpu_usage_seconds_total[24h])

# Maximum memory usage per pod
max_over_time(container_memory_working_set_bytes[24h])

# 95th percentile CPU usage
histogram_quantile(0.95,
  rate(container_cpu_usage_seconds_total[24h])
)
```

Set requests based on typical usage with headroom for spikes:

```yaml
resources:
  requests:
    # Set to 95th percentile usage + 20% headroom
    cpu: 600m
    memory: 768Mi
  limits:
    # Set to peak usage + 50% headroom
    cpu: 1500m
    memory: 1536Mi
```

## Configuring Requests for Different Workload Types

Different workload patterns require different request strategies.

For steady-state services with predictable usage:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: stable-service
spec:
  template:
    spec:
      containers:
      - name: app
        resources:
          requests:
            cpu: 1000m
            memory: 1Gi
          limits:
            cpu: 1000m    # Match requests for guaranteed QoS
            memory: 1Gi
```

Matching requests and limits creates Guaranteed QoS class, providing maximum stability for critical services.

For burstable workloads with variable usage:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: burstable-worker
spec:
  template:
    spec:
      containers:
      - name: worker
        resources:
          requests:
            cpu: 500m      # Base usage
            memory: 512Mi
          limits:
            cpu: 2000m     # Allow bursts
            memory: 2Gi
```

This creates Burstable QoS, allowing the pod to use more resources when available while guaranteeing minimum resources.

For batch jobs and low-priority workloads:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: batch-job
spec:
  template:
    spec:
      containers:
      - name: job
        resources:
          requests:
            cpu: 100m      # Minimal requests
            memory: 128Mi
          limits:
            cpu: 4000m     # Can use spare capacity
            memory: 4Gi
```

Low requests allow jobs to fit in spare capacity while limits prevent runaway resource usage.

## Preventing Resource Contention

Without proper requests, multiple pods compete for resources, causing performance degradation.

Configure requests that prevent oversubscription:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-api
  namespace: production
spec:
  replicas: 5
  template:
    spec:
      priorityClassName: high-priority
      containers:
      - name: api
        resources:
          requests:
            cpu: 1000m
            memory: 1Gi
          limits:
            cpu: 1000m
            memory: 1Gi
```

Use priority classes to ensure critical pods preempt lower-priority workloads:

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000000
globalDefault: false
description: "Critical production services"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: low-priority
value: 100
globalDefault: false
description: "Best-effort batch jobs"
```

## Right-Sizing with Vertical Pod Autoscaler

VPA recommends and applies resource request adjustments based on actual usage:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-service-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-service
  updatePolicy:
    updateMode: "Auto"  # Automatically apply recommendations
  resourcePolicy:
    containerPolicies:
    - containerName: api
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 2000m
        memory: 2Gi
```

VPA monitors usage and adjusts requests automatically. Use `updateMode: "Recommender"` initially to review recommendations before enabling automatic updates.

View VPA recommendations:

```bash
kubectl describe vpa api-service-vpa

# Output shows recommended requests
Recommendation:
  Container Recommendations:
    Container Name:  api
    Lower Bound:
      Cpu:     450m
      Memory:  512Mi
    Target:
      Cpu:     600m
      Memory:  768Mi
    Upper Bound:
      Cpu:     1200m
      Memory:  1536Mi
```

## Monitoring Resource Request Accuracy

Track how well requests match actual usage:

```promql
# Pods using significantly more CPU than requested
(rate(container_cpu_usage_seconds_total[5m]) /
 container_spec_cpu_quota * 100) > 80

# Memory usage vs requests
container_memory_working_set_bytes /
container_spec_memory_request_bytes

# Pods hitting CPU limits (being throttled)
rate(container_cpu_cfs_throttled_seconds_total[5m]) > 0.1
```

Create alerts for resource issues:

```yaml
groups:
- name: resource-alerts
  rules:
  - alert: PodCPUThrottling
    expr: |
      rate(container_cpu_cfs_throttled_seconds_total[5m]) > 0.1
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "Pod {{ $labels.pod }} is being CPU throttled"

  - alert: PodMemoryPressure
    expr: |
      container_memory_working_set_bytes /
      container_spec_memory_request_bytes > 0.9
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Pod {{ $labels.pod }} using >90% of memory request"
```

## Testing Resource Configuration

Validate resource settings under load before deploying to production:

```bash
#!/bin/bash
# load-test-resources.sh

DEPLOYMENT="api-service"
NAMESPACE="staging"

# Deploy with test configuration
kubectl apply -f api-service.yaml -n $NAMESPACE

# Wait for deployment
kubectl rollout status deployment/$DEPLOYMENT -n $NAMESPACE

# Generate load
kubectl run load-generator --image=williamyeh/wrk --rm -it --restart=Never -- \
  -t 10 -c 100 -d 300s http://api-service.$NAMESPACE.svc.cluster.local

# Monitor resource usage during load test
kubectl top pods -n $NAMESPACE -l app=$DEPLOYMENT --watch
```

Accurate resource requests are fundamental to reliable Kubernetes operations. By measuring actual usage, configuring appropriate requests and limits, and continuously monitoring resource consumption, you enable consistent pod scheduling that prevents contention while efficiently utilizing cluster capacity.
