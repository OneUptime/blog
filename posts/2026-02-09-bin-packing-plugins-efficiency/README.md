# How to Configure Bin Packing Scheduler Plugins for Node Efficiency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Scheduler, Bin Packing, Resource Optimization, Node Efficiency

Description: Implement bin packing scheduler plugins to maximize node utilization by densely packing pods and reducing the number of required nodes.

---

Kubernetes scheduler's default spreading behavior distributes pods evenly across nodes. While this improves resilience, it creates fragmentation where many nodes run partially utilized. Bin packing reverses this by consolidating pods onto fewer nodes, leaving empty nodes that can be scaled down for cost savings.

## Default Scheduler vs Bin Packing

The default scheduler uses the `BalancedResourceAllocation` and `NodeResourcesLeastAllocated` plugins. These spread pods to balance resource usage across nodes. This approach is resilient but inefficient.

Bin packing uses the `NodeResourcesMostAllocated` plugin instead. It prioritizes nodes with highest resource utilization, packing pods tightly. This concentrates workloads on fewer nodes.

The tradeoff is concentration risk. If a heavily-packed node fails, more pods are affected. Mitigate this with pod disruption budgets and anti-affinity rules for critical services.

## Configuring the Scheduler Profile

Create a custom scheduler configuration enabling bin packing:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
- schedulerName: default-scheduler
  plugins:
    score:
      disabled:
      - name: NodeResourcesLeastAllocated
      enabled:
      - name: NodeResourcesMostAllocated
        weight: 100
  pluginConfig:
  - name: NodeResourcesMostAllocated
    args:
      resources:
      - name: cpu
        weight: 1
      - name: memory
        weight: 1
```

This configuration disables the spreading plugin and enables bin packing with equal weight for CPU and memory.

Apply this configuration by modifying the scheduler manifest:

```bash
# On kubeadm clusters
vi /etc/kubernetes/manifests/kube-scheduler.yaml

# Add the config file mount and argument
--config=/etc/kubernetes/scheduler-config.yaml
```

For managed Kubernetes, check if your provider supports custom scheduler configurations. Many managed services do not allow scheduler modifications.

## Weighted Resource Priorities

Adjust resource weights to prioritize specific resources:

```yaml
pluginConfig:
- name: NodeResourcesMostAllocated
  args:
    resources:
    - name: cpu
      weight: 2  # Prioritize CPU packing
    - name: memory
      weight: 1
```

This configuration packs CPU more aggressively than memory. Use this when CPU costs dominate your infrastructure spending or when memory utilization is naturally high.

For GPU workloads:

```yaml
pluginConfig:
- name: NodeResourcesMostAllocated
  args:
    resources:
    - name: cpu
      weight: 1
    - name: memory
      weight: 1
    - name: nvidia.com/gpu
      weight: 5  # Strongly prefer GPU-packed nodes
```

GPU resources are expensive. High weights ensure GPU nodes fill completely before scheduling spreads to additional GPU nodes.

## Hybrid Scheduling Strategy

Run multiple scheduler profiles for different workload types:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
# Default spreading scheduler
- schedulerName: default-scheduler
  plugins:
    score:
      enabled:
      - name: NodeResourcesLeastAllocated
        weight: 1
# Bin packing scheduler
- schedulerName: bin-packing-scheduler
  plugins:
    score:
      disabled:
      - name: NodeResourcesLeastAllocated
      enabled:
      - name: NodeResourcesMostAllocated
        weight: 100
  pluginConfig:
  - name: NodeResourcesMostAllocated
    args:
      resources:
      - name: cpu
        weight: 1
      - name: memory
        weight: 1
```

Critical production services use the default scheduler for resilience:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-api
spec:
  template:
    spec:
      schedulerName: default-scheduler
      containers:
      - name: api
        resources:
          requests:
            cpu: "500m"
            memory: "1Gi"
```

Development and batch workloads use bin packing:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-processing
spec:
  template:
    spec:
      schedulerName: bin-packing-scheduler
      containers:
      - name: processor
        resources:
          requests:
            cpu: "1000m"
            memory: "2Gi"
```

This balances cost optimization with reliability requirements.

## Combining with Cluster Autoscaler

Bin packing works best with cluster autoscaler. As pods pack onto fewer nodes, autoscaler detects empty nodes and scales them down:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-config
  namespace: kube-system
data:
  scale-down-enabled: "true"
  scale-down-delay-after-add: "5m"
  scale-down-unneeded-time: "10m"
  scale-down-utilization-threshold: "0.5"
```

The utilization threshold of 0.5 means nodes with less than 50% utilization are candidates for scale-down. Bin packing creates these lightly-loaded nodes naturally.

Monitor autoscaler decisions:

```bash
kubectl logs -n kube-system deployment/cluster-autoscaler -f | grep scale-down
```

You should see frequent scale-down events as bin packing consolidates workloads.

## Pod Topology Spread Constraints

Prevent bin packing from violating availability requirements using topology spread:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend
spec:
  replicas: 6
  template:
    spec:
      schedulerName: bin-packing-scheduler
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: web-frontend
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app: web-frontend
      containers:
      - name: web
        resources:
          requests:
            cpu: "200m"
            memory: "256Mi"
```

The hostname constraint prevents more than one replica difference per node. The zone constraint prefers zone distribution but does not strictly require it. This balances bin packing efficiency with fault tolerance.

## Node Affinity for Bin Packing Zones

Designate specific node pools for bin-packed workloads:

```yaml
apiVersion: v1
kind: Node
metadata:
  name: worker-binpack-1
  labels:
    node-pool: bin-packing
    workload-type: batch
```

Target these nodes for batch workloads:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: analytics-job
spec:
  template:
    spec:
      schedulerName: bin-packing-scheduler
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: node-pool
                operator: In
                values:
                - bin-packing
      containers:
      - name: analytics
        resources:
          requests:
            cpu: "2000m"
            memory: "4Gi"
```

This prevents bin-packed workloads from affecting production node pools while maximizing efficiency on designated nodes.

## Monitoring Bin Packing Effectiveness

Track node utilization to measure bin packing impact:

```promql
# Average node CPU utilization
avg(
  (1 - avg by (node) (
    rate(node_cpu_seconds_total{mode="idle"}[5m])
  ))
)

# Average node memory utilization
avg(
  (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) /
  node_memory_MemTotal_bytes
)

# Nodes below utilization threshold
count(
  (
    sum by (node) (kube_pod_container_resource_requests_cpu_cores) /
    sum by (node) (kube_node_status_allocatable_cpu_cores)
  ) < 0.3
)
```

After implementing bin packing, you should see:
- Higher average node utilization
- Fewer nodes below the utilization threshold
- Greater variance in per-node utilization

## Request-Based Scoring

The bin packing plugin scores nodes based on requested resources, not actual usage. This means overcommitted nodes (many pods with low requests) may score poorly even if actual usage is low.

For workloads with accurate requests, this works well. For workloads with inflated requests, consider adjusting request values before enabling bin packing.

Calculate request-to-usage ratios:

```promql
# CPU request vs usage
sum(kube_pod_container_resource_requests_cpu_cores) /
sum(rate(container_cpu_usage_seconds_total[5m]))

# Memory request vs usage
sum(kube_pod_container_resource_requests_memory_bytes) /
sum(container_memory_working_set_bytes)
```

Ratios above 2.0 indicate significant over-requesting. Right-size these pods before implementing bin packing for best results.

## Simulating Bin Packing Impact

Test bin packing on a subset of nodes before full deployment:

```yaml
apiVersion: v1
kind: Node
metadata:
  name: worker-test-1
  labels:
    bin-packing: enabled
```

Create a test scheduler profile that only affects these nodes:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
- schedulerName: bin-packing-test
  plugins:
    filter:
      enabled:
      - name: NodeAffinity
    score:
      enabled:
      - name: NodeResourcesMostAllocated
        weight: 100
  pluginConfig:
  - name: NodeAffinity
    args:
      addedAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          nodeSelectorTerms:
          - matchExpressions:
            - key: bin-packing
              operator: In
              values:
              - enabled
```

Test pods use this scheduler and only land on labeled nodes. Compare utilization and costs before expanding to production.

## Cost Savings Calculation

Calculate expected savings from bin packing:

```
Before bin packing:
- 50 nodes at 40% average utilization
- Monthly cost: $10,000

After bin packing:
- 30 nodes at 65% average utilization
- Monthly cost: $6,000
- Savings: $4,000/month (40%)
```

Factor in:
- Increased operational risk from higher density
- Potential performance impact from resource contention
- Time to implement and validate

Most organizations find 20-40% cost reduction achievable with bin packing, especially for non-critical workloads.

## Troubleshooting

Pods remaining unscheduled:

```bash
kubectl get pods --field-selector=status.phase=Pending
kubectl describe pod <pending-pod>
```

Look for:
- No nodes with sufficient resources
- Anti-affinity rules preventing placement
- Topology constraints that cannot be satisfied

Excessive pod evictions:

```bash
kubectl get events --field-selector reason=Evicted
```

Bin packing can trigger more evictions during node pressure. Adjust eviction thresholds:

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
evictionHard:
  memory.available: "500Mi"
  nodefs.available: "10%"
evictionSoft:
  memory.available: "1Gi"
  nodefs.available: "15%"
evictionSoftGracePeriod:
  memory.available: "2m"
  nodefs.available: "2m"
```

More generous thresholds reduce eviction frequency at the cost of less aggressive bin packing.

Bin packing is a powerful technique for reducing infrastructure costs in Kubernetes. Combined with cluster autoscaling and right-sized resource requests, it can cut compute expenses by 30-50% while maintaining acceptable reliability levels for non-critical workloads.
