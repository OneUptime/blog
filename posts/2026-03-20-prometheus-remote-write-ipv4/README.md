# How to Set Up Prometheus Remote Write Over IPv4 Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Remote Write, IPv4, Metric, Long-Term Storage, Thanos, VictoriaMetrics

Description: Learn how to configure Prometheus remote write to send metrics to a remote storage backend over IPv4 for long-term metric retention.

---

Prometheus remote write forwards scraped metrics to a remote storage backend in real time. This enables long-term metric storage, global aggregation, and high availability without relying solely on local Prometheus storage.

## Supported Remote Write Backends

- **Thanos Receive** (self-hosted)
- **VictoriaMetrics** (self-hosted)
- **Grafana Mimir** (self-hosted/cloud)
- **Cortex** (self-hosted)
- **Any Prometheus Remote Write compatible endpoint**

## Basic Remote Write Configuration

```yaml
# /etc/prometheus/prometheus.yml

global:
  scrape_interval: 15s
  evaluation_interval: 15s

# --- Remote Write Configuration ---

remote_write:
  - url: "http://10.0.0.30:8428/api/v1/write"
    # Name for this remote write endpoint (appears in metrics)
    name: "victoria-metrics-primary"

    # Retry settings
    queue_config:
      # Number of concurrent goroutines sending data
      max_shards: 200
      # Maximum samples per shard per flush
      max_samples_per_send: 500
      # Buffer capacity per shard
      capacity: 2500
      # How long to batch samples before sending
      batch_send_deadline: 5s
      # Backoff settings for retries
      min_backoff: 30ms
      max_backoff: 5s

    # HTTP timeout for the remote write request
    remote_timeout: 30s

    # Add extra labels to all written metrics
    write_relabel_configs:
      - target_label: cluster
        replacement: "production-cluster-1"

scrape_configs:
  - job_name: 'node_exporter'
    static_configs:
      - targets: ['10.0.0.10:9100', '10.0.0.11:9100']
```

## Multiple Remote Write Endpoints

```yaml
remote_write:
  # Primary storage
  - url: "http://10.0.0.30:8428/api/v1/write"
    name: "primary"

  # Backup storage on a different IPv4 network
  - url: "http://10.1.0.30:8428/api/v1/write"
    name: "backup-dc2"
    # Send only specific metrics to backup to reduce bandwidth
    write_relabel_configs:
      - source_labels: [__name__]
        regex: "(up|node_cpu.*|node_memory.*)"
        action: keep
```

## Remote Write with Authentication

```yaml
remote_write:
  - url: "http://10.0.0.30:8428/api/v1/write"
    basic_auth:
      username: prometheus
      password: secret123
    # Or use an authorization header with a bearer token
    # authorization:
    #   type: Bearer
    #   credentials: "eyJhbGci..."
    # Or TLS client certificate
    # tls_config:
    #   cert_file: /etc/prometheus/client.crt
    #   key_file: /etc/prometheus/client.key
```

## VictoriaMetrics Single-Node Setup (Receiver)

```bash
# Run VictoriaMetrics on 10.0.0.30
docker run -d \
  -p 10.0.0.30:8428:8428 \
  -v /data/victoria-metrics:/victoria-metrics-data \
  victoriametrics/victoria-metrics:latest \
  -storageDataPath=/victoria-metrics-data \
  -retentionPeriod=12   # 12 months retention
```

## Monitoring Remote Write Health

```yaml
# Key metrics to watch in Prometheus itself:
# prometheus_remote_storage_samples_total - Total samples sent
# prometheus_remote_storage_samples_failed_total - Non-recoverable failed samples
# prometheus_remote_storage_samples_pending - Backlog of unsent samples
# prometheus_remote_storage_queue_highest_sent_timestamp_seconds - Latest timestamp successfully sent
```

```promql
# Query: Remote write failure rate
rate(prometheus_remote_storage_samples_failed_total[5m])

# Query: Remote write queue backlog
prometheus_remote_storage_samples_pending
```

## Key Takeaways

- `remote_write.url` accepts a full HTTP or HTTPS URL, including an IPv4 host if needed.
- `queue_config.max_shards` controls parallelism and should be tuned carefully - default values are often sufficient.
- Use `write_relabel_configs` to filter which metrics are forwarded to each remote endpoint.
- Monitor `prometheus_remote_storage_samples_pending` to detect backlog buildup.
