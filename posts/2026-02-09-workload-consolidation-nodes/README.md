# How to Implement Workload Consolidation for Reduced Node Count

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cost Optimization, Resource Management

Description: Learn effective strategies for consolidating workloads in Kubernetes to reduce node count, lower infrastructure costs, and improve resource utilization while maintaining application performance.

---

Cloud costs spiral out of control when you run dozens of underutilized nodes. Workload consolidation packs more pods onto fewer nodes, reducing your infrastructure footprint and monthly bills. But consolidation requires careful planning to avoid performance degradation and maintain application reliability.

The goal is simple: run the same workloads on fewer nodes without sacrificing performance or availability. This means improving resource utilization, rightsizing allocations, and using automation tools that continuously optimize pod placement.

## Assessing Current Resource Utilization

Before consolidating, you need visibility into actual resource consumption. Most clusters waste resources because pods request more CPU and memory than they actually use. The difference between requests and actual usage represents opportunity.

Deploy metrics collection to track real resource usage:

```yaml
# Deploy metrics-server for resource tracking
apiVersion: v1
kind: ServiceAccount
metadata:
  name: metrics-server
  namespace: kube-system
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: metrics-server
  namespace: kube-system
spec:
  selector:
    matchLabels:
      k8s-app: metrics-server
  template:
    metadata:
      labels:
        k8s-app: metrics-server
    spec:
      serviceAccountName: metrics-server
      containers:
      - name: metrics-server
        image: registry.k8s.io/metrics-server/metrics-server:v0.6.4
        args:
        - --cert-dir=/tmp
        - --secure-port=4443
        - --kubelet-preferred-address-types=InternalIP
        - --kubelet-use-node-status-port
        - --metric-resolution=15s
```

Once metrics-server is running, analyze resource usage patterns:

```bash
# Check node utilization
kubectl top nodes

# Identify pods with low utilization
kubectl top pods --all-namespaces | awk '{if($3 < 100) print}'

# Calculate cluster-wide utilization
kubectl describe nodes | grep -A 5 "Allocated resources"
```

Look for nodes running at less than 60% CPU or memory utilization. These are prime candidates for consolidation.

## Setting Appropriate Resource Requests

Overprovisioned resource requests are the primary cause of poor node utilization. Applications request 4 CPU cores but use only 500 millicores, wasting 87% of allocated capacity.

Use Vertical Pod Autoscaler (VPA) in recommendation mode to get data-driven sizing suggestions:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: app-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  updateMode: "Off"  # Recommendation mode only
  resourcePolicy:
    containerPolicies:
    - containerName: "*"
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 8
        memory: 16Gi
```

Review VPA recommendations after a week of operation:

```bash
kubectl describe vpa app-vpa
```

Apply the recommendations by updating your deployment manifests. This immediately improves scheduling density and allows more pods per node.

## Using Cluster Autoscaler with Scale-Down

Cluster Autoscaler automatically adjusts node count based on pending pods and node utilization. Configure aggressive scale-down settings to remove underutilized nodes:

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
      - image: registry.k8s.io/autoscaling/cluster-autoscaler:v1.28.0
        name: cluster-autoscaler
        command:
        - ./cluster-autoscaler
        - --v=4
        - --stderrthreshold=info
        - --cloud-provider=aws
        - --skip-nodes-with-local-storage=false
        - --scale-down-enabled=true
        - --scale-down-utilization-threshold=0.6
        - --scale-down-delay-after-add=5m
        - --scale-down-unneeded-time=5m
        - --balance-similar-node-groups
        - --skip-nodes-with-system-pods=false
```

Key scale-down parameters:

**scale-down-utilization-threshold**: Removes nodes below 60% utilization
**scale-down-unneeded-time**: How long a node must be underutilized before removal
**scale-down-delay-after-add**: Prevents thrashing by waiting after scale-up

The cluster autoscaler will consolidate pods onto fewer nodes and terminate empty or underutilized nodes.

## Implementing Descheduler for Active Consolidation

The default scheduler places pods on nodes but never moves them. Over time, this creates fragmentation with many partially filled nodes. Descheduler actively rebalances workloads to improve consolidation.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: descheduler-policy
  namespace: kube-system
data:
  policy.yaml: |
    apiVersion: descheduler/v1alpha1
    kind: DeschedulerPolicy
    strategies:
      LowNodeUtilization:
        enabled: true
        params:
          nodeResourceUtilizationThresholds:
            thresholds:
              cpu: 40
              memory: 40
            targetThresholds:
              cpu: 70
              memory: 70
      RemovePodsViolatingNodeTaints:
        enabled: true
      RemoveDuplicates:
        enabled: true
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: descheduler
  namespace: kube-system
spec:
  schedule: "*/15 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: descheduler
          containers:
          - name: descheduler
            image: registry.k8s.io/descheduler/descheduler:v0.28.0
            command:
            - /bin/descheduler
            - --policy-config-file=/policy/policy.yaml
            - --v=3
            volumeMounts:
            - name: policy
              mountPath: /policy
          volumes:
          - name: policy
            configMap:
              name: descheduler-policy
          restartPolicy: Never
```

The LowNodeUtilization strategy identifies nodes with less than 40% utilization and evicts pods from them. Those pods are then rescheduled onto higher-utilized nodes, allowing the empty nodes to be terminated.

## Configuring Pod Disruption Budgets

Consolidation requires moving pods between nodes, which temporarily disrupts running applications. Pod Disruption Budgets (PDBs) ensure you maintain minimum availability during rebalancing:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-app-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: web-app
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-pdb
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: api-server
```

PDBs prevent the descheduler and cluster autoscaler from evicting too many pods simultaneously, maintaining service availability during consolidation.

## Using Node Affinity for Controlled Placement

Direct specific workloads to dedicated nodes while allowing general workloads to consolidate on shared nodes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: general-app
spec:
  replicas: 5
  template:
    spec:
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            preference:
              matchExpressions:
              - key: workload-type
                operator: In
                values:
                - general
      containers:
      - name: app
        image: general-app:latest
```

Label nodes appropriately:

```bash
# Label nodes for different workload types
kubectl label nodes node-1 node-2 node-3 workload-type=general
kubectl label nodes node-4 workload-type=specialized
```

This gives you control over consolidation targets while protecting specialized workloads.

## Monitoring Consolidation Impact

Track key metrics to ensure consolidation doesn't degrade performance:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-rules
data:
  consolidation.rules: |
    groups:
    - name: consolidation
      interval: 30s
      rules:
      - record: cluster:node_utilization:avg
        expr: avg(1 - rate(node_cpu_seconds_total{mode="idle"}[5m]))
      - record: cluster:memory_utilization:avg
        expr: avg(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)
      - alert: NodeOvercommitted
        expr: |
          (sum(kube_pod_container_resource_requests{resource="cpu"}) by (node) /
           sum(kube_node_status_allocatable{resource="cpu"}) by (node)) > 1.5
        labels:
          severity: warning
        annotations:
          summary: "Node {{ $labels.node }} is overcommitted"
```

Watch for:
- Increased CPU throttling (container_cpu_cfs_throttled_seconds_total)
- Higher pod scheduling latency
- Increased OOMKill events
- Application latency degradation

## Best Practices for Workload Consolidation

**Start with non-production environments**: Test consolidation strategies in staging before applying to production.

**Consolidate in phases**: Don't consolidate everything at once. Move workloads gradually and monitor impact.

**Maintain availability zones**: Don't consolidate away zone redundancy. Ensure workloads remain distributed across availability zones.

**Use spot instances strategically**: Consolidated nodes are good candidates for spot/preemptible instances since workloads can easily reschedule.

**Review regularly**: Resource usage patterns change over time. Reassess and adjust consolidation settings quarterly.

## Calculating Cost Savings

Track your progress with concrete metrics:

```bash
# Count active nodes over time
kubectl get nodes --no-headers | wc -l

# Calculate cost per node per month
NODE_COST=150  # Example: $150/month per node
NODE_COUNT=$(kubectl get nodes --no-headers | wc -l)
MONTHLY_COST=$((NODE_COUNT * NODE_COST))
echo "Current monthly cost: $${MONTHLY_COST}"
```

Document baseline and target metrics:
- Initial node count and cost
- Target node count and projected savings
- Actual resource utilization improvements
- Application performance metrics

## Conclusion

Workload consolidation delivers significant cost savings without requiring application changes. By rightsizing resource requests, implementing automated scaling and descheduling, and maintaining proper availability controls, you can reduce node count by 30-50% while maintaining or improving application performance. The combination of VPA for sizing recommendations, cluster autoscaler for automatic scaling, and descheduler for active rebalancing creates a powerful consolidation pipeline that continuously optimizes your cluster.
