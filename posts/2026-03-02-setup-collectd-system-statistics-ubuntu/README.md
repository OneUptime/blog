# How to Set Up Collectd for System Statistics on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Monitoring, Collectd, Metrics, System Administration

Description: Learn how to install and configure Collectd on Ubuntu to collect and store system statistics, configure plugins, and forward data to Graphite or InfluxDB.

---

Collectd is a lightweight daemon that collects system and application performance statistics. It has been a reliable choice for metrics collection since 2005, known for its efficiency and extensibility. While newer tools like the Prometheus ecosystem have taken mindshare, Collectd remains relevant in environments that use Graphite, InfluxDB, or time-series databases that predate the Prometheus era.

## Installing Collectd

```bash
# Install collectd and common plugins
sudo apt update
sudo apt install -y collectd collectd-utils

# Check version
collectd -h | head -3

# Service management
sudo systemctl enable --now collectd
sudo systemctl status collectd
```

## Configuration Overview

The main configuration file is `/etc/collectd/collectd.conf`. Collectd uses a plugin architecture where each plugin handles a specific data type:

```bash
# View the default configuration
sudo cat /etc/collectd/collectd.conf

# Configuration directory for additional configs
ls /etc/collectd/collectd.conf.d/
```

## Core Configuration

```bash
sudo tee /etc/collectd/collectd.conf << 'EOF'
# Global settings
Hostname    "ubuntu-server-01"
FQDNLookup  true
BaseDir     "/var/lib/collectd"
PIDFile     "/run/collectd.pid"
PluginDir   "/usr/lib/collectd"
TypesDB     "/usr/share/collectd/types.db"

# Logging
LoadPlugin syslog
<Plugin syslog>
    LogLevel info
</Plugin>

# Interval between collections (seconds)
Interval     10

# Maximum simultaneous read threads
ReadThreads  5

# Maximum simultaneous write threads
WriteThreads 5

# Write queue configuration
WriteQueueLimitHigh 1000000
WriteQueueLimitLow   800000

# =============================================================
# Data Collection Plugins
# =============================================================

# System CPU usage
LoadPlugin cpu
<Plugin cpu>
    ReportByCpu true
    ReportByState true
    ValuesPercentage true
</Plugin>

# Memory statistics
LoadPlugin memory
<Plugin memory>
    ValuesAbsolute true
    ValuesPercentage true
</Plugin>

# Network interface statistics
LoadPlugin interface
<Plugin interface>
    Interface "eth0"
    Interface "eth1"
    IgnoreSelected false
</Plugin>

# Disk I/O statistics
LoadPlugin disk
<Plugin disk>
    Disk "sda"
    Disk "sdb"
    IgnoreSelected false
</Plugin>

# Filesystem usage statistics
LoadPlugin df
<Plugin df>
    MountPoint "/"
    MountPoint "/var"
    MountPoint "/home"
    IgnoreSelected false
    ReportByDevice false
    ReportInodes false
    ValuesAbsolute true
    ValuesPercentage true
</Plugin>

# System load averages
LoadPlugin load

# System uptime
LoadPlugin uptime

# User count
LoadPlugin users

# Process statistics
LoadPlugin processes
<Plugin processes>
    Process "apache2"
    Process "mysql"
    Process "nginx"
    ProcessMatch "java" "java.*"
</Plugin>

# System swap statistics
LoadPlugin swap
<Plugin swap>
    ReportByDevice false
    ReportBytes true
    ValuesAbsolute true
    ValuesPercentage true
</Plugin>

# =============================================================
# Output Plugins
# =============================================================

# Write data as round-robin database files (RRD)
LoadPlugin rrdtool
<Plugin rrdtool>
    DataDir "/var/lib/collectd/rrd"
    CreateFilesAsync false
    CacheTimeout 120
    CacheFlush   900
    WritesPerSecond 50
</Plugin>
EOF

sudo systemctl restart collectd
```

## Configuring Application Plugins

### MySQL Plugin

```bash
sudo tee /etc/collectd/collectd.conf.d/mysql.conf << 'EOF'
LoadPlugin mysql

<Plugin mysql>
    <Database "local">
        Host "localhost"
        User "root"
        Password "yourpassword"
        Database "mysql"
        SSLKey ""
        SSLCert ""
        SSLCA ""
        SSLCAPath ""
        SSLCipher ""
        ConnectTimeout 10
        InnodbStats true
        SlaveStats false
    </Database>
</Plugin>
EOF

sudo systemctl restart collectd
```

### Apache Plugin

```bash
# First, enable the Apache status module
# Add to Apache config:
sudo tee /etc/apache2/conf-available/status.conf << 'EOF'
<Location /server-status>
    SetHandler server-status
    Require local
</Location>
ExtendedStatus On
EOF

sudo a2enconf status
sudo systemctl reload apache2

# Configure Collectd Apache plugin
sudo tee /etc/collectd/collectd.conf.d/apache.conf << 'EOF'
LoadPlugin apache

<Plugin apache>
    <Instance "localhost">
        URL "http://localhost/server-status?auto"
        User ""
        Password ""
    </Instance>
</Plugin>
EOF

sudo systemctl restart collectd
```

### Nginx Plugin

```bash
# Enable nginx stub_status first
sudo tee /etc/nginx/conf.d/collectd-status.conf << 'EOF'
server {
    listen 127.0.0.1:8080;
    location /nginx_status {
        stub_status;
        allow 127.0.0.1;
        deny all;
    }
}
EOF

sudo nginx -t && sudo systemctl reload nginx

# Configure Collectd nginx plugin
sudo tee /etc/collectd/collectd.conf.d/nginx.conf << 'EOF'
LoadPlugin nginx

<Plugin nginx>
    URL "http://127.0.0.1:8080/nginx_status"
    User ""
    Password ""
</Plugin>
EOF

sudo systemctl restart collectd
```

### Disk Temperature and SMART Data

```bash
sudo apt install -y smartmontools

sudo tee /etc/collectd/collectd.conf.d/smart.conf << 'EOF'
LoadPlugin smart

<Plugin smart>
    Disk "sda"
    Disk "sdb"
    IgnoreSelected false
</Plugin>
EOF

sudo systemctl restart collectd
```

## Forwarding Data to InfluxDB

Collectd can write metrics to InfluxDB using the network plugin:

```bash
# Configure Collectd to write to InfluxDB
sudo tee /etc/collectd/collectd.conf.d/influxdb.conf << 'EOF'
LoadPlugin network

<Plugin network>
    # Send data to InfluxDB's Collectd input (UDP port 25826)
    <Server "192.168.1.50" "25826">
        SecurityLevel None
    </Server>
</Plugin>
EOF

sudo systemctl restart collectd

# InfluxDB configuration for receiving Collectd data
# In influxdb.conf, enable the Collectd input:
# [[inputs.collectd]]
#   port = 25826
#   bind_address = "0.0.0.0:25826"
#   database = "collectd"
#   retention_policy = ""
#   typesdb = "/usr/share/collectd/types.db"
```

## Forwarding Data to Graphite

```bash
sudo tee /etc/collectd/collectd.conf.d/graphite.conf << 'EOF'
LoadPlugin write_graphite

<Plugin write_graphite>
    <Node "graphite">
        Host "192.168.1.50"
        Port "2003"
        Protocol "tcp"
        LogSendErrors true
        # Prefix for metric names
        Prefix "collectd."
        # Postfix for metric names
        Postfix ""
        # Use metric name without type
        EscapeCharacter "_"
        AlwaysAppendDS false
        SeparateInstances false
        StoreRates false
        PreserveSeparator false
        DropDuplicateFields false
        ReverseHost false
    </Node>
</Plugin>
EOF

sudo systemctl restart collectd
```

## Exposing Metrics via HTTP (for Prometheus)

Collectd can expose metrics in various formats for Prometheus scraping:

```bash
# Write metrics in JSON for an HTTP endpoint
sudo apt install -y collectd-write-http 2>/dev/null || true

sudo tee /etc/collectd/collectd.conf.d/write_http.conf << 'EOF'
LoadPlugin write_http

<Plugin write_http>
    <Node "prometheus_pushgateway">
        URL "http://192.168.1.50:9091/metrics/job/collectd/instance/ubuntu-server-01"
        Format "JSON"
        StoreRates false
        BufferSize 65536
        LowSpeedLimit 0
        Timeout 0
        LogHttpError false
        Header "Content-Type: application/json"
    </Node>
</Plugin>
EOF

sudo systemctl restart collectd
```

## Viewing Collected Data

```bash
# List RRD files created by Collectd
find /var/lib/collectd/rrd -name "*.rrd" | head -20

# Read an RRD file value
rrdtool info /var/lib/collectd/rrd/ubuntu-server-01/cpu-0/cpu-user.rrd | head -20

# Fetch recent data from an RRD file
rrdtool fetch /var/lib/collectd/rrd/ubuntu-server-01/load/load.rrd AVERAGE \
  -s "now-1h" -e "now"

# Use collectdctl to inspect collected data
collectdctl listval | grep cpu

# Get a value
collectdctl getval ubuntu-server-01/cpu-0/cpu-user
```

## Custom Exec Plugin

The exec plugin runs scripts and reads metrics from their output:

```bash
# Create a custom collection script
sudo tee /usr/local/bin/collect-custom-metric.sh << 'EOF'
#!/bin/bash
# Custom Collectd metric collector

# Collectd expects output in this format:
# PUTVAL "hostname/plugin/type" interval=N timestamp:value

HOSTNAME=$(hostname -f)
TIMESTAMP=$(date +%s)

# Example: collect number of open files
OPEN_FILES=$(lsof 2>/dev/null | wc -l)
echo "PUTVAL \"${HOSTNAME}/exec-openfiles/gauge-count\" interval=60 ${TIMESTAMP}:${OPEN_FILES}"

# Example: collect a custom application metric
QUEUE_DEPTH=$(redis-cli -h localhost llen myqueue 2>/dev/null || echo 0)
echo "PUTVAL \"${HOSTNAME}/exec-redis/gauge-queue_depth\" interval=60 ${TIMESTAMP}:${QUEUE_DEPTH}"
EOF

sudo chmod +x /usr/local/bin/collect-custom-metric.sh

# Add exec plugin configuration
sudo tee /etc/collectd/collectd.conf.d/exec.conf << 'EOF'
LoadPlugin exec

<Plugin exec>
    Exec "nobody" "/usr/local/bin/collect-custom-metric.sh"
</Plugin>
EOF

sudo systemctl restart collectd
```

## Troubleshooting

```bash
# Check Collectd is running
sudo systemctl status collectd

# View Collectd logs
sudo journalctl -u collectd -n 100

# Run Collectd in debug mode (stops the service first)
sudo systemctl stop collectd
sudo collectd -f -C /etc/collectd/collectd.conf

# Verify plugins are loading
sudo collectdctl ping

# Check write queue statistics
sudo collectdctl listval | wc -l

# Test configuration syntax
sudo collectd -t -C /etc/collectd/collectd.conf
```

Collectd's lightweight footprint and plugin ecosystem make it practical for environments where resource overhead matters or where you need to feed data into existing infrastructure like Graphite or InfluxDB. Its exec plugin is particularly useful for collecting metrics from any script or application without requiring the application to expose a metrics endpoint directly.
