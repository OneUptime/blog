# How to Implement AKS Pod Topology Spread Constraints for Zone-Aware Scheduling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, Kubernetes, Topology Spread, Scheduling, Availability Zones, Azure, High Availability

Description: Learn how to use pod topology spread constraints on AKS to distribute workloads evenly across availability zones and nodes for high availability.

---

You deploy a 6-replica deployment on your AKS cluster that spans 3 availability zones. Kubernetes schedules all 6 replicas on nodes in zone 1 because those nodes have the most available resources. Zone 1 has an outage, and your application goes completely down even though zones 2 and 3 are healthy. The default Kubernetes scheduler optimizes for resource utilization, not distribution. It will happily pack all your pods onto a single node or a single zone if that is where the resources are.

Pod topology spread constraints fix this by telling the scheduler to distribute pods across topology domains - availability zones, nodes, or any custom topology you define. They are the right tool for ensuring your workloads survive zone failures, node failures, and rack failures.

## The Problem with Pod Anti-Affinity

Before topology spread constraints existed, the standard approach was pod anti-affinity rules. But pod anti-affinity has significant limitations.

```yaml
# The old approach - pod anti-affinity (limited and rigid)
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
      affinity:
        podAntiAffinity:
          # This says "don't put two web-app pods on the same node"
          # But if you have 6 replicas and only 4 nodes, 2 pods can't schedule
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: app
                    operator: In
                    values:
                      - web-app
              topologyKey: kubernetes.io/hostname
```

The problem is that required anti-affinity is all-or-nothing. If you have 6 replicas and 4 nodes, 2 pods will be stuck in Pending because there is no node without an existing pod. Preferred anti-affinity avoids the scheduling failure but provides no guarantees about distribution.

Topology spread constraints solve this by specifying the maximum allowed imbalance, giving the scheduler flexibility to make reasonable decisions.

## Basic Zone-Aware Spread

Here is a deployment that spreads pods evenly across availability zones.

```yaml
# zone-spread-deployment.yaml
# Distributes pods evenly across AKS availability zones
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
        # Spread across availability zones with max skew of 1
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: web-app
      containers:
        - name: web
          image: myacr.azurecr.io/web-app:v3
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

Let me break down the key fields.

**maxSkew**: The maximum allowed difference in pod count between any two zones. With `maxSkew: 1`, if zone 1 has 2 pods, zones 2 and 3 must each have at least 1 pod before zone 1 can get a third.

**topologyKey**: The node label that defines the topology domain. `topology.kubernetes.io/zone` is the standard label for availability zones on AKS. The values are `eastus-1`, `eastus-2`, `eastus-3` (or similar depending on the region).

**whenUnsatisfiable**: What to do if the constraint cannot be satisfied. `DoNotSchedule` means the pod stays Pending. `ScheduleAnyway` means the scheduler tries its best but places the pod somewhere even if it violates the constraint.

**labelSelector**: Which pods to consider when calculating the spread. Only pods matching this selector count toward the skew calculation.

## Combining Zone and Node Spread

For maximum availability, spread across both zones and individual nodes.

```yaml
# dual-spread-deployment.yaml
# Spread across both zones and nodes for high availability
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-api
spec:
  replicas: 9
  selector:
    matchLabels:
      app: critical-api
  template:
    metadata:
      labels:
        app: critical-api
    spec:
      topologySpreadConstraints:
        # First: spread evenly across availability zones
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: critical-api
        # Second: spread evenly across nodes within each zone
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: critical-api
      containers:
        - name: api
          image: myacr.azurecr.io/critical-api:v2
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
```

With 9 replicas across 3 zones, each zone gets 3 pods. The second constraint then tries to spread those 3 pods across different nodes within each zone. The zone spread uses `DoNotSchedule` (hard requirement), while the node spread uses `ScheduleAnyway` (best effort) because you might not have enough nodes for perfect distribution.

## Understanding maxSkew in Practice

The maxSkew value controls how uneven the distribution can be. Here is how different values affect scheduling with 6 replicas across 3 zones.

```
maxSkew: 1 (strictly even)
  Zone 1: 2 pods
  Zone 2: 2 pods
  Zone 3: 2 pods

maxSkew: 2 (slightly uneven allowed)
  Zone 1: 3 pods (possible)
  Zone 2: 2 pods
  Zone 3: 1 pod

maxSkew: 3 (very uneven allowed)
  Zone 1: 4 pods (possible)
  Zone 2: 1 pod
  Zone 3: 1 pod
```

For high availability, use `maxSkew: 1`. For workloads where some imbalance is acceptable in exchange for faster scheduling, use `maxSkew: 2`.

## Handling Zone Imbalance on AKS

AKS clusters often have an unequal number of nodes per zone. If zone 1 has 5 nodes, zone 2 has 3, and zone 3 has 2, strict zone spreading with `DoNotSchedule` can leave pods Pending because zone 3 runs out of capacity.

Use `ScheduleAnyway` with `matchLabelKeys` for a more flexible approach.

```yaml
# flexible-spread.yaml
# Flexible zone spreading that handles imbalanced node pools
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flexible-app
spec:
  replicas: 12
  selector:
    matchLabels:
      app: flexible-app
  template:
    metadata:
      labels:
        app: flexible-app
    spec:
      topologySpreadConstraints:
        - maxSkew: 2
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: flexible-app
          # Only consider pods from the same deployment revision
          # This prevents old ReplicaSet pods from affecting the calculation
          matchLabelKeys:
            - pod-template-hash
      containers:
        - name: app
          image: myacr.azurecr.io/flexible-app:v1
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
```

The `matchLabelKeys` field is important for deployments. During a rolling update, both the old and new ReplicaSets have pods running. Without `matchLabelKeys`, the spread constraint considers all pods (old and new), which can lead to uneven distribution of the new pods.

## Topology Spread for StatefulSets

StatefulSets have ordered, sticky identities that make topology spread even more important. You want database replicas in different zones so a single zone failure does not take out the majority of your database cluster.

```yaml
# database-statefulset.yaml
# Spread database replicas across zones
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      topologySpreadConstraints:
        # One replica per zone - critical for database HA
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: postgres
      containers:
        - name: postgres
          image: postgres:16
          ports:
            - containerPort: 5432
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
          resources:
            requests:
              cpu: 1
              memory: 2Gi
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: managed-csi-premium
        resources:
          requests:
            storage: 100Gi
```

With 3 replicas and 3 zones, each zone gets exactly one database replica. If zone 2 goes down, you still have 2 out of 3 replicas in the remaining zones.

## Verifying Pod Distribution

After deploying, verify that pods are actually spread correctly.

```bash
# Check which zone each pod is in
kubectl get pods -l app=web-app -o wide

# Get zone information for each pod
kubectl get pods -l app=web-app -o json | jq -r '.items[] | "\(.metadata.name)\t\(.spec.nodeName)"'

# Check zone labels on nodes
kubectl get nodes -o custom-columns=NAME:.metadata.name,ZONE:.metadata.labels.topology\\.kubernetes\\.io/zone

# Count pods per zone
kubectl get pods -l app=web-app -o json | jq -r '
  [.items[].spec.nodeName] |
  group_by(.) |
  map({node: .[0], count: length})
'
```

For a quick visual check.

```bash
# Show pod distribution across zones
for zone in $(kubectl get nodes -o jsonpath='{.items[*].metadata.labels.topology\.kubernetes\.io/zone}' | tr ' ' '\n' | sort -u); do
  count=$(kubectl get pods -l app=web-app -o json | jq --arg zone "$zone" '[.items[] | select(.spec.nodeName as $node | [env.nodes[] | select(.zone == $zone) | .name] | index($node) != null)] | length')
  echo "Zone $zone: $count pods"
done
```

## Common Pitfalls

### Pods Stuck in Pending

If pods are Pending with the message "doesn't satisfy spread constraint", you have a hard constraint (`DoNotSchedule`) that cannot be satisfied. Common reasons include not enough nodes in a zone, existing pods using all resources in one zone, or `maxSkew` being too restrictive.

Fix by changing `whenUnsatisfiable` to `ScheduleAnyway` or increasing `maxSkew`.

### Ignoring Node Affinity Interactions

Topology spread constraints interact with node affinity. If you have a node selector that restricts pods to certain nodes, the topology spread only considers those nodes.

```yaml
# Make sure topology spread and node selection are compatible
spec:
  nodeSelector:
    workload: api  # Only nodes with this label
  topologySpreadConstraints:
    - maxSkew: 1
      topologyKey: topology.kubernetes.io/zone
      # This constraint only considers nodes that match the nodeSelector
      whenUnsatisfiable: DoNotSchedule
      labelSelector:
        matchLabels:
          app: web-app
```

### Rolling Updates and Temporary Imbalance

During rolling updates, the old and new pods coexist. Use `matchLabelKeys: [pod-template-hash]` to ensure the spread constraint only considers pods from the current revision.

## Cluster-Level Default Spread Constraints

You can set default topology spread constraints for all pods in the cluster by configuring the scheduler. On AKS, this is done through the scheduler profile.

```bash
# Unfortunately, AKS does not expose scheduler configuration directly
# But you can use a mutating webhook to inject default constraints
# Or use namespace-level defaults with tools like Kyverno
```

Using Kyverno to inject default topology spread constraints.

```yaml
# kyverno-default-spread.yaml
# Automatically add zone spread constraints to all deployments
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-topology-spread
spec:
  rules:
    - name: add-zone-spread
      match:
        resources:
          kinds:
            - Deployment
      mutate:
        patchStrategicMerge:
          spec:
            template:
              spec:
                topologySpreadConstraints:
                  - maxSkew: 1
                    topologyKey: topology.kubernetes.io/zone
                    whenUnsatisfiable: ScheduleAnyway
                    labelSelector:
                      matchLabels:
                        "{{request.object.spec.selector.matchLabels}}"
```

## Wrapping Up

Pod topology spread constraints are the modern, flexible way to distribute workloads across failure domains on AKS. They replace the rigid pod anti-affinity rules with a configurable skew-based model that handles real-world scenarios like uneven zone capacity and rolling updates. For production workloads, use `maxSkew: 1` with `DoNotSchedule` for zone spread to guarantee even distribution, and `ScheduleAnyway` for node spread to avoid scheduling failures. Always verify the actual distribution after deployment, and use `matchLabelKeys` to handle rolling updates correctly. The combination of zone-aware and node-aware spread constraints gives your applications the best chance of surviving infrastructure failures without any manual intervention.
