# How to Configure Kubernetes Pod Topology Spread Constraints for True High Availability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, High Availability, Pod Topology, Scheduling

Description: Master pod topology spread constraints to distribute workloads across failure domains, ensuring your applications survive zone failures and maintain availability during infrastructure disruptions.

---

Running multiple replicas of your application provides redundancy, but if all those replicas land on the same node or availability zone, you have created an illusion of high availability. Pod topology spread constraints solve this problem by giving you fine-grained control over how Kubernetes distributes pods across your infrastructure's failure domains.

Traditional approaches like pod anti-affinity rules work but lack flexibility. They operate in binary fashion, either allowing or preventing pod co-location. Topology spread constraints provide a more nuanced approach, allowing you to specify desired distribution patterns while still permitting scheduling when perfect distribution is impossible.

This capability is critical for production workloads where a single zone failure should not take down your entire application. By spreading pods across zones, nodes, and other topology domains, you build genuine resilience into your architecture.

## Understanding Topology Spread Constraints

Topology spread constraints control how pods distribute across failure domains defined by node labels. Common topology keys include availability zone, hostname, and custom labels like rack or datacenter identifiers.

The constraint specifies a maximum skew, which defines the acceptable difference in pod count between any two topology domains. A maxSkew of 1 means domains can differ by at most one pod, while maxSkew of 2 allows a two-pod difference.

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
```

This configuration spreads six replicas across availability zones with a maximum skew of 1. If you have three zones, each zone gets exactly two pods. The `whenUnsatisfiable: DoNotSchedule` policy prevents pods from scheduling if they would violate the constraint.

The `whenUnsatisfiable` field accepts two values: `DoNotSchedule` strictly enforces the constraint, leaving pods pending if distribution requirements cannot be met. `ScheduleAnyway` treats the constraint as a preference, violating it when necessary to keep pods running.

## Configuring Zone-Level Distribution

For cloud-based Kubernetes clusters, distributing pods across availability zones is the most important topology spread constraint. Zone failures are relatively common, making zone-level distribution essential for production workloads.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: production
spec:
  replicas: 9
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: api-service
      - maxSkew: 2
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app: api-service
      containers:
      - name: api
        image: api-service:v1.0.0
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
```

This configuration uses two topology spread constraints. The first ensures even distribution across zones with strict enforcement. The second encourages distribution across nodes within zones but allows violations if necessary.

With nine replicas across three zones, you get three pods per zone. The node-level constraint then tries to spread those three pods across different nodes within each zone, maximizing resilience to both zone and node failures.

Verify the distribution after deployment:

```bash
# Check pod distribution across zones
kubectl get pods -n production -l app=api-service -o wide

# Count pods per zone
for zone in us-east-1a us-east-1b us-east-1c; do
  echo "Zone $zone:"
  kubectl get nodes -l topology.kubernetes.io/zone=$zone -o name | \
    xargs -I {} kubectl get pods -n production -l app=api-service --field-selector spec.nodeName={} --no-headers | wc -l
done
```

## Combining with Pod Anti-Affinity

Topology spread constraints work alongside pod anti-affinity rules, allowing you to express complex distribution requirements. Use anti-affinity for strict separation rules and topology spread for desired distribution patterns.

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
  namespace: production
spec:
  replicas: 3
  serviceName: database
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      # Strict anti-affinity: never co-locate database pods
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - database
            topologyKey: kubernetes.io/hostname
      # Spread across zones for zone-level HA
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: database
      containers:
      - name: postgres
        image: postgres:15
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
```

For this StatefulSet with three replicas, the anti-affinity rule ensures each pod runs on a different node. The topology spread constraint ensures these three nodes are in different availability zones. This combination provides maximum resilience for stateful workloads.

## Handling Uneven Cluster Topology

Real-world clusters often have uneven topology distributions. You might have four zones but only enough nodes in three zones to run your workload. Topology spread constraints need to handle these realities gracefully.

Use the `ScheduleAnyway` policy when you want best-effort distribution but cannot guarantee perfect spreading:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worker-pool
spec:
  replicas: 20
  selector:
    matchLabels:
      app: worker
  template:
    metadata:
      labels:
        app: worker
    spec:
      topologySpreadConstraints:
      - maxSkew: 2
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app: worker
      containers:
      - name: worker
        image: worker:latest
```

With 20 replicas and a maxSkew of 2, the scheduler attempts to distribute pods so no zone has more than two pods extra compared to other zones. If this cannot be achieved due to resource constraints or topology limitations, pods still schedule but may violate the skew preference.

Monitor actual distribution versus desired distribution:

```bash
# Create a script to analyze pod distribution
cat > check-distribution.sh << 'EOF'
#!/bin/bash

APP_LABEL=$1
NAMESPACE=${2:-default}
TOPOLOGY_KEY=${3:-topology.kubernetes.io/zone}

echo "Pod distribution for app=$APP_LABEL across $TOPOLOGY_KEY:"
echo

# Get unique topology values
TOPOLOGIES=$(kubectl get nodes -o jsonpath="{.items[*].metadata.labels.$TOPOLOGY_KEY}" | tr ' ' '\n' | sort -u)

for TOPOLOGY in $TOPOLOGIES; do
  COUNT=$(kubectl get pods -n $NAMESPACE -l app=$APP_LABEL -o json | \
    jq -r --arg topo "$TOPOLOGY" --arg key "$TOPOLOGY_KEY" \
    '.items[] | select(.spec.nodeName) | .spec.nodeName' | \
    xargs -I {} kubectl get node {} -o jsonpath="{.metadata.labels.$TOPOLOGY_KEY}" | \
    grep -c "^$TOPOLOGY$" || echo 0)
  echo "$TOPOLOGY: $COUNT pods"
done
EOF

chmod +x check-distribution.sh

# Run the analysis
./check-distribution.sh worker production topology.kubernetes.io/zone
```

## Multi-Level Topology Constraints

Complex production environments often require distribution across multiple topology dimensions simultaneously. Spread pods across zones for zone-level HA, across nodes for node-level HA, and across racks for physical infrastructure isolation.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-service
  namespace: production
spec:
  replicas: 12
  selector:
    matchLabels:
      app: critical-service
      tier: frontend
  template:
    metadata:
      labels:
        app: critical-service
        tier: frontend
    spec:
      topologySpreadConstraints:
      # Primary constraint: spread across zones
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: critical-service
            tier: frontend
      # Secondary constraint: spread across nodes within zones
      - maxSkew: 1
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app: critical-service
            tier: frontend
      # Tertiary constraint: spread across racks
      - maxSkew: 2
        topologyKey: topology.kubernetes.io/rack
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app: critical-service
            tier: frontend
      containers:
      - name: frontend
        image: critical-service:latest
        resources:
          requests:
            cpu: 1000m
            memory: 1Gi
```

The constraint evaluation happens in order. The scheduler first ensures zone-level distribution, then optimizes for node distribution within those zones, and finally considers rack-level distribution when possible. This layered approach provides comprehensive failure domain isolation.

## Default Topology Spread Constraints

Rather than configuring topology spread constraints for every deployment, set cluster-wide defaults that apply to all pods unless overridden. This ensures consistent distribution behavior across your entire cluster.

Configure default constraints in the scheduler configuration:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
- schedulerName: default-scheduler
  pluginConfig:
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

With these defaults, every pod automatically spreads across zones and nodes without requiring explicit constraints in pod specs. Individual deployments can still override these defaults when needed.

For managed Kubernetes services, many providers support default constraints through cluster configuration options:

```bash
# GKE: Enable balanced scheduling
gcloud container clusters update production-cluster \
  --enable-autoscaling \
  --autoscaling-profile=balanced

# EKS: Default spreading via node group configuration
# AKS: Availability zones configured at node pool level
```

## Testing Topology Spread Behavior

Validate your topology spread constraints by simulating various failure scenarios. Deploy applications with different replica counts and verify that distribution meets expectations.

```bash
# Deploy test workload with topology constraints
kubectl apply -f - << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: topology-test
spec:
  replicas: 15
  selector:
    matchLabels:
      app: topology-test
  template:
    metadata:
      labels:
        app: topology-test
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: topology-test
      containers:
      - name: test
        image: nginx
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
EOF

# Wait for deployment
kubectl rollout status deployment/topology-test

# Analyze distribution
kubectl get pods -l app=topology-test -o wide | \
  awk '{print $7}' | tail -n +2 | sort | uniq -c

# Simulate zone failure by cordoning all nodes in a zone
ZONE="us-east-1a"
kubectl get nodes -l topology.kubernetes.io/zone=$ZONE -o name | \
  xargs -I {} kubectl cordon {}

# Verify pods reschedule to other zones
kubectl delete pods -l app=topology-test --field-selector spec.nodeName=$NODE
```

Test constraint behavior under resource pressure by deliberately creating contention and observing how the scheduler balances spreading requirements against resource availability.

Topology spread constraints provide precise control over pod distribution across failure domains. By properly configuring these constraints for zone, node, and custom topology distributions, you build applications that survive infrastructure failures and maintain availability under diverse failure scenarios. This is not optional configuration for production workloads but fundamental infrastructure that separates resilient systems from fragile ones.
