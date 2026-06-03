# How to Use Thanos Compactor to Downsample Historical Kubernetes Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Thanos, Compactor, Downsampling, Storage Optimization, Kubernetes

Description: Learn how to configure Thanos Compactor to automatically downsample historical Kubernetes metrics for reduced storage costs while maintaining query performance.

---

Storing years of Kubernetes metrics at full resolution consumes massive storage and slows historical queries. Thanos Compactor automatically downsamples old metrics to lower resolutions (5m, 1h), which keeps long-range queries fast and can reduce storage when older raw blocks are expired by retention policies.

This guide covers deploying and configuring the Compactor for production downsampling.

## Understanding Downsampling

Downsampling reduces metric resolution for older blocks. Fresh data stays at full resolution (typically 30s). Thanos creates 5-minute downsampled blocks once raw blocks are older than 40 hours, and creates 1-hour downsampled blocks once 5-minute blocks are older than 10 days. Retention settings then decide how long each resolution is kept.

For example, CPU usage recorded every 30 seconds:

- **0-30 days**: 30s resolution (2,880 samples/day)
- **30-90 days**: 5m resolution (288 samples/day) - 90% reduction
- **90+ days**: 1h resolution (24 samples/day) - 99% reduction

Queries can use downsampled resolutions automatically when Thanos Query is configured with `--query.auto-downsampling`, or when clients set the `max_source_resolution` query parameter.

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
          - --retention.resolution-raw=30d     # Keep raw resolution for 30 days
          - --retention.resolution-5m=90d      # Keep 5m resolution for 90 days
          - --retention.resolution-1h=365d     # Keep 1h resolution for 1 year
          # Downsampling is enabled by default; add --downsampling.disable only to turn it off
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
  # Raw-resolution data for 30 days
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

Compactor creates downsampled blocks as aggregate chunks. Each downsampled chunk stores multiple views of the samples in the window:

- **Raw**: A representative raw sample
- **Count and sum**: Used to calculate averages over the window
- **Min and max**: Preserve the range of values in the window
- **Counter**: Preserves counter-like behavior for counter functions

For example, 10 samples at 30s resolution fit into one 5-minute downsampling window. A simple average for that window would be:

Original (30s):
```text
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
```text
metric_value 13.1
```

## Monitoring Compactor Progress

Track compaction and downsampling:

```promql
# Blocks compacted

thanos_compact_group_compactions_total

# Downsampling duration
histogram_quantile(0.95, rate(thanos_compact_downsample_duration_seconds_bucket[1h]))

# Successful iterations in the last 2 hours
increase(thanos_compact_iterations_total[2h])

# Compactor iterations
rate(thanos_compact_iterations_total[5m])

# Block cleanup operations
thanos_compact_block_cleanup_loops_total

# Downsampling backlog
thanos_compact_todo_downsample_blocks
```

## Configuring Compaction Intervals

Control how often compaction runs:

```yaml
args:
  # Fetch one block at a time during compaction
  - --compact.blocks-fetch-concurrency=1
  - --compact.cleanup-interval=5m
  # Wait between compaction cycles
  - --wait
  - --wait-interval=3m
```

The `--wait` flag makes Compactor run continuously. Remove it for one-time compaction.

## Storage Optimization Calculations

Calculate rough sample-count savings from downsampling and retention:

```text
Original storage (30s for 1 year):
- 1,051,200 samples per metric per year
- 100,000 metrics
- ~8 bytes per sample
= 840 GB per year

With raw retention at 30 days and lower-resolution retention after that:
- 30 days at 30s: 86,400 samples
- 60 days at 5m: 17,280 samples
- 275 days at 1h: 6,600 samples
= 110,280 samples per metric per year
= ~88 GB total for 100,000 metrics before TSDB/index overhead

Sample-count reduction: about 89% compared with retaining raw samples for the full year
```

## Handling Compaction Failures

Compactor can fail for several reasons. Configure retries and monitoring:

```yaml
args:
  # Keep compaction concurrency conservative while investigating failures
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
  # Use penalty-based deduplication for HA Prometheus replicas
  - --deduplication.func=penalty
```

This can reduce storage by merging duplicate data from HA Prometheus setups. The merge is irreversible, so test it carefully and back up data before enabling it.

## Compaction Grouping

Blocks are grouped by external labels for compaction:

```yaml
global:
  external_labels:
    cluster: production-us-east
    prometheus: monitoring/main
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
        increase(thanos_compact_iterations_total[2h]) == 0
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
        histogram_quantile(0.95, rate(thanos_compact_downsample_duration_seconds_bucket[1h])) > 3600
      labels:
        severity: warning
      annotations:
        summary: "Downsampling taking too long"
        description: "95th percentile downsampling duration is {{ $value }}s"

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
# Check block metadata
kubectl exec -n monitoring thanos-compactor-0 -- \
  thanos tools bucket inspect \
  --objstore.config-file=/etc/thanos/objstore.yml
```

Downsampled blocks are still stored under ULID block directories. Use the bucket inspect output or each block's `meta.json` to check the resolution.

## Query Performance with Downsampling

Queries can select downsampled data when `--query.auto-downsampling` is enabled or when the client sets `max_source_resolution`:

- `max_source_resolution=0` uses only raw data
- `max_source_resolution=5m` can use raw or 5-minute downsampled data
- `max_source_resolution=1h` can use raw, 5-minute, or 1-hour downsampled data
- `max_source_resolution=auto` lets Thanos choose based on the query

Grafana queries spanning long time ranges can run significantly faster against downsampled data.

## Manual Compaction

Run a one-time compaction pass:

```bash
kubectl exec -n monitoring thanos-compactor-0 -- \
  thanos compact \
  --data-dir=/tmp/compact \
  --objstore.config-file=/etc/thanos/objstore.yml \
  --compact.concurrency=1
```

## Disabling Downsampling for Specific Metrics

Some metrics should not be queried from downsampled data (e.g., SLO calculations). Use raw data for those queries by setting `max_source_resolution=0`, keep raw retention long enough for the SLO window, or send those metrics to separate blocks that can be selected or excluded with Compactor selector relabeling.

## Backfilling Downsampled Data

If you enable downsampling on existing data, the Compactor will create downsampled blocks during its normal cycles. You can also run the downsampling service directly:

```bash
kubectl exec -n monitoring thanos-compactor-0 -- \
  thanos tools bucket downsample \
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

Thanos Compactor's downsampling keeps long-range queries fast and, when paired with retention policies for raw data, can reduce long-term storage costs enough to make multi-year metric retention economically viable.
