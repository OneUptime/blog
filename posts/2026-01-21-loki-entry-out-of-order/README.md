# How to Fix Loki 'Entry Out of Order' Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Troubleshooting, Timestamp, Ingestion, Log Ordering, Promtail

Description: A comprehensive guide to diagnosing and resolving Loki 'entry out of order' errors, covering timestamp configuration, client ordering, unordered writes, and best practices for reliable log ingestion.

---

The "entry out of order" error in Grafana Loki occurs when logs are pushed with timestamps older than Loki can accept for the same stream. Loki accepts some out-of-order writes by default in current versions, but entries that are too far behind the newest entry in the stream still cause ingestion failures. This guide explains why this happens and how to fix it.

## Understanding the Error

### Error Messages

```text
entry out of order for stream
entry too far behind, entry timestamp is: <timestamp>, oldest acceptable timestamp is: <cutoff>
entry for stream <stream_labels> has timestamp too old: <timestamp>, oldest acceptable timestamp is: <cutoff>
```

### How Loki Stream Ordering Works

Loki organizes logs into streams defined by unique label combinations:

```text
Stream: {job="app", service="api", instance="pod-1"}
  - Entry 1: timestamp=1000, "log line 1"
  - Entry 2: timestamp=1001, "log line 2"
  - Entry 3: timestamp=1002, "log line 3"

If Entry 4 arrives with timestamp=1000, it is rejected as out of order.
```

In Loki 2.4 and later, unordered writes are enabled by default. Entries are still rejected if they are too far behind the newest entry in the stream; by default, the acceptable window is half of `max_chunk_age`.

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

## Solution 1: Configure Unordered Writes

For Loki 2.4 and later, unordered writes are enabled by default. In current Loki versions, the `unordered_writes` setting is deprecated and defaults to `true`, so new configurations usually only need to tune `max_chunk_age` when the default window is too small:

```yaml
# loki-config.yaml
ingester:
  # Configure the chunk age; the accepted out-of-order window is half this value.
  max_chunk_age: 2h
```

### Loki 2.4+ Out-of-Order Window

```yaml
# loki-config.yaml (Loki 2.4+)
ingester:
  # Entries can be up to 30 minutes behind the newest entry in the stream.
  max_chunk_age: 1h
```

This allows entries up to 30 minutes out of order within the same stream because Loki accepts entries newer than `time_of_most_recent_line - (max_chunk_age / 2)`.

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
```

```yaml
# promtail-config.yaml
scrape_configs:
  - job_name: application-json
    static_configs:
      - targets:
          - localhost
        labels:
          job: application
          __path__: /var/log/app/*.json
    pipeline_stages:
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
      # skip: keep the time when Promtail scraped the log entry
      # default: fudge
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
  - labels:
      thread_id:
```

This creates separate streams per thread, avoiding ordering conflicts. Avoid labels with unbounded values such as request IDs or trace IDs; use structured metadata for high-cardinality fields instead.

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
    # Send each record as JSON
    line_format json
    # Keep one flush worker for predictable output behavior
    workers      0
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

Containers use the host kernel clock, so synchronize time on Kubernetes nodes rather than mounting `/etc/localtime` into pods. Mounting `/etc/localtime` only affects timezone data, not clock synchronization.

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
          # On timestamp parse failure, keep the time when Promtail scraped the entry
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
          rate(loki_discarded_samples_total{reason=~"out_of_order|too_far_behind"}[5m]) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Loki is discarding out-of-order entries"
          description: "Rate: {{ $value }}/s"

      - alert: LokiHighTimestampMismatch
        expr: |
          rate(loki_discarded_samples_total{reason="greater_than_max_sample_age"}[5m]) > 10
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
      "expr": "rate(loki_discarded_samples_total{reason=\"too_far_behind\"}[5m])",
      "legendFormat": "Too far behind"
    },
    {
      "expr": "rate(loki_discarded_samples_total{reason=\"greater_than_max_sample_age\"}[5m])",
      "legendFormat": "Timestamp too old"
    }
  ]
}
```

## Best Practices

1. **Enable Out-of-Order Writes**: Keep the default unordered-write behavior and tune `max_chunk_age` only when needed
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
  reject_old_samples: true
  reject_old_samples_max_age: 168h
ingester:
  # Allows entries up to 30 minutes behind the newest entry in the stream
  max_chunk_age: 1h
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
- Keep the default unordered-write behavior and tune `max_chunk_age` for tolerance
- Extract timestamps from log content using pipeline stages
- Use unique labels (instance, pod, container) per log source
- Configure NTP on all hosts
- Handle log file rotation properly
- Monitor and alert on out-of-order rejection rates
