# How to Monitor CloudNativePG with Prometheus

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudNativePG, Kubernetes, PostgreSQL, Prometheus, Grafana, Monitoring, Observability

Description: A comprehensive guide to monitoring PostgreSQL clusters managed by CloudNativePG using Prometheus and Grafana, including metrics configuration, custom queries, dashboards, and alerting rules.

---

Monitoring is essential for maintaining healthy PostgreSQL clusters. CloudNativePG provides built-in Prometheus metrics export, making it easy to integrate with your existing monitoring stack. This guide covers setting up comprehensive monitoring for your PostgreSQL clusters.

## Prerequisites

- CloudNativePG operator installed
- Prometheus and Grafana deployed (or Prometheus Operator)
- PostgreSQL cluster running

## CloudNativePG Metrics Overview

CloudNativePG exports metrics via:

1. **Operator Metrics**: Controller manager health and performance
2. **Cluster Metrics**: PostgreSQL instance and cluster health
3. **Custom Queries**: User-defined metrics from PostgreSQL

## Enable Cluster Monitoring

### Basic Monitoring Configuration

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-monitored
spec:
  instances: 3
  storage:
    size: 10Gi

  monitoring:
    enablePodMonitor: true
```

### Advanced Monitoring Configuration

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-monitored
spec:
  instances: 3
  storage:
    size: 100Gi

  monitoring:
    # Create PodMonitor for Prometheus Operator
    enablePodMonitor: true

    # Disable default queries (if using only custom)
    disableDefaultQueries: false

    # Custom queries from ConfigMap
    customQueriesConfigMap:
      - name: postgres-custom-queries
        key: queries

    # Custom queries from Secret (for sensitive queries)
    customQueriesSecret:
      - name: postgres-sensitive-queries
        key: queries

    # TLS configuration for metrics endpoint
    # tls:
    #   enabled: true
```

## Default Metrics

CloudNativePG exports these metrics by default:

### Cluster Metrics

| Metric | Description |
|--------|-------------|
| `cnpg_collector_up` | Whether the collector is up |
| `cnpg_cluster_instances` | Number of instances in cluster |
| `cnpg_cluster_ready_instances` | Number of ready instances |
| `cnpg_cluster_instances_reported_state` | Instance states |

### PostgreSQL Metrics

| Metric | Description |
|--------|-------------|
| `cnpg_pg_database_size_bytes` | Database size |
| `cnpg_pg_stat_database_*` | Database statistics |
| `cnpg_pg_stat_replication_*` | Replication status |
| `cnpg_pg_stat_archiver_*` | WAL archiver status |
| `cnpg_pg_settings_*` | PostgreSQL settings |

### Replication Metrics

| Metric | Description |
|--------|-------------|
| `cnpg_pg_replication_lag` | Replication lag in seconds |
| `cnpg_pg_stat_replication_sent_lag_bytes` | WAL sent lag |
| `cnpg_pg_stat_replication_write_lag_bytes` | WAL write lag |
| `cnpg_pg_stat_replication_flush_lag_bytes` | WAL flush lag |
| `cnpg_pg_stat_replication_replay_lag_bytes` | WAL replay lag |

## Custom Queries

### Create Custom Queries ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-custom-queries
data:
  queries: |
    # Database size metrics
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

    # Table statistics
    pg_stat_user_tables:
      query: |
        SELECT
          schemaname,
          relname,
          seq_scan,
          idx_scan,
          n_tup_ins,
          n_tup_upd,
          n_tup_del,
          n_live_tup,
          n_dead_tup,
          EXTRACT(EPOCH FROM last_vacuum) as last_vacuum_epoch,
          EXTRACT(EPOCH FROM last_autovacuum) as last_autovacuum_epoch,
          EXTRACT(EPOCH FROM last_analyze) as last_analyze_epoch,
          EXTRACT(EPOCH FROM last_autoanalyze) as last_autoanalyze_epoch
        FROM pg_stat_user_tables
      metrics:
        - schemaname:
            usage: "LABEL"
            description: "Schema name"
        - relname:
            usage: "LABEL"
            description: "Table name"
        - seq_scan:
            usage: "COUNTER"
            description: "Sequential scans"
        - idx_scan:
            usage: "COUNTER"
            description: "Index scans"
        - n_tup_ins:
            usage: "COUNTER"
            description: "Rows inserted"
        - n_tup_upd:
            usage: "COUNTER"
            description: "Rows updated"
        - n_tup_del:
            usage: "COUNTER"
            description: "Rows deleted"
        - n_live_tup:
            usage: "GAUGE"
            description: "Live rows"
        - n_dead_tup:
            usage: "GAUGE"
            description: "Dead rows"
        - last_vacuum_epoch:
            usage: "GAUGE"
            description: "Last vacuum timestamp"
        - last_autovacuum_epoch:
            usage: "GAUGE"
            description: "Last autovacuum timestamp"
        - last_analyze_epoch:
            usage: "GAUGE"
            description: "Last analyze timestamp"
        - last_autoanalyze_epoch:
            usage: "GAUGE"
            description: "Last autoanalyze timestamp"

    # Index usage
    pg_stat_user_indexes:
      query: |
        SELECT
          schemaname,
          relname,
          indexrelname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes
      metrics:
        - schemaname:
            usage: "LABEL"
        - relname:
            usage: "LABEL"
        - indexrelname:
            usage: "LABEL"
        - idx_scan:
            usage: "COUNTER"
            description: "Index scans"
        - idx_tup_read:
            usage: "COUNTER"
            description: "Index tuples read"
        - idx_tup_fetch:
            usage: "COUNTER"
            description: "Index tuples fetched"

    # Connection statistics
    pg_stat_activity_count:
      query: |
        SELECT
          datname,
          state,
          COUNT(*) as count
        FROM pg_stat_activity
        WHERE datname IS NOT NULL
        GROUP BY datname, state
      metrics:
        - datname:
            usage: "LABEL"
            description: "Database name"
        - state:
            usage: "LABEL"
            description: "Connection state"
        - count:
            usage: "GAUGE"
            description: "Connection count"

    # Lock statistics
    pg_locks_count:
      query: |
        SELECT
          datname,
          mode,
          COUNT(*) as count
        FROM pg_locks l
        JOIN pg_database d ON l.database = d.oid
        GROUP BY datname, mode
      metrics:
        - datname:
            usage: "LABEL"
        - mode:
            usage: "LABEL"
        - count:
            usage: "GAUGE"
            description: "Lock count"

    # Checkpoint statistics
    pg_stat_bgwriter:
      query: |
        SELECT
          checkpoints_timed,
          checkpoints_req,
          checkpoint_write_time,
          checkpoint_sync_time,
          buffers_checkpoint,
          buffers_clean,
          maxwritten_clean,
          buffers_backend,
          buffers_backend_fsync,
          buffers_alloc
        FROM pg_stat_bgwriter
      metrics:
        - checkpoints_timed:
            usage: "COUNTER"
            description: "Scheduled checkpoints"
        - checkpoints_req:
            usage: "COUNTER"
            description: "Requested checkpoints"
        - checkpoint_write_time:
            usage: "COUNTER"
            description: "Checkpoint write time (ms)"
        - checkpoint_sync_time:
            usage: "COUNTER"
            description: "Checkpoint sync time (ms)"
        - buffers_checkpoint:
            usage: "COUNTER"
            description: "Buffers written by checkpoints"
        - buffers_clean:
            usage: "COUNTER"
            description: "Buffers written by bgwriter"
        - maxwritten_clean:
            usage: "COUNTER"
            description: "Times bgwriter stopped for max writes"
        - buffers_backend:
            usage: "COUNTER"
            description: "Buffers written by backends"
        - buffers_backend_fsync:
            usage: "COUNTER"
            description: "Backend fsync calls"
        - buffers_alloc:
            usage: "COUNTER"
            description: "Buffers allocated"
```

### pg_stat_statements Metrics

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-pgss-queries
data:
  queries: |
    # Requires pg_stat_statements extension
    pg_stat_statements:
      query: |
        SELECT
          queryid,
          LEFT(query, 50) as query_short,
          calls,
          total_exec_time,
          mean_exec_time,
          rows,
          shared_blks_hit,
          shared_blks_read,
          shared_blks_written,
          temp_blks_read,
          temp_blks_written
        FROM pg_stat_statements
        WHERE query NOT LIKE '%pg_stat_statements%'
        ORDER BY total_exec_time DESC
        LIMIT 50
      metrics:
        - queryid:
            usage: "LABEL"
        - query_short:
            usage: "LABEL"
        - calls:
            usage: "COUNTER"
            description: "Number of calls"
        - total_exec_time:
            usage: "COUNTER"
            description: "Total execution time (ms)"
        - mean_exec_time:
            usage: "GAUGE"
            description: "Mean execution time (ms)"
        - rows:
            usage: "COUNTER"
            description: "Rows returned"
        - shared_blks_hit:
            usage: "COUNTER"
            description: "Shared blocks hit"
        - shared_blks_read:
            usage: "COUNTER"
            description: "Shared blocks read"
        - shared_blks_written:
            usage: "COUNTER"
            description: "Shared blocks written"
        - temp_blks_read:
            usage: "COUNTER"
            description: "Temp blocks read"
        - temp_blks_written:
            usage: "COUNTER"
            description: "Temp blocks written"
```

## Prometheus Configuration

### PodMonitor (Prometheus Operator)

CloudNativePG creates PodMonitor automatically when enabled. Manual configuration:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: postgres-monitor
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      cnpg.io/cluster: postgres-monitored
  podMetricsEndpoints:
    - port: metrics
      interval: 30s
      scrapeTimeout: 10s
      path: /metrics
```

### ServiceMonitor for Operator

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: cnpg-controller-manager
  namespace: cnpg-system
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: cloudnative-pg
  endpoints:
    - port: metrics
      interval: 30s
```

### Manual Prometheus Configuration

For non-Operator setups, add to `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'cloudnativepg'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_cnpg_io_cluster]
        action: keep
        regex: .+
      - source_labels: [__meta_kubernetes_pod_container_port_name]
        action: keep
        regex: metrics
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
      - source_labels: [__meta_kubernetes_pod_label_cnpg_io_cluster]
        target_label: cluster
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: pod
```

## Grafana Dashboards

### Import CloudNativePG Dashboard

CloudNativePG provides official dashboards:

1. Go to Grafana > Dashboards > Import
2. Use dashboard ID: `20417` (CloudNativePG dashboard)
3. Select Prometheus data source

### Custom Dashboard Panels

#### Cluster Overview

```json
{
  "title": "Cluster Instances",
  "type": "stat",
  "targets": [
    {
      "expr": "cnpg_cluster_ready_instances{cluster=\"postgres-monitored\"}",
      "legendFormat": "Ready"
    },
    {
      "expr": "cnpg_cluster_instances{cluster=\"postgres-monitored\"}",
      "legendFormat": "Total"
    }
  ]
}
```

#### Replication Lag

```json
{
  "title": "Replication Lag",
  "type": "timeseries",
  "targets": [
    {
      "expr": "cnpg_pg_replication_lag{cluster=\"postgres-monitored\"}",
      "legendFormat": "{{pod}}"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "unit": "s"
    }
  }
}
```

#### Database Size

```json
{
  "title": "Database Size",
  "type": "timeseries",
  "targets": [
    {
      "expr": "cnpg_pg_database_size_bytes{cluster=\"postgres-monitored\"}",
      "legendFormat": "{{datname}}"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "unit": "bytes"
    }
  }
}
```

#### Connection Count

```json
{
  "title": "Active Connections",
  "type": "timeseries",
  "targets": [
    {
      "expr": "sum(pg_stat_activity_count{cluster=\"postgres-monitored\", state=\"active\"})",
      "legendFormat": "Active"
    },
    {
      "expr": "sum(pg_stat_activity_count{cluster=\"postgres-monitored\", state=\"idle\"})",
      "legendFormat": "Idle"
    }
  ]
}
```

## Alerting Rules

### PrometheusRule for CloudNativePG

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cloudnativepg-alerts
  labels:
    release: prometheus
spec:
  groups:
    - name: cloudnativepg.rules
      rules:
        # Cluster Health
        - alert: CNPGClusterNotHealthy
          expr: cnpg_cluster_ready_instances < cnpg_cluster_instances
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "PostgreSQL cluster not healthy"
            description: "Cluster {{ $labels.cluster }} has {{ $value }} ready instances out of expected"

        - alert: CNPGClusterDown
          expr: cnpg_cluster_ready_instances == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "PostgreSQL cluster is down"
            description: "Cluster {{ $labels.cluster }} has no ready instances"

        # Replication
        - alert: CNPGHighReplicationLag
          expr: cnpg_pg_replication_lag > 30
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High replication lag"
            description: "Replication lag is {{ $value }}s on {{ $labels.pod }}"

        - alert: CNPGReplicationLagCritical
          expr: cnpg_pg_replication_lag > 300
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "Critical replication lag"
            description: "Replication lag is {{ $value }}s on {{ $labels.pod }}"

        # Backups
        - alert: CNPGNoRecentBackup
          expr: time() - cnpg_pg_stat_archiver_last_archived_time > 3600
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "No recent WAL archive"
            description: "No WAL archived in the last hour for {{ $labels.cluster }}"

        - alert: CNPGArchiveFailure
          expr: increase(cnpg_pg_stat_archiver_failed_count[1h]) > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "WAL archive failures"
            description: "Archive failures on {{ $labels.cluster }}"

        # Storage
        - alert: CNPGDiskSpaceLow
          expr: cnpg_pg_database_size_bytes / on (persistentvolumeclaim) (kubelet_volume_stats_capacity_bytes) > 0.8
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "PostgreSQL disk space low"
            description: "Database {{ $labels.datname }} is using {{ $value | humanizePercentage }} of disk"

        # Connections
        - alert: CNPGConnectionsHigh
          expr: sum by (cluster) (pg_stat_activity_count) / on (cluster) cnpg_pg_settings_max_connections * 100 > 80
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "High connection usage"
            description: "Cluster {{ $labels.cluster }} is using {{ $value }}% of max connections"

        # Dead Tuples
        - alert: CNPGHighDeadTuples
          expr: sum by (cluster, relname) (pg_stat_user_tables_n_dead_tup) > 100000
          for: 30m
          labels:
            severity: warning
          annotations:
            summary: "High dead tuple count"
            description: "Table {{ $labels.relname }} has {{ $value }} dead tuples"

        # Locks
        - alert: CNPGLongRunningLocks
          expr: pg_locks_count{mode="ExclusiveLock"} > 10
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Many exclusive locks"
            description: "{{ $value }} exclusive locks on {{ $labels.datname }}"

        # Failover
        - alert: CNPGFailoverOccurred
          expr: changes(cnpg_collector_up{role="primary"}[5m]) > 0
          for: 1m
          labels:
            severity: warning
          annotations:
            summary: "PostgreSQL failover occurred"
            description: "Primary change detected in {{ $labels.cluster }}"
```

## Verify Monitoring Setup

### Check Metrics Endpoint

```bash
# Port forward to pod
kubectl port-forward postgres-monitored-1 9187:9187

# Fetch metrics
curl http://localhost:9187/metrics

# Check specific metrics
curl -s http://localhost:9187/metrics | grep cnpg
```

### Verify in Prometheus

```bash
# Port forward to Prometheus
kubectl port-forward svc/prometheus 9090:9090 -n monitoring

# Query metrics in browser
# http://localhost:9090
# Try: cnpg_cluster_instances
```

### Check PodMonitor

```bash
# List PodMonitors
kubectl get podmonitor

# Check Prometheus targets
kubectl port-forward svc/prometheus 9090:9090 -n monitoring
# Go to Status > Targets in Prometheus UI
```

## Troubleshooting

### Metrics Not Appearing

```bash
# Check if metrics port is exposed
kubectl get pod postgres-monitored-1 -o yaml | grep -A5 ports

# Check PodMonitor
kubectl describe podmonitor postgres-monitor

# Verify scrape config in Prometheus
kubectl exec -n monitoring prometheus-0 -- cat /etc/prometheus/prometheus.yml
```

### Custom Queries Failing

```bash
# Check ConfigMap
kubectl describe configmap postgres-custom-queries

# Check pod logs
kubectl logs postgres-monitored-1 | grep -i metric

# Test query manually
kubectl exec postgres-monitored-1 -- psql -c "SELECT * FROM pg_stat_user_tables LIMIT 1"
```

## Conclusion

Comprehensive monitoring is essential for PostgreSQL clusters:

1. **Enable built-in metrics** with `enablePodMonitor: true`
2. **Add custom queries** for application-specific metrics
3. **Create dashboards** for visibility
4. **Configure alerts** for proactive issue detection
5. **Regularly review** metrics and tune thresholds

CloudNativePG's native Prometheus integration makes it straightforward to implement enterprise-grade monitoring for your PostgreSQL clusters on Kubernetes.
