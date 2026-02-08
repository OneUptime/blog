# How to Run Victoria Metrics in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, VictoriaMetrics, Prometheus, Monitoring, Metrics, Time Series, DevOps

Description: Deploy VictoriaMetrics in Docker as a fast, cost-effective Prometheus-compatible time-series database for metrics storage and querying.

---

VictoriaMetrics is a high-performance time-series database that serves as a long-term storage backend for Prometheus metrics. It is fully compatible with the Prometheus ecosystem, which means Prometheus can remote-write to it, Grafana can query it, and existing PromQL dashboards work without modification. What sets VictoriaMetrics apart is its compression efficiency and query performance - it typically uses 7-10x less disk space than Prometheus and queries faster too.

VictoriaMetrics comes in two flavors: a single-node version that handles most workloads with ease, and a cluster version for horizontal scaling. The single-node version is a single binary that stores and queries metrics, making it one of the simplest monitoring backends to deploy.

## Quick Start

Run VictoriaMetrics single-node with Docker:

```bash
# Start VictoriaMetrics with 30-day retention
docker run -d \
  --name victoriametrics \
  -p 8428:8428 \
  -v vm_data:/storage \
  victoriametrics/victoria-metrics:latest \
  -storageDataPath=/storage \
  -retentionPeriod=30d
```

Port 8428 serves the HTTP API for both ingestion and querying. Verify it is running:

```bash
# Check the health endpoint
curl http://localhost:8428/health

# View active time series count
curl http://localhost:8428/api/v1/status/tsdb
```

## Docker Compose Setup

A complete monitoring stack with Prometheus, VictoriaMetrics, and Grafana:

```yaml
# docker-compose.yml - VictoriaMetrics monitoring stack
version: "3.8"

services:
  victoriametrics:
    image: victoriametrics/victoria-metrics:latest
    ports:
      # HTTP API for queries and ingestion
      - "8428:8428"
    volumes:
      - vm_data:/storage
    command:
      - -storageDataPath=/storage
      # Keep metrics for 90 days
      - -retentionPeriod=90d
      # Enable deduplication for HA Prometheus setups
      - -dedup.minScrapeInterval=15s
      # Allow accepting Prometheus remote write
      - -httpListenAddr=:8428
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yaml:/etc/prometheus/prometheus.yml
    depends_on:
      - victoriametrics

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      GF_AUTH_ANONYMOUS_ENABLED: "true"
      GF_AUTH_ANONYMOUS_ORG_ROLE: Admin
    volumes:
      - ./grafana-datasources.yaml:/etc/grafana/provisioning/datasources/datasources.yaml
      - grafana_data:/var/lib/grafana
    depends_on:
      - victoriametrics

volumes:
  vm_data:
  grafana_data:
```

## Prometheus Configuration

Configure Prometheus to send metrics to VictoriaMetrics:

```yaml
# prometheus.yaml - Prometheus with VictoriaMetrics remote write
global:
  scrape_interval: 15s
  evaluation_interval: 15s

# Remote write to VictoriaMetrics for long-term storage
remote_write:
  - url: http://victoriametrics:8428/api/v1/write
    queue_config:
      max_samples_per_send: 10000
      capacity: 20000
      max_shards: 30

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'victoriametrics'
    static_configs:
      - targets: ['victoriametrics:8428']

  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
```

## Grafana Data Source Configuration

Point Grafana at VictoriaMetrics using the Prometheus data source type:

```yaml
# grafana-datasources.yaml - Configure VictoriaMetrics as a data source
apiVersion: 1

datasources:
  - name: VictoriaMetrics
    type: prometheus
    access: proxy
    url: http://victoriametrics:8428
    isDefault: true
```

VictoriaMetrics supports PromQL natively, so any existing Prometheus dashboard works without changes.

## Direct Metric Ingestion

VictoriaMetrics accepts metrics in multiple formats, not just Prometheus remote write:

```bash
# Import metrics in Prometheus exposition format
curl -d 'http_requests_total{method="GET", endpoint="/api/users"} 1500' \
  http://localhost:8428/api/v1/import/prometheus

# Import metrics in JSON line format
curl -X POST http://localhost:8428/api/v1/import \
  -d '{"metric":{"__name__":"temperature","location":"office","floor":"3"},"values":[22.5],"timestamps":[1705312200]}'

# Import InfluxDB line protocol
curl -d 'cpu_usage,host=server1,region=us-east value=78.5 1705312200000000000' \
  http://localhost:8428/write
```

## Using vmagent for Metric Collection

vmagent is VictoriaMetrics' lightweight metrics collector. It can replace Prometheus for scraping and is more resource-efficient:

```yaml
# docker-compose.yml - VictoriaMetrics with vmagent
version: "3.8"

services:
  victoriametrics:
    image: victoriametrics/victoria-metrics:latest
    ports:
      - "8428:8428"
    volumes:
      - vm_data:/storage
    command:
      - -storageDataPath=/storage
      - -retentionPeriod=90d

  vmagent:
    image: victoriametrics/vmagent:latest
    ports:
      - "8429:8429"
    volumes:
      - ./vmagent.yaml:/etc/prometheus/prometheus.yml
      - vmagent_data:/vmagentdata
    command:
      - -promscrape.config=/etc/prometheus/prometheus.yml
      - -remoteWrite.url=http://victoriametrics:8428/api/v1/write
      # Buffer data locally if VictoriaMetrics is temporarily unavailable
      - -remoteWrite.tmpDataPath=/vmagentdata
    depends_on:
      - victoriametrics

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      GF_AUTH_ANONYMOUS_ENABLED: "true"
      GF_AUTH_ANONYMOUS_ORG_ROLE: Admin
    volumes:
      - ./grafana-datasources.yaml:/etc/grafana/provisioning/datasources/datasources.yaml

volumes:
  vm_data:
  vmagent_data:
```

```yaml
# vmagent.yaml - vmagent scrape configuration
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'victoriametrics'
    static_configs:
      - targets: ['victoriametrics:8428']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']
```

## Querying Metrics

VictoriaMetrics supports standard PromQL plus its own MetricsQL extension:

```bash
# Instant query - current value of a metric
curl "http://localhost:8428/api/v1/query?query=up"

# Range query - values over the last hour
curl "http://localhost:8428/api/v1/query_range?query=rate(http_requests_total[5m])&start=-1h&step=60s"

# MetricsQL extensions - rollup functions
# Get the 95th percentile of request duration over a range
curl "http://localhost:8428/api/v1/query?query=histogram_quantile(0.95,sum(rate(http_request_duration_seconds_bucket[5m]))by(le))"

# Find top 10 metrics by series count
curl "http://localhost:8428/api/v1/status/tsdb"

# List all metric names
curl "http://localhost:8428/api/v1/label/__name__/values"

# Export raw data for a specific metric
curl "http://localhost:8428/api/v1/export?match[]=process_cpu_seconds_total&start=-1h"
```

## VictoriaMetrics with Alerting (vmalert)

vmalert evaluates alerting and recording rules against VictoriaMetrics:

```yaml
# docker-compose.yml - Add alerting with vmalert
services:
  vmalert:
    image: victoriametrics/vmalert:latest
    ports:
      - "8880:8880"
    volumes:
      - ./alerts.yaml:/etc/alerts/alerts.yaml
    command:
      # Query VictoriaMetrics for alert evaluation
      - -datasource.url=http://victoriametrics:8428
      # Send alerts to Alertmanager
      - -notifier.url=http://alertmanager:9093
      # Write recording rule results back to VictoriaMetrics
      - -remoteWrite.url=http://victoriametrics:8428
      - -rule=/etc/alerts/*.yaml
      - -evaluationInterval=15s
    depends_on:
      - victoriametrics

  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yaml:/etc/alertmanager/alertmanager.yml
```

Define alerting rules:

```yaml
# alerts.yaml - Alerting and recording rules
groups:
  - name: system_alerts
    interval: 15s
    rules:
      # Alert when a target is down
      - alert: TargetDown
        expr: up == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Target {{ $labels.instance }} is down"
          description: "{{ $labels.job }} target {{ $labels.instance }} has been down for more than 2 minutes"

      # Alert on high CPU usage
      - alert: HighCPU
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU on {{ $labels.instance }}"

      # Recording rule for pre-computed metrics
      - record: job:node_cpu:avg_usage
        expr: 100 - (avg by(job) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

## Backup and Restore

VictoriaMetrics provides built-in backup tools:

```bash
# Create a backup using vmbackup
docker run --rm \
  -v vm_data:/storage:ro \
  -v $(pwd)/backups:/backup \
  victoriametrics/vmbackup:latest \
  -storageDataPath=/storage \
  -snapshot.createURL=http://victoriametrics:8428/snapshot/create \
  -dst=fs:///backup/$(date +%Y%m%d)

# Restore from backup
docker run --rm \
  -v vm_restore_data:/storage \
  -v $(pwd)/backups:/backup:ro \
  victoriametrics/vmrestore:latest \
  -src=fs:///backup/20240115 \
  -storageDataPath=/storage
```

## Performance Tuning

```yaml
# Optimized VictoriaMetrics command flags for production
command:
  - -storageDataPath=/storage
  - -retentionPeriod=90d
  # Allocate more memory for caching frequently accessed data
  - -memory.allowedPercent=80
  # Search cache size (speeds up repeated queries)
  - -search.maxUniqueTimeseries=1000000
  # Merge concurrency for background operations
  - -bigMergeConcurrency=2
  - -smallMergeConcurrency=4
  # Max query duration
  - -search.maxQueryDuration=60s
```

## Summary

VictoriaMetrics is one of the best options for long-term Prometheus metrics storage. Its compression efficiency means you store more data in less space, its query performance handles large-scale dashboards without lag, and its drop-in Prometheus compatibility means existing tooling works immediately. The single-node version handles surprising volumes of data - often millions of active time series on a single machine. Combined with vmagent for collection and vmalert for alerting, VictoriaMetrics provides a complete monitoring backend that is simpler to operate and more resource-efficient than comparable solutions. The Docker Compose setup in this guide gives you a production-ready monitoring stack in minutes.
