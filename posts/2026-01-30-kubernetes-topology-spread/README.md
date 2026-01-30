# How to Build Kubernetes Topology Spread

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kubernetes, Scheduling, High Availability, DevOps

Description: Configure topology spread constraints in Kubernetes to distribute pods evenly across failure domains, zones, and nodes for high availability.

---

When running production workloads on Kubernetes, distributing pods evenly across your infrastructure is critical for high availability. If all your replicas land on the same node or availability zone, a single failure can take down your entire service. Topology spread constraints give you fine-grained control over how the scheduler places pods across failure domains.

This guide walks through topology spread constraints from basic configuration to advanced patterns. You will learn how to spread pods across zones, nodes, and custom topology domains while handling edge cases in real production environments.

## Understanding Topology Spread Constraints

Topology spread constraints tell the Kubernetes scheduler how to distribute pods relative to topology domains. A topology domain is any logical grouping defined by node labels, such as availability zones, racks, or individual nodes.

Before topology spread constraints existed, operators used pod anti-affinity rules to prevent pods from landing on the same node. This approach works but becomes unwieldy with complex requirements. Topology spread constraints provide a more flexible and readable solution.

### The Core Problem

Consider a deployment with 6 replicas across 3 availability zones. Without constraints, the scheduler might place all 6 pods in a single zone if that zone has the most available resources. When that zone goes down, your service is completely unavailable.

| Distribution | Zone A | Zone B | Zone C | Zone Failure Impact |
|--------------|--------|--------|--------|---------------------|
| Bad | 6 | 0 | 0 | 100% capacity loss |
| Uneven | 4 | 1 | 1 | 67% capacity loss |
| Good | 2 | 2 | 2 | 33% capacity loss |

Topology spread constraints ensure the scheduler maintains an even distribution.

## Basic Syntax and Structure

A topology spread constraint is defined in the pod spec under `topologySpreadConstraints`. Here is the complete structure:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example-pod
  labels:
    app: web-frontend
spec:
  topologySpreadConstraints:
    - maxSkew: 1
      topologyKey: topology.kubernetes.io/zone
      whenUnsatisfiable: DoNotSchedule
      labelSelector:
        matchLabels:
          app: web-frontend
  containers:
    - name: nginx
      image: nginx:1.25
```

### Field Reference

| Field | Required | Description |
|-------|----------|-------------|
| maxSkew | Yes | Maximum allowed difference in pod count between any two topology domains |
| topologyKey | Yes | Node label key that defines topology domains |
| whenUnsatisfiable | Yes | Action when constraint cannot be satisfied: DoNotSchedule or ScheduleAnyway |
| labelSelector | Yes | Selector to identify which pods to count when calculating spread |
| minDomains | No | Minimum number of domains to consider (Kubernetes 1.25+) |
| matchLabelKeys | No | Pod label keys to include in the selector automatically (Kubernetes 1.27+) |
| nodeAffinityPolicy | No | How to treat node affinity when calculating spread (Kubernetes 1.26+) |
| nodeTaintsPolicy | No | How to treat node taints when calculating spread (Kubernetes 1.26+) |

## Understanding maxSkew

The `maxSkew` value defines how unevenly pods can be distributed. A maxSkew of 1 means the difference in pod count between any two topology domains can be at most 1.

Here is a practical example. You have 3 zones and want to deploy 5 replicas with maxSkew=1:

| Distribution | Zone A | Zone B | Zone C | Max Difference | Valid? |
|--------------|--------|--------|--------|----------------|--------|
| Option 1 | 2 | 2 | 1 | 1 | Yes |
| Option 2 | 2 | 1 | 2 | 1 | Yes |
| Option 3 | 3 | 1 | 1 | 2 | No |
| Option 4 | 5 | 0 | 0 | 5 | No |

The scheduler calculates skew as: `skew = max(podCount) - min(podCount)` across all domains matching the topology key.

This deployment spreads pods across zones with maxSkew of 1:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend
  namespace: production
spec:
  replicas: 6
  selector:
    matchLabels:
      app: web-frontend
  template:
    metadata:
      labels:
        app: web-frontend
    spec:
      topologySpreadConstraints:
        # Spread evenly across availability zones
        # maxSkew of 1 ensures at most 1 pod difference between zones
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: web-frontend
      containers:
        - name: nginx
          image: nginx:1.25
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 200m
              memory: 256Mi
```

## Topology Keys Explained

The `topologyKey` field references a node label that groups nodes into domains. Kubernetes and cloud providers add several standard labels automatically.

### Common Topology Keys

| Topology Key | Domain Type | Use Case |
|--------------|-------------|----------|
| topology.kubernetes.io/zone | Availability Zone | Survive zone failures |
| topology.kubernetes.io/region | Region | Multi-region deployments |
| kubernetes.io/hostname | Individual Node | Spread across nodes |
| node.kubernetes.io/instance-type | Instance Type | Balance across instance types |
| Custom labels | Custom grouping | Rack awareness, team ownership |

### Zone-Level Spreading

Use zone spreading to survive availability zone outages. This is the most common topology spread configuration:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: production
spec:
  replicas: 9
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
        tier: backend
    spec:
      topologySpreadConstraints:
        # Ensure pods are distributed across availability zones
        # With 9 replicas and 3 zones, expect 3 pods per zone
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: payment-service
      containers:
        - name: payment
          image: myregistry/payment-service:v2.1.0
          ports:
            - containerPort: 8080
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: payment-db-credentials
                  key: url
```

### Node-Level Spreading

Spread pods across individual nodes to maximize resource utilization and reduce blast radius:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cache-service
  namespace: production
spec:
  replicas: 12
  selector:
    matchLabels:
      app: cache-service
  template:
    metadata:
      labels:
        app: cache-service
    spec:
      topologySpreadConstraints:
        # Spread across nodes within each zone
        # This prevents multiple cache pods from competing for resources on the same node
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: cache-service
      containers:
        - name: redis
          image: redis:7.2-alpine
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: 1000m
              memory: 2Gi
```

### Custom Topology Keys

For on-premises clusters or specific requirements, create custom topology domains using node labels:

```bash
# Label nodes by rack location
kubectl label nodes node-1 node-2 node-3 topology.custom/rack=rack-a
kubectl label nodes node-4 node-5 node-6 topology.custom/rack=rack-b
kubectl label nodes node-7 node-8 node-9 topology.custom/rack=rack-c
```

Then use the custom label as a topology key:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: database-replica
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: database-replica
  template:
    metadata:
      labels:
        app: database-replica
    spec:
      topologySpreadConstraints:
        # Spread across physical racks for hardware failure tolerance
        # Each rack has independent power and network
        - maxSkew: 1
          topologyKey: topology.custom/rack
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: database-replica
      containers:
        - name: postgres
          image: postgres:16
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: postgres-data
```

## whenUnsatisfiable Behavior

The `whenUnsatisfiable` field controls scheduler behavior when no placement satisfies the constraint.

### DoNotSchedule

With `DoNotSchedule`, the scheduler will not place a pod if it would violate the constraint. The pod remains pending until a valid placement exists:

```yaml
topologySpreadConstraints:
  # Hard requirement - pod stays pending if constraint cannot be met
  # Use this for critical workloads where uneven distribution is unacceptable
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: DoNotSchedule
    labelSelector:
      matchLabels:
        app: critical-service
```

Use `DoNotSchedule` when:
- Running stateful workloads where uneven distribution causes data issues
- High availability is more important than capacity
- You prefer degraded capacity over uneven distribution

### ScheduleAnyway

With `ScheduleAnyway`, the scheduler treats the constraint as a soft preference. It tries to honor the constraint but will place the pod even if it increases skew:

```yaml
topologySpreadConstraints:
  # Soft requirement - scheduler prefers even spread but will place pod anyway
  # Use this when running pods is more important than perfect distribution
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: ScheduleAnyway
    labelSelector:
      matchLabels:
        app: batch-processor
```

Use `ScheduleAnyway` when:
- Running batch jobs where some progress is better than none
- Development or staging environments
- Workloads that can tolerate temporary imbalance

### Behavior Comparison

| Scenario | DoNotSchedule | ScheduleAnyway |
|----------|---------------|----------------|
| Constraint satisfied | Pod scheduled | Pod scheduled |
| One zone unavailable | Pod pending | Pod scheduled in available zone |
| All zones at capacity | Pod pending | Pod scheduled where possible |
| New zone added | Pod scheduled in new zone | Pod may or may not use new zone |

## The minDomains Field

The `minDomains` field, available since Kubernetes 1.25, specifies the minimum number of eligible domains required before the scheduler enforces spread constraints.

### Problem minDomains Solves

Without minDomains, a cluster with only one zone would allow all pods to land in that zone, since there is no skew when only one domain exists. When a second zone comes online, pods are already concentrated.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: production
spec:
  replicas: 6
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      topologySpreadConstraints:
        # Require at least 3 zones before scheduling
        # If fewer zones exist, pods remain pending
        # This prevents concentration during cluster scaling
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          minDomains: 3
          labelSelector:
            matchLabels:
              app: api-gateway
      containers:
        - name: gateway
          image: myregistry/api-gateway:v3.0.0
          ports:
            - containerPort: 8080
```

### minDomains Behavior Matrix

| Available Zones | minDomains | Replicas | Behavior |
|-----------------|------------|----------|----------|
| 3 | 3 | 6 | Schedule 2 per zone |
| 2 | 3 | 6 | Pods pending (fewer than minDomains zones) |
| 1 | 3 | 6 | Pods pending |
| 3 | 2 | 6 | Schedule 2 per zone |
| 2 | 2 | 6 | Schedule 3 per zone |

Use minDomains when:
- Building clusters that will scale across multiple zones
- You need guarantees about minimum distribution width
- Running in environments where zones may be temporarily unavailable

## Combining Multiple Constraints

Real production deployments often need multiple topology spread constraints. Pods must satisfy ALL constraints to be scheduled.

### Zone and Node Spreading

This configuration spreads pods across both zones and nodes within zones:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-application
  namespace: production
spec:
  replicas: 12
  selector:
    matchLabels:
      app: web-application
  template:
    metadata:
      labels:
        app: web-application
        version: v2
    spec:
      topologySpreadConstraints:
        # First constraint: spread across availability zones
        # This ensures zone failure affects at most 1/3 of pods
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: web-application
        # Second constraint: spread across nodes within each zone
        # This prevents node failure from taking multiple pods
        - maxSkew: 2
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: web-application
      containers:
        - name: web
          image: myregistry/web-application:v2.0.0
          ports:
            - containerPort: 3000
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
```

### Different Skew Values for Different Domains

Use stricter constraints for more critical topology domains:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: stateful-worker
  namespace: production
spec:
  replicas: 18
  selector:
    matchLabels:
      app: stateful-worker
  template:
    metadata:
      labels:
        app: stateful-worker
    spec:
      topologySpreadConstraints:
        # Strict zone spreading - exactly 6 pods per zone
        # Zone failure should not exceed 33% capacity loss
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: stateful-worker
        # Relaxed node spreading - allow some imbalance
        # Node-level spreading is less critical than zone-level
        - maxSkew: 3
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: stateful-worker
      containers:
        - name: worker
          image: myregistry/stateful-worker:v1.5.0
```

## Combining with Affinity Rules

Topology spread constraints work alongside node affinity and pod affinity/anti-affinity rules. The scheduler considers all requirements together.

### Topology Spread with Node Affinity

Constrain pods to specific node pools while spreading within those nodes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gpu-workload
  namespace: ml-training
spec:
  replicas: 8
  selector:
    matchLabels:
      app: gpu-workload
  template:
    metadata:
      labels:
        app: gpu-workload
    spec:
      # Node affinity restricts pods to GPU nodes
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: node.kubernetes.io/instance-type
                    operator: In
                    values:
                      - p3.2xlarge
                      - p3.8xlarge
                      - p4d.24xlarge
      # Topology spread distributes across available GPU nodes
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: gpu-workload
        - maxSkew: 2
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: gpu-workload
      containers:
        - name: training
          image: myregistry/ml-training:latest
          resources:
            limits:
              nvidia.com/gpu: 1
```

### Topology Spread with Pod Anti-Affinity

Combine topology spread with pod anti-affinity for additional separation guarantees:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zookeeper
  namespace: kafka
spec:
  replicas: 3
  selector:
    matchLabels:
      app: zookeeper
  template:
    metadata:
      labels:
        app: zookeeper
    spec:
      affinity:
        # Hard anti-affinity ensures no two ZK pods on same node
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  app: zookeeper
              topologyKey: kubernetes.io/hostname
      # Topology spread ensures zone distribution
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: zookeeper
      containers:
        - name: zookeeper
          image: confluentinc/cp-zookeeper:7.5.0
          ports:
            - containerPort: 2181
              name: client
            - containerPort: 2888
              name: peer
            - containerPort: 3888
              name: leader-election
          env:
            - name: ZOOKEEPER_CLIENT_PORT
              value: "2181"
            - name: ZOOKEEPER_TICK_TIME
              value: "2000"
```

## Real-World Scenarios

### Scenario 1: Multi-Tier Web Application

A typical web application with frontend, backend, and cache tiers, each with different spreading requirements:

```yaml
# Frontend - spread across zones, soft node spreading
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: ecommerce
spec:
  replicas: 9
  selector:
    matchLabels:
      app: frontend
      tier: web
  template:
    metadata:
      labels:
        app: frontend
        tier: web
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: frontend
        - maxSkew: 2
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: frontend
      containers:
        - name: nginx
          image: myregistry/frontend:v4.2.0
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
---
# Backend API - strict zone and node spreading
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
  namespace: ecommerce
spec:
  replicas: 12
  selector:
    matchLabels:
      app: backend-api
      tier: api
  template:
    metadata:
      labels:
        app: backend-api
        tier: api
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: backend-api
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: backend-api
      containers:
        - name: api
          image: myregistry/backend-api:v3.1.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
---
# Redis cache - one per node, spread across zones
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-cache
  namespace: ecommerce
spec:
  replicas: 6
  selector:
    matchLabels:
      app: redis-cache
      tier: cache
  template:
    metadata:
      labels:
        app: redis-cache
        tier: cache
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: redis-cache
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  app: redis-cache
              topologyKey: kubernetes.io/hostname
      containers:
        - name: redis
          image: redis:7.2-alpine
          ports:
            - containerPort: 6379
          resources:
            requests:
              cpu: 250m
              memory: 512Mi
```

### Scenario 2: Kafka Cluster

Kafka brokers require careful placement to ensure partition replicas are distributed across failure domains:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: kafka
  namespace: messaging
spec:
  serviceName: kafka-headless
  replicas: 6
  podManagementPolicy: Parallel
  selector:
    matchLabels:
      app: kafka
  template:
    metadata:
      labels:
        app: kafka
    spec:
      topologySpreadConstraints:
        # Exactly 2 brokers per zone for 3-zone cluster
        # Partition replication factor of 3 ensures at least 1 replica per zone
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: kafka
        # One broker per node for resource isolation
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: kafka
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: node-type
                    operator: In
                    values:
                      - kafka
      containers:
        - name: kafka
          image: confluentinc/cp-kafka:7.5.0
          ports:
            - containerPort: 9092
              name: kafka
            - containerPort: 9093
              name: kafka-internal
          env:
            - name: KAFKA_BROKER_ID
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: KAFKA_ZOOKEEPER_CONNECT
              value: "zookeeper-0.zookeeper:2181,zookeeper-1.zookeeper:2181,zookeeper-2.zookeeper:2181"
          resources:
            requests:
              cpu: 1000m
              memory: 4Gi
            limits:
              cpu: 2000m
              memory: 8Gi
          volumeMounts:
            - name: data
              mountPath: /var/lib/kafka/data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 500Gi
```

### Scenario 3: Batch Processing with Spot Instances

Batch workloads running on spot instances need flexible spreading that handles node interruptions:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: batch-processor
  namespace: data-pipeline
spec:
  replicas: 20
  selector:
    matchLabels:
      app: batch-processor
  template:
    metadata:
      labels:
        app: batch-processor
    spec:
      topologySpreadConstraints:
        # Soft zone spreading - prefer distribution but schedule anyway
        # Spot capacity varies across zones
        - maxSkew: 3
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: batch-processor
        # Soft node spreading - allow concentration if needed
        - maxSkew: 4
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: batch-processor
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              preference:
                matchExpressions:
                  - key: node.kubernetes.io/lifecycle
                    operator: In
                    values:
                      - spot
      tolerations:
        - key: "node.kubernetes.io/lifecycle"
          operator: "Equal"
          value: "spot"
          effect: "NoSchedule"
      containers:
        - name: processor
          image: myregistry/batch-processor:v2.0.0
          resources:
            requests:
              cpu: 2000m
              memory: 4Gi
          env:
            - name: WORKER_CONCURRENCY
              value: "4"
```

## Cluster-Level Default Constraints

Kubernetes 1.24 introduced the ability to set default topology spread constraints at the cluster level. This ensures all pods get basic spreading without requiring explicit configuration.

### Configuring Default Constraints

Add default constraints to the kube-scheduler configuration:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
  - schedulerName: default-scheduler
    pluginConfig:
      - name: PodTopologySpread
        args:
          # Default constraints applied to pods without explicit constraints
          defaultConstraints:
            - maxSkew: 3
              topologyKey: topology.kubernetes.io/zone
              whenUnsatisfiable: ScheduleAnyway
            - maxSkew: 5
              topologyKey: kubernetes.io/hostname
              whenUnsatisfiable: ScheduleAnyway
          # How to handle pods with existing constraints
          defaultingType: List
```

### defaultingType Options

| Value | Behavior |
|-------|----------|
| List | Apply default constraints to pods without any topology spread constraints |
| System | Apply system default constraints based on common labels (app, deployment name) |

## Troubleshooting Common Issues

### Pods Stuck in Pending State

When pods remain pending due to topology spread constraints, check these areas:

```bash
# View pod events for scheduling failures
kubectl describe pod <pod-name> -n <namespace>

# Check node labels to verify topology domains exist
kubectl get nodes --show-labels | grep topology.kubernetes.io/zone

# View current pod distribution
kubectl get pods -n <namespace> -l app=<app-name> -o wide

# Count pods per zone
kubectl get pods -n <namespace> -l app=<app-name> -o json | \
  jq -r '.items[].spec.nodeName' | \
  xargs -I {} kubectl get node {} -o jsonpath='{.metadata.labels.topology\.kubernetes\.io/zone}{"\n"}' | \
  sort | uniq -c
```

### Constraint Conflicts

Multiple constraints can create impossible scheduling situations:

```yaml
# This configuration may cause scheduling failures
# if any zone has fewer than 2 nodes
topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: DoNotSchedule
    labelSelector:
      matchLabels:
        app: my-app
  - maxSkew: 1
    topologyKey: kubernetes.io/hostname
    whenUnsatisfiable: DoNotSchedule
    labelSelector:
      matchLabels:
        app: my-app
```

Solution: Use `ScheduleAnyway` for less critical constraints or increase maxSkew values.

### Uneven Distribution After Node Failures

Topology spread only applies at scheduling time. If nodes fail and pods reschedule, distribution may become uneven. Use pod disruption budgets alongside topology spread:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-app-pdb
  namespace: production
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: web-app
```

## Performance Considerations

Topology spread calculations add overhead to the scheduling process. Consider these optimizations for large clusters:

### Label Selector Efficiency

Use specific label selectors to reduce the number of pods the scheduler must count:

```yaml
# Good - specific selector
labelSelector:
  matchLabels:
    app: my-specific-app
    component: frontend

# Less efficient - broad selector
labelSelector:
  matchLabels:
    tier: web
```

### Constraint Count

Limit the number of topology spread constraints per pod. Each additional constraint increases scheduling complexity:

| Constraint Count | Scheduling Impact |
|------------------|-------------------|
| 1-2 | Minimal overhead |
| 3-4 | Moderate overhead |
| 5+ | Consider consolidating |

## Migration Strategy

When adding topology spread constraints to existing deployments, follow these steps:

1. Start with `ScheduleAnyway` to observe behavior without blocking scheduling
2. Monitor pod distribution using kubectl or monitoring tools
3. Gradually tighten constraints by reducing maxSkew or switching to `DoNotSchedule`
4. Add constraints incrementally - start with zones, then nodes

```yaml
# Phase 1: Soft constraints to observe behavior
topologySpreadConstraints:
  - maxSkew: 3
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: ScheduleAnyway
    labelSelector:
      matchLabels:
        app: my-app

# Phase 2: Tighter constraints after validation
topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: DoNotSchedule
    labelSelector:
      matchLabels:
        app: my-app
```

## Summary

Topology spread constraints provide fine-grained control over pod distribution across failure domains. Key takeaways:

- Use `maxSkew: 1` with `DoNotSchedule` for critical workloads requiring even distribution
- Combine zone and node constraints for defense in depth
- Use `minDomains` to prevent concentration during cluster scaling
- Start with soft constraints (`ScheduleAnyway`) when migrating existing workloads
- Monitor pod distribution and adjust constraints based on observed behavior

Properly configured topology spread constraints significantly improve application resilience by ensuring failures in any single domain have limited impact on overall service availability.
