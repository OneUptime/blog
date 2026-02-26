# How to Deploy TimescaleDB with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, TimescaleDB, Time-Series

Description: Learn how to deploy and manage TimescaleDB on Kubernetes using ArgoCD for GitOps-managed time-series database infrastructure with continuous aggregates and retention policies.

---

TimescaleDB extends PostgreSQL with time-series superpowers - hypertables, continuous aggregates, compression, and data retention policies. It is the go-to choice when you need the familiarity of PostgreSQL with the performance of a purpose-built time-series database. Deploying TimescaleDB on Kubernetes with ArgoCD ensures your database infrastructure, configurations, and policies are all managed through GitOps.

This guide covers deploying a production-ready TimescaleDB instance on Kubernetes using ArgoCD.

## Architecture

```mermaid
graph TD
    A[ArgoCD] --> B[TimescaleDB StatefulSet]
    A --> C[PgBouncer Connection Pooler]
    A --> D[Backup CronJob]
    B --> E[PVC - Data]
    B --> F[PVC - WAL]
    C --> B
    G[Applications] --> C
    H[Prometheus] --> B
```

## Repository Structure

```
timescaledb/
  base/
    kustomization.yaml
    namespace.yaml
    statefulset.yaml
    service.yaml
    configmap.yaml
    secret.yaml
    pgbouncer/
      deployment.yaml
      configmap.yaml
      service.yaml
    backup/
      cronjob.yaml
    monitoring/
      servicemonitor.yaml
  overlays/
    production/
      kustomization.yaml
      patches/
        resources.yaml
        storage.yaml
```

## Step 1: ConfigMap for TimescaleDB Settings

Configure TimescaleDB with optimized settings:

```yaml
# base/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: timescaledb-config
data:
  postgresql.conf: |
    # Connection settings
    listen_addresses = '*'
    max_connections = 200

    # Memory settings (tune for your instance size)
    shared_buffers = '8GB'
    effective_cache_size = '24GB'
    work_mem = '64MB'
    maintenance_work_mem = '2GB'

    # WAL settings
    wal_level = replica
    max_wal_senders = 10
    wal_keep_size = '4GB'
    max_wal_size = '4GB'
    min_wal_size = '1GB'

    # Checkpoint settings
    checkpoint_completion_target = 0.9
    checkpoint_timeout = '15min'

    # TimescaleDB specific
    shared_preload_libraries = 'timescaledb'
    timescaledb.max_background_workers = 16
    timescaledb.last_tuned = '2024-01-15T00:00:00Z'

    # Compression settings
    timescaledb.compress_orderby = 'time DESC'
    timescaledb.compress_segmentby = 'device_id'

    # Parallel query
    max_parallel_workers_per_gather = 4
    max_parallel_workers = 8
    max_worker_processes = 24

    # Logging
    log_min_duration_statement = 1000
    log_checkpoints = on
    log_connections = on
    log_disconnections = on
    log_lock_waits = on

    # Statistics
    track_activities = on
    track_counts = on
    track_io_timing = on

  pg_hba.conf: |
    local   all   all                 trust
    host    all   all   0.0.0.0/0     md5
    host    all   all   ::/0          md5
    host    replication  replicator  0.0.0.0/0  md5
```

## Step 2: Deploy TimescaleDB StatefulSet

```yaml
# base/statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: timescaledb
  labels:
    app: timescaledb
spec:
  serviceName: timescaledb
  replicas: 1
  selector:
    matchLabels:
      app: timescaledb
  template:
    metadata:
      labels:
        app: timescaledb
    spec:
      securityContext:
        fsGroup: 999
        runAsUser: 999
      initContainers:
        - name: init-chmod
          image: busybox:1.36
          command: ['sh', '-c', 'chown -R 999:999 /var/lib/postgresql/data /var/lib/postgresql/wal']
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
            - name: wal
              mountPath: /var/lib/postgresql/wal
      containers:
        - name: timescaledb
          image: timescale/timescaledb-ha:pg16-ts2.14.1
          ports:
            - containerPort: 5432
              name: postgresql
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: timescaledb-secret
                  key: POSTGRES_PASSWORD
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
            - name: POSTGRES_INITDB_WALDIR
              value: /var/lib/postgresql/wal/pg_wal
          readinessProbe:
            exec:
              command:
                - pg_isready
                - -U
                - postgres
            initialDelaySeconds: 10
            periodSeconds: 10
          livenessProbe:
            exec:
              command:
                - pg_isready
                - -U
                - postgres
            initialDelaySeconds: 30
            periodSeconds: 15
          resources:
            requests:
              cpu: "4"
              memory: "16Gi"
            limits:
              cpu: "8"
              memory: "32Gi"
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
            - name: wal
              mountPath: /var/lib/postgresql/wal
            - name: config
              mountPath: /etc/postgresql/postgresql.conf
              subPath: postgresql.conf
            - name: config
              mountPath: /etc/postgresql/pg_hba.conf
              subPath: pg_hba.conf
        # Postgres exporter sidecar for metrics
        - name: postgres-exporter
          image: prometheuscommunity/postgres-exporter:0.15.0
          ports:
            - containerPort: 9187
              name: metrics
          env:
            - name: DATA_SOURCE_NAME
              value: "postgresql://postgres:$(POSTGRES_PASSWORD)@localhost:5432/postgres?sslmode=disable"
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: timescaledb-secret
                  key: POSTGRES_PASSWORD
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
      volumes:
        - name: config
          configMap:
            name: timescaledb-config
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: gp3-iops
        resources:
          requests:
            storage: 1000Gi
    - metadata:
        name: wal
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: gp3-iops
        resources:
          requests:
            storage: 100Gi
```

Separating data and WAL onto different volumes is a common optimization. It allows you to use different storage classes (higher IOPS for WAL) and prevents WAL writes from competing with data reads.

## Step 3: Connection Pooler with PgBouncer

For production workloads, always put a connection pooler in front of TimescaleDB:

```yaml
# base/pgbouncer/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pgbouncer
  labels:
    app: pgbouncer
spec:
  replicas: 2
  selector:
    matchLabels:
      app: pgbouncer
  template:
    metadata:
      labels:
        app: pgbouncer
    spec:
      containers:
        - name: pgbouncer
          image: bitnami/pgbouncer:1.22.0
          ports:
            - containerPort: 6432
          env:
            - name: POSTGRESQL_HOST
              value: timescaledb
            - name: POSTGRESQL_PORT
              value: "5432"
            - name: POSTGRESQL_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: timescaledb-secret
                  key: POSTGRES_PASSWORD
            - name: PGBOUNCER_POOL_MODE
              value: transaction
            - name: PGBOUNCER_MAX_CLIENT_CONN
              value: "1000"
            - name: PGBOUNCER_DEFAULT_POOL_SIZE
              value: "50"
            - name: PGBOUNCER_MIN_POOL_SIZE
              value: "10"
          readinessProbe:
            tcpSocket:
              port: 6432
            initialDelaySeconds: 5
            periodSeconds: 10
          resources:
            requests:
              cpu: "500m"
              memory: "256Mi"
            limits:
              cpu: "1"
              memory: "512Mi"
```

## Step 4: Schema Initialization Hook

Use an ArgoCD pre-sync hook to manage schema and policies:

```yaml
# base/schema-init.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: timescaledb-schema-init
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: init
          image: timescale/timescaledb-ha:pg16-ts2.14.1
          command:
            - psql
            - -h
            - timescaledb
            - -U
            - postgres
            - -f
            - /scripts/init.sql
          env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: timescaledb-secret
                  key: POSTGRES_PASSWORD
          volumeMounts:
            - name: scripts
              mountPath: /scripts
      volumes:
        - name: scripts
          configMap:
            name: timescaledb-schemas
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: timescaledb-schemas
data:
  init.sql: |
    -- Create the metrics database
    SELECT 'CREATE DATABASE metrics'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'metrics')\gexec

    \c metrics

    -- Enable TimescaleDB
    CREATE EXTENSION IF NOT EXISTS timescaledb;

    -- Create hypertable for device metrics
    CREATE TABLE IF NOT EXISTS device_metrics (
        time        TIMESTAMPTZ NOT NULL,
        device_id   TEXT NOT NULL,
        metric_name TEXT NOT NULL,
        value       DOUBLE PRECISION,
        tags        JSONB DEFAULT '{}'
    );

    SELECT create_hypertable('device_metrics', 'time',
        if_not_exists => TRUE,
        chunk_time_interval => INTERVAL '1 day'
    );

    -- Create continuous aggregate
    CREATE MATERIALIZED VIEW IF NOT EXISTS device_metrics_hourly
    WITH (timescaledb.continuous) AS
    SELECT
        time_bucket('1 hour', time) AS bucket,
        device_id,
        metric_name,
        avg(value) AS avg_value,
        min(value) AS min_value,
        max(value) AS max_value,
        count(*) AS sample_count
    FROM device_metrics
    GROUP BY bucket, device_id, metric_name;

    -- Add retention policy (keep 90 days of raw data)
    SELECT add_retention_policy('device_metrics', INTERVAL '90 days',
        if_not_exists => TRUE);

    -- Add compression policy (compress chunks older than 7 days)
    ALTER TABLE device_metrics SET (
        timescaledb.compress,
        timescaledb.compress_segmentby = 'device_id,metric_name',
        timescaledb.compress_orderby = 'time DESC'
    );

    SELECT add_compression_policy('device_metrics', INTERVAL '7 days',
        if_not_exists => TRUE);

    -- Refresh policy for continuous aggregate
    SELECT add_continuous_aggregate_policy('device_metrics_hourly',
        start_offset => INTERVAL '3 hours',
        end_offset => INTERVAL '1 hour',
        schedule_interval => INTERVAL '1 hour',
        if_not_exists => TRUE);
```

## Step 5: Backup CronJob

```yaml
# base/backup/cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: timescaledb-backup
spec:
  schedule: "0 3 * * *"  # 3 AM daily
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: backup
              image: timescale/timescaledb-ha:pg16-ts2.14.1
              command:
                - /bin/sh
                - -c
                - |
                  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
                  pg_dump -h timescaledb -U postgres -Fc metrics \
                    > /tmp/backup_${TIMESTAMP}.dump
                  aws s3 cp /tmp/backup_${TIMESTAMP}.dump \
                    s3://timescaledb-backups/daily/backup_${TIMESTAMP}.dump
                  echo "Backup completed: backup_${TIMESTAMP}.dump"
              env:
                - name: PGPASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: timescaledb-secret
                      key: POSTGRES_PASSWORD
              resources:
                requests:
                  cpu: "1"
                  memory: "2Gi"
```

## Step 6: The ArgoCD Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: timescaledb-production
  namespace: argocd
  labels:
    team: data-platform
    component: timescaledb
spec:
  project: data-infrastructure
  source:
    repoURL: https://github.com/myorg/data-platform.git
    targetRevision: main
    path: timescaledb/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: timescaledb
  syncPolicy:
    automated:
      prune: false
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 3
      backoff:
        duration: 30s
        factor: 2
        maxDuration: 5m
```

## Best Practices

1. **Separate data and WAL volumes** - Use high-IOPS storage for WAL to avoid write bottlenecks.

2. **Use PgBouncer** - TimescaleDB inherits PostgreSQL's process-per-connection model. PgBouncer keeps connection counts manageable.

3. **Enable compression** - TimescaleDB compression can reduce storage by 90%. Set compression policies for chunks older than a few days.

4. **Set retention policies** - Do not let tables grow unbounded. Use TimescaleDB's built-in retention policies managed through your schema init scripts.

5. **Monitor chunk size** - If chunks are too large, queries slow down. Adjust `chunk_time_interval` based on your ingestion rate.

6. **Use continuous aggregates** - Pre-compute common aggregations instead of running expensive queries on raw data.

Deploying TimescaleDB with ArgoCD gives you a fully GitOps-managed time-series database where schema changes, retention policies, and configuration updates are all tracked in version control. This is especially valuable for observability and IoT use cases where data management policies need to be auditable.
