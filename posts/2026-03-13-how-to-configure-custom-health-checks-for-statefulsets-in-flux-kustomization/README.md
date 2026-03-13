# How to Configure Custom Health Checks for StatefulSets in Flux Kustomization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, GitOps, Kubernetes, Health Checks, StatefulSets, Kustomization

Description: Learn how to configure custom health checks for StatefulSet resources in Flux Kustomization to ensure ordered, reliable stateful workload deployments.

---

## Introduction

StatefulSets manage stateful applications that require stable network identities, persistent storage, and ordered deployment. Health checking StatefulSets in Flux requires extra attention because these workloads often have longer startup times, data migration steps, and strict ordering requirements. This guide shows you how to configure custom health checks for StatefulSets in Flux Kustomization to ensure your stateful workloads are fully operational before dependent services begin.

## Prerequisites

- A Kubernetes cluster running version 1.25 or later
- Flux v2.3 or later installed on the cluster
- kubectl configured to access the cluster
- A Git repository connected to Flux via a GitRepository source
- Familiarity with Kubernetes StatefulSets and their deployment semantics

## StatefulSet Health Semantics

A StatefulSet is considered healthy when all of its pods are ready and running the updated version of the application. Unlike Deployments, StatefulSets roll out updates one pod at a time by default (using the `RollingUpdate` strategy with `partition: 0`), which means rollouts take longer. The health check must account for this sequential update process.

Flux checks that a StatefulSet has the expected number of ready replicas and that the current revision matches the update revision.

## Basic Health Check Configuration

Enable health checks for a StatefulSet using the `healthChecks` field in your Kustomization:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: database
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/database
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 15m
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: postgresql
      namespace: database
```

The timeout is set to 15 minutes to account for the sequential pod updates typical of StatefulSets.

## Health Checking a Database Cluster

Database clusters often run multiple replicas with primary-secondary replication. Each pod must start sequentially, and the health check should wait for all replicas:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: postgres-cluster
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/postgres
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 20m
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: postgres
      namespace: database
```

Here is the corresponding StatefulSet that Flux will health check:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: database
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
      containers:
        - name: postgres
          image: postgres:16
          ports:
            - containerPort: 5432
          readinessProbe:
            exec:
              command:
                - pg_isready
                - -U
                - postgres
            initialDelaySeconds: 15
            periodSeconds: 10
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
            storage: 50Gi
```

With 3 replicas updating sequentially, each needing 15 seconds of initial delay plus readiness probe checks, a 20-minute timeout provides adequate buffer.

## Checking Multiple StatefulSets

When your infrastructure includes multiple stateful components, list them all in the health checks:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: data-layer
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/data
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 25m
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: postgresql
      namespace: database
    - apiVersion: apps/v1
      kind: StatefulSet
      name: redis-cluster
      namespace: cache
    - apiVersion: apps/v1
      kind: StatefulSet
      name: elasticsearch
      namespace: logging
    - apiVersion: apps/v1
      kind: StatefulSet
      name: kafka
      namespace: messaging
```

All StatefulSets must become healthy within the timeout period for the reconciliation to succeed.

## Using wait for General Health Checking

When your Kustomization only deploys StatefulSets and their associated resources (Services, PVCs), you can use `wait: true` instead of listing each resource:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: redis
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/redis
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 10m
```

This checks all resources applied by the Kustomization, including the StatefulSet, its headless Service, and any ConfigMaps or Secrets.

## Configuring Timeout for Slow-Starting StatefulSets

Some StatefulSets need significant time to start. A ZooKeeper cluster, for example, needs each node to join the ensemble before it becomes ready:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: zookeeper
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/zookeeper
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 30m
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: zookeeper
      namespace: zookeeper
```

Calculate your timeout based on: number of replicas multiplied by the maximum time each pod takes to become ready, plus buffer for image pulls and PVC provisioning.

## Ordering StatefulSet Deployments with Dependencies

Use Kustomization dependencies to ensure StatefulSets start in the correct order:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: zookeeper
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/zookeeper
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 20m
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kafka
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/kafka
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: zookeeper
  wait: true
  timeout: 20m
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kafka-consumers
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/kafka-consumers
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: kafka
  wait: true
  timeout: 10m
```

This chain ensures ZooKeeper is healthy before Kafka starts, and Kafka is healthy before the consumer applications deploy.

## Debugging StatefulSet Health Check Failures

When a StatefulSet health check fails, investigate with these commands:

```bash
# Check Kustomization status
flux get kustomization database

# Check StatefulSet rollout status
kubectl rollout status statefulset/postgresql -n database

# Check individual pod status
kubectl get pods -n database -l app=postgres

# Check events for stuck pods
kubectl describe pod postgresql-0 -n database

# Check PVC status (PVCs must bind before pods can start)
kubectl get pvc -n database

# Check pod logs
kubectl logs postgresql-0 -n database --tail=50
```

Common StatefulSet health check failure causes include:

- PersistentVolumeClaim stuck in Pending state due to no available storage
- Pod stuck in Init state due to failing init containers
- Readiness probe failures due to misconfigured database settings
- Insufficient CPU or memory resources on the node
- Node affinity or anti-affinity rules preventing pod scheduling

## Conclusion

Custom health checks for StatefulSets in Flux Kustomization ensure your stateful workloads are fully deployed and operational before downstream services start. Because StatefulSets update sequentially and often involve data-intensive operations, setting generous timeouts and structuring Kustomization dependencies are essential practices. With proper health checking in place, you can rely on Flux to manage your database clusters, message brokers, and other stateful infrastructure with confidence.
