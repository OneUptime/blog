# How to Run Grafana Mimir in Docker for Metrics Storage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Grafana Mimir, Metrics, Prometheus, Monitoring, Observability, DevOps

Description: Deploy Grafana Mimir in Docker as a scalable, long-term Prometheus metrics storage backend with multi-tenancy support.

---

Grafana Mimir is a horizontally scalable, highly available, long-term storage solution for Prometheus metrics. It started as a fork of Cortex and addresses one of the biggest pain points in the Prometheus ecosystem: long-term metrics retention. While Prometheus is excellent at collecting and alerting on metrics, it was not designed to store months or years of data. Mimir fills that gap.

Mimir accepts Prometheus remote write data, stores it on object storage, and makes it queryable through the standard PromQL interface. It supports multi-tenancy, so multiple teams can share a single Mimir cluster with isolated data. Running Mimir in Docker gives you a production-grade metrics backend for development and testing.

## Quick Start

Run Mimir in monolithic mode (all components in a single process):

```bash
# Start Mimir with local filesystem storage
docker run -d \
  --name mimir \
  -p 9009:9009 \
  -v mimir_data:/data \
  grafana/mimir:latest \
  -config.file=/etc/mimir/demo.yaml
```

## Docker Compose Setup

For a practical development environment with Prometheus and Grafana:

```yaml
# docker-compose.yml - Mimir metrics stack
version: "3.8"

services:
  mimir:
    image: grafana/mimir:latest
    command:
      - -config.file=/etc/mimir.yaml
      - -target=all
    ports:
      # Mimir API and Prometheus-compatible endpoints
      - "9009:9009"
    volumes:
      - ./mimir.yaml:/etc/mimir.yaml
      - mimir_data:/data
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yaml:/etc/prometheus/prometheus.yml
    depends_on:
      - mimir

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
      - mimir

volumes:
  mimir_data:
  grafana_data:
```

## Mimir Configuration

Create the Mimir configuration file:

```yaml
# mimir.yaml - Mimir monolithic mode configuration
target: all

# Multi-tenancy settings
multitenancy_enabled: false

# Server configuration
server:
  http_listen_port: 9009
  grpc_listen_port: 9095
  log_level: info

# Ingester configuration - receives and processes incoming metrics
ingester:
  ring:
    instance_addr: 127.0.0.1
    kvstore:
      store: memberlist
    replication_factor: 1

# Distributor receives remote write requests
distributor:
  ring:
    instance_addr: 127.0.0.1
    kvstore:
      store: memberlist

# Compactor merges blocks for efficient querying
compactor:
  data_dir: /data/compactor
  sharding_ring:
    kvstore:
      store: memberlist

# Store gateway reads blocks from storage
store_gateway:
  sharding_ring:
    replication_factor: 1

# Block storage configuration - where metrics are persisted
blocks_storage:
  backend: filesystem
  bucket_store:
    sync_dir: /data/tsdb-sync
  filesystem:
    dir: /data/tsdb
  tsdb:
    dir: /data/tsdb/ingester

# Ruler configuration for alerting rules
ruler:
  rule_path: /data/rules
  alertmanager_url: http://localhost:9093
  ring:
    kvstore:
      store: memberlist

# Limits and retention
limits:
  # Accept up to 100,000 series per tenant
  max_global_series_per_user: 100000
  # Keep metrics for 90 days
  compactor_blocks_retention_period: 90d
  # Allow ingestion of samples up to 1 hour old
  ingestion_rate: 100000
  ingestion_burst_size: 1000000

# Activity tracker
activity_tracker:
  filepath: /data/metrics-activity.log

# Memberlist for cluster coordination
memberlist:
  join_members: []
```

## Prometheus Configuration for Remote Write

Configure Prometheus to send metrics to Mimir:

```yaml
# prometheus.yaml - Prometheus with remote write to Mimir
global:
  scrape_interval: 15s
  evaluation_interval: 15s

# Send all collected metrics to Mimir for long-term storage
remote_write:
  - url: http://mimir:9009/api/v1/push
    # Add a tenant header if multi-tenancy is enabled
    # headers:
    #   X-Scope-OrgID: team-a

# Scrape configurations
scrape_configs:
  # Scrape Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Scrape Mimir metrics
  - job_name: 'mimir'
    static_configs:
      - targets: ['mimir:9009']

  # Scrape Node Exporter for host metrics
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']

  # Scrape Docker containers with Prometheus labels
  - job_name: 'docker'
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
    relabel_configs:
      - source_labels: [__meta_docker_container_label_prometheus_scrape]
        regex: 'true'
        action: keep
```

## Grafana Data Source Configuration

Configure Grafana to query Mimir:

```yaml
# grafana-datasources.yaml - Provision Mimir as a Prometheus data source
apiVersion: 1

datasources:
  - name: Mimir
    type: prometheus
    access: proxy
    url: http://mimir:9009/prometheus
    isDefault: true
    jsonData:
      httpHeaderName1: 'X-Scope-OrgID'
    secureJsonData:
      httpHeaderValue1: 'anonymous'
```

## Full Stack with Exporters

Add common metric exporters for a complete monitoring setup:

```yaml
# docker-compose.yml - Complete monitoring stack with Mimir
version: "3.8"

services:
  mimir:
    image: grafana/mimir:latest
    command: ["-config.file=/etc/mimir.yaml", "-target=all"]
    ports:
      - "9009:9009"
    volumes:
      - ./mimir.yaml:/etc/mimir.yaml
      - mimir_data:/data

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yaml:/etc/prometheus/prometheus.yml
    depends_on:
      - mimir

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      GF_AUTH_ANONYMOUS_ENABLED: "true"
      GF_AUTH_ANONYMOUS_ORG_ROLE: Admin
    volumes:
      - ./grafana-datasources.yaml:/etc/grafana/provisioning/datasources/datasources.yaml

  # Node Exporter for host system metrics
  node-exporter:
    image: prom/node-exporter:latest
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
    command:
      - --path.procfs=/host/proc
      - --path.sysfs=/host/sys

  # cAdvisor for container metrics
  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker:/var/lib/docker:ro

volumes:
  mimir_data:
```

## Multi-Tenancy

Enable multi-tenancy for team isolation:

```yaml
# mimir.yaml - Enable multi-tenancy
multitenancy_enabled: true
```

Each team sends metrics with their tenant ID:

```yaml
# prometheus.yaml - Team A's Prometheus configuration
remote_write:
  - url: http://mimir:9009/api/v1/push
    headers:
      X-Scope-OrgID: team-a
```

Query metrics for a specific tenant:

```bash
# Query metrics for team-a
curl -H "X-Scope-OrgID: team-a" \
  "http://localhost:9009/prometheus/api/v1/query?query=up"

# Query metrics for team-b
curl -H "X-Scope-OrgID: team-b" \
  "http://localhost:9009/prometheus/api/v1/query?query=up"
```

## Querying Mimir Directly

Mimir exposes a Prometheus-compatible query API:

```bash
# Instant query
curl "http://localhost:9009/prometheus/api/v1/query?query=up"

# Range query over the last hour
curl "http://localhost:9009/prometheus/api/v1/query_range?query=rate(http_requests_total[5m])&start=$(date -d '-1 hour' +%s)&end=$(date +%s)&step=60"

# Label values
curl "http://localhost:9009/prometheus/api/v1/label/job/values"

# Series metadata
curl "http://localhost:9009/prometheus/api/v1/series?match[]=up"

# Check Mimir status
curl http://localhost:9009/ready
curl http://localhost:9009/config
```

## Recording Rules and Alerts

Push recording rules to Mimir for pre-computation:

```bash
# Upload alerting and recording rules via the Mimir ruler API
curl -X POST http://localhost:9009/prometheus/config/v1/rules/default \
  -H "Content-Type: application/yaml" \
  -d '
name: app_rules
rules:
  - record: job:http_requests:rate5m
    expr: rate(http_requests_total[5m])

  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is above 5% for the last 5 minutes"
'

# List configured rules
curl http://localhost:9009/prometheus/api/v1/rules
```

## Storage with MinIO

For testing with object storage:

```yaml
# mimir-s3.yaml - Mimir with MinIO storage backend
blocks_storage:
  backend: s3
  s3:
    endpoint: minio:9000
    bucket_name: mimir-data
    access_key_id: minioadmin
    secret_access_key: minioadmin
    insecure: true
  tsdb:
    dir: /data/tsdb/ingester
  bucket_store:
    sync_dir: /data/tsdb-sync

ruler_storage:
  backend: s3
  s3:
    endpoint: minio:9000
    bucket_name: mimir-ruler
    access_key_id: minioadmin
    secret_access_key: minioadmin
    insecure: true
```

## Summary

Grafana Mimir solves the long-term metrics storage problem that many Prometheus users face. It accepts metrics via Prometheus remote write, stores them durably on object storage or local disk, and serves PromQL queries just like Prometheus does. The Docker Compose setup gives you a complete metrics pipeline with Prometheus for collection, Mimir for storage, and Grafana for visualization. Multi-tenancy support makes it suitable for organizations with multiple teams, and the Prometheus-compatible API means your existing dashboards and alerts work without changes. Start with the monolithic mode for development and scale to microservices mode when your production requirements demand it.
