# How to Configure Redis Pod Anti-Affinity in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Kubernetes, Affinity

Description: Learn how to configure Kubernetes pod anti-affinity rules for Redis to spread replicas across nodes and availability zones for improved fault tolerance.

---

Pod anti-affinity rules ensure Redis pods are distributed across different nodes and availability zones, preventing a single node failure from taking down all Redis replicas simultaneously.

## Understanding Anti-Affinity Types

```text
requiredDuringSchedulingIgnoredDuringExecution (hard rule):
  - Pod will NOT be scheduled if rule cannot be satisfied
  - Use for strict requirements (never co-locate primary and replica)

preferredDuringSchedulingIgnoredDuringExecution (soft rule):
  - Scheduler will try to satisfy the rule but proceeds if not possible
  - Use for best-effort spreading (prefer different nodes)
```

## Basic Node Anti-Affinity

Prevent two Redis pods from landing on the same node:

```yaml
# redis-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
spec:
  serviceName: redis
  replicas: 3
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: app
                    operator: In
                    values:
                      - redis
              topologyKey: kubernetes.io/hostname
      containers:
        - name: redis
          image: redis:7-alpine
```

This hard rule ensures each Redis pod lands on a different host. If only 2 nodes are available for 3 pods, one pod will remain Pending.

## Availability Zone Spreading

Spread replicas across availability zones:

```yaml
affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
            - key: app
              operator: In
              values:
                - redis
        topologyKey: topology.kubernetes.io/zone
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
              - key: app
                operator: In
                values:
                  - redis
          topologyKey: kubernetes.io/hostname
```

This requires zone spreading (hard) and also prefers node spreading (soft).

## Combining with Node Affinity

Require Redis to run on memory-optimized nodes while maintaining anti-affinity:

```yaml
affinity:
  nodeAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      nodeSelectorTerms:
        - matchExpressions:
            - key: node-type
              operator: In
              values:
                - memory-optimized
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
              - key: app
                operator: In
                values:
                  - redis
          topologyKey: kubernetes.io/hostname
```

Label your nodes:

```bash
kubectl label node node-1 node-type=memory-optimized
kubectl label node node-2 node-type=memory-optimized
kubectl label node node-3 node-type=memory-optimized
```

## Topology Spread Constraints (Modern Approach)

Kubernetes 1.19+ offers a cleaner way to spread pods:

```yaml
topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: DoNotSchedule
    labelSelector:
      matchLabels:
        app: redis
  - maxSkew: 1
    topologyKey: kubernetes.io/hostname
    whenUnsatisfiable: ScheduleAnyway
    labelSelector:
      matchLabels:
        app: redis
```

## Verifying Placement

```bash
# Check which node each Redis pod is on
kubectl get pods -n redis -o wide

# Verify they are on different nodes
kubectl get pods -n redis -o jsonpath='{range .items[*]}{.metadata.name}{" -> "}{.spec.nodeName}{"\n"}{end}'

# Check zones
kubectl get pods -n redis -o jsonpath='{range .items[*]}{.metadata.name}{" -> "}{.spec.nodeName}{"\n"}{end}' | \
  while read pod_node; do
    node=$(echo $pod_node | awk '{print $3}')
    zone=$(kubectl get node $node -o jsonpath='{.metadata.labels.topology\.kubernetes\.io/zone}')
    echo "$pod_node (zone: $zone)"
  done
```

## Summary

Redis pod anti-affinity prevents multiple replicas from running on the same node or availability zone. Use hard `requiredDuringScheduling` rules to enforce zone spreading, and soft `preferredDuringScheduling` rules for node spreading so pods can still schedule when capacity is limited. Consider `topologySpreadConstraints` as a more expressive modern alternative that provides finer control over distribution skew.
