# How to Fix Loki "Entry Out of Order" Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Troubleshooting, Timestamp, Ingestion, Log Ordering, Promtail

Description: A comprehensive guide to diagnosing and resolving Loki "entry out of order" errors, covering timestamp configuration, client ordering, unordered writes, and best practices for reliable log ingestion.

---

The "entry out of order" error in Grafana Loki occurs when logs are pushed with timestamps older than logs already received for the same stream. Loki requires logs within a stream to be ordered by timestamp, and violations cause ingestion failures. This guide explains why this happens and how to fix it.

## Understanding the Error

### Error Messages

```
entry out of order for stream
entry with timestamp older than existing entries
stream rate limit exceeded
```

### How Loki Stream Ordering Works

Loki organizes logs into streams defined by unique label combinations:

```
Stream: {job="app", service="api", instance="pod-1"}
  - Entry 1: timestamp=1000, "log line 1"
  - Entry 2: timestamp=1001, "log line 2"
  - Entry 3: timestamp=1002, "log line 3"

If Entry 4 arrives with timestamp=1000, it is rejected as out of order.
```

### Common Causes

1. **Multiple sources writing to the same stream**: Different instances with clock skew
2. **Client buffering and retries**: Logs buffered and sent out of order
3. **Incorrect timestamp parsing**: Timestamps not extracted properly from logs
4. **Time synchronization issues**: Clocks not synchronized across servers
5. **Log file rotation**: Reading rotated files causes old logs to be re-sent

## Diagnostic Steps

### Check Loki Metrics

```bash
# Check for out-of-order rejections
curl -s http://loki:3100/metrics | grep "loki_distributor_lines_received_total"

# Check stream creation rate
curl -s http://loki:3100/metrics | grep "loki_ingester_streams"

# Check discarded samples
curl -s http://loki:3100/metrics | grep "loki_discarded"
```

### Check Loki Logs

```bash
# Find out-of-order errors
docker logs loki 2>&1 | grep -i "out of order"

# See stream details
docker logs loki 2>&1 | grep -i "stream"
```

### Check Promtail Logs

```bash
# Check for timestamp issues
docker logs promtail 2>&1 | grep -i "timestamp\|order\|skipping"
```

## Solution 1: Enable Unordered Writes

The simplest solution is to enable unordered writes in Loki:

```yaml
# loki-config.yaml
limits_config:
  # Allow out-of-order writes within a window
  unordered_writes: true

ingester:
  # Configure the out-of-order window
  max_chunk_age: 2h

  # Allow entries within this window to be out of order
  wal:
    enabled: true
    dir: /loki/wal
```

### Loki 2.4+ Out-of-Order Configuration

```yaml
# loki-config.yaml (Loki 2.4+)
limits_config:
  # Maximum time window for accepting out-of-order writes
  out_of_order_time_window: 30m
```

This allows entries up to 30 minutes out of order within the same stream.

## Solution 2: Fix Timestamp Extraction

### Promtail Pipeline Stages

```yaml
# promtail-config.yaml
scrape_configs:
  - job_name: application
    static_configs:
      - targets:
          - localhost
        labels:
          job: application
          __path__: /var/log/app/*.log
    pipeline_stages:
      # Extract timestamp from log line
      - regex:
          expression: '^(?P<timestamp>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)'
      - timestamp:
          source: timestamp
          format: RFC3339Nano
          # Action on parse failure
          action_on_failure: fudge  # or skip

      # Alternative: JSON timestamp extraction
      - json:
          expressions:
            ts: timestamp
      - timestamp:
          source: ts
          format: RFC3339Nano
```

### Common Timestamp Formats

```yaml
pipeline_stages:
  # ISO 8601 / RFC3339
  - timestamp:
      source: time
      format: RFC3339

  # RFC3339 with nanoseconds
  - timestamp:
      source: time
      format: RFC3339Nano

  # Unix timestamp (seconds)
  - timestamp:
      source: time
      format: Unix

  # Unix timestamp (milliseconds)
  - timestamp:
      source: time
      format: UnixMs

  # Unix timestamp (nanoseconds)
  - timestamp:
      source: time
      format: UnixNs

  # Custom format
  - timestamp:
      source: time
      format: "2006-01-02 15:04:05.000"

  # Multiple formats (try in order)
  - timestamp:
      source: time
      format: RFC3339
      fallback_formats:
        - "2006-01-02 15:04:05"
        - UnixMs
```

### Action on Timestamp Failure

```yaml
pipeline_stages:
  - timestamp:
      source: time
      format: RFC3339
      # Options:
      # fudge: use last known timestamp + 1 nanosecond
      # skip: drop the log line
      # keep: use current time (default)
      action_on_failure: fudge
```

## Solution 3: Unique Stream Labels

Ensure each log source has unique stream labels:

```yaml
# promtail-config.yaml
scrape_configs:
  - job_name: application
    static_configs:
      - targets:
          - localhost
        labels:
          job: application
          # Add instance-specific label
          instance: ${HOSTNAME}
          __path__: /var/log/app/*.log

    # Or use relabeling
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: pod
      - source_labels: [__meta_kubernetes_pod_ip]
        target_label: instance
```

### Dynamic Labels from Log Content

```yaml
pipeline_stages:
  - json:
      expressions:
        thread_id: thread
        request_id: request_id
  - labels:
      thread_id:
      request_id:
```

This creates unique streams per thread/request, avoiding ordering conflicts.

## Solution 4: Client-Side Ordering

### Promtail Ordering Configuration

```yaml
# promtail-config.yaml
clients:
  - url: http://loki:3100/loki/api/v1/push
    # Batch configuration
    batchwait: 1s
    batchsize: 1048576

    # Backoff configuration for retries
    backoff_config:
      min_period: 500ms
      max_period: 5m
      max_retries: 10

    # Timeout
    timeout: 10s
```

### Fluent Bit Ordering

```ini
# fluent-bit.conf
[OUTPUT]
    Name        loki
    Match       *
    Host        loki
    Port        3100
    # Enable ordering
    line_format json
    # Batch settings
    batch_wait  1
    batch_size  102400
    # Retry settings
    Retry_Limit 5
```

## Solution 5: Handle Multi-Source Streams

### Separate Streams per Source

```yaml
# promtail-config.yaml
scrape_configs:
  - job_name: app-container-1
    static_configs:
      - targets:
          - localhost
        labels:
          job: application
          container: container-1
          __path__: /var/log/containers/app-container-1/*.log

  - job_name: app-container-2
    static_configs:
      - targets:
          - localhost
        labels:
          job: application
          container: container-2
          __path__: /var/log/containers/app-container-2/*.log
```

### Kubernetes Pod Labels

```yaml
# promtail daemonset config
scrape_configs:
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      # Use pod UID for unique streams
      - source_labels: [__meta_kubernetes_pod_uid]
        target_label: pod_uid
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: pod
      - source_labels: [__meta_kubernetes_pod_container_name]
        target_label: container
```

## Solution 6: Time Synchronization

### Check Time Sync Status

```bash
# Check NTP status
timedatectl status

# Check chrony status
chronyc tracking
chronyc sources

# Check ntpd status
ntpq -p
```

### Configure NTP

```bash
# Ubuntu/Debian
apt-get install chrony
systemctl enable chrony
systemctl start chrony

# CentOS/RHEL
yum install chrony
systemctl enable chronyd
systemctl start chronyd
```

### Kubernetes Time Sync

```yaml
# Pod spec with host time
spec:
  containers:
    - name: app
      volumeMounts:
        - name: localtime
          mountPath: /etc/localtime
          readOnly: true
  volumes:
    - name: localtime
      hostPath:
        path: /etc/localtime
```

## Solution 7: Handle Log File Rotation

### Promtail File Rotation Handling

```yaml
# promtail-config.yaml
scrape_configs:
  - job_name: application
    static_configs:
      - targets:
          - localhost
        labels:
          job: application
          __path__: /var/log/app/*.log
    pipeline_stages:
      - timestamp:
          source: time
          format: RFC3339
          # Skip logs older than 1 hour (from rotated files)
          action_on_failure: skip

# Alternative: Use file discovery to handle rotation
positions:
  filename: /var/promtail/positions.yaml
  sync_period: 10s

target_config:
  sync_period: 10s
```

### Reject Old Samples

```yaml
# loki-config.yaml
limits_config:
  # Reject samples older than 1 week
  reject_old_samples: true
  reject_old_samples_max_age: 168h  # 1 week
```

## Monitoring Out-of-Order Errors

### Prometheus Alerts

```yaml
groups:
  - name: loki-ordering
    rules:
      - alert: LokiOutOfOrderEntries
        expr: |
          rate(loki_discarded_samples_total{reason="out_of_order"}[5m]) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Loki is discarding out-of-order entries"
          description: "Rate: {{ $value }}/s"

      - alert: LokiHighTimestampMismatch
        expr: |
          rate(loki_discarded_samples_total{reason="timestamp_too_old"}[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High rate of timestamp rejections"
```

### Dashboard Panel

```json
{
  "title": "Out-of-Order Entries",
  "type": "timeseries",
  "targets": [
    {
      "expr": "rate(loki_discarded_samples_total{reason=\"out_of_order\"}[5m])",
      "legendFormat": "Out of order"
    },
    {
      "expr": "rate(loki_discarded_samples_total{reason=\"timestamp_too_old\"}[5m])",
      "legendFormat": "Timestamp too old"
    }
  ]
}
```

## Best Practices

1. **Enable Out-of-Order Writes**: Use `out_of_order_time_window` for tolerance
2. **Extract Timestamps**: Always parse timestamps from log content
3. **Unique Stream Labels**: Include instance/pod identifiers in labels
4. **Sync Time**: Ensure NTP is configured on all hosts
5. **Handle Rotation**: Configure Promtail to handle log rotation properly
6. **Monitor Rejections**: Alert on out-of-order rejection rates

## Quick Reference

### Minimum Configuration for Out-of-Order Tolerance

```yaml
# loki-config.yaml
limits_config:
  out_of_order_time_window: 30m
  reject_old_samples: true
  reject_old_samples_max_age: 168h
```

### Promtail Timestamp Best Practice

```yaml
# promtail-config.yaml
pipeline_stages:
  - json:
      expressions:
        timestamp: time
  - timestamp:
      source: timestamp
      format: RFC3339
      action_on_failure: fudge
```

## Conclusion

The "entry out of order" error is common when multiple sources write to the same Loki stream or when timestamps are not properly synchronized. By enabling out-of-order writes, properly extracting timestamps, ensuring unique stream labels, and maintaining time synchronization, you can eliminate these errors and achieve reliable log ingestion.

Key takeaways:
- Enable `out_of_order_time_window` for tolerance
- Extract timestamps from log content using pipeline stages
- Use unique labels (instance, pod, container) per log source
- Configure NTP on all hosts
- Handle log file rotation properly
- Monitor and alert on out-of-order rejection rates
