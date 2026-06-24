# How to Deploy Apache APISIX Dashboard on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, Apache APISIX, API Gateway, Dashboard, Linux

Description: Learn how to install and deploy the Apache APISIX Dashboard on RHEL, including etcd setup, APISIX gateway configuration, dashboard installation, and route management through the web UI.

---

Apache APISIX is a high-performance API gateway built on top of Nginx and etcd. Its built-in dashboard provides a web-based interface for managing routes, upstreams, consumers, and plugins without touching configuration files directly. This guide covers deploying the complete APISIX stack on RHEL.

## Architecture Overview

The APISIX ecosystem has two main components:

- **etcd** - the configuration store that holds all routing and plugin data
- **APISIX** - the gateway that processes API traffic and provides the built-in Dashboard UI

Both components need to be running for the dashboard to function.

## Prerequisites

Ensure your RHEL system has:

- At least 2 GB of RAM
- Root or sudo access
- Ports 9080, 9180, 9443, and 2379 available
- `dnf-plugins-core` installed for `yum-config-manager`

```bash
# Install repository management tools

sudo dnf install -y dnf-plugins-core
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
sudo yum-config-manager --add-repo https://repos.apiseven.com/packages/redhat/apache-apisix.repo
```

```bash
# Install APISIX
sudo dnf install -y apisix
```

If the repository method does not work on RHEL, install from the RPM package directly:

```bash
# Download and install APISIX RPM
curl -LO https://repos.apiseven.com/packages/redhat/9/x86_64/apisix-3.16.0-0.ubi9.6.x86_64.rpm
sudo dnf install -y ./apisix-3.16.0-0.ubi9.6.x86_64.rpm
```

## Configuring APISIX

Edit the main configuration file:

```bash
# Edit the APISIX configuration
sudo tee /usr/local/apisix/conf/config.yaml > /dev/null << 'EOF'
apisix:
  node_listen: 9080
  enable_admin: true

deployment:
  role: traditional
  role_traditional:
    config_provider: etcd
  admin:
    enable_admin_ui: true
    admin_key:
      - name: admin
        key: your-admin-api-key-here
        role: admin
      - name: viewer
        key: your-viewer-key-here
        role: viewer
    allow_admin:
      - 0.0.0.0/0
    admin_listen:
      ip: 0.0.0.0
      port: 9180
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
curl -s http://127.0.0.1:9180/apisix/admin/routes \
  -H 'X-API-KEY: your-admin-api-key-here' | head -20
```

## Enabling the APISIX Dashboard

APISIX 3.13 and later include the Dashboard UI. The `enable_admin_ui: true` setting above enables it on the Admin API listener.

```bash
# Restart APISIX after enabling the dashboard
sudo apisix stop
sudo apisix start
```

The older standalone APISIX Dashboard 3.0.1 release should only be used with APISIX 3.0 and is not required for current APISIX releases on RHEL 9.

## Configuring the Dashboard

The built-in dashboard uses the Admin API configuration in `/usr/local/apisix/conf/config.yaml`. Use a strong Admin API key, replace `0.0.0.0/0` in `deployment.admin.allow_admin` with trusted client IP ranges, and restart APISIX after changing the configuration.

## Creating a Dashboard Systemd Service

The APISIX RPM includes an APISIX service unit. Start APISIX with systemd if you prefer service management:

```bash
# Start APISIX
sudo systemctl enable --now apisix
```

## Configuring the Firewall

Open the necessary ports:

```bash
# Allow traffic to APISIX and the dashboard
sudo firewall-cmd --permanent --add-port=9080/tcp
sudo firewall-cmd --permanent --add-port=9180/tcp
sudo firewall-cmd --permanent --add-port=9443/tcp
sudo firewall-cmd --reload
```

## Accessing the Dashboard

Open your browser and navigate to `http://your-server-ip:9180/ui/`. Enter the Admin API key you set in the configuration when prompted.

## Creating Routes Through the Dashboard

Once connected, you can create routes through the UI:

1. Click **Routes** in the left sidebar
2. Click **Create** to add a new route
3. Set the name, URI path, and HTTP methods
4. Add upstream targets (backend servers)
5. Optionally enable plugins like authentication, rate limiting, or CORS
6. Save and publish the route

You can also create routes via the Admin API:

```bash
# Create a route via the Admin API
curl -i http://127.0.0.1:9180/apisix/admin/routes/1 \
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
curl -i http://127.0.0.1:9180/apisix/admin/routes/1 \
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
