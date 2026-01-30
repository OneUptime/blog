# How to Create Kubernetes Resource Requests

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kubernetes, Resource Management, Performance, DevOps

Description: Configure Kubernetes resource requests and limits for pods with proper CPU and memory settings, QoS classes, and right-sizing strategies.

---

Resource requests and limits are how you tell Kubernetes what your containers need. Get them wrong and your pods either starve for resources or waste cluster capacity. This guide covers the practical details of setting them correctly.

## Requests vs Limits

These two settings serve different purposes:

- **Requests**: The guaranteed minimum resources a container gets. Kubernetes uses this for scheduling decisions.
- **Limits**: The maximum resources a container can use. Kubernetes enforces this at runtime.

| Aspect | Requests | Limits |
|--------|----------|--------|
| Purpose | Scheduling, guaranteed resources | Resource caps, protection |
| CPU behavior | Guaranteed CPU time | Throttling when exceeded |
| Memory behavior | Guaranteed allocation | OOMKilled when exceeded |
| Default | None (dangerous) | None (unlimited) |

Here is a basic example showing both requests and limits:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-server
spec:
  containers:
    - name: nginx
      image: nginx:1.25
      resources:
        requests:
          memory: "128Mi"
          cpu: "100m"
        limits:
          memory: "256Mi"
          cpu: "500m"
```

## CPU Units - Understanding Millicores

CPU is measured in cores or millicores (1/1000 of a core). The notation can be confusing at first.

| Notation | Meaning | Equivalent |
|----------|---------|------------|
| 1 | 1 CPU core | 1000m |
| 0.5 | Half a core | 500m |
| 100m | 100 millicores | 0.1 cores |
| 250m | 250 millicores | 0.25 cores |
| 2000m | 2000 millicores | 2 cores |

CPU is a compressible resource. When a container exceeds its CPU limit, Kubernetes throttles it but does not kill it.

This example shows various CPU settings for different workload types:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: cpu-examples
spec:
  containers:
    # Low CPU - background tasks
    - name: logger
      image: fluent/fluentd
      resources:
        requests:
          cpu: "50m"     # 5% of a core
        limits:
          cpu: "100m"    # 10% of a core

    # Medium CPU - web servers
    - name: api
      image: myapp/api:v1
      resources:
        requests:
          cpu: "250m"    # 25% of a core
        limits:
          cpu: "1000m"   # 1 full core

    # High CPU - compute intensive
    - name: processor
      image: myapp/processor:v1
      resources:
        requests:
          cpu: "2"       # 2 full cores
        limits:
          cpu: "4"       # 4 full cores
```

### CPU Throttling

When a container tries to use more CPU than its limit, the kernel throttles it. You can observe this through metrics:

```bash
# Check CPU throttling for a pod
kubectl top pod web-server

# Get detailed throttling metrics from cgroups
kubectl exec web-server -- cat /sys/fs/cgroup/cpu/cpu.stat
```

High throttling indicates your CPU limits are too low. Consider raising them or investigating why the container needs more CPU.

## Memory Units - Bytes and Beyond

Memory uses standard byte suffixes. Kubernetes supports both decimal (SI) and binary (IEC) units.

| Unit | Type | Bytes |
|------|------|-------|
| Ki | Binary | 1024 |
| Mi | Binary | 1024 * 1024 |
| Gi | Binary | 1024 * 1024 * 1024 |
| K | Decimal | 1000 |
| M | Decimal | 1000 * 1000 |
| G | Decimal | 1000 * 1000 * 1000 |

Always use binary units (Ki, Mi, Gi) for memory. They match how operating systems and containers actually measure memory.

Memory is not compressible. If a container exceeds its memory limit, the kernel kills it immediately with an OOMKill.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: memory-examples
spec:
  containers:
    # Small memory footprint
    - name: sidecar
      image: envoyproxy/envoy:v1.28
      resources:
        requests:
          memory: "64Mi"
        limits:
          memory: "128Mi"

    # Medium memory - typical web app
    - name: webapp
      image: myapp/web:v1
      resources:
        requests:
          memory: "256Mi"
        limits:
          memory: "512Mi"

    # Large memory - JVM application
    - name: java-service
      image: myapp/java-service:v1
      resources:
        requests:
          memory: "1Gi"
        limits:
          memory: "2Gi"
```

### JVM Memory Configuration

For Java applications, align JVM heap settings with container limits:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: java-app
spec:
  containers:
    - name: app
      image: myapp/java:v1
      resources:
        requests:
          memory: "1Gi"
        limits:
          memory: "2Gi"
      env:
        # Set heap to 75% of container memory limit
        - name: JAVA_OPTS
          value: "-Xms768m -Xmx1536m -XX:MaxMetaspaceSize=256m"
```

Modern JVMs (Java 10+) can detect container limits automatically:

```yaml
env:
  - name: JAVA_OPTS
    value: "-XX:MaxRAMPercentage=75.0 -XX:InitialRAMPercentage=50.0"
```

## Quality of Service (QoS) Classes

Kubernetes assigns a QoS class to each pod based on its resource configuration. This determines eviction priority when nodes run low on resources.

| QoS Class | Criteria | Eviction Priority |
|-----------|----------|-------------------|
| Guaranteed | requests == limits for all containers | Lowest (last to evict) |
| Burstable | requests < limits or partial settings | Medium |
| BestEffort | No requests or limits set | Highest (first to evict) |

### Guaranteed QoS

Set requests equal to limits for both CPU and memory on all containers. These pods get the highest protection.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: guaranteed-pod
spec:
  containers:
    - name: app
      image: myapp:v1
      resources:
        requests:
          memory: "512Mi"
          cpu: "500m"
        limits:
          memory: "512Mi"    # Same as request
          cpu: "500m"        # Same as request
```

Use Guaranteed QoS for:
- Databases and stateful services
- Critical production workloads
- Latency-sensitive applications

### Burstable QoS

Set requests lower than limits. Pods can burst above their requests when resources are available.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: burstable-pod
spec:
  containers:
    - name: app
      image: myapp:v1
      resources:
        requests:
          memory: "256Mi"
          cpu: "100m"
        limits:
          memory: "512Mi"    # Higher than request
          cpu: "500m"        # Higher than request
```

Use Burstable QoS for:
- Web servers with variable traffic
- Batch processing jobs
- Development environments

### BestEffort QoS

No resource specifications at all. These pods use whatever resources are available but get evicted first.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: besteffort-pod
spec:
  containers:
    - name: app
      image: myapp:v1
      # No resources section - BestEffort
```

Use BestEffort QoS only for:
- Non-critical batch jobs
- Development and testing
- Workloads that can tolerate eviction

### Checking QoS Class

```bash
# Check a pod's QoS class
kubectl get pod myapp -o jsonpath='{.status.qosClass}'

# List all pods with their QoS classes
kubectl get pods -o custom-columns=NAME:.metadata.name,QOS:.status.qosClass
```

## LimitRange - Namespace Defaults

LimitRange sets default requests and limits for pods in a namespace. This prevents pods from running without resource specifications.

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: resource-limits
  namespace: production
spec:
  limits:
    - type: Container
      # Default limits applied when not specified
      default:
        memory: "256Mi"
        cpu: "500m"
      # Default requests applied when not specified
      defaultRequest:
        memory: "128Mi"
        cpu: "100m"
      # Maximum allowed
      max:
        memory: "4Gi"
        cpu: "4"
      # Minimum required
      min:
        memory: "64Mi"
        cpu: "50m"
      # Maximum ratio of limit to request
      maxLimitRequestRatio:
        memory: "4"
        cpu: "10"
```

Apply this to a namespace:

```bash
kubectl apply -f limitrange.yaml -n production
```

Now pods without resource specs get defaults:

```yaml
# This pod will get default resources from LimitRange
apiVersion: v1
kind: Pod
metadata:
  name: simple-pod
  namespace: production
spec:
  containers:
    - name: app
      image: nginx
      # No resources specified - defaults apply
```

## ResourceQuota - Namespace Limits

ResourceQuota limits total resource consumption within a namespace. This prevents any single team or application from consuming all cluster resources.

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: team-alpha
spec:
  hard:
    # Total CPU requests across all pods
    requests.cpu: "10"
    # Total memory requests across all pods
    requests.memory: "20Gi"
    # Total CPU limits across all pods
    limits.cpu: "20"
    # Total memory limits across all pods
    limits.memory: "40Gi"
    # Maximum number of pods
    pods: "50"
```

Check quota usage:

```bash
kubectl describe resourcequota compute-quota -n team-alpha
```

## Vertical Pod Autoscaler (VPA)

VPA automatically adjusts pod resource requests based on actual usage. It helps you find the right values instead of guessing.

### Installing VPA

```bash
# Clone the autoscaler repository
git clone https://github.com/kubernetes/autoscaler.git
cd autoscaler/vertical-pod-autoscaler

# Install VPA components
./hack/vpa-up.sh
```

### VPA Configuration

Create a VPA object for your deployment:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: web-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web
  updatePolicy:
    updateMode: "Auto"    # Options: Off, Initial, Recreate, Auto
  resourcePolicy:
    containerPolicies:
      - containerName: "*"
        minAllowed:
          cpu: "50m"
          memory: "64Mi"
        maxAllowed:
          cpu: "2"
          memory: "4Gi"
        controlledResources: ["cpu", "memory"]
```

### VPA Update Modes

| Mode | Behavior |
|------|----------|
| Off | Only provides recommendations, no changes |
| Initial | Sets resources only at pod creation |
| Recreate | Recreates pods to apply new resources |
| Auto | Updates pods when possible (recreates if needed) |

Start with "Off" mode to see recommendations before enabling automatic updates:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  updatePolicy:
    updateMode: "Off"    # Just recommendations
```

### Reading VPA Recommendations

```bash
# Get VPA status and recommendations
kubectl describe vpa web-vpa

# Example output:
# Recommendation:
#   Container Recommendations:
#     Container Name: web
#     Lower Bound:
#       Cpu:     50m
#       Memory:  128Mi
#     Target:
#       Cpu:     200m
#       Memory:  256Mi
#     Upper Bound:
#       Cpu:     500m
#       Memory:  512Mi
```

The target values are what VPA recommends for your workload based on observed usage.

## Right-Sizing with Metrics

Use actual metrics to set resource values instead of guessing. This requires a metrics stack like Prometheus.

### Collecting Usage Data

Query Prometheus for container resource usage:

```promql
# Average CPU usage over 7 days
avg_over_time(
  rate(container_cpu_usage_seconds_total{
    namespace="production",
    container="web"
  }[5m])
[7d])

# 95th percentile memory usage over 7 days
quantile_over_time(0.95,
  container_memory_working_set_bytes{
    namespace="production",
    container="web"
  }[7d]
)
```

### Right-Sizing Formula

Use these guidelines to convert observed metrics to resource settings:

**For Requests:**
- CPU: P50 (median) usage + 20% buffer
- Memory: P95 usage + 10% buffer

**For Limits:**
- CPU: P99 usage + 50% buffer (or 2x request)
- Memory: P99 usage + 25% buffer (or 1.5x request)

```yaml
# Example based on metrics:
# Observed CPU: P50=100m, P99=300m
# Observed Memory: P95=200Mi, P99=250Mi

apiVersion: v1
kind: Pod
metadata:
  name: right-sized-app
spec:
  containers:
    - name: app
      image: myapp:v1
      resources:
        requests:
          cpu: "120m"      # P50 (100m) + 20%
          memory: "220Mi"  # P95 (200Mi) + 10%
        limits:
          cpu: "450m"      # P99 (300m) + 50%
          memory: "310Mi"  # P99 (250Mi) + 25%
```

### kubectl top Command

For quick checks without Prometheus:

```bash
# Current pod resource usage
kubectl top pods -n production

# Current node resource usage
kubectl top nodes

# Watch resource usage over time
watch -n 5 kubectl top pods -n production
```

### Metrics Server Installation

If kubectl top shows errors, install metrics-server:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

For development clusters with self-signed certificates:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: metrics-server
  namespace: kube-system
spec:
  template:
    spec:
      containers:
        - name: metrics-server
          args:
            - --kubelet-insecure-tls
            - --kubelet-preferred-address-types=InternalIP
```

## Common Patterns

### Pattern 1: Web Application

Web servers typically have variable load. Use Burstable QoS with room to handle traffic spikes.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-server
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
          image: nginx:1.25
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"
          ports:
            - containerPort: 80
```

### Pattern 2: Database

Databases need consistent resources. Use Guaranteed QoS for predictable performance.

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:15
          resources:
            requests:
              cpu: "1"
              memory: "2Gi"
            limits:
              cpu: "1"        # Same as request
              memory: "2Gi"   # Same as request
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: password
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 100Gi
```

### Pattern 3: Background Worker

Workers process jobs from a queue. They can tolerate throttling but need enough memory for their workload.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: job-worker
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
          image: myapp/worker:v1
          resources:
            requests:
              cpu: "50m"
              memory: "256Mi"
            limits:
              cpu: "200m"
              memory: "512Mi"
          env:
            - name: QUEUE_URL
              value: "redis://redis:6379"
```

### Pattern 4: Sidecar Containers

Sidecars like log collectors or proxies should use minimal resources.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-sidecars
spec:
  containers:
    # Main application
    - name: app
      image: myapp:v1
      resources:
        requests:
          cpu: "500m"
          memory: "512Mi"
        limits:
          cpu: "1"
          memory: "1Gi"

    # Envoy sidecar proxy
    - name: envoy
      image: envoyproxy/envoy:v1.28
      resources:
        requests:
          cpu: "50m"
          memory: "64Mi"
        limits:
          cpu: "200m"
          memory: "128Mi"

    # Log collector sidecar
    - name: fluentbit
      image: fluent/fluent-bit:2.2
      resources:
        requests:
          cpu: "20m"
          memory: "32Mi"
        limits:
          cpu: "100m"
          memory: "64Mi"
```

## Troubleshooting

### Pod Stuck in Pending

If pods are pending due to insufficient resources:

```bash
# Check pod events
kubectl describe pod myapp

# Look for messages like:
# 0/3 nodes are available: 3 Insufficient cpu.
# 0/3 nodes are available: 3 Insufficient memory.
```

**Solutions:**
- Lower resource requests
- Add more nodes to the cluster
- Check for resource quotas blocking the pod
- Remove or reschedule other workloads

### OOMKilled Errors

Memory limit exceeded - the container was killed.

```bash
# Check container status
kubectl get pod myapp -o jsonpath='{.status.containerStatuses[0].lastState}'

# Look for:
# reason: OOMKilled
```

**Solutions:**
- Increase memory limit
- Fix memory leaks in your application
- Add memory profiling to identify the cause

```yaml
# Temporary fix - increase memory
resources:
  limits:
    memory: "1Gi"  # Was 512Mi
```

### CPU Throttling

Check if containers are being throttled:

```bash
# Get throttling stats
kubectl exec myapp -- cat /sys/fs/cgroup/cpu/cpu.stat

# nr_throttled: number of throttle events
# throttled_time: total throttle time in nanoseconds
```

If throttled_time is high relative to total CPU time, increase CPU limits:

```yaml
resources:
  limits:
    cpu: "2"  # Was 1
```

### Checking Actual Usage vs Requests

Compare configured values to actual usage:

```bash
# Current usage
kubectl top pod myapp

# Configured resources
kubectl get pod myapp -o jsonpath='{.spec.containers[0].resources}'
```

If actual usage is consistently much lower than requests, reduce requests to free up cluster capacity.

## Best Practices Summary

1. **Always set both requests and limits** - Never deploy without resource specifications in production.

2. **Start conservative, then adjust** - Begin with higher values and tune down based on metrics.

3. **Use Guaranteed QoS for critical workloads** - Databases and core services should have requests equal to limits.

4. **Monitor and iterate** - Collect metrics and adjust resources based on actual usage patterns.

5. **Set namespace defaults with LimitRange** - Prevent pods from running without resource specs.

6. **Use VPA for automated recommendations** - Let VPA analyze usage and suggest optimal values.

7. **Account for spikes** - Set limits high enough to handle traffic bursts without excessive throttling.

8. **Consider all containers** - Remember sidecars and init containers consume resources too.

9. **Document your reasoning** - Add comments explaining why specific values were chosen.

10. **Review regularly** - Resource needs change as applications evolve.

---

Resource requests and limits directly impact your application's performance and your cluster's efficiency. Take time to measure actual usage, set appropriate values, and monitor the results. Well-tuned resources mean better performance, fewer outages, and lower infrastructure costs.
