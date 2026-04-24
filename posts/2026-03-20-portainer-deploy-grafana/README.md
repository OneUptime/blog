# How to Deploy Grafana via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Grafana, Monitoring, Dashboard, Self-Hosted

Description: Deploy Grafana via Portainer with persistent storage, pre-configured data sources, and dashboard provisioning for a ready-to-use monitoring visualization platform.

## Introduction

Grafana is the leading open-source platform for monitoring and observability visualization. Deploying it via Portainer with configuration-as-code for data sources and dashboards gives you a reproducible, version-controlled setup that's ready to use immediately after deployment.

## Deploy as a Stack

On the Docker host, create the files below under `/opt/grafana`, then in Portainer create a stack named `grafana`:

```yaml
version: "3.8"

services:
  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    environment:
      # Admin credentials
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=change_this_password
      # Disable signup
      - GF_USERS_ALLOW_SIGN_UP=false
      # Server settings
      - GF_SERVER_ROOT_URL=http://grafana.example.com
      - GF_SERVER_DOMAIN=grafana.example.com
      # SMTP for alerting
      - GF_SMTP_ENABLED=true
      - GF_SMTP_HOST=smtp.example.com:587
      - GF_SMTP_FROM_ADDRESS=grafana@example.com
      # Optional plugin installation
      - GF_PLUGINS_PREINSTALL=grafana-clock-panel
    volumes:
      # Persistent Grafana data
      - grafana_data:/var/lib/grafana
      # Provisioned data sources
      - /opt/grafana/provisioning/datasources:/etc/grafana/provisioning/datasources:ro
      # Provisioned dashboards
      - /opt/grafana/provisioning/dashboards:/etc/grafana/provisioning/dashboards:ro
      # Dashboard JSON files
      - /opt/grafana/dashboards:/var/lib/grafana/dashboards:ro
    ports:
      - "3000:3000"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "curl -fsS http://localhost:3000/api/health >/dev/null || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  grafana_data:
```

## Provisioned Data Sources

Create `/opt/grafana/provisioning/datasources/datasources.yaml`:

```yaml
apiVersion: 1

datasources:
  # Prometheus data source
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
    jsonData:
      timeInterval: "15s"

  # Loki for log aggregation
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100

  # InfluxDB for time series
  - name: InfluxDB
    type: influxdb
    access: proxy
    url: http://influxdb:8086
    jsonData:
      version: Flux
      organization: myorg
      defaultBucket: mybucket
    secureJsonData:
      token: "your_influxdb_token"
```

## Provisioned Dashboard Config

Create `/opt/grafana/provisioning/dashboards/dashboards.yaml`:

```yaml
apiVersion: 1

providers:
  - name: Default
    orgId: 1
    type: file
    disableDeletion: false
    updateIntervalSeconds: 30
    allowUiUpdates: false
    options:
      path: /var/lib/grafana/dashboards
```

## Example Dashboard JSON

Create `/opt/grafana/dashboards/system-overview.json` using Grafana's exported dashboard JSON (abbreviated below):

```json
{
  "title": "System Overview",
  "uid": "system-overview",
  "panels": [
    {
      "title": "CPU Usage",
      "type": "gauge",
      "datasource": "Prometheus",
      "targets": [
        {
          "expr": "100 - (avg by(instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
          "legendFormat": "{{instance}}"
        }
      ]
    },
    {
      "title": "Memory Usage",
      "type": "stat",
      "datasource": "Prometheus",
      "targets": [
        {
          "expr": "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100",
          "legendFormat": "Memory %"
        }
      ]
    }
  ],
  "time": {
    "from": "now-1h",
    "to": "now"
  },
  "refresh": "30s"
}
```

## Import Community Dashboards

Popular dashboard IDs to import via Grafana UI (Dashboards > Import):

| ID | Name | Use Case |
|----|------|---------|
| 1860 | Node Exporter Full | Linux host metrics |
| 893 | Docker and system monitoring | Docker monitoring |
| 3662 | Prometheus 2.0 Overview | Prometheus self-monitoring |
| 13659 | Blackbox Exporter (HTTP prober) | Website monitoring |
| 10315 | PostgreSQL Stats | Database monitoring |

## Grafana Alerting

Configure alert rules in Grafana UI:

1. Navigate to **Alerting > Alert rules > New alert rule**
2. Define query and condition
3. Set evaluation interval
4. Configure a contact point (email, Slack, PagerDuty)

## Conclusion

Grafana deployed via Portainer with provisioned data sources and dashboards is immediately useful after deployment. The configuration-as-code approach means your monitoring setup is reproducible and version-controllable. Combined with Prometheus or InfluxDB for data collection, Grafana provides powerful observability into your infrastructure and applications.
