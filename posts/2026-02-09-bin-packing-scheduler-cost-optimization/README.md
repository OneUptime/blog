# How to Configure Bin Packing Scheduler Profile for Cost Optimization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Scheduling, Cost-Optimization

Description: Learn how to configure Kubernetes scheduler bin packing profile to maximize node utilization and minimize infrastructure costs through efficient pod placement.

---

Infrastructure costs in Kubernetes scale with the number of active nodes. Spreading pods evenly across many nodes increases costs, while packing pods tightly onto fewer nodes reduces expenses by allowing unused nodes to be terminated. Bin packing scheduling strategy maximizes node utilization, keeping pods on as few nodes as possible while meeting resource requirements and constraints.

This guide will show you how to configure the Kubernetes scheduler for bin packing to optimize infrastructure costs.

## Understanding Bin Packing Strategy

The default Kubernetes scheduler uses a balanced allocation strategy that spreads pods across nodes to maximize available resources on each node. This improves reliability but increases costs by keeping many nodes partially utilized.

Bin packing inverts this logic by preferring nodes with the least available resources after scheduling. This concentrates pods onto fewer nodes, allowing cluster autoscaler to remove unused nodes and reduce costs.

## Configuring Bin Packing Scheduler Profile

Create a scheduler configuration with bin packing scoring:

```yaml
# scheduler-config.yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
- schedulerName: bin-packing-scheduler
  plugins:
    score:
      enabled:
      - name: NodeResourcesFit
        weight: 10  # High weight for bin packing
      # Disable balanced allocation
      disabled:
      - name: NodeResourcesBalancedAllocation
  pluginConfig:
  - name: NodeResourcesFit
    args:
      scoringStrategy:
        type: MostAllocated  # Key setting for bin packing
        resources:
        - name: cpu
          weight: 1
        - name: memory
          weight: 1
```

The `MostAllocated` strategy gives higher scores to nodes with more resources already allocated, packing pods tightly.

## Deploying the Bin Packing Scheduler

Create a ConfigMap with the configuration:

```bash
kubectl create configmap scheduler-config \
  --from-file=scheduler-config.yaml \
  -n kube-system
```

Deploy a custom scheduler using this configuration:

```yaml
# bin-packing-scheduler.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bin-packing-scheduler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      component: bin-packing-scheduler
  template:
    metadata:
      labels:
        component: bin-packing-scheduler
    spec:
      serviceAccountName: kube-scheduler
      containers:
      - name: scheduler
        image: registry.k8s.io/kube-scheduler:v1.28.0
        command:
        - kube-scheduler
        - --config=/etc/kubernetes/scheduler-config.yaml
        - --leader-elect=false
        - --v=2
        volumeMounts:
        - name: config
          mountPath: /etc/kubernetes
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: scheduler-config
```

Apply the deployment:

```bash
kubectl apply -f bin-packing-scheduler.yaml
```

## Using the Bin Packing Scheduler

Configure pods to use the bin packing scheduler:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: batch-workers
spec:
  replicas: 20
  selector:
    matchLabels:
      app: batch-worker
  template:
    metadata:
      labels:
        app: batch-worker
    spec:
      schedulerName: bin-packing-scheduler
      containers:
      - name: worker
        image: batch-worker:latest
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
```

These pods pack tightly onto available nodes rather than spreading out.

## Adjusting Resource Weights

Prioritize CPU or memory for bin packing:

```yaml
pluginConfig:
- name: NodeResourcesFit
  args:
    scoringStrategy:
      type: MostAllocated
      resources:
      # Prioritize CPU packing
      - name: cpu
        weight: 3
      # Less emphasis on memory
      - name: memory
        weight: 1
```

This packs CPU-intensive workloads more aggressively while allowing more memory headroom.

## Combining with Cluster Autoscaler

Bin packing works best with cluster autoscaler:

```yaml
# cluster-autoscaler-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-config
  namespace: kube-system
data:
  config: |
    {
      "scaleDownEnabled": true,
      "scaleDownDelayAfterAdd": "10m",
      "scaleDownUnneededTime": "10m",
      "scaleDownUtilizationThreshold": 0.5
    }
```

The autoscaler removes nodes when utilization drops below 50%, working in tandem with bin packing to minimize node count.

## Hybrid Scheduling Strategy

Use bin packing for batch workloads and balanced allocation for production services:

```yaml
# scheduler-config.yaml with multiple profiles
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
# Default balanced allocation for production
- schedulerName: default-scheduler
  plugins:
    score:
      enabled:
      - name: NodeResourcesBalancedAllocation
        weight: 1

# Bin packing for batch workloads
- schedulerName: bin-packing-scheduler
  plugins:
    score:
      enabled:
      - name: NodeResourcesFit
        weight: 10
  pluginConfig:
  - name: NodeResourcesFit
    args:
      scoringStrategy:
        type: MostAllocated
        resources:
        - name: cpu
          weight: 1
        - name: memory
          weight: 1
```

Production services use balanced allocation for reliability while batch jobs use bin packing for cost efficiency.

## Resource-Specific Bin Packing

Pack based on specific resource types:

```yaml
# CPU-optimized bin packing
pluginConfig:
- name: NodeResourcesFit
  args:
    scoringStrategy:
      type: MostAllocated
      resources:
      - name: cpu
        weight: 10
      - name: memory
        weight: 1
      - name: ephemeral-storage
        weight: 1
```

This aggressively packs CPU while being more lenient with memory and storage distribution.

## Balancing Bin Packing with Availability

Add pod topology spread to prevent over-concentration:

```yaml
spec:
  schedulerName: bin-packing-scheduler
  topologySpreadConstraints:
  - maxSkew: 2
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: ScheduleAnyway
    labelSelector:
      matchLabels:
        app: batch-worker
  containers:
  - name: worker
    image: batch-worker:latest
```

This packs pods tightly but maintains some distribution across zones for basic fault tolerance.

## Monitoring Cost Savings

Track node utilization and cost metrics:

```bash
# Check node resource utilization
kubectl top nodes

# Count active nodes
kubectl get nodes --no-headers | wc -l

# View pods per node
kubectl get pods --all-namespaces -o wide | \
  awk '{print $8}' | sort | uniq -c

# Calculate average node utilization
kubectl top nodes --no-headers | \
  awk '{cpu+=$3; mem+=$5} END {print "Avg CPU:", cpu/NR"%", "Avg Memory:", mem/NR"%"}'
```

Compare these metrics before and after implementing bin packing.

## Calculating Cost Impact

Estimate cost savings from reduced node count:

```bash
# Nodes before bin packing
NODES_BEFORE=20
# Nodes after bin packing
NODES_AFTER=12
# Cost per node per month
COST_PER_NODE=100

# Monthly savings
echo "$(( ($NODES_BEFORE - $NODES_AFTER) * $COST_PER_NODE ))"
# Output: 800

# Annual savings
echo "$(( ($NODES_BEFORE - $NODES_AFTER) * $COST_PER_NODE * 12 ))"
# Output: 9600
```

## Handling Resource Fragmentation

Bin packing can cause fragmentation where nodes have small amounts of free resources insufficient for any pod:

```yaml
# Add node affinity to drain fragmented nodes
affinity:
  nodeAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 50
      preference:
        matchExpressions:
        - key: node-state
          operator: NotIn
          values:
          - fragmented
```

Label fragmented nodes and use affinity to avoid them, allowing autoscaler to drain and remove them.

## PriorityClass for Bin Packing

Use priority classes to control which workloads pack:

```yaml
# high-priority.yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000
globalDefault: false
description: "High priority workloads that spread for availability"
---
# low-priority.yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: low-priority-binpack
value: 100
globalDefault: false
description: "Low priority workloads that bin pack for cost savings"
```

Apply priority classes:

```yaml
spec:
  priorityClassName: low-priority-binpack
  schedulerName: bin-packing-scheduler
```

Low-priority jobs pack tightly and can be preempted if high-priority workloads need resources.

## Testing Bin Packing Effectiveness

Deploy test workloads and observe scheduling behavior:

```bash
# Create test deployment
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: binpack-test
spec:
  replicas: 30
  selector:
    matchLabels:
      app: test
  template:
    metadata:
      labels:
        app: test
    spec:
      schedulerName: bin-packing-scheduler
      containers:
      - name: nginx
        image: nginx:alpine
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
EOF

# Wait for all pods to schedule
kubectl wait --for=condition=ready pod -l app=test --timeout=300s

# Check pod distribution
kubectl get pods -l app=test -o wide | \
  awk '{print $7}' | sort | uniq -c | sort -rn

# Verify packing onto fewer nodes
kubectl get nodes -o custom-columns=NAME:.metadata.name,CPU-USED:.status.allocatable.cpu,PODS:.status.allocatable.pods
```

## Best Practices

Use bin packing for batch jobs, CI/CD workers, and non-critical workloads that tolerate variable performance. Don't use it for latency-sensitive production services that benefit from resource headroom.

Combine bin packing with pod disruption budgets to prevent excessive disruption during node drainage:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: batch-worker-pdb
spec:
  minAvailable: 50%
  selector:
    matchLabels:
      app: batch-worker
```

Set appropriate resource requests to ensure bin packing makes informed decisions. Without requests, the scheduler can't effectively pack pods.

Monitor node utilization trends over time. If utilization drops, investigate whether bin packing is working correctly or if autoscaler is too aggressive.

Start with a conservative bin packing approach and tune aggressively based on observed results. Test in non-production environments first.

## Conclusion

Bin packing scheduling strategy significantly reduces infrastructure costs by maximizing node utilization and minimizing total node count. By packing pods onto fewer nodes, you enable cluster autoscaler to remove unused capacity, directly reducing cloud spending.

Configure bin packing for batch workloads, development environments, and non-critical services. Maintain balanced allocation for production services requiring high availability. Use hybrid scheduling strategies to optimize different workload types appropriately.

Monitor cost savings and node utilization to validate bin packing effectiveness. Adjust resource weights and combine with topology spread constraints to balance cost optimization with availability requirements. The infrastructure cost savings often justify the effort of implementing and tuning bin packing schedulers.
