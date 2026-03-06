# How to Use CEL Expressions for StatefulSet Health in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, cel, statefulset, health checks, kubernetes, gitops, stateful applications

Description: A practical guide to writing CEL health check expressions for StatefulSet resources in Flux CD, covering ordered rollouts, partition strategies, and persistent volume considerations.

---

## Introduction

StatefulSets have unique deployment characteristics compared to Deployments. They provide ordered pod creation, stable network identities, and persistent storage. These properties require specialized health check logic in Flux CD. CEL expressions let you write health checks that account for StatefulSet-specific behaviors such as ordered rollouts, partition-based updates, and volume claim status.

## Prerequisites

- Flux CD v2.4+ with CEL health check support
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

## Basic StatefulSet Health CEL Expressions

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
      cel:
        # All replicas must be ready and updated
        expression: >-
          self.metadata.generation == self.status.observedGeneration &&
          has(self.status.readyReplicas) &&
          self.status.readyReplicas == self.spec.replicas &&
          has(self.status.updatedReplicas) &&
          self.status.updatedReplicas == self.spec.replicas
```

### Revision-Based Health Check

Verify the rollout is complete by checking that current and update revisions match:

```yaml
healthChecks:
  - apiVersion: apps/v1
    kind: StatefulSet
    name: my-statefulset
    namespace: default
    cel:
      # Current revision must match update revision (rollout complete)
      expression: >-
        self.metadata.generation == self.status.observedGeneration &&
        self.status.currentRevision == self.status.updateRevision &&
        has(self.status.readyReplicas) &&
        self.status.readyReplicas == self.spec.replicas
```

## Partition-Aware Health Checks

StatefulSets support partition-based rolling updates where only pods with an ordinal >= partition value are updated.

### StatefulSet with Partition Strategy

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
        storageClass: fast-ssd
        resources:
          requests:
            storage: 50Gi
```

### Partition-Aware CEL Expression

```yaml
healthChecks:
  - apiVersion: apps/v1
    kind: StatefulSet
    name: cassandra
    namespace: database
    cel:
      # For partitioned rollout, check that the expected number
      # of pods are updated (replicas - partition value)
      expression: >-
        self.metadata.generation == self.status.observedGeneration &&
        has(self.status.readyReplicas) &&
        self.status.readyReplicas == self.spec.replicas &&
        has(self.status.updatedReplicas) &&
        self.status.updatedReplicas >= (self.spec.replicas -
          self.spec.updateStrategy.rollingUpdate.partition)
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
      cel:
        # Ensure all replicas are ready and the rollout is complete
        expression: >-
          self.metadata.generation == self.status.observedGeneration &&
          self.status.currentRevision == self.status.updateRevision &&
          has(self.status.readyReplicas) &&
          self.status.readyReplicas == self.spec.replicas
```

### Redis Cluster StatefulSet

```yaml
healthChecks:
  - apiVersion: apps/v1
    kind: StatefulSet
    name: redis-cluster
    namespace: cache
    cel:
      # Redis cluster needs all nodes to form quorum
      expression: >-
        self.metadata.generation == self.status.observedGeneration &&
        has(self.status.readyReplicas) &&
        self.status.readyReplicas == self.spec.replicas &&
        self.status.currentRevision == self.status.updateRevision
```

### Elasticsearch StatefulSet

```yaml
healthChecks:
  - apiVersion: apps/v1
    kind: StatefulSet
    name: elasticsearch-data
    namespace: logging
    cel:
      # Elasticsearch data nodes - at least 2 must be ready for replication
      expression: >-
        self.metadata.generation == self.status.observedGeneration &&
        has(self.status.readyReplicas) &&
        self.status.readyReplicas >= 2 &&
        self.status.currentRevision == self.status.updateRevision
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
    # ZooKeeper must be fully ready first (ordered dependency)
    - apiVersion: apps/v1
      kind: StatefulSet
      name: zookeeper
      namespace: kafka
      cel:
        expression: >-
          self.metadata.generation == self.status.observedGeneration &&
          has(self.status.readyReplicas) &&
          self.status.readyReplicas == self.spec.replicas &&
          self.status.currentRevision == self.status.updateRevision
    # Kafka brokers need quorum (at least 2 out of 3)
    - apiVersion: apps/v1
      kind: StatefulSet
      name: kafka
      namespace: kafka
      cel:
        expression: >-
          self.metadata.generation == self.status.observedGeneration &&
          has(self.status.readyReplicas) &&
          self.status.readyReplicas >= 2 &&
          self.status.currentRevision == self.status.updateRevision
```

## Handling OnDelete Update Strategy

Some StatefulSets use `OnDelete` update strategy, where pods must be manually deleted to trigger updates:

```yaml
healthChecks:
  - apiVersion: apps/v1
    kind: StatefulSet
    name: legacy-db
    namespace: database
    cel:
      # For OnDelete strategy, just check that replicas are ready
      # since updates happen on pod deletion, not automatically
      expression: >-
        self.metadata.generation == self.status.observedGeneration &&
        has(self.status.readyReplicas) &&
        self.status.readyReplicas == self.spec.replicas
```

## Staged Rollout Pattern

Use Flux dependencies to implement staged StatefulSet rollouts:

```yaml
# Stage 1: Update partition to roll one pod
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
      cel:
        # At least the canary pod should be updated and ready
        expression: >-
          self.metadata.generation == self.status.observedGeneration &&
          has(self.status.updatedReplicas) &&
          self.status.updatedReplicas >= 1 &&
          has(self.status.readyReplicas) &&
          self.status.readyReplicas == self.spec.replicas
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
      cel:
        # All pods updated and ready
        expression: >-
          self.metadata.generation == self.status.observedGeneration &&
          self.status.currentRevision == self.status.updateRevision &&
          has(self.status.readyReplicas) &&
          self.status.readyReplicas == self.spec.replicas
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

### Use Revision Checks for Full Rollout Validation

The `currentRevision == updateRevision` check is the most reliable way to verify a StatefulSet rollout is complete.

### Consider Quorum Requirements

For clustered stateful applications, define health based on quorum requirements rather than all replicas. This prevents unnecessary blocking when one replica is slow to start.

## Conclusion

StatefulSets require more thoughtful health checking than Deployments due to their ordered update semantics, persistent storage, and quorum requirements. CEL expressions in Flux CD give you the precision to define health criteria that match the operational requirements of your stateful applications, whether you need full replica readiness, partition-aware checks, or quorum-based validation.
