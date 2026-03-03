# How to Right-Size Talos Linux Nodes for Cost Efficiency

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Right-Sizing, Cost Efficiency, Kubernetes, Resource Management, Capacity Planning

Description: A detailed guide to properly sizing Talos Linux nodes so you pay only for the compute resources your workloads actually need.

---

Over-provisioning is the silent budget killer in Kubernetes. Teams spin up large instances during initial setup, deploy their workloads, and never revisit the decision. Months later, they discover they have been paying for compute capacity that sits idle most of the time. On the flip side, under-provisioning leads to performance issues, pod evictions, and unhappy users.

Right-sizing is the practice of matching your node specifications to your actual workload requirements. On Talos Linux, this process is particularly effective because the operating system itself consumes very few resources, giving you more predictable capacity per node.

## Why Talos Linux Makes Right-Sizing Easier

Traditional Linux distributions consume a variable amount of resources depending on what system services are running. You might have SSH, systemd timers, package management daemons, and various background processes consuming CPU and memory unpredictably. This makes it harder to accurately predict how much capacity is available for your Kubernetes workloads.

Talos Linux changes this equation. The OS overhead is consistent and minimal - typically around 200-300MB of memory and negligible CPU. This means that the resources you provision are almost entirely available for pods, making capacity planning much more predictable.

## Step 1: Gather Baseline Usage Data

Before you can right-size, you need data. Install the metrics server if you have not already:

```bash
# Install metrics server for resource monitoring
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

Collect usage data over at least two weeks to capture normal patterns including peak periods:

```bash
# Check current node resource utilization
kubectl top nodes

# Get detailed per-pod resource usage
kubectl top pods -A --sort-by=memory

# View node capacity and allocatable resources
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
CPU_CAPACITY:.status.capacity.cpu,\
CPU_ALLOCATABLE:.status.allocatable.cpu,\
MEM_CAPACITY:.status.capacity.memory,\
MEM_ALLOCATABLE:.status.allocatable.memory
```

For longer-term data, use Prometheus to track historical usage:

```yaml
# prometheus-node-recording-rules.yaml
# Recording rules for node utilization tracking
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: node-utilization-recording
  namespace: monitoring
spec:
  groups:
    - name: node.utilization
      interval: 5m
      rules:
        # Average CPU utilization per node over 1 hour
        - record: node:cpu_utilization:avg1h
          expr: >
            1 - avg by (node) (
              rate(node_cpu_seconds_total{mode="idle"}[1h])
            )

        # Average memory utilization per node over 1 hour
        - record: node:memory_utilization:avg1h
          expr: >
            1 - (
              node_memory_MemAvailable_bytes /
              node_memory_MemTotal_bytes
            )

        # Peak CPU utilization per node over 24 hours
        - record: node:cpu_utilization:max24h
          expr: >
            max_over_time(node:cpu_utilization:avg1h[24h])
```

## Step 2: Analyze Workload Profiles

Different workloads have different resource profiles. Categorize your workloads to understand what node types you need:

```bash
# Identify CPU-heavy pods (high CPU request relative to memory)
kubectl get pods -A -o json | jq '
  [.items[] |
   select(.spec.containers[].resources.requests != null) |
   {
     name: .metadata.name,
     namespace: .metadata.namespace,
     cpu: (.spec.containers[0].resources.requests.cpu // "0"),
     memory: (.spec.containers[0].resources.requests.memory // "0")
   }
  ] | sort_by(.cpu) | reverse | .[0:10]'
```

Common workload profiles include:

- **CPU-bound**: API servers, data processing, build jobs
- **Memory-bound**: Databases, caches, in-memory analytics
- **Balanced**: General web services, microservices
- **GPU workloads**: Machine learning, video processing

## Step 3: Calculate Optimal Node Size

For each node pool, calculate the optimal instance size using this formula:

```text
Optimal Node Resources =
  (Sum of pod resource requests in the pool) /
  (Target utilization rate) /
  (Number of nodes) +
  (System reserved) +
  (Eviction threshold)
```

A target utilization rate of 65-75% gives you room for spikes while avoiding waste.

Here is an example calculation for a worker pool:

```text
Total pod CPU requests: 48 cores
Target utilization: 70%
Number of nodes: 6

Per-node CPU = (48 / 0.70) / 6 = 11.4 cores
System reserved: 0.5 cores
Eviction threshold overhead: 0.2 cores

Optimal per-node CPU: ~12 cores
```

## Step 4: Configure Talos Node Pools

Create distinct node pools for different workload profiles:

```yaml
# talos-worker-balanced.yaml
# Balanced worker nodes for general workloads
machine:
  type: worker
  nodeLabels:
    node-pool: balanced
  kubelet:
    extraArgs:
      # Reserve resources for system components
      system-reserved: "cpu=250m,memory=512Mi,ephemeral-storage=1Gi"
      kube-reserved: "cpu=250m,memory=512Mi,ephemeral-storage=1Gi"
      # Set eviction thresholds
      eviction-hard: "memory.available<500Mi,nodefs.available<10%"
      eviction-soft: "memory.available<1Gi,nodefs.available<15%"
      eviction-soft-grace-period: "memory.available=2m,nodefs.available=2m"
```

```yaml
# talos-worker-memory.yaml
# Memory-optimized worker nodes for data workloads
machine:
  type: worker
  nodeLabels:
    node-pool: memory-optimized
  kubelet:
    extraArgs:
      system-reserved: "cpu=250m,memory=1Gi,ephemeral-storage=1Gi"
      kube-reserved: "cpu=250m,memory=1Gi,ephemeral-storage=1Gi"
      eviction-hard: "memory.available<1Gi,nodefs.available<10%"
      # Allow larger pods on memory nodes
      max-pods: "50"
```

## Step 5: Use the Vertical Pod Autoscaler

Deploy VPA to continuously recommend right-sized resource values for your pods:

```yaml
# vpa-for-services.yaml
# VPA recommendation for a production service
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-service-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-service
  updatePolicy:
    # Start with recommendations only
    updateMode: "Off"
  resourcePolicy:
    containerPolicies:
      - containerName: api-service
        controlledResources: ["cpu", "memory"]
        minAllowed:
          cpu: 50m
          memory: 64Mi
        maxAllowed:
          cpu: 4
          memory: 8Gi
```

Check VPA recommendations:

```bash
# View VPA recommendations for all workloads
kubectl get vpa -A -o custom-columns=\
NAME:.metadata.name,\
NAMESPACE:.metadata.namespace,\
TARGET_CPU:.status.recommendation.containerRecommendations[0].target.cpu,\
TARGET_MEM:.status.recommendation.containerRecommendations[0].target.memory
```

## Step 6: Review and Iterate

Right-sizing is not a one-time exercise. Set up a monthly review process:

```bash
# Generate a utilization report
kubectl top nodes --no-headers | awk '{
  split($2, cpu, "m");
  split($4, mem, "Mi");
  printf "Node: %s | CPU: %s (%s) | Memory: %s (%s)\n",
    $1, $2, $3, $4, $5
}'
```

Create alerts for both over-provisioning and under-provisioning:

```yaml
# node-sizing-alerts.yaml
# Alerts for node utilization that indicate sizing issues
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: node-sizing-alerts
  namespace: monitoring
spec:
  groups:
    - name: node.sizing
      rules:
        # Alert when nodes are consistently under-utilized
        - alert: NodeUnderUtilized
          expr: >
            node:cpu_utilization:avg1h < 0.3
            and node:memory_utilization:avg1h < 0.3
          for: 7d
          labels:
            severity: info
          annotations:
            summary: "Node {{ $labels.node }} has been under 30% utilization for 7 days"
            description: "Consider downsizing or consolidating workloads"

        # Alert when nodes are approaching capacity
        - alert: NodeNearCapacity
          expr: >
            node:cpu_utilization:avg1h > 0.85
            or node:memory_utilization:avg1h > 0.85
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "Node {{ $labels.node }} is above 85% utilization"
            description: "Consider adding capacity or scaling up"
```

## Cost Impact of Right-Sizing

The savings from right-sizing can be substantial. Here is a rough estimate based on common scenarios:

- Moving from 8-core to 4-core nodes when utilization is below 40%: ~45% compute cost reduction
- Switching from general-purpose to specialized instance types: 10-25% savings
- Reducing from 5 worker nodes to 3 after consolidation: 40% compute cost reduction

Even a 20% reduction in compute costs across a cluster with 20 worker nodes running on a major cloud provider can save thousands of dollars per month.

## Summary

Right-sizing Talos Linux nodes is one of the highest-impact cost optimization strategies available. Start by collecting usage data, categorize your workloads by resource profile, calculate optimal node sizes with appropriate headroom, and set up ongoing monitoring to catch drift. Talos Linux makes this process more predictable than traditional distributions thanks to its minimal and consistent system overhead. Review your sizing quarterly at minimum, and use VPA recommendations to keep pod-level resource requests aligned with actual usage.
