# How to Run Prometheus in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Prometheus, Monitoring, Metric, Alerting

Description: Learn how to run Prometheus in a Podman container with custom scrape targets, persistent metrics storage, and alerting rules.

---

> Prometheus in Podman gives you a powerful metrics collection and alerting platform in a rootless container with persistent time-series storage.

Prometheus is the leading open-source monitoring and alerting toolkit, designed for reliability and scalability. It collects metrics from configured targets at given intervals, evaluates rule expressions, and can trigger alerts. Running Prometheus in a Podman container isolates the monitoring stack, makes configuration portable, and simplifies upgrades. This guide covers setup, custom scrape configurations, persistent storage, and alerting rules.

---

## Pulling the Prometheus Image

Download the official Prometheus image.

```bash
# Pull the latest Prometheus image

podman pull docker.io/prom/prometheus:latest

# Verify the image
podman images | grep prometheus
```

## Running a Basic Prometheus Container

Start Prometheus with the default configuration.

```bash
# Run Prometheus in detached mode on port 9090
podman run -d \
  --name my-prometheus \
  -p 9090:9090 \
  prom/prometheus:latest

# Check the container is running
podman ps

# Verify Prometheus is up
curl -s http://localhost:9090/-/healthy
```

## Custom Scrape Configuration

Mount a custom prometheus.yml to define scrape targets.

```bash
# Create a config directory
mkdir -p ~/prometheus-config

# Write a custom Prometheus configuration
cat > ~/prometheus-config/prometheus.yml <<'EOF'
# Global settings
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  scrape_timeout: 10s

# Scrape configurations
scrape_configs:
  # Prometheus monitors itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Scrape Node Exporter for system metrics
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['host.containers.internal:9100']

  # Scrape a custom application
  - job_name: 'my-app'
    metrics_path: '/metrics'
    scrape_interval: 10s
    static_configs:
      - targets: ['host.containers.internal:8080']
        labels:
          environment: 'development'
          team: 'backend'
EOF

# Run Prometheus with the custom configuration
podman run -d \
  --name prometheus-custom \
  -p 9091:9090 \
  -v ~/prometheus-config/prometheus.yml:/etc/prometheus/prometheus.yml:Z \
  prom/prometheus:latest

# Verify the config was loaded
curl -s http://localhost:9091/api/v1/targets | python3 -m json.tool | head -20
```

## Persistent Metrics Storage

Use a named volume to persist your time-series data.

```bash
# Create a volume for Prometheus data
podman volume create prometheus-data

# Add retention settings to the Prometheus configuration
cat >> ~/prometheus-config/prometheus.yml <<'EOF'

# Storage retention settings
storage:
  tsdb:
    retention:
      time: 30d
      size: 10GB
EOF

# Run Prometheus with persistent storage and retention settings
podman run -d \
  --name prometheus-persistent \
  -p 9092:9090 \
  -v ~/prometheus-config/prometheus.yml:/etc/prometheus/prometheus.yml:Z \
  -v prometheus-data:/prometheus:Z \
  prom/prometheus:latest \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/prometheus \
  --web.console.libraries=/usr/share/prometheus/console_libraries \
  --web.console.templates=/usr/share/prometheus/consoles

# Verify the storage settings
curl -s http://localhost:9092/api/v1/status/config | python3 -m json.tool | head -40
```

## Adding Alerting Rules

Configure Prometheus alerting rules to detect issues.

```bash
# Create an alerting rules file
cat > ~/prometheus-config/alert-rules.yml <<'EOF'
groups:
  - name: instance-health
    rules:
      # Alert if a target is down for more than 1 minute
      - alert: InstanceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Instance {{ $labels.instance }} is down"
          description: "{{ $labels.instance }} of job {{ $labels.job }} has been down for more than 1 minute."

      # Alert if CPU usage is above 80% for 5 minutes
      - alert: HighCpuUsage
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
EOF

# Update prometheus.yml to include the rules file
cat > ~/prometheus-config/prometheus.yml <<'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

# Reference the alerting rules file
rule_files:
  - /etc/prometheus/alert-rules.yml

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
EOF

# Run Prometheus with alerting rules
podman stop prometheus-persistent

podman run -d \
  --name prometheus-alerts \
  -p 9093:9090 \
  -v ~/prometheus-config/prometheus.yml:/etc/prometheus/prometheus.yml:Z \
  -v ~/prometheus-config/alert-rules.yml:/etc/prometheus/alert-rules.yml:Z \
  -v prometheus-data:/prometheus:Z \
  prom/prometheus:latest

# Check the rules were loaded
curl -s http://localhost:9093/api/v1/rules | python3 -m json.tool | head -20
```

## Querying Prometheus

Use PromQL to query your metrics.

```bash
# Query the up metric to see which targets are healthy
curl -s 'http://localhost:9090/api/v1/query?query=up' | python3 -m json.tool

# Query Prometheus's own metrics
curl -s 'http://localhost:9090/api/v1/query?query=prometheus_tsdb_head_series' | python3 -m json.tool

# Range query for the last hour
curl -s 'http://localhost:9090/api/v1/query_range?query=up&start='$(date -d '1 hour ago' +%s)'&end='$(date +%s)'&step=60' | python3 -m json.tool | head -30

# List all available metric names
curl -s 'http://localhost:9090/api/v1/label/__name__/values' | python3 -m json.tool | head -20
```

## Managing the Container

Common management operations.

```bash
# View Prometheus logs
podman logs my-prometheus

# Reload configuration without restarting
podman kill --signal SIGHUP my-prometheus

# Stop and start
podman stop my-prometheus
podman start my-prometheus

# Remove containers and volumes
podman rm -f my-prometheus prometheus-custom prometheus-persistent prometheus-alerts
podman volume rm prometheus-data
```

## Summary

Running Prometheus in a Podman container provides a self-contained metrics platform that is portable and easy to manage. Custom scrape configurations define what targets to monitor, named volumes persist your time-series data with configurable retention policies, and alerting rules let you detect problems automatically. The PromQL API enables programmatic access to your metrics for dashboards and integrations. Podman's rootless execution adds security isolation to your monitoring infrastructure.
