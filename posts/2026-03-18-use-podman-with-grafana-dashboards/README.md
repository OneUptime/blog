# How to Use Podman with Grafana for Dashboards

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Grafana, Dashboard, Monitoring, Visualization

Description: Learn how to deploy Grafana in Podman containers to create rich monitoring dashboards for your containerized applications and infrastructure.

---

> Grafana running in Podman containers transforms raw metrics into actionable dashboards, giving you visual insight into the health and performance of your containerized infrastructure.

Grafana is the leading open-source platform for monitoring visualization. It connects to data sources like Prometheus, Loki, and InfluxDB to create interactive dashboards that display metrics, logs, and traces in a unified interface. Running Grafana in a Podman container makes deployment simple and consistent, while connecting it to other containerized monitoring tools creates a complete observability stack.

---

## Deploying Grafana with Podman

Start a basic Grafana instance:

```bash
podman volume create grafana-data

podman run -d \
  --name grafana \
  --restart always \
  -p 3000:3000 \
  -v grafana-data:/var/lib/grafana:Z \
  -e GF_SECURITY_ADMIN_USER=admin \
  -e GF_SECURITY_ADMIN_PASSWORD=admin \
  grafana/grafana:latest
```

Access Grafana at `http://localhost:3000` and log in with the credentials you set.

## Full Monitoring Stack

Deploy Grafana alongside Prometheus and host monitoring tools:

```yaml
# monitoring-stack.yml

version: "3"
services:
  prometheus:
    image: prom/prometheus:latest
    restart: always
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus

  grafana:
    image: grafana/grafana:latest
    restart: always
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
      - ./grafana/dashboards:/var/lib/grafana/dashboards:ro
    environment:
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD: "${GRAFANA_PASSWORD}"
      GF_USERS_ALLOW_SIGN_UP: "false"
      GF_SERVER_ROOT_URL: "http://localhost:3000"
    depends_on:
      - prometheus

  node-exporter:
    image: quay.io/prometheus/node-exporter:latest
    restart: always
    pid: host
    command:
      - '--path.rootfs=/host'
    volumes:
      - /:/host:ro,rslave

volumes:
  prometheus-data:
  grafana-data:
```

```bash
GRAFANA_PASSWORD=securepass podman compose -f monitoring-stack.yml up -d
```

`podman compose` uses an external Compose provider such as `docker-compose` or `podman-compose`, so make sure one is installed.

Configure Prometheus to scrape itself and Node Exporter:

```yaml
# prometheus/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: prometheus
    static_configs:
      - targets:
          - prometheus:9090

  - job_name: node-exporter
    static_configs:
      - targets:
          - node-exporter:9100
```

## Provisioning Data Sources

Automatically configure data sources using Grafana's provisioning system:

```yaml
# grafana/provisioning/datasources/datasources.yml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
```

## Provisioning Dashboards

Automatically load dashboards on startup:

```yaml
# grafana/provisioning/dashboards/dashboards.yml
apiVersion: 1

providers:
  - name: default
    orgId: 1
    type: file
    disableDeletion: false
    updateIntervalSeconds: 30
    options:
      path: /var/lib/grafana/dashboards
      foldersFromFilesStructure: true
```

## Creating a Podman Host Monitoring Dashboard

Create a dashboard JSON file for host monitoring:

```json
{
  "dashboard": {
    "uid": "podman-host-monitoring",
    "title": "Podman Host Monitoring",
    "tags": ["podman", "host"],
    "timezone": "browser",
    "schemaVersion": 41,
    "version": 1,
    "panels": [
      {
        "title": "CPU Usage",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0},
        "targets": [
          {
            "expr": "100 * (1 - avg(rate(node_cpu_seconds_total{mode=\"idle\"}[5m])))",
            "legendFormat": "CPU"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "custom": {
              "drawStyle": "line",
              "fillOpacity": 20
            }
          }
        }
      },
      {
        "title": "Memory Usage",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0},
        "targets": [
          {
            "expr": "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100",
            "legendFormat": "Memory"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent"
          }
        }
      },
      {
        "title": "Network I/O",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8},
        "targets": [
          {
            "expr": "sum by (device) (rate(node_network_receive_bytes_total{device!=\"lo\"}[5m]))",
            "legendFormat": "{{device}} - rx"
          },
          {
            "expr": "sum by (device) (rate(node_network_transmit_bytes_total{device!=\"lo\"}[5m]))",
            "legendFormat": "{{device}} - tx"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "Bps"
          }
        }
      },
      {
        "title": "Running Processes",
        "type": "stat",
        "gridPos": {"h": 4, "w": 6, "x": 12, "y": 8},
        "targets": [
          {
            "expr": "node_procs_running",
            "legendFormat": "Processes"
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "10s"
  },
  "overwrite": true
}
```

Save this as `grafana/dashboards/podman-host-monitoring.json`.

## Application Performance Dashboard

Create a dashboard for application metrics:

```json
{
  "dashboard": {
    "uid": "application-performance",
    "title": "Application Performance",
    "timezone": "browser",
    "schemaVersion": 41,
    "version": 1,
    "panels": [
      {
        "title": "Request Rate",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0},
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m])) by (endpoint)",
            "legendFormat": "{{endpoint}}"
          }
        ],
        "fieldConfig": {
          "defaults": {"unit": "reqps"}
        }
      },
      {
        "title": "Response Time (p95)",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0},
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint))",
            "legendFormat": "{{endpoint}}"
          }
        ],
        "fieldConfig": {
          "defaults": {"unit": "s"}
        }
      },
      {
        "title": "Error Rate",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8},
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m])) * 100",
            "legendFormat": "Error %"
          }
        ],
        "fieldConfig": {
          "defaults": {"unit": "percent"}
        }
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "10s"
  },
  "overwrite": true
}
```

## Grafana Configuration Options

Configure Grafana through environment variables:

```bash
podman run -d \
  --name grafana \
  -p 3000:3000 \
  -v grafana-data:/var/lib/grafana:Z \
  -e GF_SECURITY_ADMIN_USER=admin \
  -e GF_SECURITY_ADMIN_PASSWORD=strongpassword \
  -e GF_USERS_ALLOW_SIGN_UP=false \
  -e GF_AUTH_ANONYMOUS_ENABLED=false \
  -e GF_SERVER_ROOT_URL=https://grafana.example.com \
  -e GF_SMTP_ENABLED=true \
  -e GF_SMTP_HOST=smtp.example.com:587 \
  -e GF_SMTP_USER=alerts@example.com \
  -e GF_SMTP_PASSWORD=smtppassword \
  -e GF_UNIFIED_ALERTING_ENABLED=true \
  grafana/grafana:latest
```

## Backup and Restore

Back up Grafana data and dashboards:

```bash
#!/bin/bash
# backup-grafana.sh

BACKUP_DIR="/backups/grafana/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Export dashboards via the current HTTP API
GRAFANA_URL="http://localhost:3000"
GRAFANA_TOKEN="your-service-account-token"

continue_token=""

while :; do
  continue_args=()
  if [ -n "$continue_token" ]; then
    continue_args+=(--data-urlencode "continue=$continue_token")
  fi

  response=$(curl -s -G -H "Authorization: Bearer $GRAFANA_TOKEN" \
    --data-urlencode "limit=1000" \
    "${continue_args[@]}" \
    "$GRAFANA_URL/apis/dashboard.grafana.app/v1/namespaces/default/dashboards")

  echo "$response" | jq -r '.items[]?.metadata.name' | while read -r dashboard_name; do
    echo "Exporting dashboard: $dashboard_name"
    curl -s -H "Authorization: Bearer $GRAFANA_TOKEN" \
      "$GRAFANA_URL/apis/dashboard.grafana.app/v1/namespaces/default/dashboards/$dashboard_name" \
      > "$BACKUP_DIR/dashboard-$dashboard_name.json"
  done

  continue_token=$(echo "$response" | jq -r '.metadata.continue // empty')
  [ -n "$continue_token" ] || break
done

# Back up the Grafana volume
podman stop grafana
podman volume export grafana-data --output "$BACKUP_DIR/grafana-volume.tar"
podman start grafana

echo "Backup saved to $BACKUP_DIR"
```

Restore from backup:

```bash
# Stop Grafana before restoring the volume contents
podman stop grafana

# Restore the volume contents
podman volume import grafana-data /backups/grafana/20240101/grafana-volume.tar

# Start Grafana again
podman start grafana
```

## Embedding Dashboards

Configure Grafana to allow embedding dashboards in other applications:

```bash
podman run -d \
  --name grafana \
  -p 3000:3000 \
  -v grafana-data:/var/lib/grafana:Z \
  -e GF_SECURITY_ALLOW_EMBEDDING=true \
  -e GF_AUTH_ANONYMOUS_ENABLED=true \
  -e GF_AUTH_ANONYMOUS_ORG_ROLE=Viewer \
  grafana/grafana:latest
```

Then embed dashboards in your application using iframes.

## Conclusion

Grafana running in Podman containers provides powerful visualization capabilities for your monitoring data. The combination of Grafana's dashboard builder with Prometheus metrics gives you comprehensive insight into both infrastructure and application performance. Provisioning support means dashboards and data sources can be version-controlled and automatically deployed, making your monitoring infrastructure as reproducible as your application code. Whether you need simple resource monitoring or complex multi-service dashboards, Grafana and Podman together deliver an accessible and maintainable solution.
