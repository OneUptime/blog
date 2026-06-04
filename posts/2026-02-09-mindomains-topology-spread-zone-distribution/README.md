# How to Use minDomains in Topology Spread Constraints for Even Zone Distribution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Scheduling, High-Availability

Description: Learn how to use the minDomains field in topology spread constraints to ensure pods distribute across a minimum number of failure domains for improved resilience.

---

Topology spread constraints distribute pods across failure domains by comparing the number of matching pods in eligible topology domains. The minDomains field sets the minimum number of eligible domains that must be considered for skew calculations. When fewer eligible domains exist than minDomains, the scheduler treats the global minimum as 0, which can prevent additional pods from being placed until enough domains are available.

This guide will show you how to use minDomains to enforce spreading requirements across your infrastructure topology.

## Understanding minDomains Behavior

Without minDomains, the scheduler balances pods across the eligible domains it can see. With three eligible zones and maxSkew: 1, two replicas are placed in different zones. With minDomains: 3, the same balancing applies when three eligible zones exist; if fewer than three eligible zones exist, the scheduler calculates skew against a global minimum of 0 and can keep pods pending rather than allowing the workload to over-concentrate.

The minDomains field was introduced in Kubernetes 1.24 as an alpha feature and became stable in Kubernetes 1.30. Before Kubernetes 1.30, it required the MinDomainsInPodTopologySpread feature gate, which was enabled by default starting in Kubernetes 1.28. It works in conjunction with maxSkew and can only be used with `whenUnsatisfiable: DoNotSchedule`.

## Basic minDomains Configuration

Require scheduler calculations to account for at least 3 availability zones:

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
- If 3 eligible zones exist, pods distribute with maxSkew: 1
- If fewer than 3 eligible zones exist, additional pods can remain pending
- Result: 2 pods per zone across 3 zones

## Comparing with and without minDomains

Without minDomains:

```yaml
# Without minDomains - balance across eligible zones
topologySpreadConstraints:
- maxSkew: 1
  topologyKey: topology.kubernetes.io/zone
  whenUnsatisfiable: DoNotSchedule
  labelSelector:
    matchLabels:
      app: web

# Possible distribution with 6 replicas:
# Zone A: 2 pods
# Zone B: 2 pods
# Zone C: 2 pods
# (Meets maxSkew: 1 across eligible zones)
```

With minDomains:

```yaml
# With minDomains - require at least 3 eligible zones for full placement
topologySpreadConstraints:
- maxSkew: 1
  minDomains: 3
  topologyKey: topology.kubernetes.io/zone
  whenUnsatisfiable: DoNotSchedule
  labelSelector:
    matchLabels:
      app: web

# Distribution with 3 eligible zones:
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

# Spread across at least 3 zones overall
- maxSkew: 1
  minDomains: 3
  topologyKey: topology.kubernetes.io/zone
  whenUnsatisfiable: DoNotSchedule
  labelSelector:
    matchLabels:
      app: global-service
```

These constraints are both applied to the same set of pods: the scheduler enforces spreading across at least 2 eligible regions and at least 3 eligible zones overall.

## Using minDomains with Small Replica Counts

When replica count is less than minDomains, pods are spread with maxSkew across the eligible domains. With maxSkew: 1 and at least 3 eligible zones, each of the first two pods goes to a different zone:

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

With `whenUnsatisfiable: DoNotSchedule`, additional pods can remain pending if placing them would exceed maxSkew while fewer than minDomains eligible domains are available. Remove `minDomains` and use `whenUnsatisfiable: ScheduleAnyway` to fall back to best-effort distribution:

```yaml
topologySpreadConstraints:
- maxSkew: 1
  topologyKey: topology.kubernetes.io/zone
  whenUnsatisfiable: ScheduleAnyway  # Schedule while preferring lower skew
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

Pods spread across the eligible compute-optimized zones, and minDomains requires the scheduler to account for at least 3 of those zones.

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

During rolling updates, `matchLabelKeys` uses the Deployment's `pod-template-hash` label so each ReplicaSet revision is spread independently.

## Monitoring Domain Distribution

Check actual pod distribution across domains:

```bash
# Count pods per zone
kubectl get pods -l app=web -o json | \
  jq -r '.items[] | select(.spec.nodeName != null) | .spec.nodeName' | \
  xargs -I {} kubectl get node {} -o jsonpath='{.metadata.labels.topology\.kubernetes\.io/zone}{"\n"}' | \
  sort | uniq -c

# Detailed pod to zone mapping
kubectl get pods -l app=web -o json | \
  jq -r '.items[] | select(.spec.nodeName != null) | [.metadata.name, .spec.nodeName] | @tsv' | \
  while read -r pod node; do
    zone=$(kubectl get node "$node" -o jsonpath='{.metadata.labels.topology\.kubernetes\.io/zone}')
    printf "%s\t%s\t%s\n" "$pod" "$node" "$zone"
  done

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
  whenUnsatisfiable: DoNotSchedule

# Large cluster (6+ zones)
topologySpreadConstraints:
- maxSkew: 2
  minDomains: 5
  topologyKey: topology.kubernetes.io/zone
  whenUnsatisfiable: DoNotSchedule

# Multi-region cluster
topologySpreadConstraints:
- maxSkew: 1
  minDomains: 2
  topologyKey: topology.kubernetes.io/region
  whenUnsatisfiable: DoNotSchedule
- maxSkew: 1
  minDomains: 3
  topologyKey: topology.kubernetes.io/zone
  whenUnsatisfiable: DoNotSchedule
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
  awk 'NR > 1 {print $NF}' | sort | uniq

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

Use `whenUnsatisfiable: DoNotSchedule` for strict enforcement when high availability is required. Use `whenUnsatisfiable: ScheduleAnyway` for flexible deployment that tolerates reduced spreading, and omit minDomains in that case.

Start with minDomains: 2 for basic redundancy and increase based on SLA requirements. Consider cluster capacity when setting minDomains - setting it higher than available domains can leave pods pending when maxSkew would be exceeded.

Combine minDomains with appropriate maxSkew values. Common combinations: minDomains: 3 with maxSkew: 1 for balanced spreading, or minDomains: 2 with maxSkew: 2 for more flexible placement.

## Conclusion

The minDomains field ensures topology spread calculations account for a minimum number of eligible failure domains, improving availability and resilience when domains are temporarily unavailable or not yet present.

Configure minDomains based on your reliability requirements and infrastructure topology. Use `DoNotSchedule` with minDomains for strict spreading requirements, or omit minDomains with `ScheduleAnyway` when deployment flexibility is more important. Monitor actual distribution to verify constraints achieve intended spreading behavior.

Combined with maxSkew and proper labelSelector configuration, minDomains provides powerful control over pod placement for highly available applications.
