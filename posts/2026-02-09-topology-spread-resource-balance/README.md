# How to Implement Pod Topology Spread for Balanced Resource Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Scheduling, High Availability

Description: Learn how to use pod topology spread constraints in Kubernetes to distribute workloads evenly across zones and nodes for balanced resource usage and improved availability.

---

Uneven pod distribution creates resource hotspots where some nodes run at capacity while others sit idle. Pod topology spread constraints distribute workloads evenly across failure domains like availability zones, nodes, or custom topology keys. This balances resource usage and improves resilience.

Without topology spread, the scheduler makes locally optimal decisions that can lead to globally suboptimal placement. All replicas might land on the cheapest nodes or cluster in a single availability zone. Topology spread provides declarative control over distribution patterns.

## Understanding Topology Domains

Topology domains are groups of nodes defined by labels. Common topology domains include:

**Zone-level**: `topology.kubernetes.io/zone` groups nodes by availability zone
**Node-level**: `kubernetes.io/hostname` treats each node as a separate domain
**Region-level**: `topology.kubernetes.io/region` groups by cloud region
**Custom**: Any node label like `rack`, `datacenter`, or `node-pool`

The scheduler counts pods in each topology domain and tries to minimize the difference (skew) between domains.

## Basic Topology Spread Configuration

Start with zone-level spreading for high availability:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 6
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: web-app
      containers:
      - name: web
        image: web-app:latest
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
```

This configuration:
- Spreads pods across availability zones
- Allows maximum difference of 1 pod between zones
- Blocks scheduling if even distribution isn't possible
- Only considers pods matching the labelSelector

With 6 replicas across 3 zones, you get 2 pods per zone. With 7 replicas, the scheduler places 3 in one zone and 2 in the others (maxSkew of 1).

## Combining Multiple Topology Levels

Spread across both zones and nodes for maximum distribution:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-service
spec:
  replicas: 12
  template:
    metadata:
      labels:
        app: critical-service
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: critical-service
      - maxSkew: 2
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app: critical-service
      containers:
      - name: service
        image: critical-service:latest
```

This creates a two-level distribution:
1. First, spread evenly across zones (hard requirement)
2. Then, spread across nodes within zones (soft preference)

The `ScheduleAnyway` on the node-level constraint makes it a preference rather than a requirement. If perfect node distribution isn't possible, the scheduler proceeds anyway.

## Balancing Resource Usage Across Nodes

Use topology spread to prevent resource hotspots:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: resource-intensive-app
spec:
  replicas: 20
  template:
    metadata:
      labels:
        app: resource-intensive-app
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app: resource-intensive-app
        minDomains: 5
      containers:
      - name: app
        image: resource-intensive:latest
        resources:
          requests:
            cpu: "2000m"
            memory: "4Gi"
```

The `minDomains: 5` ensures pods spread across at least 5 nodes, even if fewer would technically satisfy the maxSkew constraint. This prevents clustering all pods on a small subset of nodes.

With 20 replicas and minDomains of 5, you get at least 4 pods per node. Without minDomains, all 20 might land on 2 large nodes if they have capacity.

## Using Node Affinity with Topology Spread

Combine topology spread with node affinity to control both distribution and node selection:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-training
spec:
  replicas: 8
  template:
    metadata:
      labels:
        app: ml-training
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: node-type
                operator: In
                values:
                - gpu
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: ml-training
      - maxSkew: 1
        topologyKey: gpu-model
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app: ml-training
      containers:
      - name: training
        image: ml-training:latest
        resources:
          limits:
            nvidia.com/gpu: 1
```

This distributes training pods across zones and GPU models, ensuring even utilization of different hardware types.

## Handling StatefulSets with Topology Spread

StatefulSets benefit from topology spread to distribute database replicas across failure domains:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-cluster
spec:
  serviceName: postgres
  replicas: 5
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: postgres
      - maxSkew: 1
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: postgres
      containers:
      - name: postgres
        image: postgres:14
        resources:
          requests:
            cpu: "2000m"
            memory: "8Gi"
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
```

Each database replica lands on a different node in a different zone, maximizing resilience against failures.

## Dynamic Topology Spread with Cluster Autoscaler

Topology spread works with cluster autoscaler to maintain distribution as the cluster scales:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scalable-app
spec:
  replicas: 30
  template:
    metadata:
      labels:
        app: scalable-app
    spec:
      topologySpreadConstraints:
      - maxSkew: 2
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app: scalable-app
      - maxSkew: 1
        topologyKey: node-pool
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app: scalable-app
      containers:
      - name: app
        image: scalable-app:latest
```

As pods scale up, cluster autoscaler provisions nodes in zones and pools that help satisfy topology constraints. This maintains even distribution without manual intervention.

## Monitoring Topology Distribution

Create Prometheus queries to track pod distribution:

```promql
# Pods per zone
sum(kube_pod_info{namespace="production"}) by (node, topology_zone)

# Maximum skew across zones
max(
  sum(kube_pod_info{app="web-app"}) by (topology_zone)
) -
min(
  sum(kube_pod_info{app="web-app"}) by (topology_zone)
)

# Nodes with pod count above threshold
count(
  sum(kube_pod_info) by (node) > 50
)
```

Visualize distribution in Grafana:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-topology
data:
  topology-spread.json: |
    {
      "dashboard": {
        "title": "Pod Topology Distribution",
        "panels": [
          {
            "title": "Pods per Zone",
            "targets": [
              {
                "expr": "sum(kube_pod_info) by (topology_zone)"
              }
            ],
            "type": "graph"
          },
          {
            "title": "Pods per Node",
            "targets": [
              {
                "expr": "sum(kube_pod_info) by (node)"
              }
            ],
            "type": "heatmap"
          }
        ]
      }
    }
```

## Troubleshooting Topology Spread

When pods remain pending due to topology constraints, check the scheduler events:

```bash
kubectl describe pod <pending-pod> | grep -A 10 Events
```

Common issues:

**Insufficient nodes in topology domains**: Add nodes to underrepresented zones
**Too strict maxSkew**: Relax maxSkew or change whenUnsatisfiable to ScheduleAnyway
**Conflicting constraints**: Pod affinity rules might conflict with topology spread
**Resource availability**: Nodes in target domains might lack resources

Use the descheduler to fix existing distribution issues:

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
      RemovePodsViolatingTopologySpreadConstraint:
        enabled: true
```

The descheduler evicts pods that violate topology spread constraints, allowing them to reschedule correctly.

## Best Practices

**Start with zone-level spreading**: This provides the most significant availability improvement
**Use soft constraints for node-level**: Hard node-level constraints can prevent scaling
**Set appropriate maxSkew**: Lower values create better distribution but reduce scheduling flexibility
**Combine with PodDisruptionBudgets**: Ensure maintenance doesn't violate availability requirements
**Test failure scenarios**: Verify your application remains available when a zone fails

## Conclusion

Pod topology spread constraints transform Kubernetes scheduling from opportunistic to intentional. By explicitly defining distribution requirements, you ensure workloads spread evenly across failure domains, maximizing both resource utilization and resilience. The combination of zone-level spreading for availability, node-level spreading for balanced load, and proper monitoring creates clusters that make efficient use of resources while maintaining high availability.
