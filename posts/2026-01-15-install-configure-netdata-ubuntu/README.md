# How to Install and Configure Netdata on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Netdata, Monitoring, Real-time, Observability, Tutorial

Description: Set up Netdata for real-time performance monitoring with beautiful dashboards and zero configuration.

---

Netdata is a distributed, real-time performance and health monitoring system. It provides stunning dashboards with per-second metrics, requires minimal configuration, and runs efficiently with low resource overhead. This guide covers installation and configuration on Ubuntu.

## Prerequisites

- Ubuntu 18.04 or later
- Root or sudo access
- At least 1GB RAM
- Internet connection for installation

## Features

- Real-time monitoring with 1-second granularity
- Zero configuration auto-detection
- Beautiful, interactive dashboards
- Low resource usage
- Extensible with plugins
- Built-in alerting

## Quick Installation

### One-Line Install (Recommended)

```bash
# Install Netdata using official script
wget -O /tmp/netdata-kickstart.sh https://my-netdata.io/kickstart.sh && sh /tmp/netdata-kickstart.sh
```

The script automatically:
- Detects your system
- Installs dependencies
- Compiles from source or uses packages
- Configures systemd service

### Install from Package Repository

```bash
# Add Netdata repository
wget -O /tmp/netdata-kickstart.sh https://my-netdata.io/kickstart.sh && sh /tmp/netdata-kickstart.sh --stable-channel --no-updates

# Or use APT directly (may be older version)
sudo apt update
sudo apt install netdata -y
```

### Install from Source

```bash
# Install dependencies
sudo apt update
sudo apt install zlib1g-dev uuid-dev libuv1-dev liblz4-dev libssl-dev libelf-dev libmnl-dev libprotobuf-dev protobuf-compiler gcc g++ make git autoconf autoconf-archive autogen automake pkg-config curl python3 -y

# Clone repository
git clone https://github.com/netdata/netdata.git --depth=100 --recursive
cd netdata

# Run installer
sudo ./netdata-installer.sh
```

## Start and Access Netdata

```bash
# Start Netdata service
sudo systemctl start netdata
sudo systemctl enable netdata

# Check status
sudo systemctl status netdata
```

Access the dashboard at: `http://your_server_ip:19999`

## Configuration

### Main Configuration File

```bash
# Configuration is in netdata.conf
sudo nano /etc/netdata/netdata.conf
```

### Key Settings

```ini
[global]
    # Data directory
    cache directory = /var/cache/netdata

    # History (in seconds, 3600 = 1 hour at 1s granularity)
    history = 3996

    # Update frequency (default 1 second)
    update every = 1

    # Memory mode
    memory mode = dbengine

    # Database engine settings
    page cache size = 32
    dbengine multihost disk space = 256

[web]
    # Bind address
    bind to = 0.0.0.0

    # Port
    default port = 19999

    # Enable HTTPS
    # ssl key = /etc/netdata/ssl/key.pem
    # ssl certificate = /etc/netdata/ssl/cert.pem

[plugins]
    # Enable/disable plugins
    proc = yes
    diskspace = yes
    cgroups = yes
    tc = no
```

### Apply Configuration Changes

```bash
# Restart Netdata after configuration changes
sudo systemctl restart netdata
```

## Security Configuration

### Enable Authentication

```bash
# Create user for web access
sudo /usr/libexec/netdata/netdata-claim.sh --generate-api-key

# Or create htpasswd file
sudo apt install apache2-utils -y
sudo htpasswd -c /etc/netdata/.htpasswd admin
```

Edit configuration:

```ini
[web]
    # Enable authentication
    allow connections from = localhost *
    allow management from = localhost
```

### Configure Firewall

```bash
# Allow Netdata port
sudo ufw allow 19999/tcp

# Or restrict to specific IPs
sudo ufw allow from 10.0.0.0/24 to any port 19999
```

### Enable HTTPS

```bash
# Generate self-signed certificate
sudo mkdir -p /etc/netdata/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/netdata/ssl/key.pem \
    -out /etc/netdata/ssl/cert.pem

# Update configuration
sudo nano /etc/netdata/netdata.conf
```

```ini
[web]
    ssl key = /etc/netdata/ssl/key.pem
    ssl certificate = /etc/netdata/ssl/cert.pem
```

## Configure Alerts

### Edit Health Configuration

```bash
# Health configuration directory
ls /etc/netdata/health.d/

# Edit specific alert
sudo nano /etc/netdata/health.d/cpu.conf
```

### Create Custom Alert

```bash
sudo nano /etc/netdata/health.d/custom.conf
```

```yaml
# Custom CPU usage alert
 alarm: custom_cpu_usage
    on: system.cpu
lookup: average -3m percentage of user,system
 units: %
 every: 1m
  warn: $this > 75
  crit: $this > 90
 delay: down 5m multiplier 1.5 max 1h
  info: Average CPU usage over last 3 minutes
    to: sysadmin
```

### Configure Email Notifications

```bash
# Edit alarm notification config
sudo nano /etc/netdata/health_alarm_notify.conf
```

```bash
# Enable email notifications
SEND_EMAIL="YES"
DEFAULT_RECIPIENT_EMAIL="admin@example.com"
EMAIL_SENDER="netdata@$(hostname)"
```

### Configure Slack Notifications

```bash
# In health_alarm_notify.conf
SEND_SLACK="YES"
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
DEFAULT_RECIPIENT_SLACK="#alerts"
```

## Plugin Configuration

### Enable/Disable Plugins

```bash
sudo nano /etc/netdata/netdata.conf
```

```ini
[plugins]
    proc = yes
    diskspace = yes
    cgroups = yes
    apps = yes
    charts.d = yes
    python.d = yes
    go.d = yes
```

### Configure Python Plugins

```bash
# List available Python plugins
ls /usr/libexec/netdata/python.d/

# Configure specific plugin
sudo nano /etc/netdata/python.d/nginx.conf
```

```yaml
# nginx monitoring configuration
nginx_local:
  name: 'local'
  url: 'http://localhost/nginx_status'
```

### Configure Go Plugins

```bash
# Go.d plugin configuration
sudo nano /etc/netdata/go.d/web_log.conf
```

```yaml
jobs:
  - name: nginx
    path: /var/log/nginx/access.log
```

## Docker Monitoring

### Monitor Docker Containers

Netdata automatically detects Docker:

```bash
# Ensure cgroups plugin is enabled
sudo nano /etc/netdata/netdata.conf
```

```ini
[plugins]
    cgroups = yes

[plugin:cgroups]
    enable docker = yes
```

### Run Netdata in Docker

```bash
# Run Netdata container
docker run -d --name=netdata \
  --pid=host \
  --network=host \
  -v netdataconfig:/etc/netdata \
  -v netdatalib:/var/lib/netdata \
  -v netdatacache:/var/cache/netdata \
  -v /etc/passwd:/host/etc/passwd:ro \
  -v /etc/group:/host/etc/group:ro \
  -v /etc/localtime:/etc/localtime:ro \
  -v /proc:/host/proc:ro \
  -v /sys:/host/sys:ro \
  -v /etc/os-release:/host/etc/os-release:ro \
  -v /var/log:/host/var/log:ro \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  --restart unless-stopped \
  --cap-add SYS_PTRACE \
  --cap-add SYS_ADMIN \
  --security-opt apparmor=unconfined \
  netdata/netdata
```

## Streaming (Parent/Child Setup)

### Configure Child Node (Streams to Parent)

```bash
sudo nano /etc/netdata/stream.conf
```

```ini
[stream]
    enabled = yes
    destination = PARENT_IP:19999
    api key = YOUR_API_KEY
```

### Configure Parent Node (Receives Streams)

```bash
sudo nano /etc/netdata/stream.conf
```

```ini
[YOUR_API_KEY]
    enabled = yes
    default history = 3600
    default memory mode = dbengine
    health enabled by default = auto
    allow from = *
```

## Netdata Cloud

### Claim Node to Netdata Cloud

```bash
# Claim using token from cloud.netdata.cloud
sudo netdata-claim.sh -token=YOUR_CLAIM_TOKEN -rooms=YOUR_ROOM_ID -url=https://app.netdata.cloud
```

### Check Claim Status

```bash
# View claiming configuration
cat /var/lib/netdata/cloud.d/cloud.conf
```

## Dashboard Customization

### Custom Dashboard

Access specific charts:

```
# Single chart
http://localhost:19999/api/v1/chart?chart=system.cpu

# Chart with options
http://localhost:19999/api/v1/data?chart=system.cpu&after=-300&format=json
```

### API Access

```bash
# Get chart list
curl -s "http://localhost:19999/api/v1/charts" | jq '.charts | keys'

# Get specific metric data
curl -s "http://localhost:19999/api/v1/data?chart=system.cpu&after=-60&format=json"
```

## Performance Tuning

### Reduce Memory Usage

```ini
[global]
    # Reduce history
    history = 1800

    # Use less memory for page cache
    page cache size = 16

    # Reduce dbengine disk space
    dbengine multihost disk space = 128
```

### Reduce Update Frequency

```ini
[global]
    # Update every 2 seconds instead of 1
    update every = 2
```

## Troubleshooting

### Check Logs

```bash
# View Netdata error log
sudo journalctl -u netdata -f

# Or check log file
sudo tail -f /var/log/netdata/error.log
```

### Debug Mode

```bash
# Run in foreground with debug
sudo systemctl stop netdata
sudo /usr/sbin/netdata -D -W set global 'debug flags' 0xffffffff
```

### Plugin Issues

```bash
# Test specific plugin
sudo -u netdata /usr/libexec/netdata/plugins.d/python.d.plugin nginx debug 1

# Check plugin permissions
ls -la /usr/libexec/netdata/plugins.d/
```

### Web Access Issues

```bash
# Check if Netdata is listening
ss -tlnp | grep 19999

# Test local access
curl -s http://localhost:19999/api/v1/info | jq .version
```

## Uninstall Netdata

```bash
# If installed via kickstart
sudo /usr/libexec/netdata/netdata-uninstaller.sh --yes --env /etc/netdata/.environment

# If installed via APT
sudo apt remove --purge netdata -y
sudo rm -rf /etc/netdata /var/lib/netdata /var/cache/netdata
```

---

Netdata provides exceptional real-time monitoring with minimal setup. Its per-second granularity and beautiful visualizations make it ideal for troubleshooting performance issues. For enterprise features and centralized management, consider Netdata Cloud or complement with solutions like OneUptime for comprehensive observability.
