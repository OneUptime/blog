# How to Use Descheduler LowNodeUtilization Strategy to Redistribute Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Descheduler, Resource Management

Description: Discover how to use the Descheduler LowNodeUtilization strategy to automatically rebalance workloads from overutilized nodes to underutilized ones, optimizing cluster resource usage.

---

In production Kubernetes clusters, resource utilization can become unbalanced over time. Some nodes may be heavily loaded while others sit mostly idle. This inefficiency wastes resources and can lead to performance issues when overloaded nodes struggle to handle their workload.

The Descheduler's LowNodeUtilization strategy addresses this by identifying underutilized nodes and moving pods from overutilized nodes to balance the cluster. This keeps your cluster running efficiently without manual intervention.

## How LowNodeUtilization Works

The LowNodeUtilization strategy evaluates each node's resource utilization (CPU, memory, and pods) and categorizes nodes into three groups:

- **Underutilized nodes**: Nodes below the defined threshold
- **Normally utilized nodes**: Nodes within acceptable range
- **Overutilized nodes**: Nodes above the target utilization threshold

The descheduler then evicts pods from overutilized nodes, allowing the scheduler to place them on underutilized nodes, creating a more balanced distribution.

## Basic Configuration

Here's a basic LowNodeUtilization configuration:

```yaml
# descheduler-lownodeutilization.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: descheduler-policy
  namespace: kube-system
data:
  policy.yaml: |
    apiVersion: "descheduler/v1alpha2"
    kind: "DeschedulerPolicy"
    profiles:
      - name: default
        pluginConfig:
        - name: "LowNodeUtilization"
          args:
            # Thresholds define when a node is considered underutilized
            thresholds:
              cpu: 20
              memory: 20
              pods: 20
            # Target utilization defines when a node is overutilized
            targetThresholds:
              cpu: 50
              memory: 50
              pods: 50
            # Number of nodes that can be processed in parallel
            numberOfNodes: 0  # 0 means all nodes
        plugins:
          balance:
            enabled:
              - "LowNodeUtilization"
```

In this configuration:
- Nodes using less than 20% CPU, memory, or pods are underutilized
- Nodes using more than 50% CPU, memory, or pods are overutilized
- The descheduler will move pods to achieve better balance

## Understanding Thresholds

The threshold values are percentages based on the node's allocatable resources:

```yaml
# Example: For a node with 4 CPU cores and 16Gi memory
# Allocatable: 3.8 CPU, 15Gi memory (after system reservations)
#
# With thresholds:
#   cpu: 20 = 0.76 CPU (3.8 * 0.20)
#   memory: 20 = 3Gi (15 * 0.20)
#
# With targetThresholds:
#   cpu: 50 = 1.9 CPU (3.8 * 0.50)
#   memory: 50 = 7.5Gi (15 * 0.50)
```

## Advanced Configuration with Resource Weights

You can customize which resources matter most for your workload:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: descheduler-policy-advanced
  namespace: kube-system
data:
  policy.yaml: |
    apiVersion: "descheduler/v1alpha2"
    kind: "DeschedulerPolicy"
    profiles:
      - name: production
        pluginConfig:
        - name: "LowNodeUtilization"
          args:
            thresholds:
              cpu: 30
              memory: 30
              pods: 20
            targetThresholds:
              cpu: 70
              memory: 70
              pods: 50
            # Only consider CPU and memory, ignore pod count
            useDeviationThresholds: false
            # Namespaces to include
            namespaces:
              include: ["production", "staging"]
            # Evict pods with priority lower than this
            evictableNamespaces:
              exclude: ["kube-system"]
            # Node fit checking
            nodeFit: true
        plugins:
          balance:
            enabled:
              - "LowNodeUtilization"
```

## Deploying with the Descheduler

Create the complete deployment with RBAC:

```yaml
# descheduler-complete.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: descheduler
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: descheduler
rules:
- apiGroups: [""]
  resources: ["events"]
  verbs: ["create", "update"]
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["get", "watch", "list"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "watch", "list", "delete"]
- apiGroups: [""]
  resources: ["pods/eviction"]
  verbs: ["create"]
- apiGroups: ["scheduling.k8s.io"]
  resources: ["priorityclasses"]
  verbs: ["get", "watch", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: descheduler
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: descheduler
subjects:
- kind: ServiceAccount
  name: descheduler
  namespace: kube-system
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: descheduler
  namespace: kube-system
spec:
  schedule: "*/15 * * * *"  # Run every 15 minutes
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: descheduler
          restartPolicy: Never
          containers:
          - name: descheduler
            image: registry.k8s.io/descheduler/descheduler:v0.28.0
            command:
            - /bin/descheduler
            args:
            - --policy-config-file=/policy/policy.yaml
            - --v=3
            resources:
              requests:
                cpu: 100m
                memory: 128Mi
              limits:
                cpu: 500m
                memory: 256Mi
            volumeMounts:
            - name: policy-volume
              mountPath: /policy
          volumes:
          - name: policy-volume
            configMap:
              name: descheduler-policy
```

## Testing the Strategy

Create a test scenario with unbalanced pod distribution:

```yaml
# high-resource-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: resource-heavy-app
spec:
  replicas: 5
  selector:
    matchLabels:
      app: resource-heavy
  template:
    metadata:
      labels:
        app: resource-heavy
    spec:
      affinity:
        # Force initial placement on specific nodes
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            preference:
              matchExpressions:
              - key: kubernetes.io/hostname
                operator: In
                values: ["worker-node-1"]
      containers:
      - name: app
        image: nginx:1.21
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 1000m
            memory: 2Gi
```

Check node utilization before descheduling:

```bash
# View node resource usage
kubectl top nodes

# Expected output showing imbalance:
# NAME            CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%
# worker-node-1   2800m        70%    12Gi            75%
# worker-node-2   400m         10%    2Gi             12%
# worker-node-3   600m         15%    3Gi             18%
```

## Monitoring Descheduler Actions

Check the logs to see rebalancing in action:

```bash
kubectl logs -n kube-system -l app=descheduler --tail=50
```

Expected output:

```
I0209 14:22:10.123456 1 lownodeutilization.go:156] Node "worker-node-1" is overutilized
I0209 14:22:10.234567 1 lownodeutilization.go:157] Usage: cpu=70%, memory=75%, pods=45%
I0209 14:22:10.345678 1 lownodeutilization.go:189] Node "worker-node-2" is underutilized
I0209 14:22:10.456789 1 lownodeutilization.go:190] Usage: cpu=10%, memory=12%, pods=8%
I0209 14:22:10.567890 1 evictions.go:160] Evicting pod resource-heavy-app-7d8f9c5b-xyz12
I0209 14:22:10.678901 1 evictions.go:160] Evicting pod resource-heavy-app-7d8f9c5b-abc34
```

## Combining with PodDisruptionBudgets

Protect your applications during rebalancing:

```yaml
# pdb-for-app.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: resource-heavy-app-pdb
spec:
  minAvailable: 3  # Always keep at least 3 pods running
  selector:
    matchLabels:
      app: resource-heavy
```

The descheduler will respect this PDB and won't evict pods if it would violate the minimum availability.

## Fine-Tuning for Different Workload Types

For CPU-intensive workloads:

```yaml
pluginConfig:
- name: "LowNodeUtilization"
  args:
    thresholds:
      cpu: 40       # Higher CPU threshold
      memory: 20    # Lower memory threshold
      pods: 20
    targetThresholds:
      cpu: 80       # Allow higher CPU usage
      memory: 60
      pods: 50
```

For memory-intensive workloads:

```yaml
pluginConfig:
- name: "LowNodeUtilization"
  args:
    thresholds:
      cpu: 20
      memory: 40    # Higher memory threshold
      pods: 20
    targetThresholds:
      cpu: 60
      memory: 85    # Allow higher memory usage
      pods: 50
```

## Excluding Critical Nodes

Prevent certain nodes from being descheduled:

```yaml
pluginConfig:
- name: "LowNodeUtilization"
  args:
    thresholds:
      cpu: 30
      memory: 30
      pods: 20
    targetThresholds:
      cpu: 70
      memory: 70
      pods: 50
    # Exclude nodes with specific taints
    excludeNodeTaints:
    - "node-role.kubernetes.io/master"
    - "dedicated=database:NoSchedule"
```

## Metrics and Observability

Monitor descheduler effectiveness with Prometheus metrics:

```yaml
# servicemonitor.yaml
apiVersion: v1
kind: Service
metadata:
  name: descheduler-metrics
  namespace: kube-system
  labels:
    app: descheduler
spec:
  ports:
  - name: metrics
    port: 8080
    protocol: TCP
    targetPort: 8080
  selector:
    app: descheduler
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: descheduler
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: descheduler
  endpoints:
  - port: metrics
    interval: 30s
```

## Best Practices

1. **Start Conservative**: Begin with wider threshold ranges and adjust based on observed behavior
2. **Monitor First**: Watch node utilization patterns for a week before enabling aggressive rebalancing
3. **Use PDBs**: Always protect critical applications with PodDisruptionBudgets
4. **Test in Staging**: Validate threshold values in non-production environments
5. **Schedule Wisely**: Run during low-traffic periods initially to minimize disruption
6. **Check Node Fit**: Enable nodeFit to ensure evicted pods can actually be rescheduled
7. **Combine Strategies**: Use alongside other descheduler strategies for comprehensive optimization

## Troubleshooting Common Issues

If pods aren't being rebalanced:

```bash
# Check descheduler is running
kubectl get pods -n kube-system -l app=descheduler

# Verify policy configuration
kubectl get configmap descheduler-policy -n kube-system -o yaml

# Check for PDB violations
kubectl get pdb --all-namespaces

# View detailed logs
kubectl logs -n kube-system -l app=descheduler --tail=200
```

The LowNodeUtilization strategy is essential for maintaining efficient resource usage in dynamic Kubernetes clusters. By automatically rebalancing workloads across nodes, it prevents resource hotspots and ensures your cluster operates at optimal efficiency without manual intervention.

