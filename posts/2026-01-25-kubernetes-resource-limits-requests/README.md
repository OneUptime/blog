# How to Configure Resource Limits and Requests for Kubernetes Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Resource Management, DevOps, Performance, Troubleshooting

Description: Learn how to properly configure CPU and memory resource limits and requests in Kubernetes to ensure optimal pod scheduling, prevent resource starvation, and maintain cluster stability.

---

Resource limits and requests are fundamental to running stable Kubernetes workloads. Without them, a single misbehaving pod can consume all available resources on a node and crash your entire application stack.

## Understanding Requests vs Limits

Kubernetes uses two settings for each resource type:

- **Requests**: The minimum amount of resources guaranteed to the container. The scheduler uses this to place pods on nodes.
- **Limits**: The maximum amount of resources a container can use. The kubelet enforces this ceiling.

```yaml
# Basic resource configuration
apiVersion: v1
kind: Pod
metadata:
  name: web-app
spec:
  containers:
    - name: app
      image: nginx:1.24
      resources:
        requests:
          memory: "256Mi"   # Guaranteed memory
          cpu: "250m"       # Guaranteed CPU (0.25 cores)
        limits:
          memory: "512Mi"   # Maximum memory
          cpu: "500m"       # Maximum CPU (0.5 cores)
```

## CPU Resources

CPU is measured in millicores (m). One core equals 1000m.

```yaml
resources:
  requests:
    cpu: "100m"    # 0.1 CPU core
  limits:
    cpu: "1000m"   # 1 full CPU core
```

### CPU Behavior

When a container exceeds its CPU limit, Kubernetes throttles it. The container keeps running but performs slower. This is different from memory limits.

```bash
# Check if a pod is being CPU throttled
kubectl top pod web-app

# View throttling metrics
kubectl exec -it web-app -- cat /sys/fs/cgroup/cpu/cpu.stat
```

### CPU Request Guidelines

| Workload Type | Typical Request | Notes |
|--------------|-----------------|-------|
| Web server | 100m - 500m | Scales horizontally |
| API backend | 250m - 1000m | Depends on complexity |
| Background worker | 50m - 200m | Can tolerate throttling |
| Database | 500m - 2000m | Needs consistent performance |

## Memory Resources

Memory is measured in bytes. Common suffixes include Mi (mebibytes) and Gi (gibibytes).

```yaml
resources:
  requests:
    memory: "128Mi"   # 128 mebibytes
  limits:
    memory: "256Mi"   # 256 mebibytes
```

### Memory Behavior

When a container exceeds its memory limit, Kubernetes terminates it with an OOMKilled error. Unlike CPU, there is no throttling for memory.

```bash
# Check memory usage
kubectl top pod web-app

# Check for OOMKilled events
kubectl describe pod web-app | grep -A 5 "Last State"
```

### Memory Request Guidelines

| Workload Type | Typical Request | Notes |
|--------------|-----------------|-------|
| Nginx | 64Mi - 128Mi | Static content serving |
| Node.js app | 256Mi - 512Mi | Depends on heap size |
| Java app | 512Mi - 2Gi | JVM needs headroom |
| Python app | 128Mi - 512Mi | Depends on libraries |

## Setting Requests and Limits Together

### Pattern 1: Guaranteed QoS

Set requests equal to limits for predictable performance:

```yaml
# Guaranteed QoS class - best for critical workloads
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### Pattern 2: Burstable QoS

Set limits higher than requests for burst capacity:

```yaml
# Burstable QoS class - good for variable workloads
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "1000m"
```

### Pattern 3: Best Effort QoS

No requests or limits (not recommended for production):

```yaml
# BestEffort QoS class - first to be evicted
resources: {}
```

## Viewing Pod Resource Usage

```bash
# Real-time resource usage
kubectl top pods -n default

# Output:
# NAME       CPU(cores)   MEMORY(bytes)
# web-app    125m         256Mi

# Detailed pod description
kubectl describe pod web-app

# Check QoS class
kubectl get pod web-app -o jsonpath='{.status.qosClass}'
```

## LimitRange for Default Values

Set namespace-wide defaults so pods without explicit resources still get reasonable values:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: production
spec:
  limits:
    - default:           # Default limits
        memory: "512Mi"
        cpu: "500m"
      defaultRequest:    # Default requests
        memory: "256Mi"
        cpu: "250m"
      max:               # Maximum allowed
        memory: "4Gi"
        cpu: "4"
      min:               # Minimum required
        memory: "64Mi"
        cpu: "50m"
      type: Container
```

Apply and verify:

```bash
# Apply limit range
kubectl apply -f limitrange.yaml

# Check defaults
kubectl describe limitrange default-limits -n production

# Deploy pod without resources - it gets defaults
kubectl run test --image=nginx -n production
kubectl describe pod test -n production | grep -A 10 "Limits:"
```

## ResourceQuota for Namespace Limits

Prevent a single namespace from consuming all cluster resources:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: namespace-quota
  namespace: production
spec:
  hard:
    requests.cpu: "10"        # Total CPU requests
    requests.memory: "20Gi"   # Total memory requests
    limits.cpu: "20"          # Total CPU limits
    limits.memory: "40Gi"     # Total memory limits
    pods: "50"                # Maximum pod count
```

Check quota usage:

```bash
kubectl describe resourcequota namespace-quota -n production

# Output:
# Name:            namespace-quota
# Resource         Used    Hard
# --------         ----    ----
# limits.cpu       5       20
# limits.memory    10Gi    40Gi
# pods             15      50
# requests.cpu     2500m   10
# requests.memory  5Gi     20Gi
```

## Diagnosing Resource Issues

### Pod Stuck in Pending

```bash
# Check pod events
kubectl describe pod web-app

# Common message:
# Warning  FailedScheduling  Insufficient cpu
# Warning  FailedScheduling  Insufficient memory
```

Solution: Reduce requests or add cluster capacity.

### Frequent OOMKilled

```bash
# Check termination reason
kubectl get pod web-app -o jsonpath='{.status.containerStatuses[0].lastState.terminated.reason}'

# View memory at kill time
kubectl describe pod web-app | grep -A 3 "Last State"
```

Solution: Increase memory limit or fix memory leak.

### Slow Application Performance

```bash
# Check CPU throttling
kubectl exec -it web-app -- cat /sys/fs/cgroup/cpu/cpu.stat | grep throttled

# Output:
# nr_throttled 1234
# throttled_time 567890123456
```

Solution: Increase CPU limit.

## Best Practices

### 1. Always Set Both Requests and Limits

```yaml
# Good - explicit resources
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### 2. Profile Your Application First

```bash
# Run load test and observe metrics
kubectl top pod web-app --containers

# Use Prometheus for historical data
# Query: container_memory_usage_bytes{pod="web-app"}
```

### 3. Set Memory Limit Close to Request

Memory overcommit is risky because OOMKilled terminates pods:

```yaml
# Safer - limit is 1.5x request
resources:
  requests:
    memory: "256Mi"
  limits:
    memory: "384Mi"   # Not too far from request
```

### 4. Allow CPU Bursting

CPU throttling is less disruptive than OOMKilled:

```yaml
# OK - allows CPU burst
resources:
  requests:
    cpu: "250m"
  limits:
    cpu: "1000m"   # 4x request is fine for CPU
```

### 5. Use Vertical Pod Autoscaler for Recommendations

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: web-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  updatePolicy:
    updateMode: "Off"   # Just recommendations
```

Check recommendations:

```bash
kubectl describe vpa web-vpa

# Output shows recommended resources:
# Target:
#   Container:  app
#   Lower Bound:
#     Cpu:     100m
#     Memory:  200Mi
#   Target:
#     Cpu:     250m
#     Memory:  300Mi
#   Upper Bound:
#     Cpu:     500m
#     Memory:  600Mi
```

## Complete Example

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: nginx
          image: nginx:1.24
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "500m"
          ports:
            - containerPort: 80
        - name: app
          image: myapp:v1
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          ports:
            - containerPort: 8080
```

---

Proper resource configuration prevents scheduling failures, OOMKilled errors, and performance degradation. Start with conservative estimates, monitor actual usage, and adjust based on real data. Use LimitRanges to enforce defaults and ResourceQuotas to prevent runaway resource consumption in multi-tenant clusters.
