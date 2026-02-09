# Deploying and Operating TimescaleDB for Time-Series Workloads on Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: TimescaleDB, Kubernetes, Time Series, Database, PostgreSQL

Description: Learn how to deploy, configure, and operate TimescaleDB on Kubernetes for production time-series workloads with high availability and performance tuning.

---

TimescaleDB extends PostgreSQL with specialized capabilities for time-series data, including automatic partitioning, compression, and continuous aggregates. Running it on Kubernetes brings the benefits of container orchestration to your time-series database: automated failover, rolling upgrades, and declarative configuration. But databases are stateful workloads, and getting them right on Kubernetes requires careful attention to storage, networking, and operational procedures. This post covers everything you need to deploy and operate TimescaleDB in production on Kubernetes.

## Why TimescaleDB on Kubernetes

TimescaleDB has a unique advantage over purpose-built time-series databases: it is full PostgreSQL. This means your team can use familiar SQL syntax, existing PostgreSQL tools and libraries, and the entire PostgreSQL ecosystem of extensions. You do not need to learn a new query language or maintain a separate database technology stack.

Running it on Kubernetes adds operational benefits. StatefulSets handle pod identity and ordered deployment. PersistentVolumeClaims manage storage lifecycle. Kubernetes services provide stable networking. And operators like the CloudNativePG operator or the TimescaleDB Helm chart automate complex tasks like replication and failover.

## Deploying with the Official Helm Chart

The recommended approach is the official TimescaleDB Helm chart:

```bash
helm repo add timescale https://charts.timescale.com/
helm repo update
```

Create a values file for your production deployment:

```yaml
# timescaledb-values.yaml
replicaCount: 3

image:
  repository: timescale/timescaledb-ha
  tag: pg16-ts2.14-latest

credentials:
  superuser: postgres
  admin: tsdbadmin
  standby: standby

persistentVolumes:
  data:
    size: 200Gi
    storageClass: fast-ssd
  wal:
    size: 40Gi
    storageClass: fast-ssd

resources:
  requests:
    cpu: 4
    memory: 16Gi
  limits:
    cpu: 8
    memory: 32Gi

patroni:
  postgresql:
    parameters:
      shared_buffers: "8GB"
      effective_cache_size: "24GB"
      work_mem: "256MB"
      maintenance_work_mem: "2GB"
      max_connections: "200"
      max_wal_size: "4GB"
      wal_compression: "on"
      timescaledb.max_background_workers: "16"
      timescaledb.last_tuned: "2026-02-09T00:00:00Z"

    pg_hba:
      - local     all  postgres                peer
      - host      all  all       10.0.0.0/8     md5
      - host      all  all       172.16.0.0/12  md5

backup:
  enabled: true
  pgBackRest:
    repo1-type: s3
    repo1-s3-bucket: myorg-timescaledb-backups
    repo1-s3-region: us-east-1
    repo1-s3-endpoint: s3.amazonaws.com
    repo1-retention-full: "7"
    repo1-retention-diff: "14"

podDisruptionBudget:
  enabled: true
  minAvailable: 2

affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
            - key: app
              operator: In
              values:
                - timescaledb
        topologyKey: kubernetes.io/hostname
```

Deploy the chart:

```bash
helm install timescaledb timescale/timescaledb-single \
  --namespace databases \
  --create-namespace \
  -f timescaledb-values.yaml
```

## Storage Configuration

Storage is the most critical aspect of running any database on Kubernetes. TimescaleDB needs fast, reliable storage for both data and WAL (Write-Ahead Log) files.

Separate your data and WAL volumes. WAL writes are sequential and latency-sensitive, while data access patterns are more varied. Using separate volumes allows you to optimize each independently:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "6000"
  throughput: "500"
  encrypted: "true"
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Retain
```

The `Retain` reclaim policy is essential for databases. You never want Kubernetes to automatically delete your data volumes when a PVC is removed.

## Creating Hypertables

Once TimescaleDB is running, connect and set up your schema. Hypertables are the core abstraction for time-series data:

```bash
kubectl exec -it timescaledb-0 -n databases -- psql -U postgres
```

```sql
-- Enable the extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create a table for Kubernetes events
CREATE TABLE k8s_events (
    time            TIMESTAMPTZ NOT NULL,
    cluster_name    TEXT NOT NULL,
    namespace       TEXT NOT NULL,
    resource_kind   TEXT NOT NULL,
    resource_name   TEXT NOT NULL,
    event_type      TEXT NOT NULL,
    reason          TEXT,
    message         TEXT,
    source_component TEXT,
    count           INTEGER DEFAULT 1
);

-- Convert to hypertable with 1-day chunks
SELECT create_hypertable('k8s_events', 'time',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Create a metrics table
CREATE TABLE node_metrics (
    time            TIMESTAMPTZ NOT NULL,
    cluster_name    TEXT NOT NULL,
    node_name       TEXT NOT NULL,
    cpu_usage       DOUBLE PRECISION,
    cpu_capacity    DOUBLE PRECISION,
    memory_usage    BIGINT,
    memory_capacity BIGINT,
    pod_count       INTEGER,
    pod_capacity    INTEGER
);

SELECT create_hypertable('node_metrics', 'time',
    chunk_time_interval => INTERVAL '6 hours'
);

-- Add indexes for common query patterns
CREATE INDEX ON node_metrics (cluster_name, node_name, time DESC);
CREATE INDEX ON k8s_events (namespace, time DESC);
CREATE INDEX ON k8s_events (event_type, time DESC);
```

## Compression

TimescaleDB's native compression dramatically reduces storage requirements for time-series data, often achieving 90% or better compression ratios:

```sql
-- Enable compression on the node_metrics hypertable
ALTER TABLE node_metrics SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'cluster_name, node_name',
    timescaledb.compress_orderby = 'time DESC'
);

-- Add an automatic compression policy
SELECT add_compression_policy('node_metrics', INTERVAL '7 days');

-- Enable compression on k8s_events
ALTER TABLE k8s_events SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'cluster_name, namespace',
    timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy('k8s_events', INTERVAL '3 days');
```

The `compress_segmentby` parameter determines how data is grouped within compressed chunks. Choose columns that you frequently filter on. The `compress_orderby` parameter determines the sort order within compressed segments, which affects query performance.

## Data Retention

Configure retention policies to automatically drop old data:

```sql
-- Keep raw node metrics for 90 days
SELECT add_retention_policy('node_metrics', INTERVAL '90 days');

-- Keep events for 30 days
SELECT add_retention_policy('k8s_events', INTERVAL '30 days');

-- Check active policies
SELECT * FROM timescaledb_information.jobs
WHERE proc_name IN ('policy_compression', 'policy_retention');
```

## High Availability with Patroni

The TimescaleDB Helm chart uses Patroni for high availability. Patroni manages PostgreSQL replication and automatic failover. With a 3-replica deployment, you get one primary and two synchronous standbys.

Check the cluster status:

```bash
kubectl exec -it timescaledb-0 -n databases -- patronictl list
```

Output looks like:

```
+ Cluster: timescaledb (7325486291823456789) ---+----+-----------+
| Member         | Host      | Role    | State   | TL | Lag in MB |
+----------------+-----------+---------+---------+----+-----------+
| timescaledb-0  | 10.0.1.10 | Leader  | running |  1 |           |
| timescaledb-1  | 10.0.1.11 | Replica | running |  1 |         0 |
| timescaledb-2  | 10.0.1.12 | Replica | running |  1 |         0 |
+----------------+-----------+---------+---------+----+-----------+
```

## Connection Pooling with PgBouncer

For high-throughput workloads, add PgBouncer as a connection pooler:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pgbouncer
  namespace: databases
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
              value: timescaledb.databases.svc.cluster.local
            - name: POSTGRESQL_PORT
              value: "5432"
            - name: PGBOUNCER_DATABASE
              value: "*"
            - name: PGBOUNCER_POOL_MODE
              value: transaction
            - name: PGBOUNCER_MAX_CLIENT_CONN
              value: "1000"
            - name: PGBOUNCER_DEFAULT_POOL_SIZE
              value: "50"
            - name: PGBOUNCER_MIN_POOL_SIZE
              value: "10"
          resources:
            requests:
              cpu: 500m
              memory: 256Mi
            limits:
              cpu: "1"
              memory: 512Mi
---
apiVersion: v1
kind: Service
metadata:
  name: pgbouncer
  namespace: databases
spec:
  selector:
    app: pgbouncer
  ports:
    - port: 5432
      targetPort: 6432
```

## Monitoring TimescaleDB

Deploy a monitoring stack that tracks TimescaleDB health:

```sql
-- Useful monitoring queries

-- Hypertable sizes
SELECT
    hypertable_name,
    pg_size_pretty(hypertable_size(format('%I.%I', hypertable_schema, hypertable_name)::regclass)) AS total_size,
    pg_size_pretty(pg_total_relation_size(format('%I.%I', hypertable_schema, hypertable_name)::regclass)) AS table_size
FROM timescaledb_information.hypertables;

-- Compression statistics
SELECT
    hypertable_name,
    before_compression_total_bytes,
    after_compression_total_bytes,
    round((1 - after_compression_total_bytes::numeric / before_compression_total_bytes) * 100, 1) AS compression_ratio
FROM timescaledb_information.compression_settings cs
JOIN hypertable_compression_stats(cs.hypertable_name) ON true;

-- Chunk information
SELECT
    hypertable_name,
    chunk_name,
    is_compressed,
    pg_size_pretty(before_compression_total_bytes) AS uncompressed,
    pg_size_pretty(after_compression_total_bytes) AS compressed
FROM timescaledb_information.chunks
ORDER BY hypertable_name, range_start DESC
LIMIT 20;
```

Export these metrics to Prometheus using the `postgres_exporter`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres-exporter
  namespace: databases
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres-exporter
  template:
    spec:
      containers:
        - name: exporter
          image: prometheuscommunity/postgres-exporter:0.15.0
          env:
            - name: DATA_SOURCE_URI
              value: "timescaledb.databases.svc:5432/postgres?sslmode=require"
            - name: DATA_SOURCE_USER
              value: "postgres"
          ports:
            - containerPort: 9187
```

## Backup and Recovery

The Helm chart's built-in pgBackRest integration handles backups. Verify backup status:

```bash
kubectl exec -it timescaledb-0 -n databases -- pgbackrest info
```

To restore from a backup to a specific point in time:

```bash
kubectl exec -it timescaledb-0 -n databases -- pgbackrest restore \
  --type=time \
  --target="2026-02-09 10:00:00+00" \
  --set=20260209-080000F
```

Running TimescaleDB on Kubernetes is a proven pattern for production time-series workloads. The combination of PostgreSQL compatibility, automatic partitioning, native compression, and Kubernetes orchestration gives you a powerful, operable platform for storing and querying time-series data at scale. Pay close attention to storage performance, configure compression and retention policies early, and invest in monitoring to keep your time-series infrastructure healthy.
