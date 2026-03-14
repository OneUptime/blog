# How to Deploy Percona PostgreSQL Operator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, PostgreSQL, Percona, Database Operators

Description: Deploy the Percona PostgreSQL Operator for production-grade PostgreSQL clusters on Kubernetes using Flux CD HelmRelease.

---

## Introduction

The Percona Operator for PostgreSQL is built on top of the Crunchy Data PGO operator and extends it with enterprise-grade features including automated backup management with pgBackRest, monitoring via Percona Monitoring and Management (PMM), and point-in-time recovery. Percona publishes the operator under an Apache 2.0 license and backs it with commercial support options, making it a popular choice for enterprises running PostgreSQL on Kubernetes.

Deploying the Percona PostgreSQL Operator through Flux CD ensures that the operator version, cluster topology, and backup configuration are all version-controlled. This is especially important for production database clusters where configuration drift can lead to unplanned maintenance windows or data loss.

This guide deploys the Percona PostgreSQL Operator via Flux HelmRelease and creates a highly available PostgreSQL cluster with automated pgBackRest backups.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- StorageClass supporting `ReadWriteOnce` PVCs
- S3-compatible object store for backups
- `kubectl` and `flux` CLIs installed

## Step 1: Add the Percona HelmRepository

```yaml
# infrastructure/sources/percona-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: percona
  namespace: flux-system
spec:
  interval: 12h
  url: https://percona.github.io/percona-helm-charts
```

## Step 2: Create the Namespace

```yaml
# infrastructure/databases/percona-pg/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: postgres
  labels:
    app.kubernetes.io/managed-by: flux
```

## Step 3: Deploy the Percona PostgreSQL Operator

```yaml
# infrastructure/databases/percona-pg/operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: percona-postgresql-operator
  namespace: postgres
spec:
  interval: 30m
  chart:
    spec:
      chart: pg-operator
      version: "2.4.1"
      sourceRef:
        kind: HelmRepository
        name: percona
        namespace: flux-system
  install:
    crds: Create
  upgrade:
    crds: CreateReplace
  values:
    replicaCount: 1
    resources:
      requests:
        cpu: "100m"
        memory: "256Mi"
      limits:
        cpu: "500m"
        memory: "512Mi"
```

## Step 4: Deploy a PostgreSQL Cluster

```yaml
# infrastructure/databases/percona-pg/pg-cluster.yaml
apiVersion: pgv2.percona.com/v2
kind: PerconaPGCluster
metadata:
  name: cluster1
  namespace: postgres
spec:
  crVersion: "2.4.1"
  image: percona/percona-postgresql-operator:2.4.1-ppg16-postgres

  imagePullPolicy: IfNotPresent

  instances:
    - name: instance1
      replicas: 3
      dataVolumeClaimSpec:
        accessModes:
          - ReadWriteOnce
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
      # Spread replicas across nodes
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 1
              podAffinityTerm:
                topologyKey: kubernetes.io/hostname
                labelSelector:
                  matchLabels:
                    postgres-operator.crunchydata.com/cluster: cluster1

  # Connection pooler using PgBouncer
  proxy:
    pgBouncer:
      replicas: 2
      image: percona/percona-postgresql-operator:2.4.1-ppg16-pgbouncer
      resources:
        requests:
          cpu: "100m"
          memory: "128Mi"

  # Backup configuration
  backups:
    pgbackrest:
      image: percona/percona-postgresql-operator:2.4.1-ppg16-pgbackrest
      repos:
        - name: repo1
          schedules:
            full: "0 1 * * 0"     # weekly full backup on Sunday at 1 AM
            differential: "0 1 * * 1-6"  # daily differential Mon-Sat
          s3:
            bucket: my-pg-backups
            endpoint: s3.amazonaws.com
            region: us-east-1
      global:
        repo1-retention-full: "4"   # keep 4 full backups
        repo1-retention-full-type: count

  # PostgreSQL parameters
  patroni:
    dynamicConfiguration:
      postgresql:
        parameters:
          max_connections: "200"
          shared_buffers: 256MB
          effective_cache_size: 1GB

  # Monitoring
  pmm:
    enabled: false   # set to true if PMM is deployed
```

## Step 5: Create Required Secrets

```yaml
# infrastructure/databases/percona-pg/secrets.yaml (use SealedSecret)
apiVersion: v1
kind: Secret
metadata:
  name: cluster1-pguser-app
  namespace: postgres
type: Opaque
stringData:
  password: "SecureAppPassword!"
---
# S3 credentials for pgBackRest
apiVersion: v1
kind: Secret
metadata:
  name: cluster1-pgbackrest-secret
  namespace: postgres
type: Opaque
stringData:
  s3.conf: |
    [global]
    repo1-s3-key=AKIAIOSFODNN7EXAMPLE
    repo1-s3-key-secret=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

## Step 6: Set Up Flux Kustomization

```yaml
# clusters/production/percona-pg-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: percona-postgresql
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/databases/percona-pg
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: percona-postgresql-operator
      namespace: postgres
```

## Step 7: Verify and Connect

```bash
# Check cluster status
kubectl get perconapgcluster -n postgres

# Check all pods
kubectl get pods -n postgres

# Get the connection details (service name format: <cluster>-ha)
kubectl get service -n postgres

# Connect via PgBouncer proxy
kubectl port-forward svc/cluster1-pgbouncer 5432:5432 -n postgres
psql -h localhost -U app -d app

# Verify replication
kubectl exec -n postgres cluster1-instance1-0 -- \
  psql -U postgres -c "SELECT * FROM pg_stat_replication;"

# Check backup status
kubectl exec -n postgres cluster1-instance1-0 -- \
  pgbackrest --stanza=db info
```

## Best Practices

- Store pgBackRest S3 credentials in a SealedSecret and reference them in the cluster spec rather than embedding in plaintext.
- Enable `proxy.pgBouncer` with at least 2 replicas for production to pool connections and reduce PostgreSQL connection overhead.
- Set `patroni.dynamicConfiguration.postgresql.parameters` to tune PostgreSQL for your workload rather than using defaults.
- Use `repo1-retention-full` and `repo1-retention-diff` to balance backup storage costs with your recovery point objectives.
- Monitor cluster health with `kubectl get perconapgcluster` and set up Prometheus alerts on the operator's metrics endpoint.

## Conclusion

The Percona PostgreSQL Operator deployed via Flux CD provides a mature, enterprise-grade PostgreSQL management platform with automated HA, connection pooling, and backup management built in. Every aspect of the cluster configuration — topology, backup schedules, PostgreSQL parameters — is version-controlled in Git and applied automatically by Flux. This makes your database infrastructure as reproducible and auditable as your application deployments.
