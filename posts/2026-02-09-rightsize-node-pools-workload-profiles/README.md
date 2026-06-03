# How to Right-Size Kubernetes Cluster Node Pools Based

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cost Optimization, Operation

Description: Learn how to optimize Kubernetes node pool configurations by analyzing workload resource profiles and matching them with appropriate instance types for cost efficiency.

---

Using a single node type for all workloads leads to inefficiency. CPU-intensive workloads waste money on memory-optimized instances, while memory-heavy workloads struggle on compute-optimized nodes. Right-sizing node pools by matching instance types to workload profiles reduces costs while maintaining performance.

## Understanding Workload Profiles

Workload profiles describe resource usage patterns. CPU-bound workloads need high CPU-to-memory ratios. Memory-bound workloads require the opposite. Balanced workloads use CPU and memory proportionally. Network-intensive and storage-intensive workloads have specialized needs.

Analyzing actual resource usage reveals workload profiles. Requested resources don't reflect actual usage. Profile workloads based on what they consume, not what they request.

## Analyzing Current Resource Usage

Query Prometheus for actual resource consumption patterns.

```promql
# CPU-to-memory ratio for each pod
(
  avg by (namespace, pod) (
    rate(container_cpu_usage_seconds_total{container!="",pod!=""}[1h])
  )
)
/
clamp_min(
  avg by (namespace, pod) (
    container_memory_working_set_bytes{container!="",pod!=""} / 1024 / 1024 / 1024
  ),
  0.1
)

# High ratio = CPU-bound, low ratio = memory-bound
# Ratio around 0.5 = balanced

# Identify CPU-bound pods (ratio > 1)
(
  avg by (namespace, pod) (
    rate(container_cpu_usage_seconds_total{container!="",pod!=""}[1h])
  )
)
/
clamp_min(
  avg by (namespace, pod) (
    container_memory_working_set_bytes{container!="",pod!=""} / 1024 / 1024 / 1024
  ),
  0.1
) > 1

# Identify memory-bound pods (ratio < 0.3)
(
  avg by (namespace, pod) (
    rate(container_cpu_usage_seconds_total{container!="",pod!=""}[1h])
  )
)
/
clamp_min(
  avg by (namespace, pod) (
    container_memory_working_set_bytes{container!="",pod!=""} / 1024 / 1024 / 1024
  ),
  0.1
) < 0.3
```

This identifies which workloads need specialized node types.

## Categorizing Workloads

Group workloads into categories based on resource profiles.

```python
#!/usr/bin/env python3
import requests
import pandas as pd

def fetch_workload_metrics():
    """Fetch resource usage for all workloads"""
    queries = {
        'cpu': 'avg by (namespace, pod) (rate(container_cpu_usage_seconds_total{container!="",pod!=""}[24h]))',
        'memory': 'avg by (namespace, pod) (container_memory_working_set_bytes{container!="",pod!=""})',
        'network_rx': 'avg by (namespace, pod) (rate(container_network_receive_bytes_total{pod!=""}[24h]))',
        'network_tx': 'avg by (namespace, pod) (rate(container_network_transmit_bytes_total{pod!=""}[24h]))',
    }

    results = {}
    for metric, query in queries.items():
        response = requests.get(
            'http://prometheus:9090/api/v1/query',
            params={'query': query}
        )
        results[metric] = response.json()['data']['result']

    return results

def categorize_workload(cpu, memory_gb, network_bytes_per_second):
    """Categorize workload based on resource profile"""
    cpu_memory_ratio = cpu / max(memory_gb, 0.1)
    network_mbps = network_bytes_per_second * 8 / 1000 / 1000

    # CPU-bound: High CPU relative to memory
    if cpu_memory_ratio > 1.5:
        return 'cpu-bound'

    # Memory-bound: High memory relative to CPU
    elif cpu_memory_ratio < 0.3:
        return 'memory-bound'

    # Network-intensive: High network usage
    elif network_mbps > 100:  # > 100 Mbps
        return 'network-intensive'

    # Balanced workload
    else:
        return 'balanced'

def analyze_workloads():
    """Analyze all workloads and categorize them"""
    metrics = fetch_workload_metrics()

    workloads = []
    for result in metrics['cpu']:
        namespace = result['metric']['namespace']
        pod = result['metric']['pod']
        cpu = float(result['value'][1])

        # Find corresponding memory and network metrics
        memory = next((float(m['value'][1]) for m in metrics['memory']
                      if m['metric']['namespace'] == namespace
                      and m['metric']['pod'] == pod), 0)

        network_rx = next((float(n['value'][1]) for n in metrics['network_rx']
                          if n['metric']['namespace'] == namespace
                          and n['metric']['pod'] == pod), 0)

        network_tx = next((float(n['value'][1]) for n in metrics['network_tx']
                          if n['metric']['namespace'] == namespace
                          and n['metric']['pod'] == pod), 0)

        memory_gb = memory / 1024 / 1024 / 1024
        network_bytes_per_second = network_rx + network_tx

        category = categorize_workload(cpu, memory_gb, network_bytes_per_second)

        workloads.append({
            'namespace': namespace,
            'pod': pod,
            'cpu_cores': round(cpu, 2),
            'memory_gb': round(memory_gb, 2),
            'network_mbps': round(network_bytes_per_second * 8 / 1000 / 1000, 2),
            'category': category
        })

    df = pd.DataFrame(workloads)
    print("\nWorkload Categories:")
    print(df.groupby('category').agg({
        'pod': 'count',
        'cpu_cores': 'sum',
        'memory_gb': 'sum'
    }))

    return df

# Run analysis
workloads_df = analyze_workloads()
```

This script categorizes workloads for optimal node pool assignment.

## Designing Node Pool Strategy

Create specialized node pools for different workload categories.

The following examples use Karpenter on AWS and assume an `EC2NodeClass` named `default` already exists.

```yaml
# Compute-optimized pool for CPU-bound workloads
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: compute-optimized
spec:
  template:
    metadata:
      labels:
        workload-type: cpu-bound
        instance-category: compute-optimized
    spec:
      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: default
      requirements:
      - key: node.kubernetes.io/instance-type
        operator: In
        values: ["c6i.2xlarge"] # 8 vCPU, 16 GiB RAM (1:2 ratio)
      taints:
      - key: workload-type
        value: cpu-bound
        effect: NoSchedule
  limits:
    cpu: "160"

---
# Memory-optimized pool for memory-bound workloads
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: memory-optimized
spec:
  template:
    metadata:
      labels:
        workload-type: memory-bound
        instance-category: memory-optimized
    spec:
      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: default
      requirements:
      - key: node.kubernetes.io/instance-type
        operator: In
        values: ["r6i.2xlarge"] # 8 vCPU, 64 GiB RAM (1:8 ratio)
      taints:
      - key: workload-type
        value: memory-bound
        effect: NoSchedule
  limits:
    cpu: "80"

---
# Balanced pool for general workloads
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: general-purpose
spec:
  template:
    metadata:
      labels:
        workload-type: balanced
        instance-category: general-purpose
    spec:
      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: default
      requirements:
      - key: node.kubernetes.io/instance-type
        operator: In
        values: ["m6i.2xlarge"] # 8 vCPU, 32 GiB RAM (1:4 ratio)
  limits:
    cpu: "240"
```

Taints and labels ensure workloads land on appropriate node types.

## Scheduling Workloads to Node Pools

Configure pod specifications to target appropriate node pools.

```yaml
# CPU-bound workload
apiVersion: apps/v1
kind: Deployment
metadata:
  name: video-encoder
spec:
  replicas: 5
  selector:
    matchLabels:
      app: video-encoder
  template:
    metadata:
      labels:
        app: video-encoder
    spec:
      nodeSelector:
        workload-type: cpu-bound
      tolerations:
      - key: workload-type
        operator: Equal
        value: cpu-bound
        effect: NoSchedule
      containers:
      - name: encoder
        image: video-encoder:2.0
        resources:
          requests:
            cpu: "2000m"
            memory: "4Gi"
          limits:
            memory: "8Gi"

---
# Memory-bound workload
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cache-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cache-service
  template:
    metadata:
      labels:
        app: cache-service
    spec:
      nodeSelector:
        workload-type: memory-bound
      tolerations:
      - key: workload-type
        operator: Equal
        value: memory-bound
        effect: NoSchedule
      containers:
      - name: cache
        image: redis:7
        resources:
          requests:
            cpu: "500m"
            memory: "16Gi"
          limits:
            memory: "24Gi"

---
# Balanced workload
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 10
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      nodeSelector:
        workload-type: balanced
      containers:
      - name: api
        image: api-server:1.0
        resources:
          requests:
            cpu: "500m"
            memory: "2Gi"
          limits:
            memory: "4Gi"
```

Node selectors and tolerations ensure proper placement.

## Cost Analysis by Node Type

Calculate cost efficiency for different node pool configurations.

```python
def calculate_node_pool_costs():
    """Calculate monthly costs for different node pool strategies"""

    # AWS pricing (adjust for your provider)
    instance_pricing = {
        'm6i.2xlarge': 0.384,    # 8 vCPU, 32 GB - Balanced
        'c6i.2xlarge': 0.34,     # 8 vCPU, 16 GB - Compute
        'r6i.2xlarge': 0.504,    # 8 vCPU, 64 GB - Memory
        'm6i.4xlarge': 0.768,    # 16 vCPU, 64 GB - Balanced
    }

    # Scenario 1: Single node type (m6i.2xlarge for everything)
    single_type = {
        'instance': 'm6i.2xlarge',
        'count': 30,
        'hourly': instance_pricing['m6i.2xlarge'],
    }
    single_monthly = single_type['count'] * single_type['hourly'] * 730

    # Scenario 2: Optimized node pools
    optimized = {
        'compute': {'count': 10, 'type': 'c6i.2xlarge'},
        'memory': {'count': 5, 'type': 'r6i.2xlarge'},
        'balanced': {'count': 12, 'type': 'm6i.2xlarge'},
    }

    optimized_monthly = sum([
        pool['count'] * instance_pricing[pool['type']] * 730
        for pool in optimized.values()
    ])

    print("Monthly Cost Comparison:")
    print(f"Single node type (m6i.2xlarge): ${single_monthly:,.2f}")
    print(f"Optimized node pools: ${optimized_monthly:,.2f}")
    print(f"Monthly savings: ${single_monthly - optimized_monthly:,.2f}")
    print(f"Annual savings: ${(single_monthly - optimized_monthly) * 12:,.2f}")
    print(f"Cost reduction: {((single_monthly - optimized_monthly) / single_monthly * 100):.1f}%")

calculate_node_pool_costs()
```

This demonstrates cost savings from proper node pool sizing.

## Handling Burstable Workloads

Some workloads have variable resource needs. Use spot instances or burstable instance types.

```yaml
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: burstable-compute
spec:
  template:
    metadata:
      labels:
        workload-type: burstable
        spot-instance: "true"
    spec:
      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: default
      requirements:
      - key: node.kubernetes.io/instance-type
        operator: In
        values: ["c6i.2xlarge"]
      - key: karpenter.sh/capacity-type
        operator: In
        values: ["spot"]
      taints:
      - key: spot-instance
        value: "true"
        effect: NoSchedule
  limits:
    cpu: "400"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: batch-job
spec:
  replicas: 10
  selector:
    matchLabels:
      app: batch-job
  template:
    metadata:
      labels:
        app: batch-job
    spec:
      nodeSelector:
        workload-type: burstable
      tolerations:
      - key: spot-instance
        operator: Equal
        value: "true"
        effect: NoSchedule
      containers:
      - name: worker
        image: batch-worker:1.0
```

Spot instances provide significant cost savings for fault-tolerant workloads.

## Storage-Optimized Node Pools

Workloads requiring high disk I/O benefit from storage-optimized instances.

```yaml
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: storage-optimized
spec:
  template:
    metadata:
      labels:
        workload-type: storage-intensive
        storage-type: nvme-ssd
    spec:
      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: default
      requirements:
      - key: node.kubernetes.io/instance-type
        operator: In
        values: ["i4i.2xlarge"] # Local NVMe SSDs
      taints:
      - key: workload-type
        value: storage-intensive
        effect: NoSchedule
  limits:
    cpu: "40"
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  serviceName: database
  replicas: 3
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      nodeSelector:
        workload-type: storage-intensive
      tolerations:
      - key: workload-type
        operator: Equal
        value: storage-intensive
        effect: NoSchedule
      containers:
      - name: postgres
        image: postgres:15
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: data
        hostPath:
          path: /mnt/nvme0n1/postgres
          type: DirectoryOrCreate
```

Local NVMe storage provides exceptional I/O performance for databases.

## GPU Node Pools

Machine learning workloads need GPU-enabled nodes.

```yaml
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: gpu-compute
spec:
  template:
    metadata:
      labels:
        workload-type: gpu
        gpu-type: v100
    spec:
      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: default
      requirements:
      - key: node.kubernetes.io/instance-type
        operator: In
        values: ["p3.2xlarge"] # 1 NVIDIA V100 GPU
      taints:
      - key: nvidia.com/gpu
        value: "true"
        effect: NoSchedule
  limits:
    cpu: "80"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-training
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ml-training
  template:
    metadata:
      labels:
        app: ml-training
    spec:
      nodeSelector:
        workload-type: gpu
      tolerations:
      - key: nvidia.com/gpu
        operator: Equal
        value: "true"
        effect: NoSchedule
      containers:
      - name: trainer
        image: ml-trainer:1.0
        resources:
          limits:
            nvidia.com/gpu: 1
```

GPU nodes cost significantly more, so use them only for workloads that benefit.

## Monitoring Node Pool Efficiency

Track utilization and costs per node pool.

These Prometheus rules assume node exporter metrics are relabeled with a `node` label and kube-state-metrics exposes node labels.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: node-pool-efficiency-rules
  namespace: monitoring
data:
  rules.yml: |
    groups:
    - name: node_pool_efficiency
      interval: 5m
      rules:
        # CPU utilization by node pool
        - record: node_pool:cpu_utilization:avg
          expr: |
            avg by (label_instance_category) (
              (
                1 - avg by (node) (
                  rate(node_cpu_seconds_total{mode="idle"}[5m])
                )
              )
              * on (node) group_left(label_instance_category)
                kube_node_labels{label_instance_category!=""}
            ) * 100

        # Memory utilization by node pool
        - record: node_pool:memory_utilization:avg
          expr: |
            avg by (label_instance_category) (
              (
                1 - (
                  node_memory_MemAvailable_bytes
                  / node_memory_MemTotal_bytes
                )
              )
              * on (node) group_left(label_instance_category)
                kube_node_labels{label_instance_category!=""}
            ) * 100

        # Alert on underutilized node pools
        - alert: NodePoolUnderutilized
          expr: |
            node_pool:cpu_utilization:avg < 30
            and
            node_pool:memory_utilization:avg < 30
          for: 4h
          labels:
            severity: info
          annotations:
            summary: "Node pool {{ $labels.label_instance_category }} underutilized"
            description: "Consider reducing node pool size or consolidating workloads"
```

Monitor efficiency to identify optimization opportunities.

## Dynamic Node Pool Scaling

Automatically scale node pools based on pending pod requirements.

```yaml
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: compute-optimized
spec:
  template:
    metadata:
      labels:
        workload-type: cpu-bound
        instance-category: compute-optimized
    spec:
      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: default
      requirements:
      - key: node.kubernetes.io/instance-type
        operator: In
        values: ["c6i.2xlarge"]
  limits:
    cpu: "160"
  disruption:
    consolidationPolicy: WhenEmptyOrUnderutilized
    consolidateAfter: 10m
```

Karpenter adds nodes when pods can't schedule and consolidates empty or underutilized nodes.

## Migration Strategy

Gradually migrate workloads to optimized node pools.

```bash
# Phase 1: Create new Karpenter node pools
kubectl apply -f node-pools.yaml

# Phase 2: Label workloads for migration
kubectl label deployment video-encoder workload-type=cpu-bound
kubectl label deployment cache-service workload-type=memory-bound

# Phase 3: Update pod specs with node selectors and tolerations
kubectl patch deployment video-encoder -p '{"spec":{"template":{"spec":{"nodeSelector":{"workload-type":"cpu-bound"},"tolerations":[{"key":"workload-type","operator":"Equal","value":"cpu-bound","effect":"NoSchedule"}]}}}}'

# Phase 4: Roll out changes
kubectl rollout restart deployment video-encoder

# Phase 5: Monitor for issues
kubectl rollout status deployment video-encoder

# Phase 6: Drain old nodes once workloads migrated
kubectl drain old-node-1 --ignore-daemonsets --delete-emptydir-data
```

Gradual migration minimizes disruption.

## Best Practices

Profile workloads in production under realistic load. Development patterns don't match production usage.

Start with 2-3 node pool types: compute-optimized, memory-optimized, and general-purpose. Don't over-segment initially.

Use taints and tolerations to enforce node pool assignments. Prevent workloads from landing on expensive specialized nodes accidentally.

Set appropriate scaling limits and consolidation settings per node pool. Memory-heavy pools often need more conservative consolidation settings.

Monitor cost and utilization metrics continuously. Adjust node pool configurations based on actual usage.

Document which workloads belong in which node pools. Help developers make correct placement decisions.

Review and optimize quarterly. Workload characteristics change as applications evolve.

## Conclusion

Right-sizing node pools based on workload resource profiles significantly reduces infrastructure costs while maintaining performance. Analyze actual resource usage to categorize workloads, create specialized node pools for different profiles, and use node selectors with taints to enforce proper placement. Monitor utilization and costs to identify optimization opportunities. With properly sized node pools, teams run workloads efficiently on instance types matched to their requirements.
