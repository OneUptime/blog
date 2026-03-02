# How to Install and Configure Netdata on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Monitoring, Netdata, Metrics, Performance

Description: Learn how to install and configure Netdata on Ubuntu for real-time system performance monitoring with automatic dashboards and low overhead.

---

Netdata is a real-time performance monitoring tool that stands out for its low resource overhead, automatic metric collection, and impressive out-of-the-box dashboards. Install it and within seconds you have beautiful, interactive visualizations of CPU, memory, disk, network, and hundreds of application-specific metrics - with no configuration required for the basics.

## Installing Netdata

Netdata provides an automated installation script that handles everything:

```bash
# Install using the official kickstart script
wget -O /tmp/netdata-kickstart.sh https://get.netdata.cloud/kickstart.sh
sh /tmp/netdata-kickstart.sh --stable-channel --disable-telemetry

# Verify installation
sudo systemctl status netdata

# Check it is listening on port 19999
ss -tlnp | grep 19999
```

Alternatively, install from Ubuntu repositories (may be an older version):

```bash
# Install from repositories
sudo apt update
sudo apt install -y netdata

# The config directory will be at /etc/netdata
# Data directory at /var/cache/netdata
```

Or install from source for the latest features:

```bash
# Install build dependencies
sudo apt install -y git autoconf automake pkg-config \
  libmnl-dev libuv1-dev liblz4-dev openssl libssl-dev \
  libzstd-dev

# Clone and install
git clone https://github.com/netdata/netdata.git --depth=1
cd netdata
sudo ./netdata-installer.sh --stable-channel
```

## Accessing the Dashboard

Once installed, the dashboard is available at `http://your-server:19999`. It shows real-time metrics with one-second granularity by default. No login is required unless you configure authentication.

The dashboard is interactive - click on any chart to zoom in, drag to select time ranges, and hover over data points for exact values.

## Configuration

Netdata's main configuration file is at `/etc/netdata/netdata.conf`:

```bash
# View the current configuration
sudo cat /etc/netdata/netdata.conf

# Generate a full configuration with all defaults documented
sudo netdata -W dump-config > /tmp/netdata-full.conf

# Edit the main config
sudo nano /etc/netdata/netdata.conf
```

Key settings to configure:

```bash
sudo tee /etc/netdata/netdata.conf << 'EOF'
[global]
    # Storage retention period
    history = 3600      # Seconds of data in RAM (1 hour)

    # Update every N seconds (1 = real-time)
    update every = 1

    # Maximum memory usage for metrics
    page cache size = 64

    # Run as this user
    run as user = netdata

[web]
    # Listen address and port
    bind to = 0.0.0.0:19999

    # Enable SSL (configure certificate below)
    # ssl key  = /etc/netdata/ssl/key.pem
    # ssl certificate = /etc/netdata/ssl/cert.pem

    # Allow connections from specific IP only
    allow connections from = localhost 192.168.1.0/24

    # Disable the dashboard for API-only mode
    # mode = none

[plugins]
    # Enable/disable plugin categories
    proc = yes
    diskspace = yes
    cgroups = yes
    tc = yes
    nfacct = no
    checks = yes
    idlejitter = yes

[logs]
    # Log destinations
    errors log = /var/log/netdata/error.log
    access log = /var/log/netdata/access.log
    debug log = /dev/null
EOF

sudo systemctl restart netdata
```

## Configuring Data Collection Plugins

Netdata has plugins for hundreds of applications. Most auto-detect running services:

```bash
# View available plugins
ls /usr/lib/netdata/plugins.d/
ls /usr/lib/netdata/charts.d/

# View python-based plugins
ls /usr/lib/netdata/python.d/

# Plugin configurations are in
ls /etc/netdata/python.d/
ls /etc/netdata/charts.d/
ls /etc/netdata/go.d/
```

### Configuring MySQL Monitoring

```bash
# Create a Netdata MySQL user
sudo mysql -u root -p << 'SQL'
CREATE USER 'netdata'@'localhost' IDENTIFIED BY '' WITH MAX_USER_CONNECTIONS 5;
GRANT USAGE ON *.* TO 'netdata'@'localhost';
FLUSH PRIVILEGES;
SQL

# Configure the MySQL plugin
sudo tee /etc/netdata/go.d/mysql.conf << 'EOF'
jobs:
  - name: local
    dsn: "netdata@tcp(127.0.0.1:3306)/"
    my_cnf: ""

  # Additional MySQL instance
  # - name: production
  #   dsn: "monitor:password@tcp(192.168.1.30:3306)/"
EOF

sudo systemctl restart netdata
```

### Configuring Nginx Monitoring

```bash
# Enable nginx status module (add to nginx config)
sudo tee /etc/nginx/conf.d/netdata-stub-status.conf << 'EOF'
server {
    listen 127.0.0.1:8080;
    server_name localhost;

    location /stub_status {
        stub_status;
        allow 127.0.0.1;
        deny all;
    }
}
EOF

sudo nginx -t && sudo systemctl reload nginx

# Configure Netdata nginx plugin
sudo tee /etc/netdata/go.d/nginx.conf << 'EOF'
jobs:
  - name: local
    url: http://127.0.0.1:8080/stub_status
EOF

sudo systemctl restart netdata
```

### Custom Application Monitoring

Create a custom plugin to monitor any application:

```bash
# Create a custom chart plugin
sudo tee /usr/local/lib/netdata/charts.d/myapp.chart.sh << 'EOF'
#!/bin/bash
# Custom Netdata plugin for myapp

myapp_update_every=5
myapp_priority=90000

myapp_check() {
    # Check if myapp is running
    pgrep -x myapp > /dev/null || return 1
    return 0
}

myapp_create() {
    # Define the chart
    cat << CHART
CHART myapp.requests '' 'MyApp Request Rate' 'requests/s' myapp '' line 90000 $myapp_update_every
DIMENSION total '' incremental 1 1
CHART myapp.errors '' 'MyApp Error Rate' 'errors/s' myapp '' line 90001 $myapp_update_every
DIMENSION total '' incremental 1 1
CHART
}

myapp_update() {
    # Collect metrics (parse application metrics file or API)
    local requests=$(cat /var/run/myapp/stats 2>/dev/null | awk '{print $1}')
    local errors=$(cat /var/run/myapp/stats 2>/dev/null | awk '{print $2}')

    echo "BEGIN myapp.requests"
    echo "SET total = ${requests:-0}"
    echo "END"

    echo "BEGIN myapp.errors"
    echo "SET total = ${errors:-0}"
    echo "END"
}
EOF

sudo chmod +x /usr/local/lib/netdata/charts.d/myapp.chart.sh
sudo systemctl restart netdata
```

## Setting Up Streaming (Parent-Child Architecture)

Netdata can stream metrics from multiple child nodes to a parent for centralized viewing:

```bash
# On child nodes, configure streaming to parent
sudo tee /etc/netdata/stream.conf << 'EOF'
[stream]
    # Enable streaming
    enabled = yes
    # Parent server address
    destination = 192.168.1.10:19999
    # API key (must match on parent)
    api key = 11111111-2222-3333-4444-555555555555
    # Timeout for connection attempts
    timeout seconds = 60
    # Buffer size for offline periods
    buffer size bytes = 1048576
EOF

sudo systemctl restart netdata

# On the parent node, configure to accept streaming
sudo tee -a /etc/netdata/stream.conf << 'EOF'
[11111111-2222-3333-4444-555555555555]
    # Accept streams with this API key
    enabled = yes
    # Default retention for streamed data
    history = 3600
    # Health monitoring for children
    health enabled = yes
    # Allow connections from child subnets
    allow from = 192.168.1.0/24
EOF

sudo systemctl restart netdata
```

## Configuring Alerts

Netdata includes a sophisticated alert system. Alert configurations live in `/etc/netdata/health.d/`:

```bash
# View built-in alerts
ls /usr/lib/netdata/health.d/

# Create a custom alert
sudo tee /etc/netdata/health.d/custom.conf << 'EOF'
# Alert when CPU usage exceeds 85% for 5 minutes
alarm: high_cpu
    on: system.cpu
    lookup: average -5m unaligned of user,system,softirq,irq,guest
    units: %
    every: 20s
    warn: $this > 85
    crit: $this > 95
    info: CPU usage is high
    to: sysadmin

# Alert when disk usage exceeds 80%
alarm: disk_full
    on: disk.space
    lookup: average -1m unaligned of used
    units: %
    every: 1m
    warn: $this > 80
    crit: $this > 90
    info: Disk space is running low at ${label:mount_point}
    to: sysadmin
EOF

sudo systemctl restart netdata

# Test an alert
sudo netdatacli reload-health
sudo netdatacli send-alarm-notify
```

### Configuring Alert Notifications

```bash
# Configure email notifications
sudo tee /etc/netdata/health_alarm_notify.conf << 'EOF'
# Email settings
SEND_EMAIL="YES"
DEFAULT_RECIPIENT_EMAIL="alerts@example.com"
SENDMAIL="/usr/sbin/sendmail"

# Slack notifications
SEND_SLACK="YES"
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
DEFAULT_RECIPIENT_SLACK="#alerts"

# PagerDuty
SEND_PD="YES"
PD_SERVICE_KEY="your-pagerduty-integration-key"
EOF
```

## Exposing Metrics to Prometheus

Netdata can export metrics in Prometheus format:

```bash
# Enable Prometheus exporter in netdata.conf
sudo tee -a /etc/netdata/netdata.conf << 'EOF'

[backend]
    enabled = no

[exporting:prometheus:exporter]
    enabled = yes
    destination = /api/v1/allmetrics?format=prometheus
EOF

# Netdata already exposes prometheus metrics at:
# http://your-server:19999/api/v1/allmetrics?format=prometheus

# Test it
curl -s http://localhost:19999/api/v1/allmetrics?format=prometheus | head -50

# Add to Prometheus scrape config
# scrape_configs:
#   - job_name: 'netdata'
#     metrics_path: '/api/v1/allmetrics'
#     params:
#       format: [prometheus]
#     static_configs:
#       - targets:
#           - 'server1:19999'
#           - 'server2:19999'
```

## Securing Netdata

```bash
# Restrict access to localhost only and use nginx as proxy
sudo tee -a /etc/netdata/netdata.conf << 'EOF'
[web]
    bind to = 127.0.0.1:19999
EOF

# Set up nginx with authentication
sudo apt install -y nginx apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd netdata

sudo tee /etc/nginx/sites-available/netdata << 'EOF'
server {
    listen 443 ssl;
    server_name netdata.example.com;

    ssl_certificate /etc/ssl/certs/netdata.crt;
    ssl_certificate_key /etc/ssl/private/netdata.key;

    auth_basic "Netdata Monitoring";
    auth_basic_user_file /etc/nginx/.htpasswd;

    location / {
        proxy_pass http://127.0.0.1:19999;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/netdata /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo systemctl restart netdata
```

Netdata's automatic detection and zero-configuration approach makes it exceptionally fast to deploy meaningful monitoring. For teams that want rich, interactive dashboards immediately without spending hours writing dashboard JSON, Netdata is hard to beat. Its streaming architecture also makes it practical for monitoring fleets of servers from a central location without a heavy infrastructure setup.
