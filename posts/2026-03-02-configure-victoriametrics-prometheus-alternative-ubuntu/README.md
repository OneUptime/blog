# How to Configure VictoriaMetrics as a Prometheus Alternative on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Monitoring, VictoriaMetrics, Prometheus, Metrics

Description: Deploy and configure VictoriaMetrics on Ubuntu as a drop-in Prometheus replacement with better performance, lower resource usage, and long-term metrics storage capabilities.

---

VictoriaMetrics is a time-series database and monitoring solution that is compatible with the Prometheus query language (PromQL) and data model while offering significantly better storage efficiency and query performance. It can act as a drop-in replacement for Prometheus or as long-term storage in a Prometheus federation.

For Ubuntu servers running existing Prometheus-based monitoring, VictoriaMetrics accepts the same scrape configurations, responds to the same HTTP API endpoints, and supports Grafana without changes to existing dashboards.

## Why Consider VictoriaMetrics

Compared to Prometheus, VictoriaMetrics:
- Uses 5-10x less disk space through better compression
- Requires less RAM for the same number of series
- Supports longer retention periods without performance degradation
- Supports MetricsQL (a PromQL superset) with additional functions
- Provides a single binary with no external dependencies

The trade-off is that VictoriaMetrics does not support alerting natively - you still use Prometheus Alertmanager or another tool for alerts, with VictoriaMetrics as the data source.

## Downloading VictoriaMetrics

VictoriaMetrics provides single-node and cluster versions. The single-node version handles most use cases up to millions of metrics per second on a single machine.

```bash
# Set the version to download
VM_VERSION="v1.99.0"

# Download the single-node binary
wget "https://github.com/VictoriaMetrics/VictoriaMetrics/releases/download/${VM_VERSION}/victoria-metrics-linux-amd64-${VM_VERSION}.tar.gz" \
  -O /tmp/victoria-metrics.tar.gz

# Extract
cd /tmp
tar xzf victoria-metrics.tar.gz

# Move the binary to a standard location
sudo mv victoria-metrics-prod /usr/local/bin/victoria-metrics
sudo chmod +x /usr/local/bin/victoria-metrics

# Verify
victoria-metrics --version
```

## Creating the System User and Directories

```bash
# Create a dedicated system user
sudo useradd --system --no-create-home --shell /bin/false victoriametrics

# Create data and configuration directories
sudo mkdir -p /var/lib/victoriametrics
sudo mkdir -p /etc/victoriametrics

# Set permissions
sudo chown victoriametrics:victoriametrics /var/lib/victoriametrics
```

## Creating a Systemd Service

```bash
sudo nano /etc/systemd/system/victoriametrics.service
```

```ini
[Unit]
Description=VictoriaMetrics Time Series Database
After=network.target

[Service]
User=victoriametrics
Group=victoriametrics
Type=simple

# Main binary with configuration flags
ExecStart=/usr/local/bin/victoria-metrics \
  -storageDataPath=/var/lib/victoriametrics \
  -retentionPeriod=12 \
  -httpListenAddr=127.0.0.1:8428 \
  -promscrape.config=/etc/victoriametrics/prometheus.yml \
  -selfScrapeInterval=10s

# Restart on failure
Restart=on-failure
RestartSec=5s

# Security hardening
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ReadWritePaths=/var/lib/victoriametrics
ProtectHome=yes

[Install]
WantedBy=multi-user.target
```

Key flags explained:
- `-storageDataPath` - where metrics are stored on disk
- `-retentionPeriod=12` - keep 12 months of data (default is 1 month)
- `-httpListenAddr=127.0.0.1:8428` - listen on localhost port 8428
- `-promscrape.config` - path to Prometheus-format scrape configuration
- `-selfScrapeInterval=10s` - scrape VictoriaMetrics' own metrics every 10s

## Creating the Scrape Configuration

VictoriaMetrics uses the same scrape configuration format as Prometheus:

```bash
sudo nano /etc/victoriametrics/prometheus.yml
```

```yaml
# VictoriaMetrics scrape configuration
# Compatible with Prometheus configuration format

global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    environment: production
    datacenter: us-east

scrape_configs:
  # Scrape VictoriaMetrics itself
  - job_name: "victoriametrics"
    static_configs:
      - targets: ["localhost:8428"]

  # Node exporter for system metrics
  - job_name: "node"
    static_configs:
      - targets:
          - "localhost:9100"
          - "web01.internal:9100"
          - "db01.internal:9100"
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        regex: "([^:]+).*"
        replacement: "$1"

  # Application metrics
  - job_name: "myapp"
    metrics_path: "/metrics"
    static_configs:
      - targets: ["localhost:8080"]
    metric_relabel_configs:
      # Drop high-cardinality metrics that are not useful
      - source_labels: [__name__]
        regex: "go_gc_.*"
        action: drop
```

## Starting VictoriaMetrics

```bash
sudo systemctl daemon-reload
sudo systemctl enable victoriametrics
sudo systemctl start victoriametrics

# Verify it started
sudo systemctl status victoriametrics

# Check logs
sudo journalctl -u victoriametrics -f
```

Verify it is responding:

```bash
# Check the main UI
curl -s http://localhost:8428/-/healthy

# Check ingested metrics count
curl -s http://localhost:8428/api/v1/status/tsdb | python3 -m json.tool | head -20
```

## Querying VictoriaMetrics

VictoriaMetrics exposes the same HTTP API as Prometheus. Query it directly:

```bash
# Instant query (PromQL compatible)
curl -s "http://localhost:8428/api/v1/query?query=up" | python3 -m json.tool

# Range query
curl -s "http://localhost:8428/api/v1/query_range?query=node_cpu_seconds_total&start=1h&step=60s" | \
  python3 -m json.tool
```

VictoriaMetrics also provides a built-in UI for exploring metrics:

```bash
# Forward the port if accessing remotely
ssh -L 8428:localhost:8428 user@server

# Then open in browser
# http://localhost:8428/
```

## Configuring Grafana to Use VictoriaMetrics

VictoriaMetrics works as a Prometheus data source in Grafana without any changes to existing dashboards:

1. In Grafana, go to Configuration > Data Sources
2. Click "Add data source"
3. Select "Prometheus"
4. Set URL to `http://localhost:8428`
5. Leave authentication empty (or configure if you have set up authentication)
6. Click "Save & Test"

Your existing Grafana dashboards will query VictoriaMetrics just as they queried Prometheus.

## Migrating Data from Prometheus

If migrating from an existing Prometheus installation, use the `vmctl` tool to import historical data:

```bash
# Download vmctl
wget "https://github.com/VictoriaMetrics/VictoriaMetrics/releases/download/${VM_VERSION}/vmutils-linux-amd64-${VM_VERSION}.tar.gz" \
  -O /tmp/vmutils.tar.gz
cd /tmp && tar xzf vmutils.tar.gz
sudo mv vmctl-prod /usr/local/bin/vmctl

# Migrate data from Prometheus
vmctl prometheus \
  --prom-snapshot-dir=/var/lib/prometheus/snapshots/snapshot-name \
  --vm-addr=http://localhost:8428
```

First create a Prometheus snapshot:

```bash
# Create a snapshot via Prometheus API
curl -s -XPOST http://localhost:9090/api/v1/admin/tsdb/snapshot
```

## Remote Write from Prometheus to VictoriaMetrics

If you want to keep Prometheus for scraping but use VictoriaMetrics for long-term storage, configure remote write in Prometheus:

```yaml
# In prometheus.yml
remote_write:
  - url: "http://victoriametrics-server:8428/api/v1/write"
    queue_config:
      capacity: 10000
      max_shards: 10
      min_shards: 1
      max_samples_per_send: 5000
```

## Configuring Authentication

For production, add basic authentication:

```bash
# Generate a bcrypt password hash
htpasswd -nbB admin your_password
# Output: admin:$2y$05$...

# Create auth config
sudo nano /etc/victoriametrics/auth.yml
```

```yaml
users:
  - username: admin
    password: "your_password"
```

Update the systemd service to enable authentication:

```
ExecStart=/usr/local/bin/victoria-metrics \
  ...existing flags... \
  -httpAuth.username=admin \
  -httpAuth.password=your_password
```

## Monitoring VictoriaMetrics Itself

VictoriaMetrics exposes its own metrics at `/metrics`. Key metrics to watch:

```bash
# Check total series count
curl -s "http://localhost:8428/api/v1/query?query=vm_new_timeseries_created_total"

# Check ingestion rate
curl -s "http://localhost:8428/api/v1/query?query=rate(vm_rows_inserted_total[5m])"

# Check disk space usage
curl -s "http://localhost:8428/api/v1/query?query=vm_data_size_bytes"
```

## Summary

VictoriaMetrics provides a high-performance, storage-efficient alternative to Prometheus that accepts the same configuration format and exposes compatible query APIs. Deploying it on Ubuntu involves downloading the binary, creating a systemd service with appropriate flags for retention and storage path, and pointing it at a Prometheus-format scrape configuration. Existing Prometheus scrape configs, Grafana dashboards, and Alertmanager setups continue to work without modification. The most immediate benefit is typically storage reduction - a Prometheus instance using 50GB of disk space will often use under 10GB in VictoriaMetrics with the same data.
