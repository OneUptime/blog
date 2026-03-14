# How to Use CEL Expressions for StatefulSet Health in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, CEL, StatefulSets, Health Check, Kubernetes, GitOps, Stateful Applications

Description: A practical guide to writing CEL health check expressions for StatefulSet resources in Flux CD, covering ordered rollouts, partition strategies, and persistent volume considerations.

---

## Introduction

StatefulSets have unique deployment characteristics compared to Deployments. They provide ordered pod creation, stable network identities, and persistent storage. Flux CD has built-in health check support for StatefulSets through the `.spec.healthChecks` field and the `.spec.wait` option. Flux uses the kstatus library to evaluate StatefulSet health, checking that all replicas are updated, ready, and that the rollout is complete. This guide covers how to configure health checks that account for StatefulSet-specific behaviors.

## Prerequisites

- Flux CD installed on a Kubernetes cluster
- A Kubernetes cluster with StatefulSets
- Understanding of StatefulSet ordering guarantees

## Understanding StatefulSet Status

StatefulSets have a distinct status structure:

```yaml
# Example StatefulSet status
status:
  observedGeneration: 5
  replicas: 3
  readyReplicas: 3
  currentReplicas: 3
  updatedReplicas: 3
  currentRevision: my-db-7b8f9d6c4
  updateRevision: my-db-7b8f9d6c4
  collisionCount: 0
  conditions:
    - type: Available
      status: "True"
```

Key differences from Deployments:

- `currentRevision` and `updateRevision` indicate rollout progress
- Pods are created and updated in order (0, 1, 2, ...)
- `partition` in the update strategy controls which pods get updated

Flux considers a StatefulSet healthy when all replicas are ready and updated, and the observed generation matches the spec generation.

## Basic StatefulSet Health Checks

### All Replicas Ready

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: database
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/database
  prune: true
  timeout: 15m
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: postgres
      namespace: database
```

### Wait for All Resources

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: database
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/database
  prune: true
  timeout: 15m
  # Automatically health-check all applied resources
  wait: true
```

## StatefulSet with Partition Strategy

StatefulSets support partition-based rolling updates where only pods with an ordinal >= partition value are updated.

### StatefulSet Definition

```yaml
# apps/database/statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: cassandra
  namespace: database
spec:
  serviceName: cassandra
  replicas: 5
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      # Only update pods with ordinal >= 3 (pods 3 and 4)
      partition: 3
  selector:
    matchLabels:
      app: cassandra
  template:
    metadata:
      labels:
        app: cassandra
    spec:
      containers:
        - name: cassandra
          image: cassandra:4.1
          ports:
            - containerPort: 9042
              name: cql
          # Readiness probe for Cassandra
          readinessProbe:
            exec:
              command:
                - /bin/bash
                - -c
                - nodetool status | grep "UN"
            initialDelaySeconds: 60
            periodSeconds: 10
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: 1000m
              memory: 2Gi
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 50Gi
```

### Kustomization with Health Check

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cassandra-cluster
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/database
  prune: true
  timeout: 20m
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: cassandra
      namespace: database
```

## Health Checks for Database StatefulSets

### PostgreSQL StatefulSet

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: postgres-cluster
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/postgres
  prune: true
  # Databases need more time to start
  timeout: 20m
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: postgres
      namespace: database
```

### Redis Cluster StatefulSet

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: redis-cluster
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/redis
  prune: true
  timeout: 15m
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: redis-cluster
      namespace: cache
```

## Multi-StatefulSet Application Health

For applications with multiple StatefulSets (e.g., a Kafka cluster):

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kafka-cluster
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/kafka
  prune: true
  timeout: 30m
  healthChecks:
    # ZooKeeper must be fully ready
    - apiVersion: apps/v1
      kind: StatefulSet
      name: zookeeper
      namespace: kafka
    # Kafka brokers
    - apiVersion: apps/v1
      kind: StatefulSet
      name: kafka
      namespace: kafka
```

## Staged Rollout Pattern

Use Flux dependencies to implement staged StatefulSet rollouts:

```yaml
# Stage 1: Deploy the StatefulSet with canary partition
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: db-canary
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/database/canary
  prune: true
  timeout: 15m
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: my-db
      namespace: database
---
# Stage 2: Full rollout after canary is verified
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: db-full-rollout
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    - name: db-canary
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/database/full
  prune: true
  timeout: 30m
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: my-db
      namespace: database
```

## Debugging StatefulSet Health Checks

```bash
# Check StatefulSet status in detail
kubectl get statefulset my-db -n database -o yaml | grep -A 20 "status:"

# Check individual pod readiness in order
kubectl get pods -n database -l app=my-db -o wide

# Check persistent volume claims are bound
kubectl get pvc -n database -l app=my-db

# View Flux Kustomization health check results
kubectl get kustomization database -n flux-system -o yaml
```

## Best Practices

### Set Generous Timeouts for StatefulSets

StatefulSets update pods one at a time in order. A 5-replica StatefulSet takes at least 5 times longer than a single pod startup. Set your Kustomization timeout accordingly.

### Account for Volume Provisioning

When StatefulSets scale up, new PVCs must be provisioned. This can take significant time depending on your storage class. Include this in your timeout calculations.

### Use wait: true for Simple Cases

If your Kustomization manages only StatefulSets and related resources, use `wait: true` to automatically health-check everything.

### Split Infrastructure and Application Layers

Deploy StatefulSets for databases and message queues in a separate Kustomization from the applications that depend on them. Use `dependsOn` to enforce ordering.

### Configure Readiness Probes

Flux health checks for StatefulSets rely on Kubernetes readiness status. Ensure your StatefulSets have properly configured readiness probes that reflect actual application readiness, especially for databases that may need time to join a cluster or load data.

## Conclusion

StatefulSets require more thoughtful timeout configuration than Deployments due to their ordered update semantics, persistent storage, and startup dependencies. Flux CD provides built-in health checking for StatefulSets through the `.spec.healthChecks` field and `wait: true`. Combined with proper readiness probes, dependency ordering, and generous timeouts, you can ensure that Flux waits for your stateful applications to be fully operational before proceeding with downstream deployments.
