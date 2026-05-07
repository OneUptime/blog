# How to Run Grafana in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Grafana, Monitoring, Visualization, Dashboard

Description: Learn how to run Grafana in a Podman container with persistent dashboards, custom data sources, and provisioned configurations.

---

> Grafana in Podman delivers a powerful observability dashboard in a rootless container with persistent storage and automated provisioning.

Grafana is the leading open-source platform for monitoring and observability, providing rich dashboards and alerting for your metrics, logs, and traces. Running it in a Podman container simplifies deployment, makes upgrades seamless, and lets you provision data sources and dashboards as code. This guide covers setup, persistence, data source configuration, and dashboard provisioning.

---

## Pulling the Grafana Image

Download the official Grafana image.

```bash
# Pull the latest Grafana image

podman pull docker.io/grafana/grafana:latest

# Verify the image
podman images | grep grafana
```

## Running a Basic Grafana Container

Start Grafana with default settings.

```bash
# Run Grafana in detached mode on port 3000
podman run -d \
  --name my-grafana \
  -p 3000:3000 \
  docker.io/grafana/grafana:latest

# Check the container is running
podman ps

# Grafana is available at http://localhost:3000
# Default credentials: admin / admin
echo "Open http://localhost:3000 (admin/admin)"
```

## Persistent Storage for Dashboards

Use a named volume to preserve dashboards and settings.

```bash
# Create a volume for Grafana data
podman volume create grafana-data

# Run Grafana with persistent storage
podman run -d \
  --name grafana-persistent \
  -p 3001:3000 \
  -v grafana-data:/var/lib/grafana:Z \
  docker.io/grafana/grafana:latest

# Verify the volume
podman volume inspect grafana-data
```

## Custom Environment Configuration

Configure Grafana using environment variables.

```bash
# Run Grafana with custom admin credentials and settings
podman volume create grafana-custom-data

podman run -d \
  --name grafana-custom \
  -p 3002:3000 \
  -e GF_SECURITY_ADMIN_USER=myadmin \
  -e GF_SECURITY_ADMIN_PASSWORD=my-grafana-secret \
  -e GF_USERS_ALLOW_SIGN_UP=false \
  -e GF_SERVER_ROOT_URL=http://localhost:3002 \
  -e GF_PLUGINS_PREINSTALL=grafana-clock-panel,grafana-simple-json-datasource \
  -v grafana-custom-data:/var/lib/grafana:Z \
  docker.io/grafana/grafana:latest

# Verify the custom admin can log in
curl -s -u myadmin:my-grafana-secret http://localhost:3002/api/org | python3 -m json.tool
```

## Provisioning Data Sources

Automatically configure data sources using provisioning files.

```bash
# Create provisioning directories
mkdir -p ~/grafana-provisioning/datasources
mkdir -p ~/grafana-provisioning/dashboards

# Write a data source provisioning file for Prometheus
cat > ~/grafana-provisioning/datasources/prometheus.yml <<'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://host.containers.internal:9090
    isDefault: true
    editable: true
    jsonData:
      timeInterval: '15s'

  - name: Elasticsearch
    type: elasticsearch
    access: proxy
    url: http://host.containers.internal:9200
    editable: true
    jsonData:
      index: 'app-logs-*'
      timeField: '@timestamp'
EOF

# Run Grafana with provisioned data sources
podman volume create grafana-provisioned-data

podman run -d \
  --name grafana-provisioned \
  -p 3003:3000 \
  -e GF_SECURITY_ADMIN_PASSWORD=admin-secret \
  -v ~/grafana-provisioning:/etc/grafana/provisioning:Z \
  -v grafana-provisioned-data:/var/lib/grafana:Z \
  docker.io/grafana/grafana:latest

# Verify data sources were provisioned
sleep 5
curl -s -u admin:admin-secret http://localhost:3003/api/datasources | python3 -m json.tool
```

## Provisioning Dashboards

Automatically load dashboards from JSON files.

```bash
# Create a dashboard provisioning config
cat > ~/grafana-provisioning/dashboards/default.yml <<'EOF'
apiVersion: 1

providers:
  - name: 'Default'
    orgId: 1
    folder: 'Provisioned'
    type: file
    disableDeletion: false
    editable: true
    options:
      path: /etc/grafana/provisioning/dashboards/json
      foldersFromFilesStructure: false
EOF

# Create a directory for dashboard JSON files
mkdir -p ~/grafana-provisioning/dashboards/json

# Create a simple system overview dashboard
cat > ~/grafana-provisioning/dashboards/json/system-overview.json <<'EOF'
{
  "dashboard": {
    "title": "System Overview",
    "panels": [
      {
        "title": "Welcome",
        "type": "text",
        "gridPos": {"h": 4, "w": 24, "x": 0, "y": 0},
        "options": {
          "content": "# System Overview\nThis dashboard is provisioned via Podman volume mount.",
          "mode": "markdown"
        }
      }
    ],
    "schemaVersion": 38,
    "version": 1
  },
  "overwrite": true
}
EOF

# Restart Grafana to pick up the new dashboard
podman restart grafana-provisioned
```

## Using the Grafana API

Interact with Grafana programmatically.

```bash
# List all dashboards
curl -s -u admin:admin-secret http://localhost:3003/api/search | python3 -m json.tool

# Get Grafana health status
curl -s http://localhost:3003/api/health | python3 -m json.tool

# List installed plugins
curl -s -u admin:admin-secret http://localhost:3003/api/plugins | python3 -m json.tool | head -20
```

## Managing the Container

Common management operations.

```bash
# View Grafana logs
podman logs my-grafana

# Stop and start
podman stop my-grafana
podman start my-grafana

# Remove containers and volumes
podman rm -f my-grafana grafana-persistent grafana-custom grafana-provisioned
podman volume rm grafana-data grafana-custom-data grafana-provisioned-data
```

## Summary

Running Grafana in a Podman container gives you a complete observability dashboard that is easy to deploy and configure. Environment variables control admin credentials and plugin pre-installation, while provisioning files automate data source and dashboard setup as code. Named volumes preserve your dashboards and settings across restarts. The Grafana API enables programmatic management of your monitoring platform. Podman's rootless execution provides security isolation, making this setup suitable for development monitoring, staging dashboards, and production observability stacks.
