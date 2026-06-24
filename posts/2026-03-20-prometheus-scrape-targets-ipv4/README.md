# How to Configure Prometheus Scrape Targets with IPv4 Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, IPv4, Scrape Targets, Configuration, Monitoring, Metric

Description: Configure Prometheus scrape targets using explicit IPv4 addresses in static_configs, use relabeling to add metadata, and organize targets by job and network segment.

## Introduction

Prometheus scrapes metrics from targets at defined intervals. Each target is an HTTP(S) endpoint identified by host:port. Using explicit IPv4 addresses ensures predictable scraping without DNS dependency and works in environments where DNS resolution may be unreliable.

## Basic Scrape Configuration

```yaml
# /etc/prometheus/prometheus.yml

global:
  scrape_interval: 15s
  scrape_timeout: 10s

scrape_configs:
  # Prometheus self-monitoring
  - job_name: 'prometheus'
    static_configs:
      - targets: ['127.0.0.1:9090']

  # Node exporters by IPv4
  - job_name: 'node_exporter'
    static_configs:
      - targets:
          - '10.0.0.1:9100'
          - '10.0.0.2:9100'
          - '10.0.0.3:9100'
    metrics_path: /metrics

  # MySQL exporters
  - job_name: 'mysql'
    static_configs:
      - targets:
          - '10.0.0.10:9104'
          - '10.0.0.11:9104'
```

## Targets with Metadata Labels

```yaml
scrape_configs:
  - job_name: 'node_exporter'
    static_configs:
      # Production servers with region labels
      - targets: ['10.0.1.1:9100', '10.0.1.2:9100']
        labels:
          env: production
          datacenter: us-east-1
          role: web

      # Staging servers
      - targets: ['10.0.2.1:9100', '10.0.2.2:9100']
        labels:
          env: staging
          datacenter: us-east-1
          role: web

      # Database servers
      - targets: ['10.0.3.1:9100', '10.0.3.2:9100']
        labels:
          env: production
          role: database
```

## Custom Metrics Path and Scheme

```yaml
scrape_configs:
  # HTTPS endpoint
  - job_name: 'app_metrics'
    scheme: https
    tls_config:
      ca_file: /etc/prometheus/ca.crt
    static_configs:
      - targets: ['10.0.0.20:8443']

  # Custom metrics path
  - job_name: 'custom_app'
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets: ['10.0.0.21:8080']

  # With basic auth
  - job_name: 'secured_metrics'
    basic_auth:
      username: prometheus
      password: metricspassword
    static_configs:
      - targets: ['10.0.0.22:9090']
```

## File-Based Service Discovery

```yaml
# For dynamic target lists, use file-based discovery:

scrape_configs:
  - job_name: 'dynamic_nodes'
    file_sd_configs:
      - files:
          - '/etc/prometheus/targets/*.json'
        refresh_interval: 30s
```

`/etc/prometheus/targets/nodes.json`:

```json
[
  {
    "targets": ["10.0.0.1:9100", "10.0.0.2:9100"],
    "labels": { "env": "production", "role": "web" }
  },
  {
    "targets": ["10.0.0.10:9100"],
    "labels": { "env": "production", "role": "database" }
  }
]
```

## Verifying Scrape Targets

```bash
# Check target status
curl -s http://10.0.0.5:9090/api/v1/targets | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for t in data['data']['activeTargets']:
    print(t['scrapeUrl'], t['health'], t.get('lastError',''))
"

# Check a specific scrape pool (job)
curl -s "http://10.0.0.5:9090/api/v1/targets?scrapePool=node_exporter" | python3 -m json.tool
```

## Conclusion

Prometheus scrape targets using `static_configs` specify IPv4 addresses in `host:port` format. Add metadata labels to group targets by environment, role, and datacenter for Grafana dashboard filtering. Use `file_sd_configs` for dynamic target lists that change without Prometheus restart. Monitor target health at `/api/v1/targets` - unhealthy targets show the last scrape error.
