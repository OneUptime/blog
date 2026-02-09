# How to Configure Proportional Autoscaler for Cluster Addon Scaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Autoscaling, Cluster Management

Description: Learn how to configure and deploy the Proportional Autoscaler to automatically scale cluster addons like CoreDNS and metrics-server based on cluster node count.

---

Cluster addons like CoreDNS, metrics-server, and kube-state-metrics need to scale with your cluster size. Running a fixed number of replicas works fine for small clusters but becomes a bottleneck as you add nodes and workloads. The Proportional Autoscaler (also called cluster-proportional-autoscaler) automatically adjusts addon replica counts based on cluster size.

## Understanding Proportional Autoscaler

The cluster-proportional-autoscaler watches your cluster's node or CPU core count and scales target deployments proportionally. Unlike HPA which scales based on resource utilization, this controller scales based on cluster capacity.

Two scaling modes exist:

- **Linear mode**: Replicas scale linearly with nodes or cores
- **Ladder mode**: Replicas increase in steps at defined thresholds

## Installing the Proportional Autoscaler

First, deploy the autoscaler controller. The example below scales CoreDNS based on cluster size.

Create a deployment manifest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dns-autoscaler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: dns-autoscaler
  template:
    metadata:
      labels:
        app: dns-autoscaler
    spec:
      serviceAccountName: dns-autoscaler
      containers:
      - name: autoscaler
        image: registry.k8s.io/cpa/cluster-proportional-autoscaler:v1.8.9
        resources:
          requests:
            cpu: 20m
            memory: 10Mi
        command:
        - /cluster-proportional-autoscaler
        - --namespace=kube-system
        - --configmap=dns-autoscaler
        - --target=deployment/coredns
        - --default-params={"linear":{"coresPerReplica":256,"nodesPerReplica":16,"min":2,"max":100,"preventSinglePointFailure":true,"includeUnschedulableNodes":true}}
        - --logtostderr=true
        - --v=2
```

Create the required RBAC permissions:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: dns-autoscaler
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: dns-autoscaler
rules:
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["list", "watch"]
- apiGroups: [""]
  resources: ["replicationcontrollers/scale"]
  verbs: ["get", "update"]
- apiGroups: ["apps"]
  resources: ["deployments/scale", "replicasets/scale"]
  verbs: ["get", "update"]
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "create", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: dns-autoscaler
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: dns-autoscaler
subjects:
- kind: ServiceAccount
  name: dns-autoscaler
  namespace: kube-system
```

## Configuring Linear Scaling

Linear mode calculates replicas using this formula:

```
replicas = max(ceil(cores * 1/coresPerReplica), ceil(nodes * 1/nodesPerReplica))
replicas = max(replicas, min)
replicas = min(replicas, max)
```

The configuration parameters:

- **coresPerReplica**: How many CPU cores per replica
- **nodesPerReplica**: How many nodes per replica
- **min**: Minimum replica count
- **max**: Maximum replica count
- **preventSinglePointFailure**: Ensure at least 2 replicas
- **includeUnschedulableNodes**: Count unschedulable nodes in calculation

Here's a ConfigMap for linear scaling:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dns-autoscaler
  namespace: kube-system
data:
  linear: |-
    {
      "coresPerReplica": 256,
      "nodesPerReplica": 16,
      "min": 2,
      "max": 100,
      "preventSinglePointFailure": true,
      "includeUnschedulableNodes": true
    }
```

With this configuration, a cluster with 64 nodes and 256 cores would run:

```
replicas = max(ceil(256/256), ceil(64/16)) = max(1, 4) = 4
replicas = max(4, 2) = 4 (apply min)
```

Result: 4 CoreDNS replicas.

## Configuring Ladder Scaling

Ladder mode uses step thresholds for more granular control. Define specific replica counts at node or core boundaries.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dns-autoscaler
  namespace: kube-system
data:
  ladder: |-
    {
      "coresToReplicas": [
        [ 1, 2 ],
        [ 64, 3 ],
        [ 128, 4 ],
        [ 256, 5 ],
        [ 512, 6 ],
        [ 1024, 8 ]
      ],
      "nodesToReplicas": [
        [ 1, 2 ],
        [ 10, 3 ],
        [ 25, 4 ],
        [ 50, 5 ],
        [ 100, 6 ]
      ]
    }
```

The autoscaler picks the higher value from coresToReplicas and nodesToReplicas. For a cluster with 40 nodes and 300 cores:

- nodesToReplicas: 40 nodes matches the [25, 4] bracket = 4 replicas
- coresToReplicas: 300 cores matches the [256, 5] bracket = 5 replicas
- Result: 5 replicas (higher value wins)

## Scaling Metrics Server

Apply the same pattern to metrics-server for better performance in large clusters:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: metrics-server-autoscaler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: metrics-server-autoscaler
  template:
    metadata:
      labels:
        app: metrics-server-autoscaler
    spec:
      serviceAccountName: dns-autoscaler  # Reuse the same SA
      containers:
      - name: autoscaler
        image: registry.k8s.io/cpa/cluster-proportional-autoscaler:v1.8.9
        command:
        - /cluster-proportional-autoscaler
        - --namespace=kube-system
        - --configmap=metrics-server-autoscaler
        - --target=deployment/metrics-server
        - --default-params={"linear":{"coresPerReplica":512,"nodesPerReplica":32,"min":2,"max":50}}
        - --logtostderr=true
        - --v=2
```

Metrics-server handles less traffic per node than CoreDNS, so we use higher ratios (512 cores per replica, 32 nodes per replica).

## Monitoring and Troubleshooting

Check autoscaler logs to verify calculations:

```bash
kubectl logs -n kube-system deployment/dns-autoscaler
```

Expected output shows scaling decisions:

```
I0209 10:30:15.123456 Target deployment: kube-system/coredns
I0209 10:30:15.234567 Cluster status: 48 nodes, 192 cores
I0209 10:30:15.345678 Expected replicas: 3 (from nodes), 1 (from cores), using 3
I0209 10:30:15.456789 Scaled deployment kube-system/coredns to 3 replicas
```

Verify the target deployment scaled correctly:

```bash
kubectl get deployment -n kube-system coredns
```

Common issues:

**Replicas not changing**: Check RBAC permissions. The autoscaler needs `get` and `update` on `deployments/scale`.

**Unexpected replica counts**: Verify your ConfigMap syntax. JSON parsing errors fail silently and use default parameters instead.

**Too frequent scaling**: The autoscaler polls every 10 seconds by default. Add `--poll-period-seconds=60` to reduce check frequency.

## Best Practices

**Set appropriate minimums**: Always set `min` to at least 2 for high availability. Use `preventSinglePointFailure: true` to enforce this automatically.

**Test scaling formulas**: Calculate expected replicas for your cluster sizes before deploying. Use ladder mode for non-linear scaling needs.

**Monitor resource usage**: After deployment, watch actual CPU and memory usage of scaled addons. Adjust ratios if replicas are over or under-provisioned.

**Consider node pools**: If you have heterogeneous nodes (different CPU counts), base scaling on node count rather than cores for more predictable behavior.

**Document your configuration**: Add comments in your deployment about why you chose specific ratios. This helps future operations teams understand the scaling logic.

The Proportional Autoscaler fills a crucial gap between static replica counts and metrics-based autoscaling. For cluster addons that need to scale with cluster size rather than load, it provides simple and reliable automation.
