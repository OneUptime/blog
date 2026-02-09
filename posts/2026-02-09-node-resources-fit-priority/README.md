# How to Implement Node Resources Fit Priority for Optimal Placement

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Scheduling, Resource Management

Description: Master the NodeResourcesFit plugin to optimize pod placement based on CPU, memory, and custom resource availability using least allocated, most allocated, and requested-to-capacity ratio strategies.

---

When the Kubernetes scheduler places a pod, it needs to find nodes with enough resources. But "enough" isn't the whole story. Should the scheduler prefer nodes with lots of free resources or pack pods tightly? The answer depends on your goals.

The NodeResourcesFit plugin handles this decision. It filters out nodes without sufficient resources, then scores remaining nodes based on how well they fit the pod's needs. Understanding and configuring this plugin is key to optimal resource utilization.

## How NodeResourcesFit Works

The plugin operates in two phases:

1. **Filter phase**: Eliminate nodes that don't have enough CPU, memory, or other resources to run the pod.
2. **Score phase**: Rank remaining nodes based on a scoring strategy.

The scoring strategy determines whether pods are spread out (least allocated) or packed tightly (most allocated).

## Least Allocated Strategy

The least allocated strategy prefers nodes with the most free resources. This spreads pods across the cluster:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
- schedulerName: default-scheduler
  pluginConfig:
  - name: NodeResourcesFit
    args:
      scoringStrategy:
        type: LeastAllocated
        resources:
        - name: cpu
          weight: 1
        - name: memory
          weight: 1
```

This is the default behavior. It works well for services that need room to scale and helps avoid resource contention.

Deploy a test workload to see it in action:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 10
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
        image: nginx:1.21
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
```

Check where pods landed:

```bash
# View pod distribution
kubectl get pods -l app=web -o wide | awk '{print $7}' | tail -n +2 | sort | uniq -c

# Expected: pods spread across many nodes
```

## Most Allocated Strategy

The most allocated strategy prefers nodes with the least free resources. This packs pods tightly:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
- schedulerName: bin-packing-scheduler
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

Use this for batch workloads or cost optimization in cloud environments where you pay per node:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-processing
spec:
  parallelism: 50
  template:
    spec:
      schedulerName: bin-packing-scheduler
      containers:
      - name: processor
        image: myapp/processor:v1
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
      restartPolicy: Never
```

This concentrates pods on fewer nodes, potentially allowing you to scale down unused nodes.

## Requested to Capacity Ratio

The most flexible strategy is requested-to-capacity ratio. It gives you fine-grained control over scoring:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
- schedulerName: custom-scheduler
  pluginConfig:
  - name: NodeResourcesFit
    args:
      scoringStrategy:
        type: RequestedToCapacityRatio
        resources:
        - name: cpu
          weight: 2  # CPU is more important
        - name: memory
          weight: 1
        requestedToCapacityRatio:
          # Define score function using utilization points
          shape:
          - utilization: 0   # When node is empty
            score: 0         # Score is 0 (don't prefer empty nodes)
          - utilization: 50  # When node is 50% full
            score: 5         # Score is 5
          - utilization: 80  # When node is 80% full
            score: 10        # Score is 10 (prefer fuller nodes)
          - utilization: 100 # When node is full
            score: 0         # Score is 0 (avoid overfull nodes)
```

This creates a target utilization. Nodes around 80% utilization get the highest score, encouraging bin-packing without overloading nodes.

## Weighting Different Resources

You can weight resources differently based on what matters most:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
- schedulerName: memory-optimized-scheduler
  pluginConfig:
  - name: NodeResourcesFit
    args:
      scoringStrategy:
        type: LeastAllocated
        resources:
        - name: cpu
          weight: 1
        - name: memory
          weight: 3  # Memory is 3x more important
```

Use this when you have workloads with specific resource characteristics:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cache-service
spec:
  replicas: 5
  selector:
    matchLabels:
      app: cache
  template:
    metadata:
      labels:
        app: cache
    spec:
      schedulerName: memory-optimized-scheduler
      containers:
      - name: redis
        image: redis:6.2
        resources:
          requests:
            cpu: 100m
            memory: 4Gi  # Memory-heavy workload
          limits:
            cpu: 200m
            memory: 8Gi
```

## Handling Custom Resources

NodeResourcesFit also works with custom resources like GPUs:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
- schedulerName: gpu-scheduler
  pluginConfig:
  - name: NodeResourcesFit
    args:
      scoringStrategy:
        type: LeastAllocated
        resources:
        - name: cpu
          weight: 1
        - name: memory
          weight: 1
        - name: nvidia.com/gpu
          weight: 5  # GPU availability is most important
```

Deploy GPU workloads with this scheduler:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: ml-training
spec:
  template:
    spec:
      schedulerName: gpu-scheduler
      containers:
      - name: training
        image: ml/training:v2
        resources:
          requests:
            cpu: 2000m
            memory: 8Gi
            nvidia.com/gpu: 2
          limits:
            nvidia.com/gpu: 2
      restartPolicy: Never
```

The scheduler will prefer nodes with available GPUs and avoid fragmenting GPU resources.

## Combining with Other Plugins

NodeResourcesFit works alongside other scoring plugins. Control the balance with weights:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
- schedulerName: balanced-scheduler
  plugins:
    score:
      enabled:
      - name: NodeResourcesFit
        weight: 5
      - name: ImageLocality
        weight: 2
      - name: NodeResourcesBalancedAllocation
        weight: 3
  pluginConfig:
  - name: NodeResourcesFit
    args:
      scoringStrategy:
        type: LeastAllocated
        resources:
        - name: cpu
          weight: 1
        - name: memory
          weight: 1
```

Here, NodeResourcesFit contributes 50% of the total score (5 out of 10 total weight), making it the dominant factor but not the only one.

## Real-World Strategy Examples

Here's a configuration for a multi-tenant cluster with different workload types:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
# Services: spread for high availability
- schedulerName: service-scheduler
  pluginConfig:
  - name: NodeResourcesFit
    args:
      scoringStrategy:
        type: LeastAllocated
        resources:
        - name: cpu
          weight: 1
        - name: memory
          weight: 1

# Batch jobs: pack for cost optimization
- schedulerName: batch-scheduler
  pluginConfig:
  - name: NodeResourcesFit
    args:
      scoringStrategy:
        type: MostAllocated
        resources:
        - name: cpu
          weight: 2
        - name: memory
          weight: 1

# ML workloads: optimize for GPU placement
- schedulerName: ml-scheduler
  pluginConfig:
  - name: NodeResourcesFit
    args:
      scoringStrategy:
        type: LeastAllocated
        resources:
        - name: nvidia.com/gpu
          weight: 10
        - name: cpu
          weight: 1
        - name: memory
          weight: 1

# Development: target moderate utilization
- schedulerName: dev-scheduler
  pluginConfig:
  - name: NodeResourcesFit
    args:
      scoringStrategy:
        type: RequestedToCapacityRatio
        resources:
        - name: cpu
          weight: 1
        - name: memory
          weight: 1
        requestedToCapacityRatio:
          shape:
          - utilization: 0
            score: 5
          - utilization: 50
            score: 10
          - utilization: 100
            score: 5
```

## Monitoring Resource Fit Decisions

Track how NodeResourcesFit affects scheduling:

```bash
# Check scheduler metrics
kubectl get --raw /metrics | grep node_resources_fit

# View plugin execution time
kubectl get --raw /metrics | grep scheduler_framework_extension_point_duration_seconds | \
  grep NodeResourcesFit

# Check node resource allocation
kubectl top nodes

# View detailed node allocatable resources
kubectl describe nodes | grep -A 5 "Allocatable:\|Allocated resources:"
```

Create a script to analyze placement effectiveness:

```bash
#!/bin/bash
# analyze-placement.sh - Check if pods are placed optimally

echo "Node Resource Utilization:"
echo ""

kubectl get nodes -o json | jq -r '.items[] |
  {
    name: .metadata.name,
    cpu_capacity: .status.capacity.cpu,
    mem_capacity: .status.capacity.memory,
    cpu_allocatable: .status.allocatable.cpu,
    mem_allocatable: .status.allocatable.memory
  }' | while read node; do

  name=$(echo $node | jq -r .name)

  # Get pod resource requests on this node
  pod_cpu=$(kubectl get pods --field-selector spec.nodeName=$name -A -o json | \
    jq -r '.items[].spec.containers[].resources.requests.cpu // "0"' | \
    sed 's/m//' | awk '{s+=$1} END {print s}')

  pod_mem=$(kubectl get pods --field-selector spec.nodeName=$name -A -o json | \
    jq -r '.items[].spec.containers[].resources.requests.memory // "0"' | \
    sed 's/Mi//' | awk '{s+=$1} END {print s}')

  echo "Node: $name"
  echo "  CPU: ${pod_cpu}m requested"
  echo "  Memory: ${pod_mem}Mi requested"
  echo ""
done
```

## Troubleshooting Placement Issues

When pods aren't placed as expected:

```bash
# Check if NodeResourcesFit filtered nodes
kubectl describe pod <pending-pod> | grep -A 10 Events

# Common issues:
# "Insufficient cpu" - not enough CPU on any node
# "Insufficient memory" - not enough memory on any node
# "Insufficient nvidia.com/gpu" - not enough GPUs available

# View what resources are requested
kubectl get pod <pod-name> -o json | \
  jq '.spec.containers[].resources.requests'

# Compare to node capacity
kubectl get nodes -o json | \
  jq '.items[] | {name: .metadata.name, capacity: .status.capacity}'
```

If many nodes are filtered out, you may need to:

1. Reduce resource requests
2. Add more nodes
3. Remove pods to free resources
4. Adjust node taints and tolerations

## Testing Different Strategies

Compare strategies side-by-side:

```bash
# Deploy with least allocated
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-spread
spec:
  replicas: 20
  selector:
    matchLabels:
      test: spread
  template:
    metadata:
      labels:
        test: spread
    spec:
      containers:
      - name: app
        image: nginx
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
EOF

# Wait for scheduling
kubectl wait --for=condition=Ready pod -l test=spread --timeout=60s

# Check distribution
kubectl get pods -l test=spread -o wide | awk '{print $7}' | sort | uniq -c

# Clean up and test with most allocated
kubectl delete deployment test-spread
# Update scheduler config to MostAllocated
# Redeploy and compare distribution
```

## Best Practices

Follow these guidelines for optimal NodeResourcesFit configuration:

1. **Match strategy to workload**: Use least allocated for services, most allocated for batch.
2. **Weight resources appropriately**: Give higher weight to the resource that matters most.
3. **Consider node costs**: In cloud environments, bin-packing can reduce costs.
4. **Monitor continuously**: Track actual utilization versus target utilization.
5. **Test before deploying**: Validate configuration changes in non-production first.
6. **Document decisions**: Explain why certain scoring strategies are chosen.
7. **Review regularly**: Reassess as workload patterns change.

NodeResourcesFit is one of the most important scheduler plugins. By configuring it thoughtfully, you can optimize for cost, performance, availability, or any combination of these goals.
