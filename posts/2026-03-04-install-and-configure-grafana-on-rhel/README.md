# How to Install and Configure Grafana on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Grafana, Monitoring, Dashboards, Visualization, Prometheus

Description: Install Grafana on RHEL and configure it with data sources and basic dashboards to visualize system metrics from Prometheus or other backends.

---

Grafana is an open-source visualization platform that creates dashboards from data stored in Prometheus, Elasticsearch, InfluxDB, and many other sources. This guide covers installing Grafana on RHEL and connecting it to a Prometheus data source.

## Install Grafana

```bash
# Add the Grafana repository
sudo tee /etc/yum.repos.d/grafana.repo << 'EOF'
[grafana]
name=Grafana OSS
baseurl=https://rpm.grafana.com
repo_gpgcheck=1
enabled=1
gpgcheck=1
gpgkey=https://rpm.grafana.com/gpg.key
sslverify=1
sslcacert=/etc/pki/tls/certs/ca-bundle.crt
EOF

# Install Grafana
sudo dnf install -y grafana
```

## Start Grafana

```bash
# Enable and start Grafana server
sudo systemctl enable --now grafana-server

# Check the service status
systemctl status grafana-server

# Grafana listens on port 3000 by default
```

## Open the Firewall

```bash
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## Initial Login and Setup

Access Grafana at `http://your-server:3000`. The default credentials are:
- Username: `admin`
- Password: `admin`

You will be prompted to change the password on first login.

## Configure Grafana Settings

```bash
# Main configuration file
sudo vi /etc/grafana/grafana.ini

# Common settings to change:
# [server]
# http_port = 3000
# domain = grafana.example.com
# root_url = %(protocol)s://%(domain)s/

# [security]
# admin_user = admin
# admin_password = your_secure_password

# [auth.anonymous]
# enabled = false

# Restart after changes
sudo systemctl restart grafana-server
```

## Add Prometheus as a Data Source

You can add data sources through the web UI or via the command line:

```bash
# Using the Grafana API to add a Prometheus data source
curl -X POST http://admin:admin@localhost:3000/api/datasources \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Prometheus",
        "type": "prometheus",
        "url": "http://localhost:9090",
        "access": "proxy",
        "isDefault": true
    }'
```

## Import a Pre-Built Dashboard

```bash
# Import the popular Node Exporter Full dashboard (ID 1860)
# via the Grafana API
curl -X POST http://admin:admin@localhost:3000/api/dashboards/import \
    -H "Content-Type: application/json" \
    -d '{
        "dashboard": {
            "id": null,
            "uid": null,
            "title": "Node Exporter Full",
            "tags": ["linux", "node-exporter"]
        },
        "overwrite": true,
        "inputs": [{
            "name": "DS_PROMETHEUS",
            "type": "datasource",
            "pluginId": "prometheus",
            "value": "Prometheus"
        }],
        "folderId": 0
    }'
```

Or import via the web UI: Go to Dashboards > Import > Enter dashboard ID `1860`.

## Install Plugins

```bash
# Install a plugin (example: pie chart panel)
sudo grafana-cli plugins install grafana-piechart-panel

# List installed plugins
sudo grafana-cli plugins ls

# Restart Grafana after installing plugins
sudo systemctl restart grafana-server
```

## Enable HTTPS

```bash
# Generate a self-signed certificate or use your own
# Edit /etc/grafana/grafana.ini:
# [server]
# protocol = https
# cert_file = /etc/grafana/grafana.crt
# cert_key = /etc/grafana/grafana.key

sudo systemctl restart grafana-server
```

Grafana is the standard way to visualize metrics on RHEL. Once connected to your data sources, you can build custom dashboards or import from the large library of community dashboards at grafana.com/grafana/dashboards.
