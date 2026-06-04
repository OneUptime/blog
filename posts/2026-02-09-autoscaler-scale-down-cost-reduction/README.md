# How to Use Kubernetes Cluster Autoscaler Scale-Down Policies for Cost Reduction

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cluster Autoscaler, Cost Optimization, Autoscaling

Description: Configure Cluster Autoscaler scale-down policies to aggressively reclaim unused nodes during low-demand periods while protecting critical workloads.

---

The Kubernetes Cluster Autoscaler scales nodes up when pods are pending, but scale-down behavior requires careful tuning to balance cost savings with stability. Proper scale-down policies can significantly reduce costs during off-peak hours without impacting application availability. This guide shows you how to optimize Cluster Autoscaler scale-down for cost efficiency.

## Understanding Scale-Down Mechanics

Cluster Autoscaler considers a node for removal when the maximum of CPU-request utilization and memory-request utilization is below the configured threshold, the node has been unneeded for the configured duration, and all pods can be moved to other nodes without violating PodDisruptionBudgets or scheduling rules.

## Configuring Aggressive Scale-Down

Deploy Cluster Autoscaler with optimized settings:

```yaml
# cluster-autoscaler-deployment.yaml

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
      - image: registry.k8s.io/autoscaling/cluster-autoscaler:v1.35.0
        name: cluster-autoscaler
        command:
        - ./cluster-autoscaler
        - --v=4
        - --cloud-provider=aws
        - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/my-cluster
        - --skip-nodes-with-local-storage=false
        - --expander=least-waste
        - --scale-down-delay-after-add=5m
        - --scale-down-delay-after-delete=10s
        - --scale-down-delay-after-failure=3m
        - --scale-down-unneeded-time=5m
        - --scale-down-utilization-threshold=0.5
        - --max-node-provision-time=15m
        - --balance-similar-node-groups=true
```

Key parameters:

- `node-group-auto-discovery`: Finds AWS Auto Scaling Groups tagged for Cluster Autoscaler management
- `scale-down-unneeded-time`: How long a node must be unneeded before removal (default 10m, set to 5m for aggressive scaling)
- `scale-down-utilization-threshold`: Node utilization below which it's considered for removal (default 0.5)
- `scale-down-delay-after-add`: Wait time after scale-up before allowing scale-down

Use a Cluster Autoscaler image version that matches your Kubernetes cluster's minor version.

## Protecting Critical Workloads

Use annotations to prevent pod eviction during node scale-down:

```yaml
# critical-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: database
spec:
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
      annotations:
        cluster-autoscaler.kubernetes.io/safe-to-evict: "false"
    spec:
      containers:
      - name: postgres
        image: postgres:15
```

Use PodDisruptionBudgets:

```yaml
# pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-server-pdb
spec:
  minAvailable: 3
  selector:
    matchLabels:
      app: api-server
```

## Time-Based Scaling Policies

Scale down aggressively during off-hours by reducing workload replicas:

```bash
# Scale down the batch workload at night
# cron job at 8 PM
0 20 * * * kubectl scale deployment batch-processor --replicas=1 -n production

# Scale up at 6 AM
0 6 * * * kubectl scale deployment batch-processor --replicas=10 -n production
```

## Monitoring Scale-Down Activity

Track autoscaler decisions:

```bash
# View autoscaler logs
kubectl logs -n kube-system deployment/cluster-autoscaler -f | grep "scale down"
```

Prometheus metrics:

```promql
# Scale down events
increase(cluster_autoscaler_scaled_down_nodes_total[1h])

# Unneeded nodes
cluster_autoscaler_unneeded_nodes_count

# Approximate cost savings estimate with a custom avg_node_hourly_cost metric
(max_over_time(cluster_autoscaler_nodes_count{state="ready"}[1h]) - cluster_autoscaler_nodes_count{state="ready"}) * scalar(avg(avg_node_hourly_cost)) * 730
```

## Conclusion

Properly configured Cluster Autoscaler scale-down policies automatically reclaim unused capacity, reducing costs by 30-40% in environments with variable workloads. Aggressive scale-down settings combined with appropriate safeguards ensure cost efficiency without compromising application stability.
