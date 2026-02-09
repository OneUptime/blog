# How to Tune Cluster Autoscaler Scale-Down Delay and Utilization Threshold

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cluster Autoscaler, Node Management

Description: Configure Cluster Autoscaler scale-down delay and utilization threshold parameters to control when underutilized nodes are removed, balancing cost savings with workload stability.

---

Cluster Autoscaler removes underutilized nodes to reduce cloud costs, but aggressive scale-down can cause unnecessary pod churn and capacity shortages during traffic fluctuations. The scale-down delay and utilization threshold parameters let you control how conservatively the autoscaler removes nodes.

By tuning these settings, you can prevent premature node removal during temporary load dips while still achieving cost savings during sustained low-utilization periods. The right configuration depends on your workload patterns, cost sensitivity, and tolerance for pod disruption.

## Understanding Scale-Down Parameters

The scale-down delay controls how long a node must be underutilized before becoming eligible for removal. The utilization threshold defines what "underutilized" means - nodes with resource requests below this threshold can be removed if they have been underutilized for the delay period.

These parameters work together to prevent flapping where nodes are repeatedly added and removed. Longer delays and higher thresholds make scale-down more conservative, while shorter delays and lower thresholds enable more aggressive cost optimization.

## Basic Scale-Down Configuration

Configure scale-down behavior in Cluster Autoscaler deployment.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
    spec:
      serviceAccountName: cluster-autoscaler
      containers:
      - name: cluster-autoscaler
        image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.27.0
        command:
        - ./cluster-autoscaler
        - --v=4
        - --cloud-provider=aws
        - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled
        - --scale-down-enabled=true
        - --scale-down-delay-after-add=10m
        - --scale-down-unneeded-time=10m
        - --scale-down-utilization-threshold=0.5
        - --skip-nodes-with-system-pods=false
```

This configuration waits 10 minutes after adding a node before considering scale-down, requires nodes to be underutilized for 10 minutes, and considers nodes with less than 50% utilization as candidates for removal.

## Conservative Scale-Down for Stable Workloads

Configure longer delays for workloads with predictable patterns.

```yaml
command:
- ./cluster-autoscaler
- --scale-down-delay-after-add=15m
- --scale-down-unneeded-time=30m
- --scale-down-utilization-threshold=0.6
- --scale-down-delay-after-delete=10m
- --scale-down-delay-after-failure=5m
```

These conservative settings reduce node churn for stable workloads. The 30-minute unneeded time ensures nodes aren't removed during brief utilization dips, and the 60% threshold keeps more capacity available.

## Aggressive Scale-Down for Cost Optimization

Configure shorter delays to maximize cost savings.

```yaml
command:
- ./cluster-autoscaler
- --scale-down-delay-after-add=5m
- --scale-down-unneeded-time=5m
- --scale-down-utilization-threshold=0.3
- --scale-down-delay-after-delete=2m
- --scale-down-delay-after-failure=2m
- --max-nodes-total=100
- --max-empty-bulk-delete=10
```

These aggressive settings remove underutilized nodes quickly, using a low 30% threshold. This is appropriate for non-production environments or workloads that handle pod rescheduling well.

## Different Thresholds for Different Node Types

Use node annotations to configure per-node-group behavior.

```yaml
# For spot instance node groups
command:
- ./cluster-autoscaler
- --scale-down-utilization-threshold=0.4  # More aggressive for spot nodes
- --scale-down-unneeded-time=5m

# Annotate spot nodes to allow faster scale-down
kubectl annotate node spot-node-1 \
  cluster-autoscaler.kubernetes.io/scale-down-disabled=false
```

Spot instances can use more aggressive scale-down since they are cheaper and can be reclaimed by the cloud provider anyway.

## Preventing Scale-Down During Specific Periods

Temporarily disable scale-down during critical periods.

```yaml
# Disable scale-down entirely
command:
- ./cluster-autoscaler
- --scale-down-enabled=false

# Or set very long delays
command:
- ./cluster-autoscaler
- --scale-down-unneeded-time=24h
```

Use this during major events, deployments, or other periods when capacity stability is critical.

## Monitoring Scale-Down Behavior

Track when and why nodes are removed.

```bash
# Watch for scale-down events
kubectl get events -n kube-system --watch | grep -i scale

# Check Cluster Autoscaler logs
kubectl logs -n kube-system deployment/cluster-autoscaler | \
  grep -i "scale down"

# View node utilization
kubectl top nodes

# Check which nodes are underutilized
kubectl get nodes -o json | \
  jq '.items[] | {
    name: .metadata.name,
    allocatable_cpu: .status.allocatable.cpu,
    allocatable_mem: .status.allocatable.memory
  }'

# Check for nodes pending deletion
kubectl get nodes -o json | \
  jq '.items[] |
    select(.metadata.annotations["cluster-autoscaler.kubernetes.io/scale-down-disabled"] != null) |
    .metadata.name'
```

Monitor these metrics to understand actual scale-down patterns and adjust thresholds accordingly.

## Handling DaemonSets and System Pods

Configure how DaemonSets affect scale-down decisions.

```yaml
command:
- ./cluster-autoscaler
- --skip-nodes-with-system-pods=false
- --skip-nodes-with-local-storage=false
```

Setting skip-nodes-with-system-pods to false allows removing nodes even if they run system pods like kube-proxy or monitoring agents, as these will be rescheduled automatically.

## Preventing Premature Scale-Down

Use pod disruption budgets to protect workloads.

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-app-pdb
spec:
  minAvailable: 5
  selector:
    matchLabels:
      app: web-app
---
# Cluster Autoscaler respects PDBs
command:
- ./cluster-autoscaler
- --scale-down-unneeded-time=10m
```

Even with aggressive scale-down settings, Cluster Autoscaler won't remove nodes if doing so would violate pod disruption budgets.

## Balancing Scale-Down with Pod Priority

Configure priorities to influence which nodes get removed.

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: low-priority
value: 1000
globalDefault: false
description: "Low priority pods can be evicted for scale-down"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 10000
globalDefault: false
description: "High priority pods block scale-down"
```

Nodes with only low-priority pods are more likely to be removed during scale-down.

## Configuring Per-Node-Group Settings

Use node group specific configurations on cloud provider side.

```bash
# AWS Auto Scaling Group tags
aws autoscaling create-or-update-tags \
  --tags \
  "ResourceId=my-asg,ResourceType=auto-scaling-group,Key=k8s.io/cluster-autoscaler/node-template/label/workload-type,Value=batch,PropagateAtLaunch=true"

# Configure different scale-down for batch workloads
command:
- ./cluster-autoscaler
- --scale-down-unneeded-time=5m  # Quick scale-down for batch nodes
```

Different node groups can have different characteristics that justify different scale-down behavior.

## Measuring Scale-Down Impact

Track the impact of scale-down configuration changes.

```bash
# Count scale-down events over time
kubectl get events -n kube-system --field-selector reason=ScaleDown \
  --sort-by='.lastTimestamp' | wc -l

# Check node count over time
watch -n 60 'kubectl get nodes | wc -l'

# Monitor pod evictions
kubectl get events --all-namespaces \
  --field-selector reason=Evicted \
  --sort-by='.lastTimestamp'

# Calculate cost savings
# Track node count and instance types to estimate cost reduction
```

Use these metrics to validate that your scale-down configuration achieves desired cost savings without excessive pod churn.

## Tuning for Specific Workload Patterns

Different patterns require different configurations.

```yaml
# For bursty workloads
command:
- --scale-down-delay-after-add=20m  # Wait longer after bursts
- --scale-down-unneeded-time=15m
- --scale-down-utilization-threshold=0.5

# For steady workloads
command:
- --scale-down-delay-after-add=10m
- --scale-down-unneeded-time=10m
- --scale-down-utilization-threshold=0.4

# For batch processing
command:
- --scale-down-delay-after-add=5m
- --scale-down-unneeded-time=5m
- --scale-down-utilization-threshold=0.3

# For always-on services
command:
- --scale-down-delay-after-add=30m
- --scale-down-unneeded-time=60m
- --scale-down-utilization-threshold=0.7
```

Match your configuration to observed traffic and usage patterns.

## Best Practices

Start with conservative settings and gradually make them more aggressive based on observed behavior. It's easier to speed up scale-down than to recover from premature node removal.

Set scale-down-delay-after-add longer than your typical traffic spike duration. This prevents removing nodes immediately after traffic bursts that might recur.

Use a utilization threshold that accounts for resource overhead and headroom. A 50% threshold is a good starting point for most workloads.

Monitor pod eviction rates after changing scale-down settings. High eviction rates indicate settings might be too aggressive.

Consider time-of-day patterns when tuning scale-down. Different thresholds might be appropriate for business hours versus overnight periods.

## Common Issues

Scale-down that is too aggressive causes constant pod rescheduling, which wastes resources and can impact service availability.

Scale-down that is too conservative fails to achieve cost savings, leaving underutilized nodes running unnecessarily.

Inconsistent scale-down behavior often results from not accounting for DaemonSets or system pods that create baseline resource requests on all nodes.

## Conclusion

Properly configured scale-down delay and utilization threshold parameters enable Cluster Autoscaler to remove underutilized nodes at the right time, balancing cost optimization with workload stability. By tuning these settings based on your specific workload patterns and operational requirements, you can minimize cloud costs without sacrificing reliability.

The key is understanding your application's traffic patterns and tolerance for pod rescheduling, then configuring conservative enough settings to prevent disruptive flapping while still enabling meaningful cost savings during sustained low-utilization periods. Monitor the results and adjust iteratively to find the optimal configuration for your environment.
