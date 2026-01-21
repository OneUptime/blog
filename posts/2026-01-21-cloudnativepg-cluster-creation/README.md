# How to Create PostgreSQL Clusters with CloudNativePG

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudNativePG, Kubernetes, PostgreSQL, Database, Cluster, Configuration

Description: A comprehensive guide to creating and configuring PostgreSQL clusters with CloudNativePG, covering cluster specifications, storage configuration, users, databases, and advanced settings for production deployments.

---

CloudNativePG makes creating PostgreSQL clusters on Kubernetes straightforward with its Cluster custom resource. This guide covers everything from basic clusters to production-ready configurations with multiple databases, users, and custom settings.

## Prerequisites

- Kubernetes cluster with CloudNativePG operator installed
- kubectl configured
- Storage class available for persistent volumes

## Basic Cluster Creation

### Minimal Cluster

The simplest PostgreSQL cluster:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: my-postgres
  namespace: default
spec:
  instances: 1
  storage:
    size: 1Gi
```

Apply and monitor:

```bash
kubectl apply -f cluster.yaml
kubectl get cluster my-postgres -w
```

### Standard Three-Node Cluster

For high availability with automatic failover:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-ha
  namespace: default
spec:
  instances: 3

  storage:
    size: 10Gi
    storageClass: standard

  bootstrap:
    initdb:
      database: myapp
      owner: myuser
```

## Cluster Specification Deep Dive

### PostgreSQL Version and Image

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-cluster
spec:
  instances: 3

  # Specify PostgreSQL version via image
  imageName: ghcr.io/cloudnative-pg/postgresql:16.1

  # Or use image catalog (if configured)
  # imageCatalogRef:
  #   apiGroup: postgresql.cnpg.io
  #   kind: ImageCatalog
  #   name: postgresql
  #   major: 16
```

### PostgreSQL Configuration

```yaml
spec:
  postgresql:
    parameters:
      # Memory settings
      shared_buffers: "2GB"
      effective_cache_size: "6GB"
      work_mem: "64MB"
      maintenance_work_mem: "512MB"

      # Connections
      max_connections: "200"

      # WAL settings
      wal_level: "replica"
      max_wal_size: "2GB"
      min_wal_size: "512MB"

      # Checkpoints
      checkpoint_completion_target: "0.9"
      checkpoint_timeout: "15min"

      # Query planner
      random_page_cost: "1.1"
      effective_io_concurrency: "200"

      # Parallel queries
      max_parallel_workers_per_gather: "4"
      max_parallel_workers: "8"

      # Logging
      log_statement: "ddl"
      log_min_duration_statement: "1000"
      log_checkpoints: "on"

      # Autovacuum
      autovacuum_vacuum_scale_factor: "0.1"
      autovacuum_analyze_scale_factor: "0.05"

    # Client authentication rules
    pg_hba:
      - host all all 10.0.0.0/8 scram-sha-256
      - host all all 172.16.0.0/12 scram-sha-256
      - host all all 192.168.0.0/16 scram-sha-256

    # Shared preload libraries
    shared_preload_libraries:
      - pg_stat_statements

    # Enable LDAP (optional)
    # ldap:
    #   server: ldap.example.com
    #   port: 389
```

### Storage Configuration

```yaml
spec:
  storage:
    size: 100Gi
    storageClass: fast-ssd

    # Resize in use (if storage class supports)
    resizeInUseVolumes: true

    # PVC template for advanced configuration
    pvcTemplate:
      accessModes:
        - ReadWriteOnce
      resources:
        requests:
          storage: 100Gi
      storageClassName: fast-ssd
      volumeMode: Filesystem

  # Separate WAL storage (recommended for production)
  walStorage:
    size: 20Gi
    storageClass: fast-ssd

  # Tablespaces (optional)
  tablespaces:
    - name: archive_data
      storage:
        size: 500Gi
        storageClass: standard
```

### Resource Allocation

```yaml
spec:
  resources:
    requests:
      memory: "4Gi"
      cpu: "2"
    limits:
      memory: "8Gi"
      cpu: "4"

  # Ephemeral volume size limit
  ephemeralVolumesSizeLimit:
    shm: 1Gi
    temporaryData: 10Gi
```

## Bootstrap Methods

### Initialize New Database (initdb)

```yaml
spec:
  bootstrap:
    initdb:
      database: myapp
      owner: myuser
      secret:
        name: db-credentials  # Contains username and password

      # Encoding and locale
      encoding: UTF8
      localeCType: en_US.UTF-8
      localeCollate: en_US.UTF-8

      # Data checksums (recommended)
      dataChecksums: true

      # WAL segment size
      walSegmentSize: 32  # MB

      # Post-init SQL
      postInitSQL:
        - CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
        - CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"
        - CREATE SCHEMA IF NOT EXISTS app

      # Post-init SQL from ConfigMap
      postInitApplicationSQLRefs:
        configMapRefs:
          - name: init-sql-scripts
            key: schema.sql
        secretRefs:
          - name: init-sql-secrets
            key: users.sql
```

Create credentials secret:

```bash
kubectl create secret generic db-credentials \
  --from-literal=username=myuser \
  --from-literal=password=$(openssl rand -base64 24)
```

### Restore from Backup

```yaml
spec:
  bootstrap:
    recovery:
      source: source-cluster

      # Point-in-time recovery
      recoveryTarget:
        targetTime: "2026-01-20T15:30:00Z"
        # Or targetLSN, targetXID, targetName

  externalClusters:
    - name: source-cluster
      barmanObjectStore:
        destinationPath: s3://backup-bucket/postgres/
        s3Credentials:
          accessKeyId:
            name: s3-credentials
            key: ACCESS_KEY_ID
          secretAccessKey:
            name: s3-credentials
            key: SECRET_ACCESS_KEY
```

### Clone from Running Cluster

```yaml
spec:
  bootstrap:
    pg_basebackup:
      source: source-cluster

  externalClusters:
    - name: source-cluster
      connectionParameters:
        host: source-postgres-rw.default.svc
        user: streaming_replica
      password:
        name: source-cluster-replication
        key: password
```

## User and Database Management

### Managed Roles

```yaml
spec:
  managed:
    roles:
      # Application user
      - name: app_user
        ensure: present
        login: true
        superuser: false
        createdb: false
        createrole: false
        inherit: true
        connectionLimit: 50
        passwordSecret:
          name: app-user-credentials
        inRoles:
          - pg_read_all_data

      # Read-only user
      - name: readonly_user
        ensure: present
        login: true
        superuser: false
        connectionLimit: 20
        passwordSecret:
          name: readonly-credentials
        inRoles:
          - pg_read_all_data

      # Admin user
      - name: admin_user
        ensure: present
        login: true
        superuser: true
        passwordSecret:
          name: admin-credentials

      # Service account (no password)
      - name: monitoring
        ensure: present
        login: true
        superuser: false
        passwordSecret:
          name: monitoring-credentials
```

Create role secrets:

```bash
kubectl create secret generic app-user-credentials \
  --from-literal=username=app_user \
  --from-literal=password=$(openssl rand -base64 24)
```

### Multiple Databases

Create additional databases with post-init SQL:

```yaml
spec:
  bootstrap:
    initdb:
      database: primary_db
      owner: primary_user
      postInitSQL:
        - CREATE DATABASE analytics OWNER primary_user
        - CREATE DATABASE reporting OWNER primary_user
        - GRANT CONNECT ON DATABASE analytics TO app_user
        - GRANT CONNECT ON DATABASE reporting TO readonly_user
```

Or use ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: init-databases
data:
  databases.sql: |
    CREATE DATABASE analytics;
    CREATE DATABASE reporting;
    CREATE DATABASE staging;

    -- Grant permissions
    GRANT ALL ON DATABASE analytics TO app_user;
    GRANT CONNECT ON DATABASE reporting TO readonly_user;
```

Reference in cluster:

```yaml
spec:
  bootstrap:
    initdb:
      postInitApplicationSQLRefs:
        configMapRefs:
          - name: init-databases
            key: databases.sql
```

## Pod Scheduling

### Node Affinity

```yaml
spec:
  affinity:
    # Pod anti-affinity (spread across nodes)
    enablePodAntiAffinity: true
    topologyKey: kubernetes.io/hostname
    podAntiAffinityType: required  # or preferred

    # Node affinity
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
          - matchExpressions:
              - key: node-type
                operator: In
                values:
                  - database

    # Node selector
    nodeSelector:
      kubernetes.io/os: linux
      disk-type: ssd
```

### Tolerations

```yaml
spec:
  affinity:
    tolerations:
      - key: database
        operator: Equal
        value: postgres
        effect: NoSchedule
      - key: node-role.kubernetes.io/database
        operator: Exists
        effect: NoSchedule
```

### Topology Spread

```yaml
spec:
  topologySpreadConstraints:
    - maxSkew: 1
      topologyKey: topology.kubernetes.io/zone
      whenUnsatisfiable: DoNotSchedule
      labelSelector:
        matchLabels:
          cnpg.io/cluster: postgres-cluster
```

## Services and Networking

### Service Configuration

CloudNativePG automatically creates services:

```bash
# List services
kubectl get svc -l cnpg.io/cluster=postgres-cluster

# postgres-cluster-rw  - Read-write (primary)
# postgres-cluster-ro  - Read-only (replicas)
# postgres-cluster-r   - Any instance
```

### Custom Service Template

```yaml
spec:
  serviceAccountTemplate:
    metadata:
      annotations:
        my-annotation: value

  managed:
    services:
      additional:
        - selectorType: rw
          serviceTemplate:
            metadata:
              name: postgres-external
              annotations:
                service.beta.kubernetes.io/aws-load-balancer-type: nlb
            spec:
              type: LoadBalancer
              ports:
                - port: 5432
                  targetPort: 5432
```

## Monitoring Configuration

### Enable Prometheus Metrics

```yaml
spec:
  monitoring:
    enablePodMonitor: true

    # Custom queries
    customQueriesConfigMap:
      - name: custom-queries
        key: queries

    customQueriesSecret:
      - name: sensitive-queries
        key: queries
```

### Custom Queries ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: custom-queries
data:
  queries: |
    pg_database_size:
      query: |
        SELECT datname, pg_database_size(datname) as size_bytes
        FROM pg_database
        WHERE datname NOT IN ('template0', 'template1')
      metrics:
        - datname:
            usage: "LABEL"
            description: "Database name"
        - size_bytes:
            usage: "GAUGE"
            description: "Database size in bytes"

    pg_stat_user_tables:
      query: |
        SELECT schemaname, relname,
               seq_scan, idx_scan,
               n_tup_ins, n_tup_upd, n_tup_del,
               n_dead_tup, last_vacuum, last_autovacuum
        FROM pg_stat_user_tables
      metrics:
        - schemaname:
            usage: "LABEL"
        - relname:
            usage: "LABEL"
        - seq_scan:
            usage: "COUNTER"
        - idx_scan:
            usage: "COUNTER"
        - n_tup_ins:
            usage: "COUNTER"
        - n_tup_upd:
            usage: "COUNTER"
        - n_tup_del:
            usage: "COUNTER"
        - n_dead_tup:
            usage: "GAUGE"
```

## Complete Production Example

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: production-postgres
  namespace: production
  labels:
    environment: production
    team: platform
spec:
  instances: 3
  imageName: ghcr.io/cloudnative-pg/postgresql:16.1

  postgresql:
    parameters:
      shared_buffers: "4GB"
      effective_cache_size: "12GB"
      work_mem: "128MB"
      maintenance_work_mem: "1GB"
      max_connections: "300"
      wal_level: "replica"
      max_wal_size: "4GB"
      checkpoint_completion_target: "0.9"
      random_page_cost: "1.1"
      effective_io_concurrency: "200"
      max_parallel_workers_per_gather: "4"
      log_min_duration_statement: "1000"

    pg_hba:
      - host all all 10.0.0.0/8 scram-sha-256

    shared_preload_libraries:
      - pg_stat_statements

  bootstrap:
    initdb:
      database: myapp
      owner: app_owner
      secret:
        name: postgres-credentials
      dataChecksums: true
      postInitSQL:
        - CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
        - CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"

  storage:
    size: 200Gi
    storageClass: fast-ssd

  walStorage:
    size: 50Gi
    storageClass: fast-ssd

  resources:
    requests:
      memory: "8Gi"
      cpu: "4"
    limits:
      memory: "16Gi"
      cpu: "8"

  affinity:
    enablePodAntiAffinity: true
    topologyKey: kubernetes.io/hostname
    podAntiAffinityType: required
    nodeSelector:
      node-type: database

  managed:
    roles:
      - name: app_user
        ensure: present
        login: true
        passwordSecret:
          name: app-user-credentials
      - name: readonly_user
        ensure: present
        login: true
        passwordSecret:
          name: readonly-credentials
        inRoles:
          - pg_read_all_data

  monitoring:
    enablePodMonitor: true
    customQueriesConfigMap:
      - name: postgres-custom-queries
        key: queries

  backup:
    barmanObjectStore:
      destinationPath: s3://company-backups/postgres/production/
      s3Credentials:
        accessKeyId:
          name: backup-credentials
          key: ACCESS_KEY_ID
        secretAccessKey:
          name: backup-credentials
          key: SECRET_ACCESS_KEY
      wal:
        compression: gzip
        maxParallel: 4
      data:
        compression: gzip
        jobs: 2
    retentionPolicy: "30d"

---
apiVersion: postgresql.cnpg.io/v1
kind: ScheduledBackup
metadata:
  name: production-postgres-backup
  namespace: production
spec:
  schedule: "0 0 * * *"
  backupOwnerReference: self
  cluster:
    name: production-postgres
```

## Verify Cluster Creation

```bash
# Watch cluster status
kubectl get cluster production-postgres -n production -w

# Check pods
kubectl get pods -l cnpg.io/cluster=production-postgres -n production

# Check services
kubectl get svc -l cnpg.io/cluster=production-postgres -n production

# View cluster details
kubectl describe cluster production-postgres -n production

# Check credentials
kubectl get secret production-postgres-app -n production -o yaml
```

## Conclusion

CloudNativePG provides extensive configuration options for PostgreSQL clusters:

1. **Flexible bootstrap** - Initialize, restore, or clone
2. **Comprehensive PostgreSQL configuration** - Full control over parameters
3. **Managed users and databases** - Declarative role management
4. **Production-ready storage** - Separate WAL, tablespaces, resize support
5. **Advanced scheduling** - Affinity, anti-affinity, topology spread
6. **Built-in monitoring** - Prometheus metrics and custom queries

Start with a simple configuration and add features as needed for your production requirements.
