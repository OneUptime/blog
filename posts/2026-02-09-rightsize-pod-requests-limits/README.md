# How to Right-Size Pod Resource Requests and Limits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Resource Management, Performance, Cost Optimization, Pod Configuration

Description: Learn proven strategies for setting accurate CPU and memory requests and limits to optimize pod scheduling, prevent OOM kills, and reduce cluster costs.

---

Setting appropriate resource requests and limits is one of the most impactful optimizations for Kubernetes clusters. Too high and you waste money on idle resources. Too low and pods face throttling or termination. The right balance requires understanding workload behavior and Kubernetes scheduling mechanics.

## Understanding Requests vs Limits

Resource requests tell the scheduler the minimum resources a pod needs. The scheduler only places pods on nodes with available capacity. Requests also influence runtime allocation: CPU requests affect CPU share under contention, while memory requests are mainly used for scheduling and eviction decisions.

Limits define the maximum resources a pod can consume. The kubelet enforces limits through cgroups. For CPU, exceeding limits causes throttling. For memory, exceeding limits triggers an OOM kill.

The distinction matters for scheduling and runtime behavior:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example-pod
spec:
  containers:
  - name: app
    image: myapp:v1
    resources:
      requests:
        memory: "256Mi"
        cpu: "250m"
      limits:
        memory: "512Mi"
        cpu: "500m"
```

This pod requires 256Mi memory and 250 millicores CPU to schedule. CPU usage above 500m is throttled, while memory usage above 512Mi may cause the container to be killed. The scheduler considers only requests when placing pods.

## Analyzing Current Resource Usage

Before setting resources, measure actual usage. Deploy workloads with conservative initial requests and generous limits, then observe patterns:

```bash
# Check current resource usage for a deployment

kubectl top pods -n production -l app=myapp

# View current resource usage from the Metrics API
kubectl get --raw /apis/metrics.k8s.io/v1beta1/namespaces/production/pods
```

Metrics-server provides point-in-time data. For historical trends, query Prometheus:

```promql
# P95 memory usage over 24 hours
quantile_over_time(0.95,
  container_memory_working_set_bytes{
    namespace="production",
    pod=~"myapp-.*"
  }[24h]
)

# P95 CPU usage over 24 hours
quantile_over_time(0.95,
  rate(container_cpu_usage_seconds_total{
    namespace="production",
    pod=~"myapp-.*"
  }[5m])[24h:]
)
```

Analyze usage during peak load periods. Setting resources based on average usage causes problems during traffic spikes.

## Setting Memory Requests

Memory is incompressible - when a container exceeds its limit, the kernel kills it. Set memory requests based on steady-state usage plus a buffer for spikes:

```yaml
resources:
  requests:
    memory: "384Mi"  # P95 usage (300Mi) + 28% buffer
  limits:
    memory: "512Mi"  # Allows headroom for temporary spikes
```

The buffer depends on workload variability. Applications with stable memory profiles need less buffer. Applications with unpredictable allocations need more.

Monitor OOM kills to validate your settings:

```bash
# Check for OOM killed pods
kubectl get events --field-selector reason=OOMKilled -n production

# View OOM kill count from Prometheus
kube_pod_container_status_terminated_reason{reason="OOMKilled"}
```

Frequent OOM kills indicate limits are too low. Increase both requests and limits, keeping the ratio similar.

## Setting CPU Requests

CPU is compressible - the kernel throttles containers exceeding their limits rather than killing them. This makes CPU limits less critical but still important for fairness.

Set CPU requests based on minimum required throughput:

```yaml
resources:
  requests:
    cpu: "200m"  # Minimum CPU for acceptable performance
  limits:
    cpu: "1000m"  # Allow bursting during traffic spikes
```

The gap between request and limit determines burst capacity. Applications with bursty traffic benefit from larger gaps. Steady workloads can use similar values.

Monitor CPU throttling:

```promql
# CPU throttling percentage by CFS period
rate(container_cpu_cfs_throttled_periods_total[5m]) /
rate(container_cpu_cfs_periods_total[5m]) * 100
```

Throttling above 10% suggests limits are too restrictive for your workload's burst patterns.

## Handling Different Workload Types

Different workloads require different strategies. Web applications typically need:

```yaml
# Frontend web server
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "256Mi"
    cpu: "500m"
```

Minimal baseline resources with burst capacity for traffic spikes. The wide gap between request and limit allows handling concurrent requests.

Backend API services need more memory for caching:

```yaml
# API service with caching
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

Higher memory request ensures cache stays resident. The limit allows cache growth during peak periods.

Batch processing jobs need guaranteed resources:

```yaml
# Batch processor
resources:
  requests:
    memory: "2Gi"
    cpu: "1000m"
  limits:
    memory: "2Gi"
    cpu: "1000m"
```

Setting requests equal to limits creates a Guaranteed QoS class and makes the pod least likely to be evicted under node pressure.

## Using Quality of Service Classes

Kubernetes assigns QoS classes based on requests and limits:

**Guaranteed**: All containers have requests equal to limits for both CPU and memory. These pods are least likely to be evicted due to resource pressure, but can still be evicted if they exceed limits or the node cannot preserve stability otherwise.

```yaml
resources:
  requests:
    memory: "1Gi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "500m"
```

**Burstable**: The pod does not meet the Guaranteed criteria, but at least one container has a CPU or memory request or limit. These pods get evicted after BestEffort pods and before Guaranteed pods during pressure.

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

**BestEffort**: No CPU or memory requests or limits set at the container or pod level. These pods get evicted first and receive no resource guarantees.

```yaml
resources: {}  # No requests or limits
```

Critical services should use Guaranteed QoS. Development workloads can use Burstable or BestEffort to utilize idle cluster capacity.

## Implementing Resource Quotas

Prevent individual pods from consuming excessive resources with LimitRanges:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: production
spec:
  limits:
  - max:
      memory: "4Gi"
      cpu: "2000m"
    min:
      memory: "64Mi"
      cpu: "50m"
    default:
      memory: "256Mi"
      cpu: "200m"
    defaultRequest:
      memory: "128Mi"
      cpu: "100m"
    type: Container
```

This LimitRange provides defaults for pods without explicit resources and enforces maximum values. Pods requesting more than the max get rejected.

Namespace-level quotas limit aggregate resource consumption:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-quota
  namespace: production
spec:
  hard:
    requests.cpu: "100"
    requests.memory: "200Gi"
    limits.cpu: "200"
    limits.memory: "400Gi"
    pods: "100"
```

Teams must fit within these bounds, encouraging efficient resource usage.

## Monitoring Resource Efficiency

Track resource efficiency metrics to identify optimization opportunities:

```promql
# Memory utilization percentage
(
  container_memory_working_set_bytes /
  (container_spec_memory_limit_bytes > 0)
) * 100

# CPU utilization percentage
(
  rate(container_cpu_usage_seconds_total[5m]) /
  ((container_spec_cpu_quota > 0) / container_spec_cpu_period)
) * 100

# Containers with low memory utilization compared to requests (< 20%)
(
  container_memory_working_set_bytes /
  on(namespace, pod, container)
  kube_pod_container_resource_requests{resource="memory", unit="byte"}
) < 0.2
```

Low utilization compared to requests indicates oversized requests. High utilization near limits suggests undersized limits.

Create dashboards showing:
- Current vs requested resources
- Utilization percentages
- Throttling and OOM kill events
- Resource waste (requested but unused)

## Iterative Right-Sizing Process

Right-sizing is iterative, not one-time. Follow this process:

1. Deploy with conservative initial resources based on estimates
2. Monitor actual usage for at least one full business cycle
3. Analyze P95 usage and identify patterns
4. Adjust requests to P95 usage plus 20% buffer
5. Set limits 50-100% above requests for burst capacity
6. Monitor for issues like OOM kills or throttling
7. Repeat adjustments quarterly or after major changes

Track changes in a spreadsheet:

```text
Service       | Old Request | New Request | Old Limit | New Limit | Savings
api-gateway   | 512Mi       | 384Mi       | 1Gi       | 768Mi     | 25%
user-service  | 256Mi       | 192Mi       | 512Mi     | 384Mi     | 25%
```

Document the rationale for each change and monitor impact on performance metrics.

## Common Mistakes to Avoid

Setting limits without requests causes Kubernetes to copy the limit into the request for that resource when no admission-time default request is applied. That can unintentionally reserve more capacity than you expected. Always set both explicitly:

```yaml
# Wrong - Kubernetes treats omitted requests as equal to these limits
resources:
  limits:
    memory: "512Mi"
    cpu: "500m"

# Correct - creates Burstable pod
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

Copying production resources to development wastes money. Development environments handle less load:

```yaml
# Production
resources:
  requests:
    memory: "1Gi"
    cpu: "500m"

# Development - reduced by 75%
resources:
  requests:
    memory: "256Mi"
    cpu: "125m"
```

Ignoring JVM heap settings causes problems. Java applications need memory limits larger than heap:

```yaml
# Wrong - heap equals limit
env:
- name: JAVA_OPTS
  value: "-Xmx512m"
resources:
  limits:
    memory: "512Mi"

# Correct - limit exceeds heap by 30%
env:
- name: JAVA_OPTS
  value: "-Xmx400m"
resources:
  limits:
    memory: "512Mi"
```

The extra memory accommodates JVM overhead, class metadata, and native allocations.

## Automating Right-Sizing Recommendations

Use tools to generate right-sizing recommendations automatically. Vertical Pod Autoscaler can recommend resources without auto-applying them:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: myapp-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  updatePolicy:
    updateMode: "Off"  # Recommend only, don't apply
```

Check recommendations:

```bash
kubectl describe vpa myapp-vpa -n production
```

The output shows recommended requests based on actual usage patterns. Review recommendations before applying them manually or switching to an update mode that changes pods.

Right-sizing pod resources reduces costs while maintaining performance. The investment in measurement and analysis pays off through lower cloud bills and more efficient cluster utilization.
