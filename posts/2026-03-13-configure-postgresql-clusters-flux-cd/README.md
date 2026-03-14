# How to Configure PostgreSQL Clusters with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, PostgreSQL, Database Configuration, CRD

Description: Configure PostgreSQL clusters using database operator CRDs managed by Flux CD for declarative, version-controlled database management.

---

## Introduction

Once a PostgreSQL operator is installed on your Kubernetes cluster, the real power comes from managing PostgreSQL cluster configurations declaratively through CRDs. Whether you are using CloudNativePG, Zalando, CrunchyData PGO, or Percona's operator, the pattern is the same: describe your desired cluster state in a YAML file, commit it to Git, and let Flux apply it. Day-2 operations - scaling replicas, tuning PostgreSQL parameters, rotating passwords - all become pull requests.

This post focuses on best practices for structuring PostgreSQL cluster CRDs in your Flux repository, covering parameter tuning, connection pooling configuration, user management, and rolling upgrade strategies across different operators.

## Prerequisites

- A PostgreSQL operator deployed via Flux CD (CloudNativePG, Zalando, or PGO)
- Kubernetes v1.26+ with Flux CD bootstrapped
- `kubectl` and `flux` CLIs installed

## Step 1: Structure Your Repository for Multiple Clusters

Organize database resources so each cluster is a separate directory, making it easy to apply changes per cluster:

```plaintext
infrastructure/
  databases/
    postgres/
      production/
        cluster.yaml       # PostgresCluster or Cluster CRD
        users.yaml         # User grants (if separate from cluster CRD)
        backup.yaml        # ScheduledBackup (CloudNativePG)
        kustomization.yaml # Kustomize base
      staging/
        cluster.yaml
        kustomization.yaml
```

## Step 2: CloudNativePG Cluster Configuration

Example of a tuned CloudNativePG cluster for a transactional workload:

```yaml
# infrastructure/databases/postgres/production/cluster.yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: app-postgres
  namespace: databases
  annotations:
    # Force rolling restart when this annotation changes
    kubectl.kubernetes.io/last-applied-configuration: ""
spec:
  instances: 3
  imageName: ghcr.io/cloudnative-pg/postgresql:16.3

  postgresql:
    parameters:
      # Connection settings
      max_connections: "200"
      # Memory settings (tune based on instance size)
      shared_buffers: "512MB"
      effective_cache_size: "1536MB"
      work_mem: "8MB"
      maintenance_work_mem: "128MB"
      # WAL settings
      wal_level: "replica"
      max_wal_size: "2GB"
      min_wal_size: "512MB"
      checkpoint_completion_target: "0.9"
      # Query planning
      random_page_cost: "1.1"        # SSD-optimized
      effective_io_concurrency: "200" # SSD parallel I/O
      # Parallel query
      max_worker_processes: "8"
      max_parallel_workers_per_gather: "4"
      max_parallel_workers: "8"
      # Logging
      log_min_duration_statement: "1000"  # log queries > 1 second
      log_checkpoints: "on"
      log_lock_waits: "on"
      log_temp_files: "0"

    pg_hba:
      - host all all 10.0.0.0/8 scram-sha-256

  bootstrap:
    initdb:
      database: app
      owner: app
      secret:
        name: app-postgres-credentials
      encoding: UTF8
      localeCType: en_US.UTF-8
      localeCollate: en_US.UTF-8

  storage:
    size: 50Gi
    storageClass: premium-rwo

  walStorage:
    size: 10Gi
    storageClass: premium-rwo

  resources:
    requests:
      cpu: "500m"
      memory: "1Gi"
    limits:
      cpu: "2"
      memory: "4Gi"

  # Connection pooler via PgBouncer
  managed:
    services:
      additional:
        - selectorType: rw  # read-write service
        - selectorType: ro  # read-only service pointing to replicas

  affinity:
    podAntiAffinityType: required
    topologyKey: kubernetes.io/hostname

  monitoring:
    enablePodMonitor: true
```

## Step 3: Manage PostgreSQL Parameters with Kustomize Overlays

Use Kustomize strategic merge patches to customize per-environment:

```yaml
# infrastructure/databases/postgres/staging/cluster-patch.yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: app-postgres
  namespace: databases
spec:
  instances: 1   # Only 1 instance in staging
  postgresql:
    parameters:
      shared_buffers: "128MB"   # Smaller in staging
      max_connections: "50"
  resources:
    requests:
      cpu: "250m"
      memory: "512Mi"
    limits:
      cpu: "500m"
      memory: "1Gi"
  storage:
    size: 10Gi   # Smaller storage in staging
```

```yaml
# infrastructure/databases/postgres/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../production
patches:
  - path: cluster-patch.yaml
```

## Step 4: Automate Rolling Restarts for Parameter Changes

Some PostgreSQL parameters require a restart (`max_connections`, `shared_buffers`). CloudNativePG handles rolling restarts automatically when the spec changes. Monitor the restart:

```bash
# Watch the cluster go through a rolling restart
kubectl get cluster app-postgres -n databases -w

# Check which parameters require restart
kubectl exec -n databases app-postgres-1 -- \
  psql -U postgres -c \
  "SELECT name, setting, pending_restart FROM pg_settings WHERE pending_restart = true;"
```

## Step 5: Manage Database Users Declaratively

```yaml
# infrastructure/databases/postgres/production/users.yaml (CloudNativePG)
# CloudNativePG manages users through Secrets with specific naming conventions
# The app user is created by initdb; additional users can be added via bootstrap SQL

apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: app-postgres
  namespace: databases
spec:
  # Post-init SQL for additional users and grants
  bootstrap:
    initdb:
      postInitSQL:
        - CREATE USER reader WITH PASSWORD 'reader-password' NOSUPERUSER;
        - GRANT CONNECT ON DATABASE app TO reader;
        - GRANT SELECT ON ALL TABLES IN SCHEMA public TO reader;
        - ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO reader;
```

## Step 6: Monitor Cluster Changes with Flux

```yaml
# clusters/production/postgres-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-postgres
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/databases/postgres/production
  prune: true
  healthChecks:
    - apiVersion: postgresql.cnpg.io/v1
      kind: Cluster
      name: app-postgres
      namespace: databases
```

```bash
# Watch Flux reconcile cluster changes
flux get kustomizations app-postgres --watch

# Check cluster health
kubectl get cluster app-postgres -n databases -o jsonpath='{.status.phase}'
```

## Best Practices

- Use Kustomize overlays to maintain DRY database configurations across environments with per-environment patches.
- Tune PostgreSQL parameters based on your instance size: `shared_buffers` should be 25% of available RAM, `effective_cache_size` should be 75%.
- Set `log_min_duration_statement: "1000"` to automatically capture slow queries for performance analysis.
- Use read-only services (pointing to replicas) for reporting queries to offload the primary.
- Test parameter changes in staging with a production-sized data set before applying to production.

## Conclusion

Managing PostgreSQL cluster configurations through Flux CD CRDs brings the same discipline to database operations that GitOps brings to application deployments. Parameter changes, topology modifications, and user management all go through pull requests with team review. Kustomize overlays enable environment-specific tuning without duplicating configuration. The result is a PostgreSQL fleet that is consistently configured, auditable, and safe to change.
