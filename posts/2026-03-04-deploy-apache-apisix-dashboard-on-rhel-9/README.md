# How to Deploy Apache APISIX Dashboard on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, Apache APISIX, API Gateway, Dashboards, Linux

Description: Learn how to install and deploy the Apache APISIX Dashboard on RHEL, including etcd setup, APISIX gateway configuration, dashboard installation, and route management through the web UI.

---

Apache APISIX is a high-performance API gateway built on top of Nginx and etcd. Its dashboard provides a web-based interface for managing routes, upstreams, consumers, and plugins without touching configuration files directly. This guide covers deploying the complete APISIX stack on RHEL.

## Architecture Overview

The APISIX ecosystem has three main components:

- **etcd** - the configuration store that holds all routing and plugin data
- **APISIX** - the gateway that processes API traffic
- **APISIX Dashboard** - a web UI for managing APISIX configuration

All three components need to be running for the dashboard to function.

## Prerequisites

Ensure your RHEL system has:

- At least 2 GB of RAM
- Root or sudo access
- Ports 9080, 9443, 9000, and 2379 available
- EPEL repository enabled

```bash
# Enable EPEL repository
sudo dnf install -y epel-release
```

## Installing etcd

APISIX uses etcd as its configuration backend:

```bash
# Download and install etcd
ETCD_VERSION="3.5.12"
curl -LO https://github.com/etcd-io/etcd/releases/download/v${ETCD_VERSION}/etcd-v${ETCD_VERSION}-linux-amd64.tar.gz
tar xzf etcd-v${ETCD_VERSION}-linux-amd64.tar.gz
sudo cp etcd-v${ETCD_VERSION}-linux-amd64/etcd /usr/local/bin/
sudo cp etcd-v${ETCD_VERSION}-linux-amd64/etcdctl /usr/local/bin/
```

Create a systemd service for etcd:

```bash
# Create etcd systemd unit
sudo tee /etc/systemd/system/etcd.service > /dev/null << 'EOF'
[Unit]
Description=etcd key-value store
After=network.target

[Service]
Type=notify
ExecStart=/usr/local/bin/etcd --listen-client-urls http://0.0.0.0:2379 --advertise-client-urls http://127.0.0.1:2379
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

```bash
# Start etcd
sudo systemctl daemon-reload
sudo systemctl enable --now etcd
```

Verify etcd is running:

```bash
# Check etcd health
etcdctl endpoint health
```

## Installing Apache APISIX

Install APISIX using the RPM repository:

```bash
# Add the APISIX repository
sudo yum-config-manager --add-repo https://repos.apiseven.com/packages/centos/apache-apisix.repo
```

```bash
# Install APISIX
sudo dnf install -y apisix
```

If the repository method does not work on RHEL, install from the RPM package directly:

```bash
# Download and install APISIX RPM
curl -LO https://repos.apiseven.com/packages/centos/9/x86_64/apisix-3.8.0-0.el9.x86_64.rpm
sudo rpm -ivh apisix-3.8.0-0.el9.x86_64.rpm
```

## Configuring APISIX

Edit the main configuration file:

```bash
# Edit the APISIX configuration
sudo tee /usr/local/apisix/conf/config.yaml > /dev/null << 'EOF'
apisix:
  node_listen: 9080
  enable_admin: true
  admin_key:
    - name: admin
      key: your-admin-api-key-here
      role: admin
    - name: viewer
      key: your-viewer-key-here
      role: viewer

etcd:
  host:
    - "http://127.0.0.1:2379"
  prefix: "/apisix"

plugin_attr:
  prometheus:
    export_addr:
      ip: "0.0.0.0"
      port: 9091
EOF
```

Start APISIX:

```bash
# Initialize and start APISIX
sudo apisix init
sudo apisix start
```

Verify APISIX is responding:

```bash
# Test the admin API
curl -s http://127.0.0.1:9080/apisix/admin/routes \
  -H 'X-API-KEY: your-admin-api-key-here' | head -20
```

## Installing the APISIX Dashboard

Download and install the dashboard:

```bash
# Download the APISIX Dashboard
DASHBOARD_VERSION="3.0.1"
curl -LO https://github.com/apache/apisix-dashboard/releases/download/v${DASHBOARD_VERSION}/apisix-dashboard-${DASHBOARD_VERSION}-0.el9.x86_64.rpm
sudo rpm -ivh apisix-dashboard-${DASHBOARD_VERSION}-0.el9.x86_64.rpm
```

If the RPM is not available, build from source:

```bash
# Install build dependencies
sudo dnf install -y golang nodejs npm make

# Clone and build the dashboard
git clone https://github.com/apache/apisix-dashboard.git
cd apisix-dashboard
make build
sudo cp output/manager-api /usr/local/bin/apisix-dashboard
sudo mkdir -p /usr/local/apisix-dashboard
sudo cp -r output/conf output/webapp /usr/local/apisix-dashboard/
```

## Configuring the Dashboard

Edit the dashboard configuration:

```bash
# Configure the dashboard
sudo tee /usr/local/apisix-dashboard/conf/conf.yaml > /dev/null << 'EOF'
conf:
  listen:
    host: 0.0.0.0
    port: 9000
  etcd:
    endpoints:
      - "127.0.0.1:2379"
  log:
    error_log:
      level: warn
      file_path: /var/log/apisix-dashboard/error.log
    access_log:
      file_path: /var/log/apisix-dashboard/access.log

authentication:
  secret: your-dashboard-secret-key
  expire_time: 3600
  users:
    - username: admin
      password: admin
EOF
```

```bash
# Create the log directory
sudo mkdir -p /var/log/apisix-dashboard
```

## Creating a Dashboard Systemd Service

```bash
# Create the systemd unit file
sudo tee /etc/systemd/system/apisix-dashboard.service > /dev/null << 'EOF'
[Unit]
Description=Apache APISIX Dashboard
After=network.target etcd.service

[Service]
Type=simple
WorkingDirectory=/usr/local/apisix-dashboard
ExecStart=/usr/local/bin/apisix-dashboard -c /usr/local/apisix-dashboard/conf/conf.yaml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

```bash
# Start the dashboard
sudo systemctl daemon-reload
sudo systemctl enable --now apisix-dashboard
```

## Configuring the Firewall

Open the necessary ports:

```bash
# Allow traffic to APISIX and the dashboard
sudo firewall-cmd --permanent --add-port=9080/tcp
sudo firewall-cmd --permanent --add-port=9443/tcp
sudo firewall-cmd --permanent --add-port=9000/tcp
sudo firewall-cmd --reload
```

## Accessing the Dashboard

Open your browser and navigate to `http://your-server-ip:9000`. Log in with the credentials you set in the configuration (default: admin/admin).

## Creating Routes Through the Dashboard

Once logged in, you can create routes through the UI:

1. Click **Routes** in the left sidebar
2. Click **Create** to add a new route
3. Set the name, URI path, and HTTP methods
4. Add upstream targets (backend servers)
5. Optionally enable plugins like authentication, rate limiting, or CORS
6. Save and publish the route

You can also create routes via the Admin API:

```bash
# Create a route via the Admin API
curl -i http://127.0.0.1:9080/apisix/admin/routes/1 \
  -H 'X-API-KEY: your-admin-api-key-here' \
  -X PUT -d '{
    "uri": "/api/*",
    "upstream": {
      "type": "roundrobin",
      "nodes": {
        "127.0.0.1:8080": 1
      }
    }
  }'
```

## Enabling Plugins

APISIX comes with dozens of plugins. Enable them on routes through the dashboard or the API:

```bash
# Add rate limiting to a route
curl -i http://127.0.0.1:9080/apisix/admin/routes/1 \
  -H 'X-API-KEY: your-admin-api-key-here' \
  -X PATCH -d '{
    "plugins": {
      "limit-req": {
        "rate": 10,
        "burst": 5,
        "key": "remote_addr",
        "rejected_code": 429
      }
    }
  }'
```

## Conclusion

The Apache APISIX Dashboard on RHEL gives you a visual interface for managing your API gateway configuration. Combined with the powerful plugin ecosystem and etcd-backed configuration, it provides a complete API management solution that scales well for production workloads.
