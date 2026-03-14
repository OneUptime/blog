# How to Deploy Zalando Postgres Operator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, PostgreSQL, Zalando, Patroni, Database Operators

Description: Deploy the Zalando Postgres Operator for managed PostgreSQL clusters using Flux CD HelmRelease with Patroni-based high availability.

---

## Introduction

The Zalando Postgres Operator (also known as `postgres-operator` by Zalando) is one of the original Kubernetes PostgreSQL operators, built on top of Patroni for HA and supporting logical backups via WAL-G. It introduced the concept of defining databases and users directly in the PostgreSQL CRD, making database provisioning feel like a native Kubernetes operation. Zalando uses it to manage hundreds of PostgreSQL clusters in their production environment.

Managing the Zalando Postgres Operator through Flux CD gives you GitOps control over both the operator configuration (team permissions, logical backup settings, pod templates) and over individual `postgresql` CRs that define cluster topology. This is especially useful for platform teams that provision database clusters for multiple application teams through a self-service GitOps workflow.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- StorageClass supporting `ReadWriteOnce` PVCs
- AWS S3 or compatible storage for WAL backups (optional)
- `kubectl` and `flux` CLIs installed

## Step 1: Add the Zalando HelmRepository

The Zalando Postgres Operator is available via their GitHub-hosted Helm chart.

```yaml
# infrastructure/sources/zalando-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: postgres-operator
  namespace: flux-system
spec:
  interval: 12h
  url: https://opensource.zalando.com/postgres-operator/charts/postgres-operator
```

```yaml
# infrastructure/sources/postgres-operator-ui-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: postgres-operator-ui
  namespace: flux-system
spec:
  interval: 12h
  url: https://opensource.zalando.com/postgres-operator/charts/postgres-operator-ui
```

## Step 2: Deploy the Operator

```yaml
# infrastructure/databases/zalando/operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: postgres-operator
  namespace: postgres-operator
spec:
  interval: 30m
  chart:
    spec:
      chart: postgres-operator
      version: "1.12.2"
      sourceRef:
        kind: HelmRepository
        name: postgres-operator
        namespace: flux-system
  install:
    crds: Create
  upgrade:
    crds: CreateReplace
  values:
    configGeneral:
      # Docker image for Spilo (Patroni + PostgreSQL)
      docker_image: "ghcr.io/zalando/spilo-16:3.2-p2"
      # Enable WAL archiving
      enable_master_load_balancer: false
      enable_replica_load_balancer: false
      # Team API for ownership-based access control
      enable_teams_api: false

    configPostgreSQL:
      # Default PostgreSQL parameters applied to all clusters
      parameters:
        max_connections: "100"
        shared_buffers: "256MB"
        log_statement: "ddl"

    configLoadBalancer:
      enable_master_pool_size: false

    # Pod resources for PostgreSQL instances
    configKubernetes:
      pod_management_policy: "ordered_ready"

    resources:
      limits:
        cpu: "500m"
        memory: "500Mi"
      requests:
        cpu: "100m"
        memory: "250Mi"
```

## Step 3: Create a PostgreSQL Cluster CRD

```yaml
# infrastructure/databases/zalando/my-app-db.yaml
apiVersion: "acid.zalan.do/v1"
kind: postgresql
metadata:
  name: acid-my-app-db
  namespace: databases
  labels:
    team: my-app
spec:
  teamId: "my-app"
  volume:
    size: 20Gi
    storageClass: fast-ssd

  numberOfInstances: 3

  # Define databases and users in the CRD
  users:
    app_user:
      - superuser
      - createdb
    read_only_user: []

  databases:
    app_db: app_user

  preparedDatabases:
    app_db:
      defaultUsers: true
      schemas:
        public: {}

  # PostgreSQL version
  postgresql:
    version: "16"
    parameters:
      max_connections: "200"
      shared_buffers: "512MB"
      effective_cache_size: "1536MB"
      work_mem: "8MB"

  # Resources per PostgreSQL instance
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: "1"
      memory: 2Gi

  # Patroni configuration for HA
  patroni:
    initdb:
      encoding: "UTF8"
      locale: "en_US.UTF-8"
    pg_hba:
      - host all all 10.0.0.0/8 md5
    ttl: 30
    loop_wait: 10
    retry_timeout: 10
    maximum_lag_on_failover: 33554432  # 32 MB

  # Pod annotations for Prometheus scraping
  podAnnotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "9187"
```

## Step 4: Configure Logical Backups

```yaml
# Add to the operator HelmRelease values
    configLogicalBackup:
      # Schedule backups using a CronJob
      logical_backup_schedule: "30 00 * * *"
      # Upload to S3
      logical_backup_s3_bucket: "my-postgres-backups"
      logical_backup_s3_region: "us-east-1"
      logical_backup_s3_access_key_id: ""   # use IRSA instead
      logical_backup_s3_secret_access_key: ""
      # Retention: keep 7 days of backups
      logical_backup_s3_retention_time: "7"
```

## Step 5: Create Flux Kustomizations

```yaml
# clusters/production/zalando-operator-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: zalando-postgres-operator
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/databases/zalando
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: postgres-operator
      namespace: postgres-operator
```

## Step 6: Verify the Cluster

```bash
# Check operator health
kubectl get deployment postgres-operator -n postgres-operator

# Check cluster status
kubectl get postgresql -n databases

# Check pods
kubectl get pods -n databases -l application=spilo

# Get connection credentials (auto-created by operator)
kubectl get secret app_user.acid-my-app-db.credentials.postgresql.acid.zalan.do \
  -n databases -o jsonpath='{.data.password}' | base64 -d

# Connect to primary
kubectl exec -it acid-my-app-db-0 -n databases -- su postgres -c "psql"
```

## Best Practices

- Use the `teamId` field to enable ownership-based access control when managing clusters for multiple application teams.
- Enable logical backups to S3 using IRSA credentials rather than static access keys.
- Set `numberOfInstances: 3` (or higher with odd numbers) for quorum-based leader election in production.
- Use `preparedDatabases` to have the operator automatically create schemas and roles — reduces manual post-provisioning steps.
- Monitor Patroni's REST API on port 8008 with Prometheus to track cluster state, leader, and sync lag.

## Conclusion

The Zalando Postgres Operator deployed through Flux CD is a battle-tested solution for self-service PostgreSQL provisioning on Kubernetes. Its CRD-based approach to defining databases, users, and connection settings makes it natural for application teams to provision their own databases through Git pull requests. With Flux managing the operator and the cluster CRDs, your entire PostgreSQL footprint is described in code and automatically kept in sync with your desired state.
