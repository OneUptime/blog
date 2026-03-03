# How to Configure VictoriaMetrics on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Monitoring, VictoriaMetrics, Time-Series, Prometheus

Description: Learn how to install and configure VictoriaMetrics as a high-performance time-series database on Ubuntu for storing and querying Prometheus metrics at scale.

---

VictoriaMetrics is a fast, cost-effective time-series database that is compatible with the Prometheus query language (MetricsQL/PromQL) while offering significantly better compression and query performance at scale. It can act as a drop-in replacement for Prometheus storage, a long-term storage backend, or a standalone metrics platform. If your Prometheus TSDB is consuming too much disk space or your queries are slow, VictoriaMetrics typically solves both problems.

## Why VictoriaMetrics over Prometheus

- **Compression ratio** - typically 5-10x better than Prometheus TSDB
- **Ingestion speed** - handles millions of data points per second on modest hardware
- **PromQL compatibility** - most Grafana dashboards work unchanged
- **Simple operation** - single binary, no complex cluster setup required for moderate scale
- **Remote write** - accepts data from existing Prometheus scrapers

## Installing VictoriaMetrics (Single Node)

```bash
# Download the latest binary
VERSION="v1.96.0"
curl -Lo /tmp/victoria-metrics.tar.gz \
    https://github.com/VictoriaMetrics/VictoriaMetrics/releases/download/${VERSION}/victoria-metrics-linux-amd64-${VERSION}.tar.gz

# Extract and install
sudo tar xzf /tmp/victoria-metrics.tar.gz -C /usr/local/bin/
sudo chmod +x /usr/local/bin/victoria-metrics-prod

# Create alias for cleaner commands
sudo ln -sf /usr/local/bin/victoria-metrics-prod /usr/local/bin/victoria-metrics

# Verify installation
victoria-metrics --version
```

## Creating the Service User and Directories

```bash
# Create dedicated service user
sudo useradd --system --no-create-home --shell /usr/sbin/nologin victoria-metrics

# Create data directory
sudo mkdir -p /var/lib/victoria-metrics
sudo chown victoria-metrics:victoria-metrics /var/lib/victoria-metrics

# Create log directory
sudo mkdir -p /var/log/victoria-metrics
sudo chown victoria-metrics:victoria-metrics /var/log/victoria-metrics
```

## Creating the Systemd Service

```bash
sudo nano /etc/systemd/system/victoria-metrics.service
```

```ini
[Unit]
Description=VictoriaMetrics Time Series Database
After=network.target

[Service]
Type=simple
User=victoria-metrics
Group=victoria-metrics

ExecStart=/usr/local/bin/victoria-metrics \
    -storageDataPath=/var/lib/victoria-metrics \
    -retentionPeriod=12 \
    -httpListenAddr=:8428 \
    -loggerLevel=INFO \
    -loggerOutput=/var/log/victoria-metrics/victoria-metrics.log \
    -selfScrapeInterval=10s \
    -maxLabelsPerTimeseries=50 \
    -search.maxQueryDuration=60s \
    -search.maxConcurrentRequests=16

Restart=always
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable victoria-metrics
sudo systemctl start victoria-metrics

# Verify it's running
sudo systemctl status victoria-metrics
curl http://localhost:8428/metrics | head -20
```

## Key Configuration Parameters

Understanding the important flags:

```bash
# Storage and retention
-storageDataPath=/var/lib/victoria-metrics  # Where data is stored
-retentionPeriod=12                          # Keep 12 months of data (default: 1 month)

# Performance tuning
-memory.allowedPercent=60      # Use up to 60% of available RAM for caching
-search.maxQueryDuration=60s   # Kill queries longer than 60 seconds
-search.maxConcurrentRequests=32  # Max simultaneous queries

# Ingestion limits
-maxLabelsPerTimeseries=50     # Reject series with too many labels (cardinality protection)
-maxScrapeSize=16MB            # Max scrape response size
```

## Configuring Prometheus to Use VictoriaMetrics

Add remote_write to your existing Prometheus configuration:

```yaml
# /etc/prometheus/prometheus.yml

global:
  scrape_interval: 15s

# Send data to VictoriaMetrics via remote write
remote_write:
  - url: http://victoria-metrics-host:8428/api/v1/write
    queue_config:
      # Tune for your scrape volume
      max_samples_per_send: 10000
      capacity: 50000
      max_shards: 30

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
```

Restart Prometheus to apply:

```bash
sudo systemctl restart prometheus
```

Verify data is arriving in VictoriaMetrics:

```bash
# Query VictoriaMetrics directly
curl 'http://localhost:8428/api/v1/query?query=up'
```

## Querying VictoriaMetrics

VictoriaMetrics exposes a Prometheus-compatible API:

```bash
# Instant query
curl 'http://localhost:8428/api/v1/query?query=up&time=2026-03-02T00:00:00Z'

# Range query
curl 'http://localhost:8428/api/v1/query_range?query=rate(http_requests_total[5m])&start=2026-03-01T00:00:00Z&end=2026-03-02T00:00:00Z&step=60'

# Label values
curl 'http://localhost:8428/api/v1/label/job/values'

# Series count
curl 'http://localhost:8428/api/v1/series/count'
```

## Grafana Integration

Configure Grafana to use VictoriaMetrics as a Prometheus data source:

1. Go to **Connections** > **Data Sources** > **Add data source**
2. Select **Prometheus**
3. Set the URL to `http://victoria-metrics-host:8428`
4. Save and test

All existing Prometheus/PromQL dashboards work without modification.

## VictoriaMetrics Extended Features

VictoriaMetrics adds MetricsQL extensions to PromQL:

```text
# Rate without looking-back window issues
rate(http_requests_total[5m])

# Moving average over last hour
avg_over_time(cpu_usage[1h])

# Quantiles across all instances
quantile(0.99, rate(request_duration_seconds_sum[5m]) / rate(request_duration_seconds_count[5m]))

# Label manipulation
alias(up{job="prometheus"}, "prometheus_up")
```

## Monitoring VictoriaMetrics Itself

VictoriaMetrics exposes its own metrics at `/metrics`:

```bash
# Create a Prometheus scrape config for self-monitoring
cat >> /etc/prometheus/prometheus.yml << 'EOF'
  - job_name: 'victoria-metrics'
    static_configs:
      - targets: ['victoria-metrics-host:8428']
EOF
```

Key self-metrics to watch:

```text
vm_rows_ingested_total          # Total rows ingested
vm_cache_size_bytes             # Cache memory usage
vm_queries_total                # Total queries processed
vm_slow_queries_total           # Queries exceeding the duration limit
vm_data_size_bytes              # Total on-disk data size
```

## Tuning for High Ingest Volume

For environments ingesting millions of time series:

```bash
# Add to the systemd service ExecStart flags
-memory.allowedPercent=70          # Allow more RAM for caching
-search.maxConcurrentRequests=64   # More parallel queries
-inmemoryDataFlushInterval=5s      # Flush in-memory data more often
-smallMergeConcurrency=2           # Parallel small merge operations
-bigMergeConcurrency=1             # Serial big merge (avoids I/O saturation)
```

For high write throughput, use faster storage:

```bash
# Check current disk write performance
sudo fio --name=write-test --ioengine=libaio --iodepth=32 \
    --rw=write --bs=4k --direct=1 --size=4G \
    --directory=/var/lib/victoria-metrics --filename=test.fio

# SSDs should show > 100 MB/s sequential write for good VictoriaMetrics performance
```

VictoriaMetrics is an excellent choice for teams that have outgrown Prometheus's storage efficiency but don't want the operational complexity of Thanos or Cortex. The single-binary deployment keeps things simple while providing the compression and query performance needed for large-scale monitoring.
