# How to Configure Prometheus Retention Policies for Local Storage Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Storage, Retention, Performance, Kubernetes

Description: Learn how to configure Prometheus retention policies to balance storage costs, data availability, and query performance for local time series data.

---

Prometheus stores all metrics locally in a time series database. Without proper retention configuration, storage fills up quickly, causing crashes or performance degradation. Retention policies control how long Prometheus keeps data and how much disk space it uses. This guide covers retention strategies, storage optimization, and capacity planning for Prometheus deployments.

## Understanding Prometheus Storage

Prometheus stores data in blocks on disk:
- Active data is in the head block (in-memory)
- Older data is in persisted blocks (2-hour chunks by default)
- Each block contains index files and chunk files
- WAL (Write-Ahead Log) provides crash recovery

Storage grows based on:
- Number of time series (cardinality)
- Scrape frequency
- Retention period
- Compression efficiency

## Basic Retention Configuration

Configure retention by time or size:

```yaml
# prometheus-values.yaml (for kube-prometheus-stack)
prometheus:
  prometheusSpec:
    # Time-based retention (default: 15d)
    retention: 30d

    # Size-based retention (takes precedence if reached first)
    retentionSize: "50GB"

    # Storage configuration
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: fast-ssd
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 100Gi
```

Apply the configuration:

```bash
helm upgrade prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values prometheus-values.yaml
```

## Retention Strategies

### Time-Based Retention

Keep data for a specific duration:

```yaml
prometheus:
  prometheusSpec:
    # Short-term (good for high-cardinality, high-frequency)
    retention: 7d

    # Medium-term (standard recommendation)
    retention: 15d

    # Long-term (if no remote storage)
    retention: 90d
```

### Size-Based Retention

Limit disk usage:

```yaml
prometheus:
  prometheusSpec:
    retention: 30d  # Keep up to 30 days
    retentionSize: "40GB"  # But never exceed 40GB

    # Storage should be larger than retentionSize
    storageSpec:
      volumeClaimTemplate:
        spec:
          resources:
            requests:
              storage: 50Gi  # 25% overhead
```

### Hybrid Retention

Combine both approaches:

```yaml
prometheus:
  prometheusSpec:
    # Keep 30 days OR 80GB, whichever comes first
    retention: 30d
    retentionSize: "80GB"

    storageSpec:
      volumeClaimTemplate:
        spec:
          resources:
            requests:
              storage: 100Gi
```

## Calculating Storage Requirements

Estimate storage needs:

```
Daily samples = (number of series) × (86400 / scrape_interval)
Daily storage = daily samples × average bytes per sample (1-2 bytes)
Total storage = daily storage × retention days × 1.5 (overhead)
```

Example calculation:

```
Series: 100,000
Scrape interval: 30s
Retention: 15 days

Daily samples = 100,000 × (86,400 / 30) = 288,000,000
Daily storage = 288,000,000 × 1.5 bytes = 432 MB
Total storage = 432 MB × 15 days × 1.5 = 9.7 GB
Recommended PVC: 15-20 GB
```

Configuration based on calculation:

```yaml
prometheus:
  prometheusSpec:
    retention: 15d
    retentionSize: "12GB"  # 80% of PVC

    storageSpec:
      volumeClaimTemplate:
        spec:
          resources:
            requests:
              storage: 15Gi

    resources:
      requests:
        cpu: 500m
        memory: 2Gi  # ~2x active series in memory
      limits:
        cpu: 2000m
        memory: 4Gi
```

## Storage Classes and Performance

Choose appropriate storage:

```yaml
# Fast SSD for high-performance
prometheus:
  prometheusSpec:
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: fast-ssd
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 100Gi

---
# Standard disk for cost savings
prometheus:
  prometheusSpec:
    retention: 7d  # Shorter retention on slower disks
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: standard
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 50Gi
```

## WAL Configuration

Configure Write-Ahead Log:

```yaml
prometheus:
  prometheusSpec:
    # Enable WAL compression (recommended)
    walCompression: true

    # WAL settings via extraArgs
    additionalArgs:
      - --storage.tsdb.wal-compression
      - --storage.tsdb.retention.time=30d
      - --storage.tsdb.retention.size=50GB
```

## Block Compaction

Control compaction behavior:

```yaml
prometheus:
  prometheusSpec:
    # Disable compaction if using Thanos sidecar
    disableCompaction: false

    # Compaction settings via extraArgs
    additionalArgs:
      - --storage.tsdb.min-block-duration=2h
      - --storage.tsdb.max-block-duration=36h
```

## Multi-Tier Retention Strategy

Use different retention for different metric types:

```yaml
# High-frequency, short retention
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: prometheus-short-term
  namespace: monitoring
spec:
  retention: 2d
  retentionSize: "10GB"
  scrapeInterval: 15s

  # Scrape only real-time metrics
  serviceMonitorSelector:
    matchLabels:
      retention: short-term

---
# Standard retention
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: prometheus-standard
  namespace: monitoring
spec:
  retention: 15d
  retentionSize: "50GB"
  scrapeInterval: 30s

  serviceMonitorSelector:
    matchLabels:
      retention: standard

---
# Long-term with remote write
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: prometheus-long-term
  namespace: monitoring
spec:
  retention: 2d  # Local retention short
  scrapeInterval: 60s

  # Send to long-term storage
  remoteWrite:
    - url: http://thanos-receive:19291/api/v1/receive

  serviceMonitorSelector:
    matchLabels:
      retention: long-term
```

## Monitoring Storage Usage

Track storage metrics:

```promql
# Current storage size
prometheus_tsdb_storage_blocks_bytes

# WAL size
prometheus_tsdb_wal_storage_size_bytes

# Head block size (in-memory)
prometheus_tsdb_head_chunks_storage_size_bytes

# Total storage
prometheus_tsdb_storage_blocks_bytes + prometheus_tsdb_wal_storage_size_bytes

# Storage utilization percentage
(
  (prometheus_tsdb_storage_blocks_bytes + prometheus_tsdb_wal_storage_size_bytes)
  / (50 * 1024 * 1024 * 1024)  # Assuming 50GB limit
) * 100
```

Create storage alerts:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: storage-alerts
  namespace: monitoring
spec:
  groups:
    - name: prometheus-storage
      interval: 1m
      rules:
        - alert: PrometheusStorageNearFull
          expr: |
            (
              prometheus_tsdb_storage_blocks_bytes + prometheus_tsdb_wal_storage_size_bytes
            ) / 50000000000 > 0.8
          for: 30m
          labels:
            severity: warning
          annotations:
            summary: "Prometheus storage is 80% full"
            description: "Prometheus storage usage is {{ $value | humanizePercentage }}."

        - alert: PrometheusStorageFull
          expr: |
            (
              prometheus_tsdb_storage_blocks_bytes + prometheus_tsdb_wal_storage_size_bytes
            ) / 50000000000 > 0.95
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "Prometheus storage is 95% full"
            description: "Prometheus will stop ingesting metrics soon."

        - alert: PrometheusStorageGrowthHigh
          expr: |
            predict_linear(prometheus_tsdb_storage_blocks_bytes[6h], 24 * 3600)
            > 50000000000
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "Prometheus storage will fill in 24 hours"
            description: "At current growth rate, storage will be full tomorrow."

        - alert: PrometheusWALCorrupted
          expr: |
            prometheus_tsdb_wal_corruptions_total > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Prometheus WAL corrupted"
            description: "WAL corruption detected, data loss possible."
```

## Storage Optimization Techniques

### Reduce Cardinality

Drop high-cardinality labels:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: optimized-scraping
  namespace: monitoring
spec:
  endpoints:
    - port: metrics
      metricRelabelings:
        # Drop high-cardinality labels
        - regex: '(user_id|session_id|request_id)'
          action: labeldrop

        # Drop histogram buckets
        - sourceLabels: [__name__]
          regex: '.*_bucket'
          action: drop
```

### Use Recording Rules

Pre-aggregate data to reduce series:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: storage-optimization-rules
  namespace: monitoring
spec:
  groups:
    - name: aggregations
      interval: 60s
      rules:
        # Aggregate to namespace level
        - record: namespace:cpu_usage:sum
          expr: sum by (namespace) (rate(container_cpu_usage_seconds_total[5m]))

        # Then drop pod-level metrics (in separate Prometheus or with relabeling)
```

### Increase Scrape Intervals

Reduce sample frequency:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: slow-changing-metrics
  namespace: monitoring
spec:
  endpoints:
    - port: metrics
      interval: 5m  # Less frequent for slow-changing metrics
```

## Backup and Recovery

Backup Prometheus data:

```bash
# Create snapshot
kubectl exec -n monitoring prometheus-pod -- \
  curl -X POST http://localhost:9090/api/v1/admin/tsdb/snapshot

# Snapshot location
kubectl exec -n monitoring prometheus-pod -- \
  ls /prometheus/snapshots/

# Copy snapshot
kubectl cp monitoring/prometheus-pod:/prometheus/snapshots/20260209T120000Z-xxx ./prometheus-backup
```

Restore from snapshot:

```bash
# Stop Prometheus
kubectl scale statefulset prometheus-prometheus-stack-kube-prom-prometheus -n monitoring --replicas=0

# Copy snapshot to data directory
kubectl cp ./prometheus-backup monitoring/prometheus-pod:/prometheus/

# Start Prometheus
kubectl scale statefulset prometheus-prometheus-stack-kube-prom-prometheus -n monitoring --replicas=1
```

## Cleanup Strategies

Manual cleanup (emergency):

```bash
# Access Prometheus pod
kubectl exec -it -n monitoring prometheus-pod -- sh

# Clean old blocks (dangerous!)
rm -rf /prometheus/01234567890ABCDEF/

# Reload Prometheus
curl -X POST http://localhost:9090/-/reload
```

Automated cleanup with retention policies is safer than manual intervention.

## Migrating to Remote Storage

Transition from local to remote storage:

```yaml
prometheus:
  prometheusSpec:
    # Reduce local retention
    retention: 2d
    retentionSize: "10GB"

    # Enable remote write
    remoteWrite:
      - url: http://thanos-receive:19291/api/v1/receive
        queueConfig:
          capacity: 10000
          maxShards: 50

    # Keep local storage small
    storageSpec:
      volumeClaimTemplate:
        spec:
          resources:
            requests:
              storage: 15Gi
```

## Best Practices

1. Set retention to 15-30 days for local storage
2. Use size-based retention as a safety limit
3. Monitor storage usage and set alerts
4. Calculate storage requirements before deployment
5. Use fast SSDs for better performance
6. Enable WAL compression to save space
7. Implement remote storage for long-term retention
8. Regular backup critical Prometheus instances
9. Review and optimize cardinality regularly
10. Plan for 50-100% overhead in storage allocation

## Conclusion

Proper retention configuration ensures Prometheus runs reliably without storage issues. By balancing retention periods, storage limits, and remote write, you maintain data availability while controlling costs. Regular monitoring of storage metrics and proactive capacity planning prevent outages and maintain query performance. For long-term storage beyond local retention, integrate remote write solutions like Thanos or Mimir.
