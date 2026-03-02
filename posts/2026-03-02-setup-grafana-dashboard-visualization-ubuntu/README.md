# How to Set Up Grafana for Dashboard Visualization on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Monitoring, Grafana, Visualization, Prometheus

Description: Learn how to install and configure Grafana on Ubuntu for creating powerful dashboards to visualize metrics from Prometheus and other data sources.

---

Grafana turns raw metrics data into visual dashboards that actually make sense at a glance. Where Prometheus is good at storing and querying time-series data, Grafana is good at making that data understandable through graphs, gauges, tables, and alerts. Together they form the most widely used open-source monitoring stack in infrastructure operations.

## Installing Grafana

Grafana maintains their own APT repository for Ubuntu:

```bash
# Install required packages
sudo apt update
sudo apt install -y apt-transport-https software-properties-common wget

# Add Grafana GPG key
sudo mkdir -p /etc/apt/keyrings
wget -q -O - https://apt.grafana.com/gpg.key | gpg --dearmor | \
  sudo tee /etc/apt/keyrings/grafana.gpg > /dev/null

# Add Grafana repository
echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" | \
  sudo tee /etc/apt/sources.list.d/grafana.list

# Update and install Grafana
sudo apt update
sudo apt install -y grafana

# Enable and start Grafana
sudo systemctl enable --now grafana-server

# Verify it is running
sudo systemctl status grafana-server

# Check it is listening on port 3000
ss -tlnp | grep 3000
```

Grafana is now accessible at `http://your-server:3000`. The default credentials are `admin/admin`. You will be prompted to change the password on first login.

## Grafana Configuration File

The main configuration file is `/etc/grafana/grafana.ini`:

```bash
# View the configuration
sudo cat /etc/grafana/grafana.ini | grep -v "^;"

# Key settings to configure
sudo tee -a /etc/grafana/grafana.ini << 'EOF'

[server]
# Bind address and port
http_addr = 0.0.0.0
http_port = 3000
# Set domain if using a reverse proxy
domain = grafana.example.com
root_url = https://grafana.example.com/

[security]
# Change admin password from command line instead of in config
# admin_password = <set via grafana-cli or API>
allow_embedding = false
cookie_secure = true

[users]
# Prevent self-registration
allow_sign_up = false

[auth.anonymous]
# Disable anonymous access
enabled = false

[smtp]
enabled = true
host = smtp.example.com:587
user = alerts@example.com
password = yourpassword
from_address = alerts@example.com
from_name = Grafana Alerts
EOF

sudo systemctl restart grafana-server
```

## Adding Prometheus as a Data Source

Connect Grafana to your Prometheus instance via the API:

```bash
# Add Prometheus datasource via API
curl -X POST \
  -H "Content-Type: application/json" \
  -u admin:admin \
  http://localhost:3000/api/datasources \
  -d '{
    "name": "Prometheus",
    "type": "prometheus",
    "url": "http://localhost:9090",
    "access": "proxy",
    "isDefault": true,
    "jsonData": {
      "timeInterval": "15s",
      "httpMethod": "POST"
    }
  }'
```

Or through the UI: navigate to Configuration > Data Sources > Add data source > select Prometheus > enter URL `http://localhost:9090` > click Save & Test.

## Creating a System Metrics Dashboard

You can import pre-built dashboards from the Grafana dashboard library. The most popular for Node Exporter is Dashboard ID 1860:

```bash
# Import dashboard via API
curl -X POST \
  -H "Content-Type: application/json" \
  -u admin:admin \
  http://localhost:3000/api/dashboards/import \
  -d '{
    "dashboard": {"id": null},
    "inputs": [{"name": "DS_PROMETHEUS", "type": "datasource", "pluginId": "prometheus", "value": "Prometheus"}],
    "folderId": 0,
    "overwrite": true,
    "gnetId": 1860
  }'
```

Or via UI: Dashboards > Import > enter `1860` > select your Prometheus datasource > Import.

## Building a Custom Dashboard with API

For programmatic dashboard creation:

```bash
# Create a dashboard via API
curl -X POST \
  -H "Content-Type: application/json" \
  -u admin:admin \
  http://localhost:3000/api/dashboards/db \
  -d '{
    "dashboard": {
      "title": "Server Overview",
      "tags": ["production", "servers"],
      "timezone": "browser",
      "refresh": "30s",
      "panels": [
        {
          "type": "stat",
          "title": "CPU Usage",
          "gridPos": {"h": 4, "w": 6, "x": 0, "y": 0},
          "datasource": {"type": "prometheus", "uid": "prometheus"},
          "targets": [
            {
              "expr": "100 - (avg(rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
              "legendFormat": "CPU %"
            }
          ],
          "options": {
            "reduceOptions": {"calcs": ["lastNotNull"]},
            "colorMode": "background"
          },
          "fieldConfig": {
            "defaults": {
              "unit": "percent",
              "thresholds": {
                "steps": [
                  {"color": "green", "value": 0},
                  {"color": "yellow", "value": 70},
                  {"color": "red", "value": 90}
                ]
              }
            }
          }
        }
      ]
    },
    "overwrite": false
  }'
```

## Provisioning Dashboards as Code

For production, manage dashboards as YAML/JSON files in version control:

```bash
# Create provisioning directories
sudo mkdir -p /etc/grafana/provisioning/datasources
sudo mkdir -p /etc/grafana/provisioning/dashboards
sudo mkdir -p /var/lib/grafana/dashboards

# Configure the datasource via provisioning
sudo tee /etc/grafana/provisioning/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://localhost:9090
    isDefault: true
    editable: false
    jsonData:
      timeInterval: "15s"
      httpMethod: POST
EOF

# Configure the dashboard provider
sudo tee /etc/grafana/provisioning/dashboards/default.yml << 'EOF'
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 30
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
      foldersFromFilesStructure: true
EOF

# Set permissions
sudo chown -R grafana:grafana /etc/grafana/provisioning
sudo chown -R grafana:grafana /var/lib/grafana/dashboards

sudo systemctl restart grafana-server
```

## Setting Up Alerting

Grafana can send alerts when metrics cross thresholds:

```bash
# Configure alert contact point via API (using email)
curl -X POST \
  -H "Content-Type: application/json" \
  -u admin:admin \
  http://localhost:3000/api/v1/provisioning/contact-points \
  -d '{
    "name": "team-email",
    "type": "email",
    "settings": {
      "addresses": "team@example.com",
      "subject": "Grafana Alert: {{ .CommonLabels.alertname }}"
    }
  }'

# Configure notification policy
curl -X PUT \
  -H "Content-Type: application/json" \
  -u admin:admin \
  http://localhost:3000/api/v1/provisioning/policies \
  -d '{
    "receiver": "team-email",
    "group_by": ["alertname", "instance"],
    "group_wait": "30s",
    "group_interval": "5m",
    "repeat_interval": "4h"
  }'
```

## Setting Up HTTPS with Nginx Reverse Proxy

Do not expose Grafana directly on port 3000 in production. Use nginx:

```bash
# Install nginx and certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# Create nginx config for Grafana
sudo tee /etc/nginx/sites-available/grafana << 'EOF'
server {
    listen 80;
    server_name grafana.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name grafana.example.com;

    ssl_certificate /etc/letsencrypt/live/grafana.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/grafana.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support for live updates
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/grafana /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d grafana.example.com
```

## Managing Users and Organizations

```bash
# Create a user via API
curl -X POST \
  -H "Content-Type: application/json" \
  -u admin:admin \
  http://localhost:3000/api/admin/users \
  -d '{
    "name": "John Smith",
    "email": "john@example.com",
    "login": "john",
    "password": "securepassword",
    "OrgId": 1
  }'

# List users
curl -u admin:admin http://localhost:3000/api/users

# Reset admin password from command line
sudo grafana-cli admin reset-admin-password newpassword
```

## Useful Dashboard Panels

When building dashboards for system monitoring, these panel types and queries work well together:

```promql
# Stat panel - current CPU usage
100 - (avg(rate(node_cpu_seconds_total{mode="idle",instance=~"$instance"}[5m])) * 100)

# Time series panel - memory usage over time
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100

# Gauge panel - disk usage
(1 - (node_filesystem_avail_bytes{mountpoint="/",fstype!="rootfs"} /
      node_filesystem_size_bytes{mountpoint="/",fstype!="rootfs"})) * 100

# Table panel - top processes by CPU
topk(10, rate(namedprocess_namegroup_cpu_seconds_total[5m]))

# Bar gauge - network throughput by interface
rate(node_network_receive_bytes_total{device!="lo"}[5m])
```

Grafana's value is in making metrics actionable. Start with imported dashboards to get visibility quickly, then create custom dashboards that reflect your specific architecture and service-level objectives. The provisioning-as-code approach ensures your dashboards survive server rebuilds and can be reviewed through version control like any other configuration.
