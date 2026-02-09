# How to Use Pod Topology Spread with maxSkew and whenUnsatisfiable Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Scheduling, High Availability

Description: Master Kubernetes Pod Topology Spread Constraints with maxSkew and whenUnsatisfiable to distribute pods evenly across zones, nodes, and custom topologies for maximum availability and reliability.

---

Running all replicas of an application on the same node or availability zone creates a single point of failure. If that node or zone fails, your entire application goes down. Pod Topology Spread Constraints distribute pods across nodes, zones, or custom topology domains to ensure high availability.

The maxSkew and whenUnsatisfiable settings control how strictly Kubernetes enforces distribution. Understanding these settings helps you balance availability, resource utilization, and scheduling flexibility.

## Understanding Pod Topology Spread

Pod Topology Spread Constraints distribute pods across topology domains. A topology domain is a group of nodes with the same value for a specific label, such as:

- kubernetes.io/hostname (individual nodes)
- topology.kubernetes.io/zone (availability zones)
- topology.kubernetes.io/region (cloud regions)
- Custom labels like rack, datacenter, or cluster

maxSkew defines the maximum allowed difference in pod count between any two domains. Lower maxSkew means more even distribution.

whenUnsatisfiable determines what happens when spreading cannot be satisfied:
- DoNotSchedule refuses to schedule if constraints cannot be met (hard constraint)
- ScheduleAnyway schedules anyway but prefers better spread (soft constraint)

## Basic Topology Spread Configuration

Spread pods across nodes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 6
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: web
      containers:
      - name: web
        image: nginx
```

This configuration ensures pods are distributed across nodes with at most 1 pod difference between nodes.

With 6 replicas across 3 nodes:
- Node 1: 2 pods
- Node 2: 2 pods
- Node 3: 2 pods

Perfect distribution with maxSkew: 1.

## Understanding maxSkew

maxSkew controls distribution strictness. It defines the maximum difference in pod count between the domain with the most pods and the domain with the fewest pods.

maxSkew: 1 (strict distribution):

```yaml
topologySpreadConstraints:
- maxSkew: 1
  topologyKey: topology.kubernetes.io/zone
  whenUnsatisfiable: DoNotSchedule
  labelSelector:
    matchLabels:
      app: api
```

With 5 replicas across 3 zones:
- Zone A: 2 pods
- Zone B: 2 pods
- Zone C: 1 pod

Difference between max (2) and min (1) is 1, satisfying maxSkew: 1.

maxSkew: 2 (relaxed distribution):

```yaml
topologySpreadConstraints:
- maxSkew: 2
  topologyKey: topology.kubernetes.io/zone
  whenUnsatisfiable: DoNotSchedule
  labelSelector:
    matchLabels:
      app: api
```

With 5 replicas across 3 zones:
- Zone A: 3 pods
- Zone B: 2 pods
- Zone C: 0 pods

Difference between max (3) and min (0) is 3, violating maxSkew: 2. The scheduler would prevent this distribution.

Allowed distribution:
- Zone A: 2 pods
- Zone B: 2 pods
- Zone C: 1 pod

Difference is 1, satisfying maxSkew: 2.

## Using DoNotSchedule

DoNotSchedule creates a hard constraint. Pods remain pending if constraints cannot be satisfied.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-service
spec:
  replicas: 4
  selector:
    matchLabels:
      app: critical
  template:
    metadata:
      labels:
        app: critical
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: critical
      containers:
      - name: app
        image: critical-app:v1.0
```

With only 2 zones available and 4 replicas:
- Zone A: 2 pods
- Zone B: 2 pods

Perfect distribution. If you increase to 5 replicas:
- One pod stays pending because adding it to any zone would violate maxSkew: 1

Use DoNotSchedule when availability is more important than running all replicas.

## Using ScheduleAnyway

ScheduleAnyway creates a soft constraint. Kubernetes prefers good distribution but schedules pods even if constraints are violated.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: batch-job
spec:
  replicas: 10
  selector:
    matchLabels:
      app: batch
  template:
    metadata:
      labels:
        app: batch
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app: batch
      containers:
      - name: worker
        image: batch-worker:v1.0
```

With 2 zones and 10 replicas, ideal distribution is 5 per zone. If one zone has resource constraints:
- Zone A: 7 pods (has resources)
- Zone B: 3 pods (resource constrained)

The constraint is violated (maxSkew would be 4), but all pods run.

Use ScheduleAnyway when running all replicas is more important than perfect distribution.

## Multi-Constraint Topology Spread

Apply multiple constraints for hierarchical distribution:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: multi-tier-app
spec:
  replicas: 12
  selector:
    matchLabels:
      app: multi-tier
  template:
    metadata:
      labels:
        app: multi-tier
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: multi-tier
      - maxSkew: 2
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app: multi-tier
      containers:
      - name: app
        image: app:v1.0
```

This configuration:
- Distributes evenly across zones (strict)
- Distributes reasonably across nodes within zones (soft)

With 3 zones and 6 nodes (2 per zone):
- Zone A, Node 1: 2 pods
- Zone A, Node 2: 2 pods
- Zone B, Node 3: 2 pods
- Zone B, Node 4: 2 pods
- Zone C, Node 5: 2 pods
- Zone C, Node 6: 2 pods

## Custom Topology Keys

Create custom topology domains with labels:

```bash
# Label nodes by rack
kubectl label node node-1 rack=rack-a
kubectl label node node-2 rack=rack-a
kubectl label node node-3 rack=rack-b
kubectl label node node-4 rack=rack-b
kubectl label node node-5 rack=rack-c
kubectl label node node-6 rack=rack-c
```

Spread across racks:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  serviceName: db
  replicas: 6
  selector:
    matchLabels:
      app: db
  template:
    metadata:
      labels:
        app: db
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: rack
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: db
      containers:
      - name: postgres
        image: postgres:14
```

Pods distribute evenly across racks for hardware failure tolerance.

## Real-World Example: Multi-Region Deployment

Deploy across regions and zones for maximum availability:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: global-api
spec:
  replicas: 18
  selector:
    matchLabels:
      app: global-api
  template:
    metadata:
      labels:
        app: global-api
    spec:
      topologySpreadConstraints:
      - maxSkew: 2
        topologyKey: topology.kubernetes.io/region
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: global-api
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app: global-api
      containers:
      - name: api
        image: api:v2.0.0
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
```

This distributes pods across regions (strict) and zones within regions (soft) for disaster recovery.

## Debugging Topology Spread Issues

Check why pods are pending:

```bash
kubectl describe pod my-pod
```

Look for events:

```
Events:
  Warning  FailedScheduling  0/3 nodes are available: 3 node(s) didn't match pod topology spread constraints.
```

View topology domain distribution:

```bash
# Count pods per zone
kubectl get pods -l app=myapp -o json | \
  jq -r '.items[] | .spec.nodeName' | \
  xargs -I {} kubectl get node {} -o jsonpath='{.metadata.labels.topology\.kubernetes\.io/zone}{"\n"}' | \
  sort | uniq -c
```

Output:

```
  3 us-east-1a
  5 us-east-1b
  2 us-east-1c
```

Skew is 3 (5 - 2), violating maxSkew: 1.

Check node labels:

```bash
kubectl get nodes --show-labels | grep topology
```

Verify all nodes have required topology labels.

## Combining with Affinity Rules

Topology spread works with affinity:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: combined-constraints
spec:
  replicas: 6
  selector:
    matchLabels:
      app: combined
  template:
    metadata:
      labels:
        app: combined
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                app: combined
            topologyKey: kubernetes.io/hostname
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: combined
      containers:
      - name: app
        image: app:latest
```

This configuration:
- Prevents multiple pods on the same node (anti-affinity)
- Distributes evenly across zones (topology spread)

Both constraints must be satisfied.

## Monitoring Topology Distribution

Check current pod distribution:

```bash
#!/bin/bash
# show-topology-distribution.sh

LABEL_SELECTOR="app=myapp"
TOPOLOGY_KEY="topology.kubernetes.io/zone"

echo "Pod distribution by $TOPOLOGY_KEY:"

kubectl get pods -l $LABEL_SELECTOR -o json | \
  jq -r '.items[] | .spec.nodeName' | \
  while read node; do
    kubectl get node $node -o jsonpath="{.metadata.labels.$TOPOLOGY_KEY}{\"\\n\"}"
  done | sort | uniq -c | sort -rn
```

Create alerts for uneven distribution:

```yaml
# PrometheusRule
groups:
- name: topology-alerts
  rules:
  - alert: UnevenPodDistribution
    expr: |
      max(count(kube_pod_info{app="myapp"}) by (topology_zone)) -
      min(count(kube_pod_info{app="myapp"}) by (topology_zone)) > 2
    annotations:
      summary: "Pods not evenly distributed across zones"
```

## Best Practices

Use maxSkew: 1 with DoNotSchedule for critical services that need strict high availability.

Use maxSkew: 2 or higher with ScheduleAnyway for services that prioritize running all replicas.

Spread across zones (topology.kubernetes.io/zone) for availability zone failures.

Spread across nodes (kubernetes.io/hostname) for node failures.

Combine multiple constraints for hierarchical distribution (zones and nodes).

Ensure all nodes have required topology labels before deploying constraints.

Monitor topology distribution and adjust constraints based on observed patterns.

Test constraint changes in development before production.

Document why specific maxSkew and whenUnsatisfiable values are chosen.

## Common Pitfalls

Too strict constraints with insufficient resources:

```yaml
# This might prevent scaling
topologySpreadConstraints:
- maxSkew: 1
  topologyKey: topology.kubernetes.io/zone
  whenUnsatisfiable: DoNotSchedule
```

With only 2 zones, you can only run an even number of replicas.

Missing topology labels:

```bash
# Check all nodes have zone labels
kubectl get nodes -o jsonpath='{.items[*].metadata.labels.topology\.kubernetes\.io/zone}'
```

If some nodes lack labels, distribution fails.

Conflicting constraints:

```yaml
# Anti-affinity + strict spread might be impossible
affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
    - topologyKey: kubernetes.io/hostname
topologySpreadConstraints:
- maxSkew: 1
  topologyKey: kubernetes.io/hostname
  whenUnsatisfiable: DoNotSchedule
```

With 3 nodes and 6 replicas, anti-affinity allows max 3 pods but spread wants 6.

## Migration Strategy

Migrate existing deployments gradually:

1. Add topology spread with ScheduleAnyway:

```yaml
topologySpreadConstraints:
- maxSkew: 1
  topologyKey: topology.kubernetes.io/zone
  whenUnsatisfiable: ScheduleAnyway
```

2. Monitor distribution:

```bash
kubectl get pods -l app=myapp -o wide
```

3. Tighten constraints if distribution is good:

```yaml
whenUnsatisfiable: DoNotSchedule
```

4. Roll back if scheduling issues occur:

```bash
kubectl rollout undo deployment myapp
```

## Conclusion

Pod Topology Spread Constraints distribute pods across nodes, zones, and custom topologies for high availability. Use maxSkew to control distribution strictness and whenUnsatisfiable to determine hard vs soft constraints.

Configure DoNotSchedule for critical services requiring strict distribution. Use ScheduleAnyway for workloads that must run all replicas. Apply multiple constraints for hierarchical distribution across regions, zones, and nodes.

Monitor topology distribution and adjust constraints based on cluster resources and availability requirements. Master topology spread to build highly available Kubernetes applications that survive node and zone failures.
