# How to Set Up Prometheus and Grafana on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, Prometheus, Grafana, Monitoring, Observability

Description: Set up a complete monitoring stack on Ubuntu with Prometheus for metrics collection and Grafana for visualization and alerting.

---

Monitoring is a critical aspect of any production infrastructure. Prometheus and Grafana together form one of the most popular open-source monitoring stacks available today. Prometheus handles metrics collection and storage with its powerful time-series database, while Grafana provides beautiful visualizations and alerting capabilities.

In this comprehensive guide, we will walk through setting up a complete monitoring stack on Ubuntu, covering everything from installation to creating dashboards and alerting rules.

## Prerequisites

Before we begin, ensure you have the following:

- Ubuntu 20.04 LTS or newer (this guide uses Ubuntu 22.04)
- A user with sudo privileges
- At least 2GB of RAM and 2 CPU cores
- Basic familiarity with Linux command line
- Ports 9090 (Prometheus), 9100 (Node Exporter), and 3000 (Grafana) available

## Architecture Overview

Our monitoring stack will consist of three main components:

1. **Prometheus Server**: The core metrics collection and storage engine
2. **Node Exporter**: Exposes hardware and OS metrics from the host machine
3. **Grafana**: Visualization and alerting platform

The data flow works as follows:
- Node Exporter collects system metrics and exposes them on port 9100
- Prometheus scrapes these metrics at regular intervals and stores them
- Grafana queries Prometheus and displays the data in dashboards

## Part 1: Installing Prometheus

### Step 1: Create a Prometheus User

First, we create a dedicated system user for Prometheus. This follows the security principle of least privilege.

```bash
# Create a system user for Prometheus without home directory or login shell
sudo useradd --no-create-home --shell /bin/false prometheus
```

### Step 2: Create Required Directories

Create the directories needed for Prometheus configuration and data storage.

```bash
# Create directory for Prometheus configuration files
sudo mkdir /etc/prometheus

# Create directory for Prometheus time-series data storage
sudo mkdir /var/lib/prometheus

# Set ownership of data directory to prometheus user
sudo chown prometheus:prometheus /var/lib/prometheus
```

### Step 3: Download and Install Prometheus

Download the latest Prometheus release and extract it. Always check the [Prometheus downloads page](https://prometheus.io/download/) for the latest version.

```bash
# Navigate to temporary directory for downloading
cd /tmp

# Download Prometheus (check for latest version)
wget https://github.com/prometheus/prometheus/releases/download/v2.48.0/prometheus-2.48.0.linux-amd64.tar.gz

# Extract the downloaded archive
tar xvf prometheus-2.48.0.linux-amd64.tar.gz

# Navigate to extracted directory
cd prometheus-2.48.0.linux-amd64
```

### Step 4: Move Binaries and Configuration Files

Install the Prometheus binaries and configuration files to their proper locations.

```bash
# Copy prometheus binary to /usr/local/bin
sudo cp prometheus /usr/local/bin/

# Copy promtool (utility for validating config) to /usr/local/bin
sudo cp promtool /usr/local/bin/

# Set ownership of binaries to prometheus user
sudo chown prometheus:prometheus /usr/local/bin/prometheus
sudo chown prometheus:prometheus /usr/local/bin/promtool

# Copy console libraries to configuration directory
sudo cp -r consoles /etc/prometheus
sudo cp -r console_libraries /etc/prometheus

# Set ownership of configuration directory
sudo chown -R prometheus:prometheus /etc/prometheus
```

### Step 5: Create Prometheus Configuration File

The main configuration file defines how Prometheus operates and what targets it scrapes.

```bash
# Create the main Prometheus configuration file
sudo tee /etc/prometheus/prometheus.yml > /dev/null << 'EOF'
# Global configuration applies to all scrape configs
global:
  # How often to scrape targets for metrics
  scrape_interval: 15s
  # How often to evaluate alerting and recording rules
  evaluation_interval: 15s
  # Attach these labels to all time series and alerts
  external_labels:
    monitor: 'prometheus-stack'

# Alertmanager configuration (we'll configure this later)
alerting:
  alertmanagers:
    - static_configs:
        - targets: []
          # - alertmanager:9093

# Rule files for alerting and recording rules
rule_files:
  - "/etc/prometheus/rules/*.yml"

# Scrape configurations define what endpoints to collect metrics from
scrape_configs:
  # Scrape Prometheus's own metrics
  - job_name: 'prometheus'
    # Override global scrape interval for this job
    scrape_interval: 5s
    static_configs:
      - targets: ['localhost:9090']
        labels:
          instance: 'prometheus-server'

  # Scrape Node Exporter metrics (we'll set this up next)
  - job_name: 'node_exporter'
    scrape_interval: 10s
    static_configs:
      - targets: ['localhost:9100']
        labels:
          instance: 'ubuntu-server'
EOF
```

Set proper ownership on the configuration file.

```bash
# Set ownership to prometheus user
sudo chown prometheus:prometheus /etc/prometheus/prometheus.yml
```

### Step 6: Create Rules Directory

Create a directory for alerting and recording rules.

```bash
# Create rules directory
sudo mkdir -p /etc/prometheus/rules

# Set ownership
sudo chown -R prometheus:prometheus /etc/prometheus/rules
```

### Step 7: Create Systemd Service File

Create a systemd service to manage Prometheus as a system service.

```bash
# Create systemd service file for Prometheus
sudo tee /etc/systemd/system/prometheus.service > /dev/null << 'EOF'
[Unit]
Description=Prometheus Monitoring System
Documentation=https://prometheus.io/docs/introduction/overview/
Wants=network-online.target
After=network-online.target

[Service]
# Run as prometheus user
User=prometheus
Group=prometheus
Type=simple

# Prometheus startup command with configuration flags
ExecStart=/usr/local/bin/prometheus \
    --config.file=/etc/prometheus/prometheus.yml \
    --storage.tsdb.path=/var/lib/prometheus/ \
    --web.console.templates=/etc/prometheus/consoles \
    --web.console.libraries=/etc/prometheus/console_libraries \
    --web.listen-address=0.0.0.0:9090 \
    --web.enable-lifecycle \
    --storage.tsdb.retention.time=15d

# Restart on failure
Restart=always
RestartSec=10

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/prometheus

[Install]
WantedBy=multi-user.target
EOF
```

### Step 8: Start and Enable Prometheus

Reload systemd and start the Prometheus service.

```bash
# Reload systemd to recognize new service
sudo systemctl daemon-reload

# Start Prometheus service
sudo systemctl start prometheus

# Enable Prometheus to start on boot
sudo systemctl enable prometheus

# Check service status
sudo systemctl status prometheus
```

### Step 9: Verify Prometheus Installation

You can verify that Prometheus is running correctly by accessing its web interface.

```bash
# Check if Prometheus is listening on port 9090
curl -s http://localhost:9090/-/healthy

# You should see: Prometheus Server is Healthy.
```

Access the Prometheus web UI at `http://your-server-ip:9090`

## Part 2: Installing Node Exporter

Node Exporter is a Prometheus exporter that collects hardware and OS metrics from Linux systems.

### Step 1: Create Node Exporter User

Create a dedicated system user for Node Exporter.

```bash
# Create system user for node_exporter
sudo useradd --no-create-home --shell /bin/false node_exporter
```

### Step 2: Download and Install Node Exporter

Download and install the Node Exporter binary.

```bash
# Navigate to temporary directory
cd /tmp

# Download Node Exporter (check for latest version)
wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz

# Extract the archive
tar xvf node_exporter-1.7.0.linux-amd64.tar.gz

# Copy binary to /usr/local/bin
sudo cp node_exporter-1.7.0.linux-amd64/node_exporter /usr/local/bin/

# Set ownership
sudo chown node_exporter:node_exporter /usr/local/bin/node_exporter
```

### Step 3: Create Node Exporter Systemd Service

Create a systemd service file for Node Exporter.

```bash
# Create systemd service file for Node Exporter
sudo tee /etc/systemd/system/node_exporter.service > /dev/null << 'EOF'
[Unit]
Description=Prometheus Node Exporter
Documentation=https://github.com/prometheus/node_exporter
Wants=network-online.target
After=network-online.target

[Service]
# Run as node_exporter user
User=node_exporter
Group=node_exporter
Type=simple

# Node Exporter startup command with collectors enabled
ExecStart=/usr/local/bin/node_exporter \
    --web.listen-address=:9100 \
    --collector.systemd \
    --collector.processes \
    --collector.filesystem.mount-points-exclude="^/(sys|proc|dev|host|etc)($$|/)"

# Restart on failure
Restart=always
RestartSec=10

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true

[Install]
WantedBy=multi-user.target
EOF
```

### Step 4: Start and Enable Node Exporter

Start the Node Exporter service.

```bash
# Reload systemd
sudo systemctl daemon-reload

# Start Node Exporter
sudo systemctl start node_exporter

# Enable on boot
sudo systemctl enable node_exporter

# Verify status
sudo systemctl status node_exporter
```

### Step 5: Verify Node Exporter

Check that Node Exporter is collecting metrics.

```bash
# Test Node Exporter metrics endpoint
curl -s http://localhost:9100/metrics | head -20

# You should see output like:
# # HELP go_gc_duration_seconds A summary of the pause duration of garbage collection cycles.
# # TYPE go_gc_duration_seconds summary
# go_gc_duration_seconds{quantile="0"} 0
```

### Step 6: Verify Prometheus is Scraping Node Exporter

After a minute, verify that Prometheus is successfully scraping Node Exporter.

```bash
# Query Prometheus for node_exporter up status
curl -s 'http://localhost:9090/api/v1/query?query=up{job="node_exporter"}' | python3 -m json.tool
```

You should see the value "1" indicating the target is up and being scraped successfully.

## Part 3: Installing Grafana

Grafana provides the visualization layer for our monitoring stack.

### Step 1: Add Grafana APT Repository

Add the official Grafana repository to get the latest version.

```bash
# Install required packages for adding repositories
sudo apt-get install -y apt-transport-https software-properties-common wget

# Add Grafana GPG key
sudo mkdir -p /etc/apt/keyrings/
wget -q -O - https://apt.grafana.com/gpg.key | gpg --dearmor | sudo tee /etc/apt/keyrings/grafana.gpg > /dev/null

# Add Grafana repository
echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" | sudo tee /etc/apt/sources.list.d/grafana.list
```

### Step 2: Install Grafana

Update package lists and install Grafana.

```bash
# Update package lists
sudo apt-get update

# Install Grafana OSS (Open Source)
sudo apt-get install -y grafana

# Alternatively, install Grafana Enterprise (free tier available)
# sudo apt-get install -y grafana-enterprise
```

### Step 3: Configure Grafana

The main Grafana configuration file is located at `/etc/grafana/grafana.ini`. Here are some important settings to consider.

```bash
# Edit Grafana configuration (optional customizations)
sudo tee -a /etc/grafana/grafana.ini > /dev/null << 'EOF'

# Custom settings appended to default configuration
[server]
# HTTP port to listen on
http_port = 3000

# Public-facing domain name
domain = localhost

# Root URL for accessing Grafana
root_url = %(protocol)s://%(domain)s:%(http_port)s/

[security]
# Default admin user created on first startup
admin_user = admin

# Disable signup to prevent unauthorized access
disable_initial_admin_creation = false

[users]
# Disable user signup
allow_sign_up = false

[auth.anonymous]
# Disable anonymous access
enabled = false

[alerting]
# Enable alerting features
enabled = true

[unified_alerting]
# Enable unified alerting (newer system)
enabled = true
EOF
```

### Step 4: Start and Enable Grafana

Start the Grafana server.

```bash
# Reload systemd
sudo systemctl daemon-reload

# Start Grafana
sudo systemctl start grafana-server

# Enable Grafana on boot
sudo systemctl enable grafana-server

# Check status
sudo systemctl status grafana-server
```

### Step 5: Access Grafana Web Interface

Grafana is now accessible at `http://your-server-ip:3000`

Default credentials:
- Username: `admin`
- Password: `admin`

You will be prompted to change the password on first login.

## Part 4: Configuring Prometheus Data Source in Grafana

Now we need to connect Grafana to Prometheus so it can query and display metrics.

### Step 1: Add Prometheus Data Source via UI

1. Log in to Grafana at `http://your-server-ip:3000`
2. Navigate to **Configuration** (gear icon) > **Data Sources**
3. Click **Add data source**
4. Select **Prometheus**
5. Configure the data source:
   - Name: `Prometheus`
   - URL: `http://localhost:9090`
   - Access: `Server (default)`
6. Click **Save & Test**

### Step 2: Add Data Source via Provisioning (Recommended for Automation)

For automated deployments, you can provision data sources using YAML files.

```bash
# Create provisioning directory for data sources
sudo mkdir -p /etc/grafana/provisioning/datasources

# Create data source provisioning file
sudo tee /etc/grafana/provisioning/datasources/prometheus.yml > /dev/null << 'EOF'
# Prometheus data source provisioning configuration
apiVersion: 1

# List of data sources to provision
datasources:
  # Prometheus data source configuration
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://localhost:9090
    # Set as default data source
    isDefault: true
    # Allow users to edit in UI
    editable: true
    # JSON data for additional settings
    jsonData:
      # HTTP method for queries
      httpMethod: POST
      # Timeout for queries in seconds
      timeInterval: "15s"
      # Enable exemplar support
      exemplarTraceIdDestinations:
        - name: traceID
          datasourceUid: tempo
EOF

# Set proper ownership
sudo chown -R root:grafana /etc/grafana/provisioning/datasources
sudo chmod 640 /etc/grafana/provisioning/datasources/prometheus.yml

# Restart Grafana to apply provisioning
sudo systemctl restart grafana-server
```

## Part 5: Creating Dashboards

### Step 1: Import a Pre-built Node Exporter Dashboard

Grafana has a library of community dashboards. The Node Exporter Full dashboard (ID: 1860) is excellent.

1. In Grafana, go to **Dashboards** > **Import**
2. Enter dashboard ID: `1860`
3. Click **Load**
4. Select **Prometheus** as the data source
5. Click **Import**

### Step 2: Create a Custom Dashboard via Provisioning

Create a custom dashboard programmatically.

```bash
# Create provisioning directory for dashboards
sudo mkdir -p /etc/grafana/provisioning/dashboards
sudo mkdir -p /var/lib/grafana/dashboards

# Create dashboard provider configuration
sudo tee /etc/grafana/provisioning/dashboards/default.yml > /dev/null << 'EOF'
apiVersion: 1

providers:
  - name: 'Default'
    orgId: 1
    folder: 'Provisioned'
    folderUid: 'provisioned'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 30
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF
```

### Step 3: Create a System Overview Dashboard

Create a custom JSON dashboard file.

```bash
# Create system overview dashboard
sudo tee /var/lib/grafana/dashboards/system-overview.json > /dev/null << 'EOF'
{
  "annotations": {
    "list": []
  },
  "description": "System overview dashboard for Ubuntu server monitoring",
  "editable": true,
  "fiscalYearStartMonth": 0,
  "graphTooltip": 0,
  "id": null,
  "links": [],
  "liveNow": false,
  "panels": [
    {
      "datasource": {
        "type": "prometheus",
        "uid": "${DS_PROMETHEUS}"
      },
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "thresholds"
          },
          "mappings": [],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {"color": "green", "value": null},
              {"color": "yellow", "value": 50},
              {"color": "red", "value": 80}
            ]
          },
          "unit": "percent"
        }
      },
      "gridPos": {"h": 8, "w": 6, "x": 0, "y": 0},
      "id": 1,
      "options": {
        "orientation": "auto",
        "reduceOptions": {
          "calcs": ["lastNotNull"],
          "fields": "",
          "values": false
        },
        "showThresholdLabels": false,
        "showThresholdMarkers": true
      },
      "title": "CPU Usage",
      "type": "gauge",
      "targets": [
        {
          "expr": "100 - (avg(irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
          "refId": "A"
        }
      ]
    },
    {
      "datasource": {
        "type": "prometheus",
        "uid": "${DS_PROMETHEUS}"
      },
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "thresholds"
          },
          "mappings": [],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {"color": "green", "value": null},
              {"color": "yellow", "value": 70},
              {"color": "red", "value": 90}
            ]
          },
          "unit": "percent"
        }
      },
      "gridPos": {"h": 8, "w": 6, "x": 6, "y": 0},
      "id": 2,
      "options": {
        "orientation": "auto",
        "reduceOptions": {
          "calcs": ["lastNotNull"],
          "fields": "",
          "values": false
        },
        "showThresholdLabels": false,
        "showThresholdMarkers": true
      },
      "title": "Memory Usage",
      "type": "gauge",
      "targets": [
        {
          "expr": "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100",
          "refId": "A"
        }
      ]
    },
    {
      "datasource": {
        "type": "prometheus",
        "uid": "${DS_PROMETHEUS}"
      },
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "thresholds"
          },
          "mappings": [],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {"color": "green", "value": null},
              {"color": "yellow", "value": 70},
              {"color": "red", "value": 85}
            ]
          },
          "unit": "percent"
        }
      },
      "gridPos": {"h": 8, "w": 6, "x": 12, "y": 0},
      "id": 3,
      "options": {
        "orientation": "auto",
        "reduceOptions": {
          "calcs": ["lastNotNull"],
          "fields": "",
          "values": false
        },
        "showThresholdLabels": false,
        "showThresholdMarkers": true
      },
      "title": "Disk Usage",
      "type": "gauge",
      "targets": [
        {
          "expr": "(1 - (node_filesystem_avail_bytes{mountpoint=\"/\"} / node_filesystem_size_bytes{mountpoint=\"/\"})) * 100",
          "refId": "A"
        }
      ]
    },
    {
      "datasource": {
        "type": "prometheus",
        "uid": "${DS_PROMETHEUS}"
      },
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "palette-classic"
          },
          "custom": {
            "axisCenteredZero": false,
            "axisColorMode": "text",
            "axisLabel": "",
            "axisPlacement": "auto",
            "barAlignment": 0,
            "drawStyle": "line",
            "fillOpacity": 10,
            "gradientMode": "none",
            "hideFrom": {
              "legend": false,
              "tooltip": false,
              "viz": false
            },
            "lineInterpolation": "linear",
            "lineWidth": 1,
            "pointSize": 5,
            "scaleDistribution": {
              "type": "linear"
            },
            "showPoints": "never",
            "spanNulls": false,
            "stacking": {
              "group": "A",
              "mode": "none"
            },
            "thresholdsStyle": {
              "mode": "off"
            }
          },
          "mappings": [],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {"color": "green", "value": null}
            ]
          },
          "unit": "percent"
        }
      },
      "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8},
      "id": 4,
      "options": {
        "legend": {
          "calcs": ["mean", "max"],
          "displayMode": "table",
          "placement": "bottom",
          "showLegend": true
        },
        "tooltip": {
          "mode": "multi",
          "sort": "desc"
        }
      },
      "title": "CPU Usage Over Time",
      "type": "timeseries",
      "targets": [
        {
          "expr": "100 - (avg(irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
          "legendFormat": "CPU Usage",
          "refId": "A"
        }
      ]
    },
    {
      "datasource": {
        "type": "prometheus",
        "uid": "${DS_PROMETHEUS}"
      },
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "palette-classic"
          },
          "custom": {
            "axisCenteredZero": false,
            "axisColorMode": "text",
            "axisLabel": "",
            "axisPlacement": "auto",
            "barAlignment": 0,
            "drawStyle": "line",
            "fillOpacity": 10,
            "gradientMode": "none",
            "hideFrom": {
              "legend": false,
              "tooltip": false,
              "viz": false
            },
            "lineInterpolation": "linear",
            "lineWidth": 1,
            "pointSize": 5,
            "scaleDistribution": {
              "type": "linear"
            },
            "showPoints": "never",
            "spanNulls": false,
            "stacking": {
              "group": "A",
              "mode": "none"
            },
            "thresholdsStyle": {
              "mode": "off"
            }
          },
          "mappings": [],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {"color": "green", "value": null}
            ]
          },
          "unit": "bytes"
        }
      },
      "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8},
      "id": 5,
      "options": {
        "legend": {
          "calcs": ["mean", "max"],
          "displayMode": "table",
          "placement": "bottom",
          "showLegend": true
        },
        "tooltip": {
          "mode": "multi",
          "sort": "desc"
        }
      },
      "title": "Memory Usage Over Time",
      "type": "timeseries",
      "targets": [
        {
          "expr": "node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes",
          "legendFormat": "Used Memory",
          "refId": "A"
        },
        {
          "expr": "node_memory_MemAvailable_bytes",
          "legendFormat": "Available Memory",
          "refId": "B"
        }
      ]
    }
  ],
  "refresh": "10s",
  "schemaVersion": 38,
  "style": "dark",
  "tags": ["prometheus", "node-exporter", "system"],
  "templating": {
    "list": []
  },
  "time": {
    "from": "now-1h",
    "to": "now"
  },
  "timepicker": {},
  "timezone": "",
  "title": "System Overview",
  "uid": "system-overview",
  "version": 1,
  "weekStart": ""
}
EOF

# Set proper ownership
sudo chown -R grafana:grafana /var/lib/grafana/dashboards

# Restart Grafana to load the dashboard
sudo systemctl restart grafana-server
```

## Part 6: Setting Up Alerting Rules

### Step 1: Create Prometheus Alerting Rules

Create alerting rules that Prometheus will evaluate.

```bash
# Create alerting rules file
sudo tee /etc/prometheus/rules/alerts.yml > /dev/null << 'EOF'
# Prometheus alerting rules configuration
groups:
  # System health alerts
  - name: system_health
    rules:
      # Alert when any target is down
      - alert: TargetDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Target {{ $labels.instance }} is down"
          description: "{{ $labels.job }} target {{ $labels.instance }} has been down for more than 1 minute."

      # Alert on high CPU usage
      - alert: HighCPUUsage
        expr: 100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected on {{ $labels.instance }}"
          description: "CPU usage is above 80% (current value: {{ $value | printf \"%.2f\" }}%)"

      # Alert on critical CPU usage
      - alert: CriticalCPUUsage
        expr: 100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 95
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Critical CPU usage on {{ $labels.instance }}"
          description: "CPU usage is above 95% (current value: {{ $value | printf \"%.2f\" }}%)"

  # Memory alerts
  - name: memory_alerts
    rules:
      # Alert on high memory usage
      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is above 80% (current value: {{ $value | printf \"%.2f\" }}%)"

      # Alert on critical memory usage
      - alert: CriticalMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 95
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Critical memory usage on {{ $labels.instance }}"
          description: "Memory usage is above 95% (current value: {{ $value | printf \"%.2f\" }}%)"

      # Alert on low available memory
      - alert: LowMemoryAvailable
        expr: node_memory_MemAvailable_bytes < 268435456
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Low available memory on {{ $labels.instance }}"
          description: "Available memory is below 256MB"

  # Disk alerts
  - name: disk_alerts
    rules:
      # Alert on high disk usage
      - alert: HighDiskUsage
        expr: (1 - (node_filesystem_avail_bytes{fstype!~"tmpfs|overlay"} / node_filesystem_size_bytes{fstype!~"tmpfs|overlay"})) * 100 > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High disk usage on {{ $labels.instance }}"
          description: "Disk usage on {{ $labels.mountpoint }} is above 80% (current value: {{ $value | printf \"%.2f\" }}%)"

      # Alert on critical disk usage
      - alert: CriticalDiskUsage
        expr: (1 - (node_filesystem_avail_bytes{fstype!~"tmpfs|overlay"} / node_filesystem_size_bytes{fstype!~"tmpfs|overlay"})) * 100 > 90
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Critical disk usage on {{ $labels.instance }}"
          description: "Disk usage on {{ $labels.mountpoint }} is above 90% (current value: {{ $value | printf \"%.2f\" }}%)"

      # Alert on predicted disk fill
      - alert: DiskWillFillIn24Hours
        expr: predict_linear(node_filesystem_avail_bytes{fstype!~"tmpfs|overlay"}[6h], 24*3600) < 0
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Disk will fill within 24 hours on {{ $labels.instance }}"
          description: "Disk {{ $labels.mountpoint }} is predicted to fill within 24 hours based on current usage trend"

  # Network alerts
  - name: network_alerts
    rules:
      # Alert on high network errors
      - alert: HighNetworkErrors
        expr: rate(node_network_receive_errs_total[5m]) > 10 or rate(node_network_transmit_errs_total[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High network errors on {{ $labels.instance }}"
          description: "Network interface {{ $labels.device }} is experiencing errors"

  # System alerts
  - name: system_alerts
    rules:
      # Alert on system load
      - alert: HighSystemLoad
        expr: node_load15 > (count(node_cpu_seconds_total{mode="idle"}) by (instance)) * 0.8
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "High system load on {{ $labels.instance }}"
          description: "15-minute load average is high (current value: {{ $value | printf \"%.2f\" }})"

      # Alert on too many open files
      - alert: TooManyOpenFiles
        expr: node_filefd_allocated / node_filefd_maximum * 100 > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Too many open file descriptors on {{ $labels.instance }}"
          description: "File descriptor usage is above 80% (current value: {{ $value | printf \"%.2f\" }}%)"
EOF

# Set ownership
sudo chown prometheus:prometheus /etc/prometheus/rules/alerts.yml

# Validate the rules configuration
promtool check rules /etc/prometheus/rules/alerts.yml

# Reload Prometheus to apply new rules
sudo systemctl reload prometheus
```

### Step 2: Verify Alerting Rules

Check that the alerting rules are loaded.

```bash
# Query Prometheus rules API
curl -s http://localhost:9090/api/v1/rules | python3 -m json.tool | head -50

# Check for any firing alerts
curl -s http://localhost:9090/api/v1/alerts | python3 -m json.tool
```

## Part 7: Configuring Grafana Alerting

Grafana can also send alerts based on queries. Here's how to set up alert contact points and notification policies.

### Step 1: Create Contact Points via Provisioning

```bash
# Create alerting provisioning directory
sudo mkdir -p /etc/grafana/provisioning/alerting

# Create contact points configuration
sudo tee /etc/grafana/provisioning/alerting/contactpoints.yml > /dev/null << 'EOF'
# Grafana contact points for alerting
apiVersion: 1

contactPoints:
  - orgId: 1
    name: default-email
    receivers:
      - uid: email-receiver
        type: email
        settings:
          addresses: admin@example.com
          singleEmail: true
        disableResolveMessage: false
EOF

# Set ownership
sudo chown -R root:grafana /etc/grafana/provisioning/alerting
```

### Step 2: Create Notification Policies

```bash
# Create notification policies configuration
sudo tee /etc/grafana/provisioning/alerting/policies.yml > /dev/null << 'EOF'
# Grafana notification policies
apiVersion: 1

policies:
  - orgId: 1
    receiver: default-email
    group_by: ['grafana_folder', 'alertname']
    group_wait: 30s
    group_interval: 5m
    repeat_interval: 4h
EOF

# Restart Grafana to apply changes
sudo systemctl restart grafana-server
```

## Part 8: Advanced Prometheus Configuration

### Adding More Scrape Targets

As your infrastructure grows, you'll need to scrape more targets. Here's an example of scraping multiple nodes.

```bash
# Update prometheus.yml to include more targets
sudo tee /etc/prometheus/prometheus.yml > /dev/null << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    monitor: 'prometheus-stack'
    environment: 'production'

alerting:
  alertmanagers:
    - static_configs:
        - targets: []

rule_files:
  - "/etc/prometheus/rules/*.yml"

scrape_configs:
  # Prometheus self-monitoring
  - job_name: 'prometheus'
    scrape_interval: 5s
    static_configs:
      - targets: ['localhost:9090']
        labels:
          instance: 'prometheus-server'

  # Node Exporter for all servers
  - job_name: 'node_exporter'
    scrape_interval: 10s
    static_configs:
      # Primary server
      - targets: ['localhost:9100']
        labels:
          instance: 'server-01'
          datacenter: 'dc1'
      # Add more servers as needed
      # - targets: ['192.168.1.10:9100']
      #   labels:
      #     instance: 'server-02'
      #     datacenter: 'dc1'

  # Example: Scraping a web application
  # - job_name: 'webapp'
  #   scrape_interval: 30s
  #   metrics_path: '/metrics'
  #   static_configs:
  #     - targets: ['localhost:8080']
  #       labels:
  #         app: 'mywebapp'

  # Example: Service discovery with file-based targets
  # - job_name: 'dynamic_targets'
  #   file_sd_configs:
  #     - files:
  #         - '/etc/prometheus/targets/*.json'
  #       refresh_interval: 30s
EOF

# Validate configuration
promtool check config /etc/prometheus/prometheus.yml

# Reload Prometheus
sudo systemctl reload prometheus
```

### Creating Recording Rules

Recording rules pre-compute frequently used or computationally expensive expressions.

```bash
# Create recording rules
sudo tee /etc/prometheus/rules/recording.yml > /dev/null << 'EOF'
# Recording rules for pre-computed metrics
groups:
  - name: node_recording_rules
    interval: 15s
    rules:
      # Pre-compute CPU usage percentage
      - record: instance:node_cpu_usage:rate5m
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

      # Pre-compute memory usage percentage
      - record: instance:node_memory_usage:percent
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

      # Pre-compute disk usage percentage
      - record: instance:node_disk_usage:percent
        expr: (1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})) * 100

      # Pre-compute network receive rate
      - record: instance:node_network_receive:rate5m
        expr: sum by(instance) (irate(node_network_receive_bytes_total[5m]))

      # Pre-compute network transmit rate
      - record: instance:node_network_transmit:rate5m
        expr: sum by(instance) (irate(node_network_transmit_bytes_total[5m]))
EOF

# Set ownership
sudo chown prometheus:prometheus /etc/prometheus/rules/recording.yml

# Validate and reload
promtool check rules /etc/prometheus/rules/recording.yml
sudo systemctl reload prometheus
```

## Part 9: Security Best Practices

### Enabling Authentication for Prometheus

By default, Prometheus doesn't have authentication. Here's how to add basic auth using a reverse proxy.

```bash
# Install nginx
sudo apt-get install -y nginx apache2-utils

# Create password file for basic auth
sudo htpasswd -c /etc/nginx/.htpasswd prometheus

# Create nginx configuration
sudo tee /etc/nginx/sites-available/prometheus > /dev/null << 'EOF'
# Nginx reverse proxy for Prometheus with basic auth
server {
    listen 9091;
    server_name localhost;

    location / {
        # Basic authentication
        auth_basic "Prometheus";
        auth_basic_user_file /etc/nginx/.htpasswd;

        # Proxy to Prometheus
        proxy_pass http://localhost:9090;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/prometheus /etc/nginx/sites-enabled/

# Test and reload nginx
sudo nginx -t
sudo systemctl reload nginx
```

### Firewall Configuration

Configure firewall rules to restrict access.

```bash
# Install ufw if not present
sudo apt-get install -y ufw

# Allow SSH
sudo ufw allow ssh

# Allow Grafana (you may want to restrict to specific IPs)
sudo ufw allow 3000/tcp

# Allow Prometheus only from localhost (use nginx proxy)
sudo ufw allow from 127.0.0.1 to any port 9090

# Enable firewall
sudo ufw --force enable

# Check status
sudo ufw status verbose
```

## Part 10: Maintenance and Operations

### Backup Strategy

Create a backup script for your monitoring configuration.

```bash
# Create backup script
sudo tee /usr/local/bin/backup-monitoring.sh > /dev/null << 'EOF'
#!/bin/bash
# Backup script for Prometheus and Grafana configurations

BACKUP_DIR="/var/backups/monitoring"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Backup Prometheus configuration
tar -czf "${BACKUP_DIR}/prometheus-config-${DATE}.tar.gz" /etc/prometheus/

# Backup Grafana configuration and data
tar -czf "${BACKUP_DIR}/grafana-config-${DATE}.tar.gz" /etc/grafana/
tar -czf "${BACKUP_DIR}/grafana-data-${DATE}.tar.gz" /var/lib/grafana/

# Keep only last 7 days of backups
find "${BACKUP_DIR}" -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: ${DATE}"
EOF

# Make executable
sudo chmod +x /usr/local/bin/backup-monitoring.sh

# Add to crontab for daily backups
echo "0 2 * * * /usr/local/bin/backup-monitoring.sh" | sudo tee -a /var/spool/cron/crontabs/root
```

### Monitoring the Monitoring Stack

Add alerts for the monitoring stack itself.

```bash
# Create monitoring stack alerts
sudo tee /etc/prometheus/rules/monitoring-stack.yml > /dev/null << 'EOF'
groups:
  - name: monitoring_stack
    rules:
      # Alert if Prometheus is not healthy
      - alert: PrometheusNotHealthy
        expr: prometheus_health != 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Prometheus is not healthy"
          description: "Prometheus health check is failing"

      # Alert if too many samples rejected
      - alert: PrometheusTooManySamplesRejected
        expr: rate(prometheus_target_scrapes_sample_out_of_bounds_total[5m]) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Prometheus rejecting samples"
          description: "Prometheus is rejecting samples due to out of bounds timestamps"

      # Alert on high memory usage by Prometheus
      - alert: PrometheusHighMemory
        expr: process_resident_memory_bytes{job="prometheus"} > 2e+09
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Prometheus using high memory"
          description: "Prometheus is using more than 2GB of memory"
EOF

# Set ownership and reload
sudo chown prometheus:prometheus /etc/prometheus/rules/monitoring-stack.yml
sudo systemctl reload prometheus
```

## Troubleshooting

### Common Issues and Solutions

**1. Prometheus won't start**

Check the configuration syntax:

```bash
# Validate configuration
promtool check config /etc/prometheus/prometheus.yml

# Check systemd logs
sudo journalctl -u prometheus -f
```

**2. Node Exporter not being scraped**

Verify connectivity:

```bash
# Test Node Exporter endpoint
curl -v http://localhost:9100/metrics

# Check Prometheus targets
curl -s http://localhost:9090/api/v1/targets | python3 -m json.tool
```

**3. Grafana dashboard not showing data**

Check data source configuration:

```bash
# Test Prometheus query directly
curl -s 'http://localhost:9090/api/v1/query?query=up' | python3 -m json.tool

# Check Grafana logs
sudo journalctl -u grafana-server -f
```

**4. High disk usage by Prometheus**

Adjust retention settings:

```bash
# Check current disk usage
du -sh /var/lib/prometheus/

# Modify retention in systemd service
# --storage.tsdb.retention.time=7d
# --storage.tsdb.retention.size=10GB

sudo systemctl daemon-reload
sudo systemctl restart prometheus
```

## Summary

You have successfully set up a complete monitoring stack on Ubuntu with:

1. **Prometheus** - collecting and storing metrics with a 15-day retention
2. **Node Exporter** - exposing system metrics from your Ubuntu server
3. **Grafana** - visualizing metrics with dashboards and alerting

Key takeaways:
- Always create dedicated service users for security
- Use systemd for service management
- Validate configurations before reloading services
- Implement alerting rules for proactive monitoring
- Set up regular backups of your monitoring configuration
- Consider security measures like reverse proxies and firewalls

This monitoring stack provides a solid foundation for observability. As your infrastructure grows, you can add more exporters, create additional dashboards, and integrate with notification systems like Slack, PagerDuty, or email for comprehensive alerting coverage.

## Next Steps

Consider exploring:
- **Alertmanager** for advanced alert routing and deduplication
- **Loki** for log aggregation alongside Prometheus
- **Thanos** or **Cortex** for long-term storage and multi-cluster federation
- **Blackbox Exporter** for probing endpoints
- Additional exporters for databases, applications, and services

For more monitoring solutions, check out [OneUptime](https://oneuptime.com), which provides enterprise-grade monitoring with built-in alerting, status pages, and incident management.
