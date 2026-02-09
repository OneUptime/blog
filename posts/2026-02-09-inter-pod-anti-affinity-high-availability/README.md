# How to Implement Inter-Pod Anti-Affinity for High-Availability Deployment Patterns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Scheduling, High-Availability

Description: Learn how to use inter-pod anti-affinity rules to distribute pods across nodes and zones for improved resilience and high availability in Kubernetes.

---

Inter-pod anti-affinity prevents pods from running together, spreading them across failure domains to improve availability. When properly configured, anti-affinity ensures that a single node, zone, or region failure doesn't take down your entire application. This is essential for production workloads that require high availability and fault tolerance.

This guide will show you how to implement inter-pod anti-affinity patterns for resilient applications.

## Understanding Inter-Pod Anti-Affinity

Inter-pod anti-affinity tells the scheduler to avoid placing pods near other pods matching a label selector. The "nearness" is defined by a topology key, which can be hostname (node-level separation), zone, region, or any custom topology label.

Anti-affinity comes in two types:
- Required: Hard constraint, pods won't schedule if anti-affinity can't be satisfied
- Preferred: Soft preference, scheduler tries to honor but will violate if necessary

## Basic Node-Level Anti-Affinity

Prevent replicas from running on the same node:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - web
            topologyKey: kubernetes.io/hostname
      containers:
      - name: nginx
        image: nginx:latest
```

With this configuration, each of the 3 replicas runs on a different node. If you only have 2 nodes, the third replica remains pending until a third node becomes available.

## Zone-Level Anti-Affinity

Spread replicas across availability zones for better fault tolerance:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: database
spec:
  replicas: 3
  selector:
    matchLabels:
      app: db
  template:
    metadata:
      labels:
        app: db
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - db
            topologyKey: topology.kubernetes.io/zone
      containers:
      - name: postgres
        image: postgres:14
```

Each database replica runs in a different availability zone, ensuring that a zone failure doesn't impact all replicas.

## Preferred Anti-Affinity for Flexibility

Use preferred anti-affinity when you want separation but need scheduling to succeed even when it can't be achieved:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 10
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - api
              topologyKey: kubernetes.io/hostname
      containers:
      - name: api
        image: api-server:latest
```

The scheduler tries to spread pods across nodes but will co-locate them if necessary, ensuring all 10 replicas deploy even in a 5-node cluster.

## Multi-Level Anti-Affinity

Combine zone and node-level anti-affinity for comprehensive distribution:

```yaml
affinity:
  podAntiAffinity:
    # Hard requirement: different zones
    requiredDuringSchedulingIgnoredDuringExecution:
    - labelSelector:
        matchExpressions:
        - key: app
          operator: In
          values:
          - critical-app
      topologyKey: topology.kubernetes.io/zone

    # Soft preference: different nodes within zones
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 80
      podAffinityTerm:
        labelSelector:
          matchExpressions:
          - key: app
            operator: In
            values:
            - critical-app
        topologyKey: kubernetes.io/hostname
```

This ensures zone separation while preferring node separation within zones.

## StatefulSet with Anti-Affinity

Spread StatefulSet pods for database or stateful service high availability:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: cassandra
spec:
  replicas: 5
  selector:
    matchLabels:
      app: cassandra
  serviceName: cassandra
  template:
    metadata:
      labels:
        app: cassandra
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - cassandra
            topologyKey: kubernetes.io/hostname
      containers:
      - name: cassandra
        image: cassandra:4.0
        ports:
        - containerPort: 9042
          name: cql
```

Each Cassandra node runs on a separate host, preventing a single host failure from affecting multiple replicas.

## Anti-Affinity by Version

Separate old and new versions during rolling updates:

```yaml
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 100
      podAffinityTerm:
        labelSelector:
          matchExpressions:
          - key: app
            operator: In
            values:
            - web
          # Match pods with same version
          - key: pod-template-hash
            operator: In
            values:
            - ${POD_TEMPLATE_HASH}
        topologyKey: kubernetes.io/hostname
```

This spreads pods of the same version across nodes while allowing different versions to co-locate during rolling updates.

## Anti-Affinity with Label Matching

Prevent pods with specific characteristics from co-locating:

```yaml
# Don't run memory-intensive pods together
affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
    - labelSelector:
        matchExpressions:
        - key: resource-profile
          operator: In
          values:
          - memory-intensive
      topologyKey: kubernetes.io/hostname
```

Tag memory-intensive workloads and spread them to prevent node resource exhaustion.

## Handling Insufficient Nodes

When anti-affinity prevents scheduling:

```yaml
# Strict anti-affinity
affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
    - labelSelector:
        matchExpressions:
        - key: app
          operator: In
          values:
          - web
      topologyKey: kubernetes.io/hostname

# Deployment with 10 replicas but only 5 nodes
# Result: 5 pods running, 5 pods pending
```

Solution options:
1. Add more nodes
2. Relax to preferred anti-affinity
3. Use topology spread constraints instead
4. Reduce replica count

## Topology Spread as Alternative

Consider topology spread constraints for more flexible distribution:

```yaml
# Instead of anti-affinity
topologySpreadConstraints:
- maxSkew: 1
  topologyKey: kubernetes.io/hostname
  whenUnsatisfiable: ScheduleAnyway
  labelSelector:
    matchLabels:
      app: web
```

Topology spread allows controlled skew rather than absolute separation, providing better scheduling success rates.

## Anti-Affinity for Different Applications

Separate different application tiers:

```yaml
# API server avoids database pods
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 70
      podAffinityTerm:
        labelSelector:
          matchExpressions:
          - key: tier
            operator: In
            values:
            - database
        topologyKey: kubernetes.io/hostname
```

This reduces noisy neighbor issues and improves resource distribution.

## Region-Level Anti-Affinity

For geo-distributed applications, spread across regions:

```yaml
affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
    - labelSelector:
        matchExpressions:
        - key: app
          operator: In
          values:
          - global-service
      topologyKey: topology.kubernetes.io/region
```

Ensures replicas run in different geographic regions for disaster recovery.

## Combining with Node Affinity

Mix anti-affinity with node requirements:

```yaml
affinity:
  # Pods must run on production nodes
  nodeAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      nodeSelectorTerms:
      - matchExpressions:
        - key: environment
          operator: In
          values:
          - production

  # Pods must avoid each other
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
    - labelSelector:
        matchExpressions:
        - key: app
          operator: In
          values:
          - web
      topologyKey: kubernetes.io/hostname
```

## Monitoring Anti-Affinity Effectiveness

Check pod distribution:

```bash
# View pod to node mapping
kubectl get pods -l app=web -o wide

# Count pods per node
kubectl get pods -l app=web -o jsonpath='{range .items[*]}{.spec.nodeName}{"\n"}{end}' | sort | uniq -c

# Count pods per zone
kubectl get pods -l app=web -o json | \
  jq -r '.items[] | .spec.nodeName' | \
  xargs -I {} kubectl get node {} -o jsonpath='{.metadata.labels.topology\.kubernetes\.io/zone}{"\n"}' | \
  sort | uniq -c

# Check for pending pods
kubectl get pods -l app=web --field-selector status.phase=Pending

# View why pod is pending
kubectl describe pod PENDING_POD | grep -A10 Events
```

## Testing Failure Scenarios

Validate anti-affinity improves availability:

```bash
# Drain a node to simulate failure
kubectl drain NODE_NAME --ignore-daemonsets --delete-emptydir-data

# Verify remaining pods still serve traffic
kubectl get pods -l app=web -o wide

# Check if drained pods rescheduled
kubectl get pods -l app=web --field-selector spec.nodeName=NODE_NAME

# Uncordon node
kubectl uncordon NODE_NAME
```

## Best Practices

Use required anti-affinity for critical services that must survive single-node failures. Use preferred anti-affinity for better scheduling success rates when absolute separation isn't critical.

Combine zone-level and node-level anti-affinity for multi-layer protection. Start with preferred rules and only use required when necessary.

Match anti-affinity replica count to available topology domains. Don't set 10 replicas with required node anti-affinity in a 5-node cluster.

Consider topology spread constraints as an alternative for more flexible distribution control. They often provide better scheduling outcomes than strict anti-affinity.

Monitor pod distribution regularly to ensure anti-affinity rules achieve intended spreading. Test failure scenarios to validate your high availability assumptions.

## Conclusion

Inter-pod anti-affinity is essential for building highly available Kubernetes applications. By preventing pods from co-locating on the same nodes or zones, you ensure that infrastructure failures don't take down your entire service.

Use required anti-affinity when you need guaranteed separation for critical workloads. Use preferred anti-affinity for better scheduling flexibility while still encouraging distribution. Combine multiple levels of anti-affinity for comprehensive fault tolerance across nodes, zones, and regions.

Test your anti-affinity configurations thoroughly and monitor actual pod distribution to verify they deliver the high availability you need.
