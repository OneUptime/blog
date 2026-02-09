# How to Use Thanos Compactor to Downsample Historical Kubernetes Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Thanos, Compactor, Downsampling, Storage Optimization, Kubernetes

Description: Learn how to configure Thanos Compactor to automatically downsample historical Kubernetes metrics for reduced storage costs while maintaining query performance.

---

Storing years of Kubernetes metrics at full resolution consumes massive storage and slows historical queries. Thanos Compactor automatically downsamples old metrics to lower resolutions (5m, 1h), reducing storage by 90 percent while keeping queries fast.

This guide covers deploying and configuring the Compactor for production downsampling.

## Understanding Downsampling

Downsampling reduces metric resolution for old data. Fresh data stays at full resolution (typically 30s), but data older than 30 days might downsample to 5-minute resolution, and data older than 90 days to 1-hour resolution.

For example, CPU usage recorded every 30 seconds:

- **0-30 days**: 30s resolution (2,880 samples/day)
- **30-90 days**: 5m resolution (288 samples/day) - 90% reduction
- **90+ days**: 1h resolution (24 samples/day) - 99% reduction

Queries automatically use the appropriate resolution based on the requested time range.

## Deploying Thanos Compactor

Deploy Compactor as a StatefulSet with only one replica (multiple compactors conflict):

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: thanos-compactor
  namespace: monitoring
spec:
  serviceName: thanos-compactor
  replicas: 1  # MUST be 1 - multiple compactors will conflict
  selector:
    matchLabels:
      app: thanos-compactor
  template:
    metadata:
      labels:
        app: thanos-compactor
    spec:
      containers:
      - name: compactor
        image: quay.io/thanos/thanos:v0.32.0
        args:
          - compact
          - --data-dir=/data
          - --http-address=0.0.0.0:10902
          - --objstore.config-file=/etc/thanos/objstore.yml
          # Downsampling configuration
          - --retention.resolution-raw=30d     # Keep 30s resolution for 30 days
          - --retention.resolution-5m=90d      # Keep 5m resolution for 90 days
          - --retention.resolution-1h=365d     # Keep 1h resolution for 1 year
          # Enable downsampling
          - --downsampling.disable=false
          # Compaction configuration
          - --compact.concurrency=1
          - --downsample.concurrency=1
          - --delete-delay=48h
          - --wait
        ports:
        - containerPort: 10902
          name: http
        volumeMounts:
        - name: data
          mountPath: /data
        - name: objstore-config
          mountPath: /etc/thanos
        resources:
          requests:
            memory: 4Gi
            cpu: 2
          limits:
            memory: 8Gi
            cpu: 4
        livenessProbe:
          httpGet:
            path: /-/healthy
            port: 10902
          initialDelaySeconds: 30
          periodSeconds: 30
      volumes:
      - name: objstore-config
        secret:
          secretName: thanos-objstore-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
---
apiVersion: v1
kind: Service
metadata:
  name: thanos-compactor
  namespace: monitoring
spec:
  selector:
    app: thanos-compactor
  ports:
  - port: 10902
    name: http
```

## Configuring Retention Policies

The retention flags control how long each resolution is kept:

```yaml
args:
  # Raw 30-second data for 30 days
  - --retention.resolution-raw=30d

  # 5-minute downsampled data for 90 days total
  # (30 days raw + 60 days downsampled)
  - --retention.resolution-5m=90d

  # 1-hour downsampled data for 1 year total
  # (30 days raw + 60 days 5m + 275 days 1h)
  - --retention.resolution-1h=365d
```

After 30 days, raw data is deleted and only 5m resolution remains. After 90 days, 5m data is deleted and only 1h remains.

## Understanding Downsampling Aggregations

Compactor creates downsampled blocks using these aggregations:

- **Counter**: Uses max value within the window
- **Gauge**: Uses average within the window
- **Histogram**: Merges buckets

For example, 10 samples at 30s resolution become 1 sample at 5m resolution.

Original (30s):
```
metric_value 10
metric_value 12
metric_value 15
metric_value 13
metric_value 11
metric_value 14
metric_value 16
metric_value 12
metric_value 13
metric_value 15
```

Downsampled (5m average):
```
metric_value 13.1
```

## Monitoring Compactor Progress

Track compaction and downsampling:

```promql
# Blocks compacted
thanos_compact_group_compactions_total

# Downsampling duration
thanos_compact_downsample_duration_seconds

# Last successful compaction
time() - thanos_compact_last_run_timestamp_seconds

# Compactor iterations
rate(thanos_compact_iterations_total[5m])

# Block cleanup operations
thanos_compact_block_cleanup_loops_total
```

## Configuring Compaction Intervals

Control how often compaction runs:

```yaml
args:
  # Compact blocks older than 2 hours
  - --compact.block-fetch-concurrency=1
  - --compact.cleanup-interval=5m
  # Wait between compaction cycles
  - --wait
  - --wait-interval=3m
```

The `--wait` flag makes Compactor run continuously. Remove it for one-time compaction.

## Storage Optimization Calculations

Calculate storage savings from downsampling:

```
Original storage (30s for 1 year):
- 1,051,200 samples per metric per year
- 100,000 metrics
- ~8 bytes per sample
= 840 GB per year

With downsampling:
- 30 days at 30s: 86,400 samples = 69 MB
- 60 days at 5m: 17,280 samples = 14 MB
- 275 days at 1h: 6,600 samples = 5 MB
= 88 MB per metric per year
= 8.8 GB total for 100,000 metrics

Storage reduction: 99% savings
```

## Handling Compaction Failures

Compactor can fail for several reasons. Configure retries and monitoring:

```yaml
args:
  # Retry failed uploads
  - --compact.concurrency=1
  # Clean up partial blocks
  - --delete-delay=48h
  # Log compaction issues
  - --log.level=info
```

## Vertical Compaction

Compactor also performs vertical compaction, merging overlapping blocks from multiple Prometheus replicas:

```yaml
args:
  # Enable vertical compaction
  - --compact.enable-vertical-compaction
  # Deduplication labels
  - --deduplication.replica-label=prometheus_replica
  - --deduplication.replica-label=replica
```

This reduces storage by removing duplicate data from HA Prometheus setups.

## Compaction Grouping

Blocks are grouped by external labels for compaction:

```yaml
args:
  # Group blocks by cluster label
  - --compact.block-viewer.global.sync-block-interval=3m
```

Blocks with the same external labels are compacted together.

## Alerting on Compaction Issues

Create alerts for Compactor problems:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: thanos-compactor-alerts
  namespace: monitoring
spec:
  groups:
  - name: compactor
    rules:
    - alert: ThanosCompactorNotRunning
      expr: |
        time() - thanos_compact_last_run_timestamp_seconds > 7200
      for: 15m
      labels:
        severity: critical
      annotations:
        summary: "Compactor hasn't run in 2 hours"
        description: "Compaction is blocked or failing"

    - alert: ThanosCompactorFailing
      expr: |
        rate(thanos_compact_group_compactions_failures_total[1h]) > 0
      for: 30m
      labels:
        severity: warning
      annotations:
        summary: "Compactor experiencing failures"
        description: "{{ $value }} failures per second"

    - alert: ThanosCompactorHighDuration
      expr: |
        thanos_compact_duration_seconds > 3600
      labels:
        severity: warning
      annotations:
        summary: "Compaction taking too long"
        description: "Last compaction took {{ $value }}s"

    - alert: ThanosCompactorDiskFull
      expr: |
        (
          kubelet_volume_stats_available_bytes{persistentvolumeclaim="data-thanos-compactor-0"} /
          kubelet_volume_stats_capacity_bytes{persistentvolumeclaim="data-thanos-compactor-0"}
        ) < 0.1
      labels:
        severity: critical
      annotations:
        summary: "Compactor disk nearly full"
```

## Viewing Downsampled Blocks

Check object storage for downsampled blocks:

```bash
# List blocks in S3
aws s3 ls s3://thanos-metrics/ --recursive | grep -E '5m|1h'

# Check block metadata
kubectl exec -n monitoring thanos-compactor-0 -- \
  thanos tools bucket inspect \
  --objstore.config-file=/etc/thanos/objstore.yml
```

Downsampled blocks have `5m` or `1h` in their directory names.

## Query Performance with Downsampling

Queries automatically select the appropriate resolution:

- Query last 1 hour → uses raw 30s data
- Query last 7 days → uses raw 30s data
- Query last 60 days → uses 5m downsampled data
- Query last 6 months → uses 1h downsampled data

Grafana queries spanning 30+ days run 10-50x faster against downsampled data.

## Manual Compaction

Trigger manual compaction for specific blocks:

```bash
kubectl exec -n monitoring thanos-compactor-0 -- \
  thanos compact \
  --data-dir=/tmp/compact \
  --objstore.config-file=/etc/thanos/objstore.yml \
  --wait=false \
  --compact.concurrency=1
```

## Disabling Downsampling for Specific Metrics

Some metrics should not be downsampled (e.g., SLO calculations). Use separate Prometheus instances without Thanos sidecar for these metrics, or configure the Compactor to skip certain blocks.

## Backfilling Downsampled Data

If you enable downsampling on existing data:

```bash
kubectl exec -n monitoring thanos-compactor-0 -- \
  thanos downsample \
  --data-dir=/data \
  --objstore.config-file=/etc/thanos/objstore.yml
```

This creates downsampled blocks for existing data in object storage.

## Resource Requirements

Compactor needs significant memory and CPU:

- **Memory**: 4-8GB base + ~1GB per 100,000 active series
- **CPU**: 2-4 cores for compaction concurrency
- **Disk**: 100GB+ for temporary compaction workspace

Scale resources based on metric cardinality and block size.

Thanos Compactor's downsampling dramatically reduces long-term storage costs while maintaining query performance, making multi-year metric retention economically viable.
