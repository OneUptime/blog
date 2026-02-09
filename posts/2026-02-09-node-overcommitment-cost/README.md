# How to Implement Node Overcommitment Strategies for Cost Savings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cost Optimization, Resource Management, Node Management, Overcommitment

Description: Safely overcommit cluster resources to increase node utilization and reduce infrastructure costs without compromising application reliability.

---

Node overcommitment allows scheduling more pod requests than node capacity by leveraging the gap between requested and actual resource usage. Most applications use far less than their requests, creating unused capacity. Overcommitment reclaims this waste, fitting more workloads on fewer nodes.

## Understanding Overcommitment Fundamentals

Kubernetes schedules pods based on requests, not actual usage. If node has 8 CPU cores and pods request 8 cores but use only 4 cores, half the node sits idle. Overcommitment lets you schedule pods requesting 10+ cores on that 8-core node, knowing actual usage stays below capacity.

The risk is cumulative usage exceeding physical resources. For CPU, this causes throttling. For memory, it triggers OOM kills. Successful overcommitment requires understanding workload patterns and setting appropriate limits.

Two key ratios control overcommitment. The request-to-usage ratio shows how much requested capacity goes unused. The request-to-limit ratio determines burst capacity. Both inform overcommitment strategy.

## Analyzing Workload Resource Patterns

Before overcommitting, measure actual resource usage:

```promql
# Average CPU usage vs requests
avg_over_time(
  container_cpu_usage_seconds_total[24h]
) / on(pod) group_left()
container_spec_cpu_quota

# Average memory usage vs requests
avg_over_time(
  container_memory_working_set_bytes[24h]
) / on(pod) group_left()
container_spec_memory_limit_bytes
```

Calculate the P95 usage to account for spikes:

```promql
quantile_over_time(0.95,
  container_cpu_usage_seconds_total[24h]
) / container_spec_cpu_quota
```

If P95 usage is consistently 30-50% of requests, you have significant overcommitment opportunity.

## Configuring Kubelet Overcommitment

The kubelet supports two overcommitment mechanisms: system reserved resources and eviction thresholds. System reserved carves out capacity for OS and Kubernetes components:

```yaml
# kubelet configuration
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
systemReserved:
  cpu: "1000m"
  memory: "2Gi"
  ephemeral-storage: "10Gi"
kubeReserved:
  cpu: "500m"
  memory: "1Gi"
  ephemeral-storage: "5Gi"
```

On a node with 16 CPU and 64Gi memory, this reserves 1.5 CPU and 3Gi for system use. Allocatable capacity becomes 14.5 CPU and 61Gi, but actual physical capacity remains 16 CPU and 64Gi. Pods can burst beyond allocatable up to physical limits.

Eviction thresholds trigger pod eviction when usage exceeds safe levels:

```yaml
evictionHard:
  memory.available: "1Gi"
  nodefs.available: "10%"
  nodefs.inodesFree: "5%"
evictionSoft:
  memory.available: "2Gi"
  nodefs.available: "15%"
evictionSoftGracePeriod:
  memory.available: "1m30s"
  nodefs.available: "2m"
```

Hard thresholds trigger immediate eviction. Soft thresholds trigger eviction after the grace period. This provides safety margins preventing node failure.

## CPU Overcommitment Strategy

CPU is compressible, making it safer to overcommit. The kernel throttles processes exceeding their share rather than killing them. This degrades performance but maintains availability.

Set CPU requests conservatively while allowing high limits:

```yaml
resources:
  requests:
    cpu: "200m"  # Minimum needed
  limits:
    cpu: "2000m"  # Allow bursting
```

The 10x ratio between request and limit enables significant overcommitment. Ten such pods request 2 CPU but can burst to 20 CPU total. On an 8-core node, they schedule successfully and share CPU fairly during contention.

Monitor throttling to validate overcommitment levels:

```promql
# Percentage of time containers are throttled
rate(container_cpu_cfs_throttled_seconds_total[5m]) /
rate(container_cpu_cfs_periods_total[5m]) * 100
```

Throttling below 10% is generally acceptable. Higher indicates overcommitment is too aggressive.

## Memory Overcommitment Approach

Memory overcommitment is riskier because memory is incompressible. Exceeding physical memory triggers OOM kills. Approach memory overcommitment carefully.

Analyze memory usage patterns first:

```promql
# Memory usage headroom
(container_spec_memory_limit_bytes -
 container_memory_working_set_bytes) /
container_spec_memory_limit_bytes * 100
```

If most containers show 30%+ headroom consistently, moderate overcommitment is safe.

Set limits higher than requests:

```yaml
resources:
  requests:
    memory: "512Mi"  # Baseline usage
  limits:
    memory: "1Gi"    # Peak usage
```

The scheduler sees 512Mi requests. If actual usage stays around 500Mi, the 500Mi gap between request and limit provides overcommitment capacity.

## Quality of Service and Overcommitment

Kubernetes QoS classes interact with overcommitment. Guaranteed pods (requests equal limits) never get overcommitted. Burstable pods (requests less than limits) enable overcommitment. BestEffort pods (no requests/limits) use only truly idle capacity.

Structure workloads by criticality:

```yaml
# Critical service - Guaranteed QoS
apiVersion: v1
kind: Pod
metadata:
  name: critical-service
spec:
  containers:
  - name: app
    resources:
      requests:
        memory: "2Gi"
        cpu: "1000m"
      limits:
        memory: "2Gi"
        cpu: "1000m"
---
# Normal service - Burstable QoS
apiVersion: v1
kind: Pod
metadata:
  name: normal-service
spec:
  containers:
  - name: app
    resources:
      requests:
        memory: "512Mi"
        cpu: "200m"
      limits:
        memory: "1Gi"
        cpu: "1000m"
---
# Batch job - BestEffort QoS
apiVersion: v1
kind: Pod
metadata:
  name: batch-job
spec:
  containers:
  - name: job
    resources: {}
```

Critical services get guaranteed resources. Normal services enable moderate overcommitment. Batch jobs fill remaining capacity.

## Pod Priority and Preemption

Combine overcommitment with pod priorities. Higher priority pods can preempt lower priority pods during resource pressure:

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000
preemptionPolicy: PreemptLowerPriority
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: low-priority
value: 100
preemptionPolicy: PreemptLowerPriority
```

Apply priorities to pods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: important-app
spec:
  priorityClassName: high-priority
  containers:
  - name: app
    resources:
      requests:
        memory: "512Mi"
        cpu: "250m"
```

During overcommitment, if high-priority pods need resources, Kubernetes evicts low-priority pods. This provides safety for critical workloads while maximizing utilization.

## Calculating Safe Overcommitment Ratios

Determine safe overcommitment ratios empirically. Start conservative and increase gradually:

```
Week 1: No overcommitment (baseline)
Week 2: 10% overcommitment (1.1x node capacity)
Week 3: 20% overcommitment (1.2x node capacity)
Week 4: 30% overcommitment (1.3x node capacity)
```

At each level, monitor:
- OOM kill events
- CPU throttling percentages
- Pod eviction rates
- Application error rates

If metrics remain healthy, continue increasing. When metrics degrade, roll back to the previous level.

A common safe ratio is 1.5x for CPU and 1.2x for memory. This varies by workload type and risk tolerance.

## Monitoring Overcommitment Health

Create dashboards tracking overcommitment impact:

```promql
# Node allocatable vs actual capacity
kube_node_status_capacity - kube_node_status_allocatable

# Total pod requests vs node capacity
sum by (node) (kube_pod_container_resource_requests) /
sum by (node) (kube_node_status_capacity)

# Actual usage vs node capacity
sum by (node) (container_memory_working_set_bytes) /
sum by (node) (kube_node_status_capacity_memory_bytes)
```

Alert on dangerous conditions:

```promql
# Alert when actual usage approaches physical limits
(
  sum by (node) (container_memory_working_set_bytes) /
  sum by (node) (kube_node_status_capacity_memory_bytes)
) > 0.85
```

This warning signals overcommitment is too aggressive before OOM kills occur.

## Node Selection for Overcommitment

Not all nodes should be overcommitted equally. Designate node pools by overcommitment policy:

```yaml
# High-utilization node pool
apiVersion: v1
kind: Node
metadata:
  name: worker-high-util-1
  labels:
    node-pool: high-utilization
spec:
  taints:
  - key: overcommitted
    value: "true"
    effect: NoSchedule
```

Route appropriate workloads to overcommitted nodes:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: batch-job
spec:
  tolerations:
  - key: overcommitted
    operator: Equal
    value: "true"
    effect: NoSchedule
  nodeSelector:
    node-pool: high-utilization
  containers:
  - name: job
    resources:
      requests:
        cpu: "100m"
        memory: "256Mi"
```

Critical production services avoid overcommitted nodes. Batch and development workloads target them.

## Cost Savings Analysis

Quantify overcommitment savings by comparing cluster sizes:

```
Before overcommitment:
- 100 nodes, 1600 cores, $32,000/month
- 50% average utilization
- Effective capacity: 800 cores

After 1.5x CPU overcommitment:
- 70 nodes, 1120 cores, $22,400/month
- 70% average utilization
- Effective capacity: 784 cores

Monthly savings: $9,600 (30% reduction)
```

The slightly lower effective capacity is acceptable given workload patterns. Monitor that application performance remains within SLO targets.

## Handling Edge Cases

Some workloads are poor candidates for overcommitment:

- Databases requiring consistent performance
- Real-time processing with strict latency SLOs
- Memory-intensive applications with unpredictable allocation patterns

Exclude these from overcommitment:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: database
spec:
  nodeSelector:
    node-pool: guaranteed-capacity
  containers:
  - name: postgres
    resources:
      requests:
        memory: "8Gi"
        cpu: "2000m"
      limits:
        memory: "8Gi"
        cpu: "2000m"
```

Guaranteed QoS and dedicated node pools ensure these workloads get predictable resources.

Node overcommitment is a powerful cost optimization technique when implemented thoughtfully. Start conservative, monitor closely, and adjust based on actual workload behavior to find the right balance between cost savings and reliability.
