# How to Use minDomains in Topology Spread Constraints for Even Zone Distribution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Scheduling, High-Availability

Description: Learn how to use the minDomains field in topology spread constraints to ensure pods distribute across a minimum number of failure domains for improved resilience.

---

Topology spread constraints distribute pods across failure domains, but by default they only spread across domains that already have matching pods. The minDomains field forces the scheduler to spread pods across at least a specified number of domains, even when starting from zero. This ensures true multi-zone or multi-region distribution from the beginning, improving availability and resilience.

This guide will show you how to use minDomains to guarantee minimum spreading across your infrastructure topology.

## Understanding minDomains Behavior

Without minDomains, if you deploy 2 replicas with maxSkew: 1, both might land in the same zone initially. As you scale up, pods spread to other zones. With minDomains: 3, the scheduler ensures the first 3 pods land in different zones, guaranteeing multi-zone presence immediately.

The minDomains field was introduced in Kubernetes 1.24 and became stable in 1.26. It works in conjunction with maxSkew to provide both minimum spread and maximum skew constraints.

## Basic minDomains Configuration

Ensure pods spread across at least 3 availability zones:

```yaml
# deployment-mindomain.yaml
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
        minDomains: 3
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: web
      containers:
      - name: nginx
        image: nginx:latest
```

With this configuration:
- First 3 pods must land in 3 different zones
- Remaining 3 pods distribute with maxSkew: 1
- Result: 2 pods per zone across 3 zones

## Comparing with and without minDomains

Without minDomains (legacy behavior):

```yaml
# Without minDomains - pods might cluster initially
topologySpreadConstraints:
- maxSkew: 1
  topologyKey: topology.kubernetes.io/zone
  whenUnsatisfiable: DoNotSchedule
  labelSelector:
    matchLabels:
      app: web

# Possible distribution with 6 replicas:
# Zone A: 4 pods
# Zone B: 2 pods
# Zone C: 0 pods
# (Meets maxSkew: 1 between zones with pods)
```

With minDomains:

```yaml
# With minDomains - guaranteed 3-zone spread
topologySpreadConstraints:
- maxSkew: 1
  minDomains: 3
  topologyKey: topology.kubernetes.io/zone
  whenUnsatisfiable: DoNotSchedule
  labelSelector:
    matchLabels:
      app: web

# Guaranteed distribution with 6 replicas:
# Zone A: 2 pods
# Zone B: 2 pods
# Zone C: 2 pods
```

## Multi-Level Topology with minDomains

Spread across regions and zones:

```yaml
topologySpreadConstraints:
# Spread across at least 2 regions
- maxSkew: 2
  minDomains: 2
  topologyKey: topology.kubernetes.io/region
  whenUnsatisfiable: DoNotSchedule
  labelSelector:
    matchLabels:
      app: global-service

# Within each region, spread across at least 3 zones
- maxSkew: 1
  minDomains: 3
  topologyKey: topology.kubernetes.io/zone
  whenUnsatisfiable: ScheduleAnyway
  labelSelector:
    matchLabels:
      app: global-service
```

This creates a hierarchical distribution: at least 2 regions, with pods in at least 3 zones per region.

## Using minDomains with Small Replica Counts

When replica count is less than minDomains, each pod goes to a different domain:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-service
spec:
  replicas: 2  # Less than minDomains
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
        minDomains: 3
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: critical
      containers:
      - name: app
        image: critical-app:latest

# Result: 2 pods in 2 different zones
# Zone A: 1 pod
# Zone B: 1 pod
# Zone C: 0 pods
```

## Handling Insufficient Domains

If fewer domains exist than minDomains specifies:

```yaml
topologySpreadConstraints:
- maxSkew: 1
  minDomains: 5  # But cluster only has 3 zones
  topologyKey: topology.kubernetes.io/zone
  whenUnsatisfiable: DoNotSchedule
  labelSelector:
    matchLabels:
      app: web
```

With `whenUnsatisfiable: DoNotSchedule`, pods remain pending if minDomains cannot be satisfied. Use `whenUnsatisfiable: ScheduleAnyway` to fall back to best-effort distribution:

```yaml
topologySpreadConstraints:
- maxSkew: 1
  minDomains: 5
  topologyKey: topology.kubernetes.io/zone
  whenUnsatisfiable: ScheduleAnyway  # Schedule even if can't meet minDomains
  labelSelector:
    matchLabels:
      app: web
```

## StatefulSet with minDomains

Ensure StatefulSet pods spread across zones from the start:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  replicas: 6
  selector:
    matchLabels:
      app: db
  serviceName: database
  template:
    metadata:
      labels:
        app: db
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        minDomains: 3
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
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
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi

# Result:
# Zone A: db-0, db-3
# Zone B: db-1, db-4
# Zone C: db-2, db-5
```

## Combining with Node Affinity

Ensure minimum spread within a subset of nodes:

```yaml
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: node-type
            operator: In
            values:
            - compute-optimized
  topologySpreadConstraints:
  - maxSkew: 1
    minDomains: 3
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: DoNotSchedule
    labelSelector:
      matchLabels:
        app: compute-job
```

Pods spread across at least 3 zones, but only on compute-optimized nodes.

## minDomains for Rolling Updates

Maintain zone diversity during deployments:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 9
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 3
      maxUnavailable: 1
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        minDomains: 3
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: api
        matchLabelKeys:
        - pod-template-hash
      containers:
      - name: api
        image: api:v2
```

During rolling updates, both old and new ReplicaSets maintain 3-zone spread independently.

## Monitoring Domain Distribution

Check actual pod distribution across domains:

```bash
# Count pods per zone
kubectl get pods -l app=web -o json | \
  jq -r '.items[] | .spec.nodeName' | \
  xargs -I {} kubectl get node {} -o jsonpath='{.metadata.labels.topology\.kubernetes\.io/zone}{"\n"}' | \
  sort | uniq -c

# Detailed pod to zone mapping
kubectl get pods -l app=web -o custom-columns=\
NAME:.metadata.name,\
NODE:.spec.nodeName,\
ZONE:.spec.nodeSelector

# Check for pending pods due to spread constraints
kubectl get pods -l app=web --field-selector status.phase=Pending
kubectl describe pod PENDING_POD | grep -A5 "Events"
```

## Adjusting for Cluster Size

Scale minDomains based on cluster topology:

```yaml
# Small cluster (3 zones)
topologySpreadConstraints:
- maxSkew: 1
  minDomains: 3
  topologyKey: topology.kubernetes.io/zone

# Large cluster (6+ zones)
topologySpreadConstraints:
- maxSkew: 2
  minDomains: 5
  topologyKey: topology.kubernetes.io/zone

# Multi-region cluster
topologySpreadConstraints:
- maxSkew: 1
  minDomains: 2
  topologyKey: topology.kubernetes.io/region
- maxSkew: 1
  minDomains: 3
  topologyKey: topology.kubernetes.io/zone
```

## Troubleshooting minDomains Issues

Debug pods stuck pending due to minDomains:

```bash
# Check why pod is pending
kubectl describe pod PENDING_POD

# Common message:
# "0/10 nodes are available: 3 node(s) didn't match pod topology spread constraints."

# Verify available domains
kubectl get nodes -L topology.kubernetes.io/zone | \
  awk '{print $6}' | sort | uniq

# Check existing pod distribution
kubectl get pods -l app=web -o wide

# Temporarily relax constraint for testing
kubectl patch deployment web-app --type=json -p='[
  {
    "op": "replace",
    "path": "/spec/template/spec/topologySpreadConstraints/0/whenUnsatisfiable",
    "value": "ScheduleAnyway"
  }
]'
```

## Best Practices

Set minDomains based on your reliability requirements and available infrastructure. For critical services, use minDomains equal to your desired zone count. For less critical workloads, use lower values or omit minDomains.

Use `whenUnsatisfiable: DoNotSchedule` for strict enforcement when high availability is required. Use `whenUnsatisfiable: ScheduleAnyway` for flexible deployment that tolerates reduced spreading.

Start with minDomains: 2 for basic redundancy and increase based on SLA requirements. Consider cluster capacity when setting minDomains - setting it higher than available domains causes permanent pending pods.

Combine minDomains with appropriate maxSkew values. Common combinations: minDomains: 3 with maxSkew: 1 for balanced spreading, or minDomains: 2 with maxSkew: 2 for more flexible placement.

## Conclusion

The minDomains field ensures pods distribute across multiple failure domains from the start, improving availability and resilience. By guaranteeing minimum spreading, you avoid scenarios where all pods cluster in a single domain initially.

Configure minDomains based on your reliability requirements and infrastructure topology. Use it with appropriate whenUnsatisfiable policies to balance strict spreading requirements with deployment flexibility. Monitor actual distribution to verify constraints achieve intended spreading behavior.

Combined with maxSkew and proper labelSelector configuration, minDomains provides powerful control over pod placement for highly available applications.
