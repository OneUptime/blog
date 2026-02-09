# How to Implement Spread Scheduling for High Availability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Scheduling, High Availability

Description: Learn how to configure spread scheduling constraints in Kubernetes to distribute pods across zones, nodes, and failure domains for maximum high availability and fault tolerance.

---

High availability is critical for production workloads. When your application runs on multiple replicas, you want those replicas distributed across different failure domains. If all replicas land on the same node or availability zone, a single failure could take down your entire service.

Kubernetes provides topology spread constraints that let you control how pods are distributed across your cluster. This feature gives you fine-grained control over pod placement to achieve high availability without manual intervention.

## Understanding Topology Spread Constraints

Topology spread constraints allow you to define rules about how pods should be distributed across different topology domains. A topology domain is defined by a node label, such as zone, hostname, or region.

The key difference between topology spread constraints and pod anti-affinity is that spread constraints give you more control over the distribution. Instead of saying "don't schedule on the same node," you can say "distribute evenly across zones with a maximum skew of 1."

## Basic Spread Configuration

Here's a simple example that spreads pods across availability zones:

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
      - maxSkew: 1  # Maximum difference in pod count between zones
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: web
      containers:
      - name: web
        image: nginx:1.21
        ports:
        - containerPort: 80
```

This configuration ensures that pods are distributed evenly across availability zones. The `maxSkew` of 1 means that the difference in pod count between any two zones cannot exceed 1.

## Spreading Across Multiple Dimensions

You can define multiple spread constraints to distribute pods across different topology dimensions:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
spec:
  replicas: 12
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
        tier: backend
    spec:
      topologySpreadConstraints:
      # Spread across zones first
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: api
      # Then spread across nodes within zones
      - maxSkew: 2
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app: api
      containers:
      - name: api
        image: myapp/api:v2.3
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
```

This creates a two-level distribution strategy. First, pods are distributed across zones with strict enforcement. Then, within each zone, pods are spread across nodes with relaxed enforcement using `ScheduleAnyway`.

## Understanding WhenUnsatisfiable Options

The `whenUnsatisfiable` field determines what happens when the scheduler cannot satisfy the constraint:

- **DoNotSchedule**: Hard constraint. The pod will not be scheduled if the constraint cannot be met. Use this for critical high availability requirements.
- **ScheduleAnyway**: Soft constraint. The scheduler will try to satisfy the constraint but will schedule the pod anyway if it cannot.

Here's an example combining both:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  replicas: 5
  serviceName: db
  selector:
    matchLabels:
      app: db
  template:
    metadata:
      labels:
        app: db
    spec:
      topologySpreadConstraints:
      # Must spread across zones
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: db
      # Should spread across nodes
      - maxSkew: 1
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app: db
      containers:
      - name: postgres
        image: postgres:14
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 100Gi
```

## Advanced Label Selectors

You can use more complex label selectors to control which pods are considered for spreading:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worker
spec:
  replicas: 8
  selector:
    matchLabels:
      app: worker
      version: v2
  template:
    metadata:
      labels:
        app: worker
        version: v2
        environment: production
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchExpressions:
          - key: app
            operator: In
            values:
            - worker
          - key: environment
            operator: In
            values:
            - production
      containers:
      - name: worker
        image: myapp/worker:v2
```

This ensures that only production worker pods are considered when calculating the spread, allowing you to have separate spreading for staging or development environments.

## Combining with Node Affinity

You can combine topology spread constraints with node affinity for more sophisticated placement:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-inference
spec:
  replicas: 6
  selector:
    matchLabels:
      app: ml-inference
  template:
    metadata:
      labels:
        app: ml-inference
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: node.kubernetes.io/instance-type
                operator: In
                values:
                - m5.xlarge
                - m5.2xlarge
      topologySpreadConstraints:
      - maxSkew: 2
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: ml-inference
      containers:
      - name: inference
        image: ml/inference:latest
        resources:
          requests:
            cpu: 2000m
            memory: 4Gi
```

This ensures pods only run on specific instance types while still being spread across zones.

## Cluster-Level Default Constraints

Instead of defining constraints on every workload, you can set cluster-level defaults in the scheduler configuration. Create a scheduler config:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
- pluginConfig:
  - name: PodTopologySpread
    args:
      defaultConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: ScheduleAnyway
      - maxSkew: 3
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: ScheduleAnyway
      defaultingType: List
```

These defaults apply to all pods unless they define their own constraints. This provides a baseline level of spreading without requiring every workload to specify it.

## Monitoring Spread Effectiveness

After implementing spread constraints, verify that pods are actually distributed as expected:

```bash
# Check pod distribution across zones
kubectl get pods -l app=web -o wide | \
  awk '{print $7}' | tail -n +2 | sort | uniq -c

# Check pod distribution across nodes
kubectl get pods -l app=web -o wide | \
  awk '{print $1,$7}' | tail -n +2 | \
  while read pod node; do
    echo "$node"
  done | sort | uniq -c
```

You can also create a simple script to calculate the actual skew:

```bash
#!/bin/bash
# calculate-skew.sh - Check topology spread effectiveness

LABEL_SELECTOR="app=web"
TOPOLOGY_KEY="topology.kubernetes.io/zone"

echo "Calculating pod distribution for $LABEL_SELECTOR"
echo ""

# Get pod distribution
kubectl get pods -l "$LABEL_SELECTOR" -o json | \
  jq -r '.items[] | .spec.nodeName' | \
  while read node; do
    kubectl get node "$node" -o json | \
      jq -r ".metadata.labels[\"$TOPOLOGY_KEY\"]"
  done | sort | uniq -c | \
  awk '{print "Zone", $2":", $1, "pods"}'

echo ""
echo "Current skew: (calculate max - min)"
```

## Troubleshooting Spread Issues

If pods are not spreading as expected, check these common issues:

1. **Insufficient topology domains**: If you have 3 zones but 10 replicas with maxSkew of 1, some pods cannot be scheduled.
2. **Resource constraints**: Nodes in some zones might not have enough resources.
3. **Conflicting constraints**: Other affinity rules might conflict with spread constraints.

Check scheduler events for clues:

```bash
# View events for pending pods
kubectl get events --field-selector reason=FailedScheduling | \
  grep -i "topology spread"

# Describe a pending pod
kubectl describe pod <pending-pod-name> | grep -A 10 Events
```

## Best Practices

Follow these practices for effective spread scheduling:

1. **Start with soft constraints**: Use `ScheduleAnyway` initially, then tighten to `DoNotSchedule` as needed.
2. **Consider replica count**: Ensure your replica count makes sense for your topology. With 3 zones and maxSkew of 1, you can have 3, 4, 5, 6 replicas efficiently.
3. **Layer your constraints**: Apply zone-level constraints first with strict enforcement, then node-level constraints with relaxed enforcement.
4. **Test failure scenarios**: Remove nodes or cordon entire zones to verify your application remains available.
5. **Monitor continuously**: Set up alerts for uneven pod distribution or pods stuck in pending state.

Spread scheduling gives you powerful tools to implement high availability at the infrastructure level. By distributing pods across failure domains, you reduce the blast radius of any single failure and improve overall system resilience.
