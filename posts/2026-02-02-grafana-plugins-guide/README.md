# How to Use Grafana Plugins

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Grafana, Plugins, Monitoring, Data Visualization, Observability, Dashboard, Panel Plugins, Data Source Plugins

Description: A practical guide to discovering, installing, configuring, and managing Grafana plugins. Learn how to extend Grafana's capabilities with community and enterprise plugins for data sources, panels, and applications.

---

Grafana plugins transform your monitoring setup from a basic dashboard into a powerful observability platform. Whether you need to connect to a new data source, add custom visualizations, or integrate with external services, plugins make it possible. In this guide, you will learn how to find the right plugins, install them safely, configure them properly, and troubleshoot common issues.

## Understanding Grafana Plugin Types

Grafana supports three distinct plugin types, each serving a different purpose in your monitoring stack.

```mermaid
flowchart TB
    subgraph Plugin Types
        direction TB
        DS[Data Source Plugins]
        Panel[Panel Plugins]
        App[App Plugins]
    end

    subgraph Data Source Examples
        direction TB
        DS1[InfluxDB]
        DS2[Elasticsearch]
        DS3[MongoDB]
        DS4[Snowflake]
    end

    subgraph Panel Examples
        direction TB
        P1[Pie Chart]
        P2[Worldmap]
        P3[Treemap]
        P4[Statusmap]
    end

    subgraph App Examples
        direction TB
        A1[Kubernetes App]
        A2[Synthetic Monitoring]
        A3[OnCall]
    end

    DS --> DS1
    DS --> DS2
    DS --> DS3
    DS --> DS4

    Panel --> P1
    Panel --> P2
    Panel --> P3
    Panel --> P4

    App --> A1
    App --> A2
    App --> A3
```

| Plugin Type | Purpose | Common Use Cases |
|-------------|---------|------------------|
| Data Source | Connect to external databases and APIs | Prometheus, InfluxDB, custom APIs |
| Panel | Create custom visualizations | Maps, specialized charts, status indicators |
| App | Bundle complete features with pages and dashboards | Kubernetes monitoring, incident management |

## Finding Plugins in the Grafana Catalog

The official Grafana plugin catalog contains hundreds of plugins maintained by Grafana Labs and the community. You can browse the catalog directly from your Grafana instance or online.

### Browsing from the Grafana UI

Navigate to the plugin catalog within Grafana to discover available plugins.

1. Open your Grafana instance
2. Click on the gear icon (Administration) in the left sidebar
3. Select "Plugins and data" then "Plugins"
4. Use the search bar and filters to find plugins

### Searching the Online Catalog

Visit the official catalog at grafana.com/grafana/plugins to explore plugins before installation. Each plugin page includes:

- Version history and changelog
- Installation instructions
- Documentation links
- User reviews and ratings
- Compatibility information

## Installing Plugins Using the CLI

The grafana-cli tool provides the most reliable method for plugin installation. All commands run on the server where Grafana is installed.

The following command installs a plugin by its ID:

```bash
# Install the pie chart panel plugin
# The plugin ID matches what you see in the catalog URL
grafana-cli plugins install grafana-piechart-panel
```

Installing a specific version ensures compatibility with your Grafana version:

```bash
# Install a specific version of the clock panel plugin
# Use this when the latest version requires a newer Grafana release
grafana-cli plugins install grafana-clock-panel 2.1.3
```

Listing currently installed plugins helps you track what's available:

```bash
# Show all installed plugins with their versions
grafana-cli plugins ls
```

Removing plugins you no longer need keeps your installation clean:

```bash
# Remove a plugin by its ID
# The plugin folder and all its files will be deleted
grafana-cli plugins remove grafana-piechart-panel
```

Updating all plugins at once saves time during maintenance windows:

```bash
# Update every installed plugin to its latest compatible version
grafana-cli plugins update-all
```

## Installing Plugins with Docker

Running Grafana in Docker requires a different approach to plugin installation. You have several options depending on your needs.

### Using Environment Variables

Setting the GF_INSTALL_PLUGINS environment variable installs plugins when the container starts:

```yaml
# docker-compose.yml
# Plugins listed here install automatically on container startup
# Separate multiple plugins with commas

version: "3.8"

services:
  grafana:
    image: grafana/grafana:10.3.1
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      # Install multiple plugins separated by commas
      # Format: plugin-id,another-plugin-id
      - GF_INSTALL_PLUGINS=grafana-clock-panel,grafana-piechart-panel,grafana-worldmap-panel
    volumes:
      # Persist Grafana data including installed plugins
      - grafana-data:/var/lib/grafana
    restart: unless-stopped

volumes:
  grafana-data:
```

### Installing Specific Plugin Versions

When you need precise version control, specify versions in the environment variable:

```yaml
# docker-compose.yml
# Pin plugins to specific versions for reproducible deployments

version: "3.8"

services:
  grafana:
    image: grafana/grafana:10.3.1
    environment:
      # Specify versions using plugin-id;version format
      # Mix versioned and latest plugins in the same list
      - GF_INSTALL_PLUGINS=grafana-clock-panel;2.1.3,grafana-piechart-panel;1.6.4,grafana-polystat-panel
    volumes:
      - grafana-data:/var/lib/grafana

volumes:
  grafana-data:
```

### Building a Custom Docker Image

For production deployments, baking plugins into your image eliminates installation time at startup:

```dockerfile
# Dockerfile
# Pre-install plugins during image build for faster container starts

FROM grafana/grafana:10.3.1

# Switch to root to install plugins
USER root

# Install plugins using the CLI
# Each plugin installs into /var/lib/grafana/plugins/
RUN grafana-cli plugins install grafana-clock-panel && \
    grafana-cli plugins install grafana-piechart-panel && \
    grafana-cli plugins install grafana-worldmap-panel && \
    grafana-cli plugins install grafana-polystat-panel

# Install a plugin from a custom URL (useful for private plugins)
# RUN grafana-cli --pluginUrl https://example.com/plugin.zip plugins install custom-plugin

# Switch back to grafana user for security
USER grafana

# Expose the default Grafana port
EXPOSE 3000
```

Build and run the custom image:

```bash
# Build the custom Grafana image with pre-installed plugins
docker build -t my-grafana-with-plugins .

# Run the container using the custom image
docker run -d -p 3000:3000 --name grafana my-grafana-with-plugins
```

## Installing Plugins in Kubernetes

Kubernetes deployments using Helm charts support plugin installation through values configuration.

### Helm Chart Configuration

Configure plugins in your Helm values file:

```yaml
# values.yaml
# Grafana Helm chart plugin configuration

grafana:
  # Plugins install during pod initialization
  plugins:
    - grafana-clock-panel
    - grafana-piechart-panel
    - grafana-worldmap-panel
    - grafana-polystat-panel

  # For private or unsigned plugins, add to allow list
  grafana.ini:
    plugins:
      allow_loading_unsigned_plugins: my-private-plugin,another-unsigned-plugin

  # Persistence ensures plugins survive pod restarts
  persistence:
    enabled: true
    size: 10Gi
    storageClassName: standard
```

### Using Init Containers

For more control over plugin installation, use an init container:

```yaml
# grafana-deployment.yaml
# Init container approach for plugin installation

apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
spec:
  template:
    spec:
      # Init container runs before the main Grafana container
      initContainers:
        - name: install-plugins
          image: grafana/grafana:10.3.1
          command:
            - /bin/sh
            - -c
            - |
              # Install plugins into the shared volume
              grafana-cli --pluginsDir /var/lib/grafana/plugins plugins install grafana-clock-panel
              grafana-cli --pluginsDir /var/lib/grafana/plugins plugins install grafana-piechart-panel
              grafana-cli --pluginsDir /var/lib/grafana/plugins plugins install grafana-worldmap-panel
          volumeMounts:
            - name: grafana-plugins
              mountPath: /var/lib/grafana/plugins

      containers:
        - name: grafana
          image: grafana/grafana:10.3.1
          volumeMounts:
            - name: grafana-plugins
              mountPath: /var/lib/grafana/plugins
            - name: grafana-data
              mountPath: /var/lib/grafana

      volumes:
        - name: grafana-plugins
          emptyDir: {}
        - name: grafana-data
          persistentVolumeClaim:
            claimName: grafana-pvc
```

## Configuring Data Source Plugins

Once installed, data source plugins need configuration to connect to your backends.

### InfluxDB Data Source Configuration

The following example shows how to configure an InfluxDB data source through the provisioning system:

```yaml
# provisioning/datasources/influxdb.yaml
# Auto-provision InfluxDB as a data source

apiVersion: 1

datasources:
  - name: InfluxDB
    type: influxdb
    access: proxy
    # Use the internal service name in Kubernetes
    url: http://influxdb:8086
    isDefault: false
    jsonData:
      # InfluxDB version determines the query language
      version: Flux
      organization: my-org
      defaultBucket: metrics
      # Time interval for auto-grouping in queries
      timeInterval: 10s
    secureJsonData:
      # Token stored securely, not visible in UI
      token: $INFLUXDB_TOKEN
```

### Elasticsearch Data Source Configuration

Elasticsearch requires specific settings for proper index pattern handling:

```yaml
# provisioning/datasources/elasticsearch.yaml
# Configure Elasticsearch with index patterns

apiVersion: 1

datasources:
  - name: Elasticsearch
    type: elasticsearch
    access: proxy
    url: http://elasticsearch:9200
    jsonData:
      # Index pattern with date-based rotation
      index: "logs-*"
      # Time field used for time-based queries
      timeField: "@timestamp"
      # Elasticsearch version affects query syntax
      esVersion: "8.0.0"
      # Maximum concurrent shard requests
      maxConcurrentShardRequests: 5
      # Log message field for log context
      logMessageField: message
      logLevelField: level
    secureJsonData:
      # Basic auth credentials if required
      basicAuthPassword: $ELASTICSEARCH_PASSWORD
    basicAuth: true
    basicAuthUser: elastic
```

### Custom API Data Source

Some data source plugins connect to custom APIs. Here is an example using the JSON API data source:

```yaml
# provisioning/datasources/custom-api.yaml
# Connect to a custom REST API endpoint

apiVersion: 1

datasources:
  - name: Custom API
    type: marcusolsson-json-datasource
    access: proxy
    url: https://api.example.com/v1
    jsonData:
      # Query parameters added to every request
      queryParams: "format=json"
    secureJsonData:
      # API key passed in headers
      httpHeaderValue1: $API_KEY
    jsonData:
      httpHeaderName1: "Authorization"
```

## Using Panel Plugins

Panel plugins add new visualization types to your dashboards. After installation, they appear in the visualization picker when editing a panel.

### Configuring the Worldmap Panel

The worldmap panel displays metrics on a geographic map. Configure it in your dashboard JSON:

```json
{
  "panels": [
    {
      "type": "grafana-worldmap-panel",
      "title": "Server Locations",
      "gridPos": {
        "h": 12,
        "w": 12,
        "x": 0,
        "y": 0
      },
      "options": {
        "mapCenter": "custom",
        "mapCenterLatitude": 40,
        "mapCenterLongitude": -95,
        "initialZoom": 4,
        "maxZoom": 18,
        "mouseWheelZoom": true,
        "showLegend": true,
        "stickyLabels": false,
        "circleMinSize": 5,
        "circleMaxSize": 30
      },
      "fieldConfig": {
        "defaults": {
          "thresholds": {
            "mode": "absolute",
            "steps": [
              { "color": "green", "value": null },
              { "color": "yellow", "value": 50 },
              { "color": "red", "value": 80 }
            ]
          }
        }
      },
      "targets": [
        {
          "refId": "A",
          "datasource": "Prometheus",
          "expr": "sum by (location, latitude, longitude) (server_requests_total)"
        }
      ]
    }
  ]
}
```

### Configuring the Polystat Panel

The polystat panel creates hexagonal status indicators perfect for service health dashboards:

```json
{
  "panels": [
    {
      "type": "grafana-polystat-panel",
      "title": "Service Health",
      "gridPos": {
        "h": 8,
        "w": 24,
        "x": 0,
        "y": 0
      },
      "options": {
        "autoSizePolygons": true,
        "polygonBorderColor": "black",
        "polygonBorderSize": 2,
        "tooltipDisplayMode": "all",
        "tooltipPrimarySortDirection": "desc",
        "tooltipSecondarySortDirection": "desc",
        "layoutNumColumns": 6,
        "layoutNumRows": 2,
        "layoutDisplayLimit": 100,
        "globalDisplayMode": "all",
        "globalOperator": "mean",
        "globalDecimals": 2
      },
      "fieldConfig": {
        "defaults": {
          "thresholds": {
            "mode": "absolute",
            "steps": [
              { "color": "green", "value": null },
              { "color": "orange", "value": 0.5 },
              { "color": "red", "value": 1 }
            ]
          },
          "mappings": [
            {
              "type": "value",
              "options": {
                "0": { "text": "Healthy", "color": "green" },
                "1": { "text": "Degraded", "color": "orange" },
                "2": { "text": "Down", "color": "red" }
              }
            }
          ]
        }
      }
    }
  ]
}
```

## Managing Plugin Security

Plugin security requires attention to signatures, permissions, and update practices.

### Understanding Plugin Signatures

Grafana validates plugin signatures to ensure authenticity. The signature levels are:

```mermaid
flowchart LR
    subgraph Signature Levels
        direction TB
        G[Grafana Labs Signed]
        C[Community Signed]
        P[Private Signed]
        U[Unsigned]
    end

    subgraph Trust Level
        direction TB
        H[High Trust]
        M[Medium Trust]
        L[Lower Trust]
        N[No Verification]
    end

    G --> H
    C --> M
    P --> L
    U --> N
```

### Allowing Unsigned Plugins

Some internal or development plugins lack signatures. Enable them cautiously in your configuration:

```ini
# grafana.ini
# Allow specific unsigned plugins by listing their IDs
# Only use this for plugins you trust completely

[plugins]
# Comma-separated list of plugin IDs
allow_loading_unsigned_plugins = my-internal-plugin,dev-panel-plugin

# Enable development mode to allow all unsigned plugins (not for production)
# app_mode = development
```

For Docker deployments, set the configuration via environment variable:

```yaml
# docker-compose.yml
services:
  grafana:
    image: grafana/grafana:10.3.1
    environment:
      # Allow specific unsigned plugins
      - GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=my-internal-plugin,dev-panel-plugin
```

### Plugin Update Best Practices

Keep plugins updated to receive security patches and new features:

```bash
# Check for available updates
grafana-cli plugins list-remote

# Update a specific plugin
grafana-cli plugins update grafana-piechart-panel

# Update all plugins at once
grafana-cli plugins update-all

# Verify plugin versions after updates
grafana-cli plugins ls
```

## Provisioning Plugins with Infrastructure as Code

Automate plugin configuration using Grafana's provisioning system.

### Directory Structure

Organize your provisioning files in a clear structure:

```
grafana/
├── provisioning/
│   ├── datasources/
│   │   ├── prometheus.yaml
│   │   ├── influxdb.yaml
│   │   └── elasticsearch.yaml
│   ├── dashboards/
│   │   ├── dashboards.yaml
│   │   └── json/
│   │       ├── services.json
│   │       └── infrastructure.json
│   └── plugins/
│       └── apps.yaml
└── grafana.ini
```

### App Plugin Provisioning

Enable and configure app plugins through provisioning:

```yaml
# provisioning/plugins/apps.yaml
# Auto-enable app plugins on startup

apiVersion: 1

apps:
  - type: grafana-kubernetes-app
    # Enable the plugin automatically
    enabled: true
    # Pin the plugin to prevent auto-updates
    pinned: true
    # Plugin-specific configuration
    jsonData:
      clusterName: production
      refreshInterval: 30s
    secureJsonData:
      token: $KUBERNETES_TOKEN

  - type: grafana-oncall-app
    enabled: true
    pinned: true
    jsonData:
      onCallApiUrl: https://oncall.example.com/api/v1
```

### Dashboard Provisioning with Plugin Panels

Provision dashboards that use plugin panels:

```yaml
# provisioning/dashboards/dashboards.yaml
# Configure dashboard provisioning

apiVersion: 1

providers:
  - name: default
    orgId: 1
    folder: ''
    folderUid: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 30
    options:
      # Path to dashboard JSON files
      path: /etc/grafana/provisioning/dashboards/json
```

## Troubleshooting Common Plugin Issues

When plugins fail to work correctly, systematic troubleshooting helps identify the root cause.

### Plugin Not Loading

Check the Grafana server logs for plugin-related errors:

```bash
# View recent Grafana logs
journalctl -u grafana-server -n 100 --no-pager

# Search for plugin-specific errors
journalctl -u grafana-server | grep -i plugin

# For Docker deployments
docker logs grafana 2>&1 | grep -i plugin
```

Common causes and solutions:

| Symptom | Possible Cause | Solution |
|---------|----------------|----------|
| Plugin not found | Wrong plugin ID | Verify ID in catalog |
| Signature error | Unsigned plugin | Add to allow list |
| Version mismatch | Incompatible version | Install compatible version |
| Missing files | Incomplete installation | Reinstall plugin |

### Data Source Connection Failures

When data source plugins cannot connect, verify the configuration:

```bash
# Test network connectivity to the data source
curl -v http://influxdb:8086/health

# Check if Grafana can reach the endpoint
docker exec grafana curl -v http://influxdb:8086/health

# Verify DNS resolution in containers
docker exec grafana nslookup influxdb
```

### Panel Rendering Issues

Panel plugins may fail to render due to JavaScript errors:

1. Open browser developer tools (F12)
2. Check the Console tab for JavaScript errors
3. Look for network requests failing in the Network tab
4. Clear browser cache and reload

```javascript
// Browser console commands to debug panels
// Check if panel plugin is loaded
console.log(window.grafanaBootData);

// List available panel types
console.log(Object.keys(window.grafanaPlugins || {}));
```

### Plugin API Endpoint Testing

Test plugin API endpoints directly:

```bash
# List installed plugins via API
curl -s http://admin:admin@localhost:3000/api/plugins | jq '.[] | {id, name, type}'

# Get specific plugin details
curl -s http://admin:admin@localhost:3000/api/plugins/grafana-piechart-panel/settings | jq

# Check plugin health endpoint if available
curl -s http://admin:admin@localhost:3000/api/plugins/grafana-piechart-panel/health
```

## Popular Plugins by Category

Knowing which plugins solve common problems helps you build effective dashboards faster.

### Visualization Plugins

These plugins extend Grafana's charting capabilities:

| Plugin | Purpose | Best For |
|--------|---------|----------|
| Pie Chart | Proportional data | Distribution views |
| Worldmap | Geographic data | Location-based metrics |
| Treemap | Hierarchical data | Resource allocation |
| Statusmap | Time-based status | Service availability |
| Polystat | Multi-value status | Health dashboards |
| FlowCharting | Diagrams with data | Architecture views |

### Data Source Plugins

Connect to various backends with these plugins:

| Plugin | Database/Service | Query Language |
|--------|------------------|----------------|
| InfluxDB | InfluxDB 2.x | Flux |
| MongoDB | MongoDB | MQL |
| Snowflake | Snowflake | SQL |
| Oracle | Oracle DB | SQL |
| JSON API | REST APIs | JSONPath |
| CSV | CSV files | N/A |

### App Plugins

Complete applications that bundle multiple features:

| Plugin | Purpose | Includes |
|--------|---------|----------|
| Kubernetes | K8s monitoring | Dashboards, data sources |
| Synthetic Monitoring | Uptime checks | Probes, alerting |
| OnCall | Incident management | Schedules, escalations |
| Machine Learning | Anomaly detection | Forecasting, outliers |

## Performance Considerations

Plugins impact Grafana's performance in various ways.

### Memory Usage

Some plugins consume significant memory:

```yaml
# docker-compose.yml
# Set resource limits to prevent memory exhaustion

services:
  grafana:
    image: grafana/grafana:10.3.1
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 512M
```

### Query Optimization

Data source plugins execute queries against backends. Optimize your queries:

```promql
# Inefficient: Fetches all data then filters
sum(rate(http_requests_total[5m]))

# Better: Filter early with label matchers
sum(rate(http_requests_total{job="api",status=~"5.."}[5m]))

# Avoid: Regex on high-cardinality labels
{__name__=~".*_total"}

# Prefer: Explicit metric names
http_requests_total or http_errors_total
```

### Caching Strategies

Enable caching for frequently accessed data:

```ini
# grafana.ini
# Configure query caching

[caching]
# Enable query result caching
enabled = true

[caching.encryption]
# Encrypt cached data
enabled = true
```

## Creating Plugin Bundles

For organizations with standardized monitoring stacks, create reusable plugin bundles.

### Ansible Playbook for Plugin Installation

Automate plugin installation across multiple Grafana instances:

```yaml
# install-plugins.yaml
# Ansible playbook for Grafana plugin management

- name: Install Grafana Plugins
  hosts: grafana_servers
  become: true

  vars:
    grafana_plugins:
      - grafana-clock-panel
      - grafana-piechart-panel
      - grafana-worldmap-panel
      - grafana-polystat-panel

  tasks:
    - name: Install required plugins
      ansible.builtin.command:
        cmd: grafana-cli plugins install {{ item }}
      loop: "{{ grafana_plugins }}"
      register: plugin_install
      changed_when: "'Installed' in plugin_install.stdout"
      notify: Restart Grafana

    - name: Verify installed plugins
      ansible.builtin.command:
        cmd: grafana-cli plugins ls
      register: installed_plugins
      changed_when: false

    - name: Display installed plugins
      ansible.builtin.debug:
        var: installed_plugins.stdout_lines

  handlers:
    - name: Restart Grafana
      ansible.builtin.systemd:
        name: grafana-server
        state: restarted
```

### Terraform Configuration

Use Terraform to manage Grafana plugins declaratively:

```hcl
# main.tf
# Terraform configuration for Grafana plugin management

terraform {
  required_providers {
    grafana = {
      source  = "grafana/grafana"
      version = "~> 2.0"
    }
  }
}

provider "grafana" {
  url  = "http://localhost:3000"
  auth = "admin:admin"
}

# Note: Grafana provider manages dashboards and data sources
# Plugin installation happens at infrastructure level
# Use this to provision data sources that depend on plugins

resource "grafana_data_source" "influxdb" {
  type = "influxdb"
  name = "InfluxDB"
  url  = "http://influxdb:8086"

  json_data_encoded = jsonencode({
    version      = "Flux"
    organization = "my-org"
    defaultBucket = "metrics"
  })

  secure_json_data_encoded = jsonencode({
    token = var.influxdb_token
  })
}

resource "grafana_data_source" "elasticsearch" {
  type = "elasticsearch"
  name = "Elasticsearch"
  url  = "http://elasticsearch:9200"

  json_data_encoded = jsonencode({
    index     = "logs-*"
    timeField = "@timestamp"
    esVersion = "8.0.0"
  })
}
```

## Conclusion

Grafana plugins unlock the full potential of your monitoring platform. By understanding the plugin types, installation methods, and configuration options, you can build dashboards that perfectly match your observability needs. Whether you need to connect to specialized data sources, create custom visualizations, or integrate with external services, plugins provide the flexibility to extend Grafana beyond its core capabilities.

Key takeaways for working with Grafana plugins:

1. **Choose the right plugin type** - Data source plugins connect backends, panel plugins visualize data, and app plugins provide complete solutions with bundled features.

2. **Install plugins securely** - Use grafana-cli for traditional installations, environment variables for Docker, and Helm values for Kubernetes deployments.

3. **Provision configuration** - Automate data source and app plugin configuration using Grafana's provisioning system to maintain consistency across environments.

4. **Monitor plugin health** - Check logs regularly, test connections, and keep plugins updated to avoid compatibility issues.

5. **Optimize for performance** - Consider memory usage, optimize queries, and enable caching to maintain responsive dashboards.

Start with the plugins you need today and expand your collection as requirements evolve. The Grafana plugin ecosystem continues to grow, offering new ways to visualize and analyze your infrastructure data.
