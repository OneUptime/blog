# How to Implement Cluster Autoscaler for Dynamic Node Scaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cluster Autoscaler, Scaling, Cost Optimization, Capacity Management

Description: Deploy and configure Kubernetes Cluster Autoscaler to automatically adjust node count based on pod resource needs and optimize infrastructure costs.

---

Cluster Autoscaler automatically adjusts the number of nodes in your cluster based on pod scheduling requirements. When pods cannot schedule due to insufficient resources, it adds nodes. When nodes sit underutilized, it removes them. This dynamic scaling optimizes both availability and cost.

## How Cluster Autoscaler Works

The autoscaler runs as a deployment in your cluster, continuously monitoring pending pods and node utilization. Every 10 seconds by default, it checks for unschedulable pods. If found, it determines which node group can accommodate them and triggers node additions.

For scale-down, the autoscaler evaluates nodes every 10 minutes. Nodes below the utilization threshold (default 50%) with all pods safely reschedulable to other nodes become removal candidates. After a configurable delay, the autoscaler cordons, drains, and terminates these nodes.

The autoscaler respects pod disruption budgets, node affinity, and other scheduling constraints. It will not remove a node if doing so would violate these policies.

## Installing Cluster Autoscaler

On AWS with EKS:

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml

# Configure for your cluster
kubectl -n kube-system edit deployment cluster-autoscaler

# Add these arguments to the container:
- --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/my-cluster-name
- --balance-similar-node-groups
- --skip-nodes-with-system-pods=false
```

Ensure your node groups have the appropriate tags:

```bash
aws autoscaling create-or-update-tags \
  --tags "ResourceId=my-node-group,ResourceType=auto-scaling-group,Key=k8s.io/cluster-autoscaler/enabled,Value=true,PropagateAtLaunch=true" \
  "ResourceId=my-node-group,ResourceType=auto-scaling-group,Key=k8s.io/cluster-autoscaler/my-cluster-name,Value=owned,PropagateAtLaunch=true"
```

On GKE, cluster autoscaler is built-in:

```bash
gcloud container clusters update my-cluster \
  --enable-autoscaling \
  --min-nodes=3 \
  --max-nodes=50 \
  --node-pool=default-pool
```

## Configuring Scale-Up Behavior

Control how quickly the autoscaler adds nodes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - name: cluster-autoscaler
        command:
        - ./cluster-autoscaler
        - --v=4
        - --cloud-provider=aws
        - --skip-nodes-with-local-storage=false
        - --expander=least-waste
        - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled
        - --scale-up-unneeded-time=1m
        - --max-node-provision-time=15m
```

Key parameters:

**expander**: Determines which node group to scale when multiple groups could satisfy requirements. Options include:
- `least-waste`: Minimizes unused resources
- `most-pods`: Maximizes pods per node
- `price`: Prefers cheaper instance types
- `priority`: Uses configured priorities
- `random`: Random selection

**max-node-provision-time**: Maximum time to wait for a node to become ready. If exceeded, the autoscaler considers the scale-up failed.

**scale-up-unneeded-time**: How long a node can be unnecessary before removal.

## Configuring Scale-Down Behavior

Fine-tune node removal:

```yaml
command:
- ./cluster-autoscaler
- --scale-down-enabled=true
- --scale-down-delay-after-add=10m
- --scale-down-delay-after-delete=10s
- --scale-down-delay-after-failure=3m
- --scale-down-unneeded-time=10m
- --scale-down-utilization-threshold=0.5
```

**scale-down-delay-after-add**: Wait this long after adding a node before considering scale-down. Prevents thrashing when workload demand fluctuates.

**scale-down-unneeded-time**: How long a node must be below the utilization threshold before removal.

**scale-down-utilization-threshold**: Node must be below this percentage utilization to be removable. Default 0.5 (50%).

Adjust these based on your workload patterns. Spiky workloads benefit from longer delays. Steady workloads can use shorter delays for faster cost optimization.

## Preventing Node Removal

Protect specific nodes from autoscaler removal using annotations:

```bash
kubectl annotate node my-node cluster-autoscaler.kubernetes.io/scale-down-disabled=true
```

This prevents the autoscaler from ever removing this node, useful for:
- Nodes running stateful workloads
- Nodes with local data
- Nodes hosting critical system components

For pods that should prevent their node's removal:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: database
spec:
  template:
    metadata:
      annotations:
        cluster-autoscaler.kubernetes.io/safe-to-evict: "false"
    spec:
      containers:
      - name: postgres
        image: postgres:14
```

The autoscaler will not remove nodes hosting these pods, even if otherwise underutilized.

## Node Group Priorities

When multiple node groups can satisfy a pending pod, use priorities to prefer specific groups:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-priority-expander
  namespace: kube-system
data:
  priorities: |-
    10:
    - .*-spot-.*
    5:
    - .*-on-demand-standard-.*
    1:
    - .*-on-demand-large-.*
```

The autoscaler tries spot instance node groups first (priority 10), then standard on-demand (priority 5), and finally large on-demand instances (priority 1) as a last resort.

This minimizes costs while maintaining availability.

## Handling Insufficient Capacity

When cloud provider capacity is unavailable, the autoscaler logs errors but continues operating:

```bash
kubectl logs -n kube-system deployment/cluster-autoscaler | grep "Failed to increase"
```

Configure fallback node groups:

```yaml
data:
  priorities: |-
    10:
    - .*-spot-t3-large-.*
    9:
    - .*-spot-t3a-large-.*
    5:
    - .*-on-demand-t3-large-.*
```

If t3.large spots are unavailable, the autoscaler tries t3a.large spots, then on-demand instances.

## Monitoring Autoscaler Activity

View autoscaler status:

```bash
kubectl -n kube-system get configmap cluster-autoscaler-status -o yaml
```

This shows:
- Current cluster size
- Pending scale-up operations
- Nodes being scaled down
- Recent events and errors

Monitor metrics:

```promql
# Cluster size over time
cluster_autoscaler_cluster_size

# Unschedulable pods
cluster_autoscaler_unschedulable_pods_count

# Scale up events
increase(cluster_autoscaler_scaled_up_nodes_total[1h])

# Scale down events
increase(cluster_autoscaler_scaled_down_nodes_total[1h])
```

Create dashboards showing cluster size trends, autoscaling frequency, and time to scale.

## Balancing Similar Node Groups

When you have multiple node groups with identical instance types in different availability zones:

```yaml
command:
- ./cluster-autoscaler
- --balance-similar-node-groups=true
- --balancing-ignore-labels=topology.kubernetes.io/zone
```

This keeps node counts balanced across zones for better fault tolerance. Without this, the autoscaler might scale only one zone, creating availability risk.

## Integration with HPA

Cluster Autoscaler and Horizontal Pod Autoscaler work together. HPA scales pod count based on metrics. When more pods need scheduling, Cluster Autoscaler adds nodes:

```yaml
# HPA scales replicas
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

As HPA increases replicas, some pods become pending due to insufficient node capacity. Cluster Autoscaler detects this and adds nodes. The pods then schedule successfully.

This creates fully automatic scaling from pod metrics to infrastructure capacity.

## Cost Optimization Strategies

Configure the autoscaler for maximum cost efficiency:

```yaml
command:
- ./cluster-autoscaler
- --expander=price
- --scale-down-utilization-threshold=0.3
- --scale-down-unneeded-time=5m
```

The price expander selects the cheapest node group. Lower utilization threshold (30%) and shorter unneeded time (5 minutes) trigger faster scale-down.

Monitor cost impact:

```promql
# Average cluster size
avg_over_time(cluster_autoscaler_cluster_size[24h])

# Calculate daily cost
avg_over_time(cluster_autoscaler_cluster_size[24h]) * $instance_hourly_cost * 24
```

Compare to previous static cluster costs to quantify autoscaling savings.

## Troubleshooting

Pods not scheduling despite autoscaler running:

```bash
# Check autoscaler logs
kubectl logs -n kube-system deployment/cluster-autoscaler -f

# Check for errors
kubectl logs -n kube-system deployment/cluster-autoscaler | grep -i error
```

Common issues:
- Node group max size reached
- Cloud provider API rate limiting
- IAM permissions insufficient for autoscaler
- Pod affinity rules preventing scheduling
- PodDisruptionBudgets blocking scale-down

Excessive node churn:

```bash
# View recent scaling events
kubectl get events -n kube-system --field-selector source=cluster-autoscaler
```

Increase scale-down delays:

```yaml
command:
- ./cluster-autoscaler
- --scale-down-delay-after-add=15m
- --scale-down-unneeded-time=15m
```

Slow scale-up:

```bash
# Check node provision time
kubectl logs -n kube-system deployment/cluster-autoscaler | grep "node-provision-time"
```

Reduce `max-node-provision-time` or investigate cloud provider delays.

## Advanced Configuration

Skip nodes with specific characteristics:

```yaml
command:
- ./cluster-autoscaler
- --skip-nodes-with-local-storage=true
- --skip-nodes-with-system-pods=false
```

`skip-nodes-with-local-storage` prevents removing nodes with pods using emptyDir or hostPath volumes.

Configure resource limits for the autoscaler itself:

```yaml
resources:
  requests:
    cpu: 100m
    memory: 300Mi
  limits:
    cpu: 100m
    memory: 300Mi
```

The autoscaler is lightweight but needs stable resources to function reliably.

Cluster Autoscaler transforms Kubernetes from static to dynamic infrastructure, automatically adjusting capacity to match demand. Proper configuration reduces costs while maintaining headroom for traffic spikes and ensures optimal resource utilization across changing workload patterns.
