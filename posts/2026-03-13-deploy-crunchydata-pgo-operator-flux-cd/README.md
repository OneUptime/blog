# How to Deploy CrunchyData PGO Operator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, PostgreSQL, CrunchyData, PGO, Database Operators

Description: Deploy CrunchyData PGO (Crunchy Postgres Operator) to Kubernetes using Flux CD for GitOps-managed enterprise PostgreSQL clusters.

---

## Introduction

The Crunchy Postgres Operator (PGO) from CrunchyData is a Kubernetes-native PostgreSQL operator that emphasizes enterprise readiness with features like pgBouncer connection pooling, pgBackRest backup management, and built-in Prometheus monitoring. PGO v5 was redesigned from scratch to follow Kubernetes operator best practices and is the basis for the Percona PostgreSQL Operator. Red Hat OpenShift Data Foundation uses PGO as its PostgreSQL engine.

Deploying PGO through Flux CD provides GitOps control over the operator installation and over the `PostgresCluster` CRDs that define each PostgreSQL cluster. Teams can provision new databases via pull requests and have cluster topology, backup configuration, and user management all version-controlled.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- StorageClass supporting `ReadWriteOnce` PVCs
- S3-compatible storage for pgBackRest backups
- `kubectl` and `flux` CLIs installed

## Step 1: Add the CrunchyData OCI HelmRepository

PGO is published as an OCI Helm chart starting with version 5:

```yaml
# infrastructure/sources/crunchydata-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: crunchydata
  namespace: flux-system
spec:
  interval: 12h
  type: oci
  url: oci://registry.developers.crunchydata.com/crunchydata
```

## Step 2: Deploy the PGO Operator

```yaml
# infrastructure/databases/pgo/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: postgres-operator
```

```yaml
# infrastructure/databases/pgo/operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: pgo
  namespace: postgres-operator
spec:
  interval: 30m
  chart:
    spec:
      chart: pgo
      version: "5.6.1"
      sourceRef:
        kind: HelmRepository
        name: crunchydata
        namespace: flux-system
  install:
    crds: Create
  upgrade:
    crds: CreateReplace
  values:
    resources:
      controller:
        requests:
          cpu: "100m"
          memory: "256Mi"
        limits:
          cpu: "500m"
          memory: "512Mi"
```

## Step 3: Create a PostgresCluster

```yaml
# infrastructure/databases/pgo/my-cluster.yaml
apiVersion: postgres-operator.crunchydata.com/v1beta1
kind: PostgresCluster
metadata:
  name: hippo
  namespace: databases
spec:
  image: registry.developers.crunchydata.com/crunchydata/crunchy-postgres:ubi8-16.3-0
  postgresVersion: 16

  instances:
    - name: instance1
      replicas: 2
      dataVolumeClaimSpec:
        accessModes:
          - "ReadWriteOnce"
        resources:
          requests:
            storage: 20Gi
      resources:
        requests:
          cpu: "500m"
          memory: "1Gi"
        limits:
          cpu: "1"
          memory: "2Gi"
      # Spread replicas across availability zones
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 1
              podAffinityTerm:
                topologyKey: topology.kubernetes.io/zone
                labelSelector:
                  matchLabels:
                    postgres-operator.crunchydata.com/cluster: hippo

  # PgBouncer connection pooler
  proxy:
    pgBouncer:
      image: registry.developers.crunchydata.com/crunchydata/crunchy-pgbouncer:ubi8-1.22-0
      replicas: 2
      resources:
        requests:
          cpu: "100m"
          memory: "128Mi"

  # pgBackRest backup configuration
  backups:
    pgbackrest:
      image: registry.developers.crunchydata.com/crunchydata/crunchy-pgbackrest:ubi8-2.51-0
      repos:
        - name: repo1
          schedules:
            full: "0 1 * * 0"          # Sunday full backup
            differential: "0 1 * * 1-6" # Weekday differential
          s3:
            bucket: "my-pg-backups"
            endpoint: "s3.amazonaws.com"
            region: "us-east-1"

  # PostgreSQL configuration
  patroni:
    dynamicConfiguration:
      postgresql:
        parameters:
          max_connections: 150
          shared_buffers: 256MB
          work_mem: 4MB
          maintenance_work_mem: 64MB
          wal_level: replica
          archive_mode: "on"

  # User management
  users:
    - name: app
      databases:
        - app_db
      options: "NOSUPERUSER"
    - name: monitoring
      options: "NOSUPERUSER NOLOGIN"

  # Monitoring configuration
  monitoring:
    pgmonitor:
      exporter:
        image: registry.developers.crunchydata.com/crunchydata/crunchy-postgres-exporter:ubi8-5.6.1-0
        resources:
          requests:
            cpu: "50m"
            memory: "64Mi"
```

## Step 4: S3 Credentials for pgBackRest

```yaml
# infrastructure/databases/pgo/pgbackrest-secret.yaml (use SealedSecret)
apiVersion: v1
kind: Secret
metadata:
  name: hippo-pgbackrest-secret
  namespace: databases
stringData:
  s3.conf: |
    [global]
    repo1-s3-key=AKIAIOSFODNN7EXAMPLE
    repo1-s3-key-secret=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

## Step 5: Flux Kustomization

```yaml
# clusters/production/pgo-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: crunchy-pgo
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/databases/pgo
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: pgo
      namespace: postgres-operator
```

## Step 6: Verify the Cluster

```bash
# Check PGO operator
kubectl get deployment pgo -n postgres-operator

# Check cluster instances
kubectl get postgrescluster hippo -n databases
kubectl get pods -n databases -l postgres-operator.crunchydata.com/cluster=hippo

# Get the user's connection Secret (auto-created)
kubectl get secret hippo-pguser-app -n databases -o yaml

# Decode connection URI
kubectl get secret hippo-pguser-app -n databases \
  -o jsonpath='{.data.uri}' | base64 -d

# Trigger a manual backup
kubectl annotate postgrescluster hippo -n databases \
  postgres-operator.crunchydata.com/pgbackrest-backup="$(date)"
```

## Best Practices

- Use `users` in the PostgresCluster spec to manage database users declaratively - the operator creates and rotates secrets automatically.
- Enable `proxy.pgBouncer` with multiple replicas for connection pooling, which is critical for applications using many short-lived connections.
- Reference S3 credentials via a Secret rather than embedding them in the PostgresCluster spec.
- Use affinity rules to spread instances across availability zones for maximum resilience.
- Enable `monitoring.pgmonitor` and scrape the Prometheus exporter to get query-level performance metrics.

## Conclusion

CrunchyData PGO deployed via Flux CD delivers an enterprise-grade PostgreSQL platform with declarative user management, built-in pgBouncer, and pgBackRest backup integration. The `PostgresCluster` CRD is a clean, Kubernetes-native API for expressing all aspects of your PostgreSQL configuration. With Flux managing both the operator and the cluster CRDs, your entire PostgreSQL footprint is version-controlled and automatically reconciled to the desired state.
