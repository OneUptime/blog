# Deploy Jaeger with Cassandra Backend Using Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Jaeger, Cassandra, Distributed Tracing, Observability

Description: Deploy Jaeger with a Cassandra storage backend on Kubernetes using Flux CD for production-grade distributed tracing with persistent span storage.

---

## Introduction

Cassandra is one of Jaeger's original supported storage backends and excels at high write throughput for trace data. Its wide-column data model maps naturally to Jaeger's span index patterns, and its peer-to-peer architecture avoids single points of failure.

When running Jaeger at scale-thousands of services generating millions of spans per minute-Cassandra's horizontal write scalability outperforms alternatives. Deploying both Cassandra and Jaeger via Flux CD ensures the entire tracing stack is version-controlled, from schema initialization jobs to collector replica counts.

This guide deploys Cassandra using the Bitnami Helm chart and Jaeger using the Jaeger Operator with Cassandra storage configured.

## Prerequisites

- Kubernetes cluster with Flux CD bootstrapped
- Sufficient cluster storage for Cassandra PersistentVolumeClaims (at least 3 nodes recommended for a 3-replica ring)
- cert-manager installed (required by Jaeger Operator webhook)
- `flux` and `kubectl` CLIs installed

## Step 1: Deploy Cassandra via HelmRelease

Deploy a 3-node Cassandra ring with persistent storage.

```yaml
# clusters/my-cluster/jaeger/cassandra-helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  interval: 12h
  url: https://charts.bitnami.com/bitnami
---
# clusters/my-cluster/jaeger/cassandra-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cassandra
  namespace: observability
spec:
  interval: 15m
  chart:
    spec:
      chart: cassandra
      version: ">=10.0.0 <11.0.0"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
  values:
    # 3-node ring for production; use 1 for dev/test
    replicaCount: 3
    # Set the Cassandra superuser password - override with a Secret in production
    dbUser:
      user: cassandra
      existingSecret: cassandra-credentials
    # Allocate persistent storage per Cassandra node
    persistence:
      enabled: true
      size: 100Gi
      storageClass: fast-ssd
    # Resource requests tuned for a mid-sized node
    resources:
      requests:
        cpu: "2"
        memory: "4Gi"
      limits:
        cpu: "4"
        memory: "8Gi"
    # Configure JVM heap (set to ~50% of container memory limit)
    jvm:
      maxHeapSize: 4096m
      newHeapSize: 800m
```

## Step 2: Create the Cassandra Credentials Secret

```yaml
# clusters/my-cluster/jaeger/cassandra-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: cassandra-credentials
  namespace: observability
type: Opaque
stringData:
  # Cassandra superuser password - encrypt with SOPS before committing
  cassandra-password: "changeme-in-production"
```

## Step 3: Deploy the Jaeger Operator

```yaml
# clusters/my-cluster/jaeger/jaeger-operator-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: jaeger-operator
  namespace: observability
spec:
  interval: 15m
  chart:
    spec:
      chart: jaeger-operator
      version: ">=2.49.0 <3.0.0"
      sourceRef:
        kind: HelmRepository
        name: jaegertracing
        namespace: flux-system
  values:
    rbac:
      clusterRole: true
```

## Step 4: Create the Jaeger Instance with Cassandra Storage

```yaml
# clusters/my-cluster/jaeger/jaeger-instance.yaml
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger-production
  namespace: observability
spec:
  # Production strategy deploys collector and query as separate scalable components
  strategy: production

  storage:
    type: cassandra
    options:
      cassandra:
        # Point at the Cassandra headless service
        servers: cassandra-headless.observability.svc
        keyspace: jaeger_v1_dc1
        local-dc: datacenter1
        tls:
          enabled: false
    # Run the Cassandra schema init job before starting Jaeger components
    dependencies:
      enabled: true
      schedule: "55 23 * * *"
    cassandraCreateSchema:
      datacenter: "dc1"
      mode: prod
      replicationFactor: 3

  collector:
    # Scale collectors based on trace ingestion volume
    replicas: 2
    resources:
      requests:
        cpu: "500m"
        memory: "512Mi"

  query:
    replicas: 1
    serviceType: ClusterIP
```

## Step 5: Create the Flux Kustomization with Dependencies

```yaml
# clusters/my-cluster/jaeger/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: jaeger
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/jaeger
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    # Cassandra must be healthy before Jaeger starts schema init
    - name: cassandra
    - name: cert-manager
```

## Best Practices

- Set Cassandra's `replicaCount` to 3 and Jaeger's `cassandraCreateSchema.replicationFactor` to 3 for production quorum writes.
- Use a `fast-ssd` StorageClass for Cassandra PVCs; spinning disks cause significant write latency.
- Enable Cassandra's built-in TTL (`default_time_to_live`) on the traces table to auto-expire old spans without manual compaction tuning.
- Use `dependsOn` in the Kustomization to enforce startup ordering between Cassandra and the Jaeger schema job.
- Monitor Cassandra heap usage and GC pause time; excessive GC is the most common Cassandra performance issue.

## Conclusion

Jaeger with a Cassandra backend delivers production-grade distributed tracing with persistent, horizontally scalable storage. Managing the entire stack via Flux CD keeps schema initialization, storage configuration, and collector scaling all in Git, making operational changes safe and reviewable.
