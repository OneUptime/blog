# Using TimescaleDB Continuous Aggregates for Real-Time Analytics on Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: TimescaleDB, Continuous Aggregates, Kubernetes, Time Series, Analytics

Description: Learn how to use TimescaleDB continuous aggregates to build real-time analytics dashboards and precomputed rollups on Kubernetes-hosted time-series data.

---

Time-series data grows relentlessly. Metrics from Kubernetes clusters, application logs, IoT sensor readings, and financial transactions all share the same challenge: queries that aggregate over large time ranges become painfully slow as data accumulates. TimescaleDB continuous aggregates solve this by automatically maintaining precomputed materialized views that update incrementally as new data arrives. In this post, we will explore how to deploy TimescaleDB on Kubernetes and build continuous aggregates for real-time analytics.

## What Are Continuous Aggregates

Continuous aggregates are TimescaleDB's answer to the performance problem of running aggregate queries (SUM, AVG, COUNT, MAX, MIN) over large time-series datasets. Unlike standard PostgreSQL materialized views that must be fully refreshed each time, continuous aggregates track which data has changed and only recompute the affected time buckets. This makes them orders of magnitude faster to maintain and query.

Under the hood, a continuous aggregate is a materialized view backed by a hypertable. It uses TimescaleDB's chunk-aware infrastructure to efficiently track and update only the portions of the aggregate that have new or modified source data.

## Deploying TimescaleDB on Kubernetes

Before we build continuous aggregates, let us deploy TimescaleDB on Kubernetes using the official Helm chart:

```bash
helm repo add timescale https://charts.timescale.com/
helm repo update

helm install timescaledb timescale/timescaledb-single \
  --namespace databases \
  --create-namespace \
  --set replicaCount=2 \
  --set persistentVolumes.data.size=100Gi \
  --set persistentVolumes.wal.size=20Gi \
  --set resources.requests.memory=4Gi \
  --set resources.requests.cpu=2 \
  --set resources.limits.memory=8Gi \
  --set resources.limits.cpu=4
```

Verify the deployment:

```bash
kubectl get pods -n databases
kubectl exec -it timescaledb-0 -n databases -- psql -U postgres
```

Once connected, enable the TimescaleDB extension:

```sql
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

## Setting Up the Source Hypertable

Let us create a scenario: we are collecting Kubernetes pod metrics and want to build real-time dashboards. First, create the source hypertable:

```sql
CREATE TABLE pod_metrics (
    time        TIMESTAMPTZ NOT NULL,
    cluster     TEXT NOT NULL,
    namespace   TEXT NOT NULL,
    pod_name    TEXT NOT NULL,
    container   TEXT NOT NULL,
    cpu_usage   DOUBLE PRECISION,
    memory_usage BIGINT,
    network_rx  BIGINT,
    network_tx  BIGINT,
    disk_read   BIGINT,
    disk_write  BIGINT
);

SELECT create_hypertable('pod_metrics', 'time',
    chunk_time_interval => INTERVAL '1 day'
);

-- Create indexes for common query patterns
CREATE INDEX idx_pod_metrics_namespace ON pod_metrics (namespace, time DESC);
CREATE INDEX idx_pod_metrics_cluster ON pod_metrics (cluster, time DESC);
```

Insert some sample data to work with:

```sql
INSERT INTO pod_metrics
SELECT
    time,
    'prod-us-east-1' AS cluster,
    (ARRAY['default', 'kube-system', 'monitoring', 'app-frontend', 'app-backend'])[floor(random() * 5 + 1)] AS namespace,
    'pod-' || floor(random() * 100)::int AS pod_name,
    'main' AS container,
    random() * 2000 AS cpu_usage,
    (random() * 4 * 1024 * 1024 * 1024)::bigint AS memory_usage,
    (random() * 100 * 1024 * 1024)::bigint AS network_rx,
    (random() * 50 * 1024 * 1024)::bigint AS network_tx,
    (random() * 200 * 1024 * 1024)::bigint AS disk_read,
    (random() * 100 * 1024 * 1024)::bigint AS disk_write
FROM generate_series(
    NOW() - INTERVAL '30 days',
    NOW(),
    INTERVAL '30 seconds'
) AS time;
```

## Creating Your First Continuous Aggregate

Now let us create a continuous aggregate that computes 5-minute rollups of pod metrics per namespace:

```sql
CREATE MATERIALIZED VIEW namespace_metrics_5min
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('5 minutes', time) AS bucket,
    cluster,
    namespace,
    COUNT(*) AS sample_count,
    AVG(cpu_usage) AS avg_cpu,
    MAX(cpu_usage) AS max_cpu,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY cpu_usage) AS p95_cpu,
    AVG(memory_usage) AS avg_memory,
    MAX(memory_usage) AS max_memory,
    SUM(network_rx) AS total_network_rx,
    SUM(network_tx) AS total_network_tx,
    SUM(disk_read) AS total_disk_read,
    SUM(disk_write) AS total_disk_write
FROM pod_metrics
GROUP BY bucket, cluster, namespace
WITH NO DATA;
```

The `WITH NO DATA` clause creates the aggregate without immediately computing it. This is useful for large datasets where the initial computation might take a long time and you want to control when it happens.

## Configuring Refresh Policies

Continuous aggregates need a refresh policy to keep them up to date. You can configure both automatic refresh schedules and the time window they cover:

```sql
SELECT add_continuous_aggregate_policy('namespace_metrics_5min',
    start_offset    => INTERVAL '1 hour',
    end_offset      => INTERVAL '5 minutes',
    schedule_interval => INTERVAL '5 minutes'
);
```

This policy runs every 5 minutes and refreshes data from 1 hour ago up to 5 minutes ago. The `end_offset` of 5 minutes ensures we do not try to aggregate data that might still be arriving (handling late data).

To manually refresh historical data:

```sql
CALL refresh_continuous_aggregate('namespace_metrics_5min',
    '2026-01-01'::timestamptz,
    NOW()
);
```

## Building Hierarchical Aggregates

One of the most powerful patterns is building aggregates on top of aggregates. Start with fine-grained rollups and build coarser ones on top:

```sql
-- Hourly aggregate built on top of the 5-minute aggregate
CREATE MATERIALIZED VIEW namespace_metrics_1hour
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', bucket) AS bucket,
    cluster,
    namespace,
    SUM(sample_count) AS sample_count,
    AVG(avg_cpu) AS avg_cpu,
    MAX(max_cpu) AS max_cpu,
    AVG(avg_memory) AS avg_memory,
    MAX(max_memory) AS max_memory,
    SUM(total_network_rx) AS total_network_rx,
    SUM(total_network_tx) AS total_network_tx
FROM namespace_metrics_5min
GROUP BY time_bucket('1 hour', bucket), cluster, namespace;

SELECT add_continuous_aggregate_policy('namespace_metrics_1hour',
    start_offset    => INTERVAL '3 hours',
    end_offset      => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour'
);

-- Daily aggregate
CREATE MATERIALIZED VIEW namespace_metrics_1day
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', bucket) AS bucket,
    cluster,
    namespace,
    SUM(sample_count) AS sample_count,
    AVG(avg_cpu) AS avg_cpu,
    MAX(max_cpu) AS max_cpu,
    AVG(avg_memory) AS avg_memory,
    MAX(max_memory) AS max_memory,
    SUM(total_network_rx) AS total_network_rx,
    SUM(total_network_tx) AS total_network_tx
FROM namespace_metrics_1hour
GROUP BY time_bucket('1 day', bucket), cluster, namespace;

SELECT add_continuous_aggregate_policy('namespace_metrics_1day',
    start_offset    => INTERVAL '3 days',
    end_offset      => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day'
);
```

This hierarchical approach is extremely efficient. The hourly aggregate reads from the already-computed 5-minute aggregate instead of scanning the raw data, and the daily aggregate reads from the hourly aggregate.

## Querying Continuous Aggregates

Querying a continuous aggregate is identical to querying any regular PostgreSQL view or table:

```sql
-- Dashboard: namespace CPU usage over the last 24 hours (5-min resolution)
SELECT
    bucket,
    namespace,
    avg_cpu,
    max_cpu,
    p95_cpu
FROM namespace_metrics_5min
WHERE bucket > NOW() - INTERVAL '24 hours'
    AND cluster = 'prod-us-east-1'
ORDER BY bucket DESC, namespace;

-- Dashboard: weekly trend per namespace (hourly resolution)
SELECT
    bucket,
    namespace,
    avg_cpu,
    avg_memory / (1024 * 1024 * 1024.0) AS avg_memory_gb,
    total_network_rx / (1024 * 1024 * 1024.0) AS network_rx_gb
FROM namespace_metrics_1hour
WHERE bucket > NOW() - INTERVAL '7 days'
    AND namespace = 'app-backend'
ORDER BY bucket;

-- Dashboard: monthly overview (daily resolution)
SELECT
    bucket,
    namespace,
    avg_cpu,
    max_cpu,
    total_network_rx / (1024.0 * 1024 * 1024 * 1024) AS network_rx_tb
FROM namespace_metrics_1day
WHERE bucket > NOW() - INTERVAL '30 days'
ORDER BY bucket, namespace;
```

## Real-Time Aggregation with Materialized Flags

By default, continuous aggregates include real-time data from the source hypertable for time ranges that have not yet been materialized. This means your queries always return up-to-date results, at the cost of slightly slower queries for the most recent data:

```sql
-- Check the real-time setting
SELECT view_name, materialized_only
FROM timescaledb_information.continuous_aggregates;

-- Disable real-time aggregation for faster queries (only returns materialized data)
ALTER MATERIALIZED VIEW namespace_metrics_5min
SET (timescaledb.materialized_only = true);
```

For dashboards where near-real-time is acceptable, keeping real-time aggregation enabled is the best approach. For batch reporting where exact performance matters, disabling it and relying solely on materialized data is appropriate.

## Retention Policies

Combine continuous aggregates with retention policies to manage storage efficiently. Keep raw data for a short period and aggregated data for longer:

```sql
-- Keep raw data for 7 days
SELECT add_retention_policy('pod_metrics', INTERVAL '7 days');

-- Keep 5-minute aggregates for 30 days
SELECT add_retention_policy('namespace_metrics_5min', INTERVAL '30 days');

-- Keep hourly aggregates for 1 year
SELECT add_retention_policy('namespace_metrics_1hour', INTERVAL '1 year');

-- Keep daily aggregates indefinitely (no retention policy)
```

## Monitoring Continuous Aggregate Health

Monitor your continuous aggregates to ensure they are refreshing on schedule:

```sql
-- Check refresh job status
SELECT
    application_name,
    schedule_interval,
    last_run_started_at,
    last_successful_finish,
    next_start,
    total_runs,
    total_failures
FROM timescaledb_information.jobs
WHERE application_name LIKE '%continuous%';

-- Check materialization lag
SELECT
    view_name,
    completed_threshold,
    NOW() - completed_threshold AS lag
FROM timescaledb_information.continuous_aggregate_stats;
```

Set up alerting on these metrics to catch stalled refresh jobs early.

## Kubernetes-Specific Considerations

When running TimescaleDB on Kubernetes, ensure your PersistentVolumes use a high-performance storage class. Continuous aggregate refresh jobs are I/O intensive, particularly for large time windows:

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
volumeBindingMode: WaitForFirstConsumer
```

Also, allocate sufficient shared_buffers and work_mem for the continuous aggregate refresh worker:

```sql
ALTER SYSTEM SET shared_buffers = '4GB';
ALTER SYSTEM SET work_mem = '256MB';
ALTER SYSTEM SET maintenance_work_mem = '1GB';
ALTER SYSTEM SET timescaledb.max_background_workers = 8;
```

TimescaleDB continuous aggregates transform the economics of time-series analytics. Instead of choosing between query speed and data freshness, you get both. By deploying TimescaleDB on Kubernetes with well-designed hierarchical aggregates and appropriate retention policies, you can build real-time analytics dashboards that scale with your data without breaking your query budget.
