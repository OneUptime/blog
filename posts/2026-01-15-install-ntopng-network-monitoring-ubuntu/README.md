# How to Install ntopng for Network Monitoring on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ntopng, network monitoring, Ubuntu, traffic analysis, NetFlow, sFlow, network security, InfluxDB, SNMP

Description: A complete guide to installing, configuring, and using ntopng for comprehensive network traffic monitoring and analysis on Ubuntu systems.

---

Network monitoring is essential for maintaining healthy infrastructure, identifying security threats, and optimizing network performance. ntopng is a powerful, open-source network traffic monitoring tool that provides real-time visibility into network flows, bandwidth usage, and potential security issues. In this comprehensive guide, we'll walk through installing and configuring ntopng on Ubuntu, covering everything from basic setup to advanced integrations.

## What is ntopng?

ntopng (next generation ntop) is a high-performance, web-based network traffic analysis tool. It's the successor to the original ntop and offers significant improvements in performance, scalability, and features.

### Key Capabilities

- **Real-time Traffic Analysis**: Monitor live network traffic with detailed flow information
- **Deep Packet Inspection (DPI)**: Identify applications and protocols using nDPI library
- **Historical Data**: Store and analyze historical traffic data with time-series databases
- **Flow Collection**: Support for NetFlow v5/v9, sFlow, and IPFIX
- **Alert System**: Configurable alerts for bandwidth thresholds, security events, and anomalies
- **Geolocation**: Map traffic to geographic locations
- **Host Behavior Analysis**: Track and profile host communication patterns
- **Security Features**: Detect potential threats, port scans, and suspicious activities
- **SNMP Support**: Monitor network devices via SNMP
- **REST API**: Programmatic access for integration with other tools

## Prerequisites

Before installing ntopng, ensure your system meets the following requirements.

### System Requirements

The hardware requirements depend on the amount of traffic you plan to monitor.

```bash
# Minimum requirements for small networks (< 100 Mbps)
# - 2 CPU cores
# - 4 GB RAM
# - 20 GB disk space

# Recommended for medium networks (100 Mbps - 1 Gbps)
# - 4 CPU cores
# - 8 GB RAM
# - 100 GB SSD storage

# For high-traffic environments (> 1 Gbps)
# - 8+ CPU cores
# - 16+ GB RAM
# - Fast SSD storage (NVMe recommended)
# - Dedicated network interface for monitoring
```

### Update Your System

Start by updating your Ubuntu system to ensure all packages are current.

```bash
# Update package lists and upgrade existing packages
sudo apt update && sudo apt upgrade -y

# Install essential dependencies
sudo apt install -y software-properties-common wget curl gnupg apt-transport-https
```

### Check Ubuntu Version

ntopng supports Ubuntu 20.04, 22.04, and 24.04 LTS releases.

```bash
# Verify your Ubuntu version
lsb_release -a

# Check system architecture (ntopng supports x86_64 and ARM64)
uname -m
```

## Installation from Official Repository

The recommended way to install ntopng is from the official ntop repository, which provides the latest stable releases.

### Add the ntop Repository

First, add the official ntop repository to your system.

```bash
# Download and add the ntop repository GPG key
wget https://packages.ntop.org/apt-stable/bookworm/all/apt-ntop-stable.deb
sudo dpkg -i apt-ntop-stable.deb

# For Ubuntu, use the appropriate package
# Ubuntu 22.04 (Jammy)
wget https://packages.ntop.org/apt-stable/22.04/all/apt-ntop-stable.deb
sudo dpkg -i apt-ntop-stable.deb

# Ubuntu 24.04 (Noble)
wget https://packages.ntop.org/apt-stable/24.04/all/apt-ntop-stable.deb
sudo dpkg -i apt-ntop-stable.deb
```

### Install ntopng

Now install ntopng and its dependencies.

```bash
# Update package lists to include ntop repository
sudo apt update

# Install ntopng and required packages
sudo apt install -y ntopng ntopng-data

# The installation includes:
# - ntopng: Main application
# - ntopng-data: GeoIP databases and other data files
# - nDPI: Deep packet inspection library (installed as dependency)
```

### Verify Installation

Confirm that ntopng is installed correctly.

```bash
# Check ntopng version
ntopng --version

# View available command-line options
ntopng --help

# Check if the service is running
systemctl status ntopng
```

## Initial Configuration

ntopng uses a configuration file for persistent settings. Let's set up the basic configuration.

### Main Configuration File

Create or edit the main ntopng configuration file.

```bash
# Create the configuration directory if it doesn't exist
sudo mkdir -p /etc/ntopng

# Create the main configuration file
sudo nano /etc/ntopng/ntopng.conf
```

Add the following basic configuration.

```bash
# /etc/ntopng/ntopng.conf
# Basic ntopng configuration

# Network interface to monitor (use your actual interface name)
# Find interface names with: ip link show
-i=eth0

# Web server settings
# Listen on all interfaces (use 127.0.0.1 for localhost only)
-w=0.0.0.0:3000

# Data directory for storing ntopng data
-d=/var/lib/ntopng

# Enable local host detection
--local-networks="192.168.0.0/16,10.0.0.0/8,172.16.0.0/12"

# Set the DNS resolution mode
# 0 = Decode DNS responses and resolve local hosts
# 1 = Decode DNS responses and resolve all hosts
# 2 = Decode DNS responses only
# 3 = Don't decode DNS responses and don't resolve hosts
--dns-mode=1

# Disable login for initial setup (enable in production!)
# --disable-login=1

# Community edition settings
-G=/var/run/ntopng.pid
```

### Configure Network Interfaces

Identify the network interfaces you want to monitor.

```bash
# List all network interfaces
ip link show

# Show detailed interface information
ip addr show

# For monitoring a specific interface, note the interface name (e.g., eth0, ens33, enp0s3)
# You can also monitor multiple interfaces by specifying them in the config:
# -i=eth0
# -i=eth1

# For capturing traffic on a mirror/span port, ensure the interface is in promiscuous mode
sudo ip link set eth0 promisc on
```

### Start and Enable ntopng Service

Configure ntopng to start automatically at boot.

```bash
# Start the ntopng service
sudo systemctl start ntopng

# Enable ntopng to start on boot
sudo systemctl enable ntopng

# Check the service status
sudo systemctl status ntopng

# View ntopng logs for troubleshooting
sudo journalctl -u ntopng -f
```

## Web Interface Setup

ntopng provides a powerful web interface for monitoring and configuration.

### Access the Web Interface

Open your web browser and navigate to the ntopng web interface.

```bash
# Default URL (replace with your server's IP)
# http://your-server-ip:3000

# Default credentials:
# Username: admin
# Password: admin

# IMPORTANT: Change the default password immediately after first login!
```

### Initial Web Configuration

After logging in, configure the basic settings through the web interface.

```bash
# Navigate to Settings > Preferences to configure:

# 1. Interface Settings
#    - Select which interfaces to monitor
#    - Set interface speed for accurate bandwidth calculations

# 2. Host Settings
#    - Configure local networks
#    - Set host idle timeout
#    - Enable/disable host tracking features

# 3. Data Retention
#    - Configure how long to keep flow data
#    - Set timeseries resolution
```

### Configure Firewall Rules

If you're using UFW (Uncomplicated Firewall), allow access to ntopng.

```bash
# Allow access to ntopng web interface
sudo ufw allow 3000/tcp

# If using HTTPS (recommended for production)
sudo ufw allow 3001/tcp

# For NetFlow collection (if needed)
sudo ufw allow 2055/udp

# For sFlow collection (if needed)
sudo ufw allow 6343/udp

# Verify firewall rules
sudo ufw status
```

## Interface Monitoring Configuration

Configure ntopng to monitor specific network interfaces effectively.

### Monitor Multiple Interfaces

You can monitor multiple interfaces simultaneously.

```bash
# Edit the configuration to add multiple interfaces
sudo nano /etc/ntopng/ntopng.conf

# Add each interface on a separate line
# -i=eth0
# -i=eth1
# -i=wlan0

# Or combine them with a comma
# -i=eth0,eth1,wlan0
```

### Virtual Interface Monitoring

For virtualized environments, configure appropriate interface settings.

```bash
# For VMware virtual interfaces
-i=ens160

# For KVM/QEMU virtual interfaces
-i=virbr0

# For Docker bridge interface
-i=docker0

# For container network namespaces, you may need additional configuration
# to access traffic from within containers
```

### Mirror/SPAN Port Configuration

For comprehensive network monitoring, configure a mirror port on your switch.

```bash
# Once traffic is mirrored to your monitoring interface,
# ensure it's in promiscuous mode

# Create a script to set promiscuous mode on boot
sudo nano /etc/network/if-up.d/ntopng-promisc
```

Add the following content to the script.

```bash
#!/bin/bash
# Set promiscuous mode for ntopng monitoring interface

MONITOR_INTERFACE="eth1"

if [ "$IFACE" = "$MONITOR_INTERFACE" ]; then
    /sbin/ip link set $IFACE promisc on
fi
```

Make the script executable.

```bash
# Make the script executable
sudo chmod +x /etc/network/if-up.d/ntopng-promisc
```

## Flow Analysis and Traffic Classification

ntopng provides deep traffic analysis using nDPI (ntop Deep Packet Inspection).

### Understanding Traffic Categories

ntopng categorizes traffic into various application protocols.

```bash
# nDPI can identify over 300 protocols including:
# - Web: HTTP, HTTPS, HTTP/2, QUIC
# - Streaming: Netflix, YouTube, Spotify, Twitch
# - Social: Facebook, Twitter, Instagram, TikTok
# - Cloud: AWS, Azure, Google Cloud, Dropbox
# - Messaging: WhatsApp, Telegram, Signal, Slack
# - Gaming: Steam, PlayStation, Xbox, various game protocols
# - VPN: OpenVPN, WireGuard, IPSec, various commercial VPNs
# - P2P: BitTorrent, eDonkey, and other peer-to-peer protocols
```

### Configure Application Detection

Fine-tune application detection settings.

```bash
# Edit ntopng configuration
sudo nano /etc/ntopng/ntopng.conf

# Enable protocol detection features
--enable-tls-quic-hosts-detection

# Set packet inspection limits (higher values = more accurate detection)
# but with increased CPU usage
--max-num-flows=200000
--max-num-hosts=65536

# Configure protocol file for custom protocol definitions
--protocols-file=/etc/ntopng/protocols.txt
```

### Custom Protocol Definitions

Create custom protocol definitions for internal applications.

```bash
# Create a custom protocols file
sudo nano /etc/ntopng/protocols.txt

# Format: protocol_name host:port
# Example entries:
# internal_erp 192.168.1.100:8080
# custom_api 10.0.0.50:443
# monitoring_server 192.168.1.200:9090
```

### Traffic Policies

Configure traffic policies for bandwidth management insights.

```bash
# In the web interface, navigate to:
# Settings > Traffic Policies

# Create policies to:
# 1. Identify high-bandwidth users
# 2. Track specific application usage
# 3. Monitor compliance with acceptable use policies
# 4. Generate reports on traffic categories
```

## Alert Configuration

ntopng provides comprehensive alerting capabilities for proactive monitoring.

### Configure Alert Endpoints

Set up notification endpoints for alerts.

```bash
# Edit ntopng configuration for email alerts
sudo nano /etc/ntopng/ntopng.conf

# SMTP settings for email notifications
--smtp-server=smtp.yourserver.com
--smtp-port=587
--smtp-username=alerts@yourdomain.com
--smtp-password=your_smtp_password
--sender-address=ntopng@yourdomain.com
```

### Alert Types

Configure different types of alerts in the web interface.

```bash
# Navigate to Settings > Alerts in the web interface

# Available alert types:

# 1. Threshold Alerts
#    - Bandwidth exceeded
#    - Packets per second threshold
#    - Flow count threshold

# 2. Security Alerts
#    - Port scan detection
#    - SYN flood detection
#    - DNS anomalies
#    - Suspicious host behavior

# 3. Flow Alerts
#    - Long-lived flows
#    - Large flows
#    - Unusual protocols

# 4. SNMP Alerts
#    - Device unreachable
#    - Interface down
#    - High interface utilization
```

### Webhook Integration

Configure webhooks for integration with external systems.

```bash
# In the web interface, configure webhook endpoints:
# Settings > Notifications > Webhook

# Example webhook configuration:
# URL: https://your-webhook-endpoint.com/ntopng
# Method: POST
# Authentication: Bearer token or Basic auth

# The webhook payload includes:
# - Alert type and severity
# - Timestamp
# - Affected host/flow details
# - Additional context
```

### Create Custom Alert Scripts

Create custom scripts for specialized alert handling.

```bash
# Create a custom alert script directory
sudo mkdir -p /usr/local/share/ntopng/scripts/callbacks

# Create a custom alert handler
sudo nano /usr/local/share/ntopng/scripts/callbacks/custom_alert.lua
```

Example Lua script for custom alerts.

```lua
-- /usr/local/share/ntopng/scripts/callbacks/custom_alert.lua
-- Custom alert handler for ntopng

local json = require("dkjson")

function alert_handler(alert)
    -- Log the alert details
    local alert_json = json.encode(alert)

    -- Write to custom log file
    local log_file = io.open("/var/log/ntopng/custom_alerts.log", "a")
    if log_file then
        log_file:write(os.date("%Y-%m-%d %H:%M:%S") .. " - " .. alert_json .. "\n")
        log_file:close()
    end

    -- Send to external system via curl
    if alert.severity >= 3 then  -- High severity alerts
        os.execute("curl -X POST -H 'Content-Type: application/json' -d '" ..
                   alert_json .. "' https://your-alert-system.com/api/alerts")
    end
end

return {
    handler = alert_handler
}
```

## Historical Data with InfluxDB

For long-term data storage and analysis, integrate ntopng with InfluxDB.

### Install InfluxDB

Install InfluxDB 2.x for time-series data storage.

```bash
# Add InfluxDB repository
wget -q https://repos.influxdata.com/influxdata-archive_compat.key
echo '393e8779c89ac8d958f81f942f9ad7fb82a25e133faddaf92e15b16e6ac9ce4c influxdata-archive_compat.key' | sha256sum -c && cat influxdata-archive_compat.key | gpg --dearmor | sudo tee /etc/apt/trusted.gpg.d/influxdata-archive_compat.gpg > /dev/null

echo 'deb [signed-by=/etc/apt/trusted.gpg.d/influxdata-archive_compat.gpg] https://repos.influxdata.com/debian stable main' | sudo tee /etc/apt/sources.list.d/influxdata.list

# Update and install InfluxDB
sudo apt update
sudo apt install -y influxdb2

# Start and enable InfluxDB service
sudo systemctl start influxdb
sudo systemctl enable influxdb

# Verify InfluxDB is running
sudo systemctl status influxdb
```

### Configure InfluxDB

Set up InfluxDB for ntopng integration.

```bash
# Access InfluxDB setup via CLI
influx setup

# Follow the prompts to configure:
# - Username: admin
# - Password: your_secure_password
# - Organization: your_org
# - Bucket: ntopng (for storing ntopng data)
# - Retention period: 30d (or your preference)

# Generate an API token for ntopng
influx auth create \
  --org your_org \
  --description "ntopng token" \
  --read-bucket ntopng \
  --write-bucket ntopng
```

### Configure ntopng for InfluxDB

Update ntopng configuration to export data to InfluxDB.

```bash
# Edit ntopng configuration
sudo nano /etc/ntopng/ntopng.conf

# Add InfluxDB timeseries configuration
# For InfluxDB 2.x
--ts-driver=influxdb2
--ts-host=http://127.0.0.1:8086
--ts-organization=your_org
--ts-bucket=ntopng
--ts-token=your_influxdb_token

# Configure what data to export
--enable-users-login=1
--enable-minute-timeseries=1
--enable-5min-timeseries=1
--enable-hour-timeseries=1
--enable-day-timeseries=1
```

### InfluxDB Data Retention Policies

Configure data retention for optimal storage management.

```bash
# Create retention policies for different data resolutions
influx bucket update \
  --name ntopng \
  --retention 30d

# For longer retention with downsampled data, create additional buckets
influx bucket create \
  --name ntopng_weekly \
  --org your_org \
  --retention 365d

# Create a task to downsample data
influx task create --file /path/to/downsample_task.flux
```

Example Flux task for downsampling.

```flux
// downsample_task.flux
// Downsample ntopng data from 1-minute to 1-hour resolution

option task = {
    name: "ntopng_downsample",
    every: 1h
}

from(bucket: "ntopng")
    |> range(start: -2h, stop: -1h)
    |> filter(fn: (r) => r._measurement =~ /^host:/)
    |> aggregateWindow(every: 1h, fn: mean)
    |> to(bucket: "ntopng_weekly", org: "your_org")
```

## SNMP Integration

ntopng can monitor network devices via SNMP for comprehensive infrastructure visibility.

### Configure SNMP Monitoring

Enable SNMP device monitoring in ntopng.

```bash
# Edit ntopng configuration
sudo nano /etc/ntopng/ntopng.conf

# Enable SNMP monitoring
--snmp-community=public
--snmp-default-version=2c

# For SNMPv3 (recommended for security)
# Configure via web interface for per-device credentials
```

### Add SNMP Devices via Web Interface

Navigate to the web interface to add SNMP devices.

```bash
# In ntopng web interface:
# 1. Go to Devices > SNMP
# 2. Click "Add Device"
# 3. Enter device details:
#    - IP Address: 192.168.1.1
#    - Community String: your_community (for v1/v2c)
#    - SNMP Version: 2c or 3
#    - For v3: Username, Auth Protocol, Auth Password, Priv Protocol, Priv Password
# 4. Set polling interval (default: 5 minutes)
# 5. Click "Add"
```

### SNMP Device Configuration Examples

Configure different types of network devices.

```bash
# For Cisco devices
# Community: public (default, change in production)
# OIDs monitored:
#   - ifInOctets / ifOutOctets (interface traffic)
#   - ifOperStatus (interface status)
#   - sysUpTime (device uptime)
#   - cpmCPUTotal5min (CPU utilization)
#   - ciscoMemoryPoolUsed (memory usage)

# For Linux servers (with snmpd installed)
sudo apt install snmpd

# Configure /etc/snmp/snmpd.conf
# rocommunity public 192.168.1.0/24
# syslocation "Server Room"
# syscontact admin@yourdomain.com
```

### SNMP Polling and Alerts

Configure SNMP-specific monitoring settings.

```bash
# In the web interface, configure SNMP alerts:
# Settings > SNMP

# Available SNMP alerts:
# 1. Interface down/up
# 2. High interface utilization (configurable threshold)
# 3. Device unreachable
# 4. High CPU/memory usage (device-specific)
# 5. Port security violations

# Polling intervals:
# - Device discovery: Every 30 minutes
# - Interface status: Every 1 minute
# - Traffic counters: Every 5 minutes
```

## nProbe for NetFlow/sFlow Collection

For collecting flow data from network devices, use nProbe alongside ntopng.

### Install nProbe

Install nProbe for NetFlow/sFlow collection.

```bash
# nProbe is available from the ntop repository
sudo apt update
sudo apt install -y nprobe

# Verify installation
nprobe --version
```

### Configure nProbe for NetFlow Collection

Set up nProbe to collect NetFlow data.

```bash
# Create nProbe configuration file
sudo nano /etc/nprobe/nprobe.conf

# Basic NetFlow v9 collector configuration
# Listen for NetFlow on UDP port 2055
-i=none
--collector-port=2055

# Export to ntopng via ZMQ
--zmq=tcp://127.0.0.1:5556

# NetFlow version support
--netflow-version=9

# Template handling
--dont-drop-unknown-template

# Logging
-G=/var/run/nprobe.pid
```

### Configure nProbe for sFlow Collection

Set up sFlow collection from switches.

```bash
# Create sFlow collector configuration
sudo nano /etc/nprobe/nprobe-sflow.conf

# sFlow collector configuration
-i=none
--collector-port=6343
--collector-protocol=sflow

# Export to ntopng via ZMQ
--zmq=tcp://127.0.0.1:5557

# sFlow-specific settings
--sflow-sample-rate=1024

-G=/var/run/nprobe-sflow.pid
```

### Integrate nProbe with ntopng

Configure ntopng to receive data from nProbe.

```bash
# Edit ntopng configuration
sudo nano /etc/ntopng/ntopng.conf

# Add ZMQ interface for NetFlow data
-i=tcp://127.0.0.1:5556

# Add ZMQ interface for sFlow data
-i=tcp://127.0.0.1:5557

# You can now monitor both direct packet capture and flow data
# Example complete configuration:
# -i=eth0                          # Direct packet capture
# -i=tcp://127.0.0.1:5556          # NetFlow from nProbe
# -i=tcp://127.0.0.1:5557          # sFlow from nProbe
```

### Start nProbe Services

Create and start nProbe services.

```bash
# Start nProbe NetFlow collector
sudo systemctl start nprobe

# Start nProbe sFlow collector (if using separate instance)
sudo systemctl start nprobe-sflow

# Enable services on boot
sudo systemctl enable nprobe
sudo systemctl enable nprobe-sflow

# Restart ntopng to recognize new interfaces
sudo systemctl restart ntopng
```

## HTTPS Configuration

Secure your ntopng web interface with HTTPS.

### Generate SSL Certificates

Create SSL certificates for ntopng.

```bash
# Create directory for certificates
sudo mkdir -p /etc/ntopng/ssl

# Option 1: Generate self-signed certificate (for testing)
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ntopng/ssl/ntopng.key \
    -out /etc/ntopng/ssl/ntopng.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=ntopng.yourdomain.com"

# Set proper permissions
sudo chmod 600 /etc/ntopng/ssl/ntopng.key
sudo chmod 644 /etc/ntopng/ssl/ntopng.crt
sudo chown -R ntopng:ntopng /etc/ntopng/ssl
```

### Use Let's Encrypt Certificates

For production, use Let's Encrypt certificates.

```bash
# Install Certbot
sudo apt install -y certbot

# Generate certificate (standalone mode)
sudo certbot certonly --standalone -d ntopng.yourdomain.com

# Certificates will be stored in:
# /etc/letsencrypt/live/ntopng.yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/ntopng.yourdomain.com/privkey.pem

# Create symbolic links for ntopng
sudo ln -sf /etc/letsencrypt/live/ntopng.yourdomain.com/fullchain.pem /etc/ntopng/ssl/ntopng.crt
sudo ln -sf /etc/letsencrypt/live/ntopng.yourdomain.com/privkey.pem /etc/ntopng/ssl/ntopng.key
```

### Configure ntopng for HTTPS

Update ntopng configuration to use HTTPS.

```bash
# Edit ntopng configuration
sudo nano /etc/ntopng/ntopng.conf

# Disable HTTP and enable HTTPS
# Comment out or remove the HTTP line
# -w=0.0.0.0:3000

# Enable HTTPS
-W=0.0.0.0:3001

# Specify certificate paths
--https-cert=/etc/ntopng/ssl/ntopng.crt
--https-key=/etc/ntopng/ssl/ntopng.key

# Optional: Redirect HTTP to HTTPS
# -w=0.0.0.0:3000
# --http-redirect-https
```

### Restart ntopng with HTTPS

Apply the HTTPS configuration.

```bash
# Restart ntopng service
sudo systemctl restart ntopng

# Verify HTTPS is working
curl -k https://localhost:3001

# Update firewall rules
sudo ufw allow 3001/tcp
sudo ufw delete allow 3000/tcp  # Remove HTTP if only using HTTPS
```

## User Management

Configure user accounts and access control in ntopng.

### Create Additional Users

Create users with different permission levels.

```bash
# In the web interface:
# 1. Navigate to Settings > Users
# 2. Click "Add User"
# 3. Configure user details:
#    - Username
#    - Full Name
#    - Password
#    - Role: Administrator / Unprivileged / Limited View
#    - Allowed Networks (optional restriction)
#    - Allowed Interfaces (limit to specific interfaces)
```

### User Roles and Permissions

Understand the different user roles.

```bash
# Available user roles:

# 1. Administrator
#    - Full access to all features
#    - Can create/modify/delete users
#    - Can change system settings
#    - Access to all interfaces and data

# 2. Unprivileged User
#    - View-only access to monitoring data
#    - Cannot modify settings
#    - Can be restricted to specific interfaces

# 3. Limited View
#    - Restricted view access
#    - Only sees allowed networks/interfaces
#    - Ideal for department-specific monitoring
```

### LDAP/Active Directory Integration

Configure LDAP authentication for enterprise environments.

```bash
# Edit ntopng configuration
sudo nano /etc/ntopng/ntopng.conf

# Enable LDAP authentication
--ldap-server=ldap://ldap.yourdomain.com:389
--ldap-bind-dn=cn=ntopng,ou=services,dc=yourdomain,dc=com
--ldap-bind-password=your_bind_password
--ldap-search-base=ou=users,dc=yourdomain,dc=com
--ldap-user-search-filter=(sAMAccountName=%username%)
--ldap-group-search-filter=(member=%userdn%)
--ldap-admin-group=cn=ntopng-admins,ou=groups,dc=yourdomain,dc=com
```

### Session Management

Configure session settings for security.

```bash
# Edit ntopng configuration
sudo nano /etc/ntopng/ntopng.conf

# Session timeout (in seconds)
--user-session-timeout=3600

# Maximum concurrent sessions per user
--max-sessions-per-user=3

# Enable session logging
--enable-login-tracking
```

## API Usage

ntopng provides a comprehensive REST API for integration and automation.

### API Authentication

Obtain API credentials for programmatic access.

```bash
# Generate an API token in the web interface:
# Settings > Users > [Your User] > API Token

# Or use username/password with basic auth
# The API is available at: https://your-server:3001/lua/rest/v2/

# Example: Test API connection
curl -k -u admin:your_password \
    "https://localhost:3001/lua/rest/v2/get/interface/data.lua?ifid=0"
```

### Common API Endpoints

Here are frequently used API endpoints.

```bash
# Get interface statistics
curl -k -u admin:password \
    "https://localhost:3001/lua/rest/v2/get/interface/data.lua?ifid=0"

# Get host information
curl -k -u admin:password \
    "https://localhost:3001/lua/rest/v2/get/host/data.lua?ifid=0&host=192.168.1.100"

# Get active flows
curl -k -u admin:password \
    "https://localhost:3001/lua/rest/v2/get/flow/active.lua?ifid=0"

# Get top talkers
curl -k -u admin:password \
    "https://localhost:3001/lua/rest/v2/get/host/top_talkers.lua?ifid=0"

# Get alerts
curl -k -u admin:password \
    "https://localhost:3001/lua/rest/v2/get/alert/engaged.lua?ifid=0"

# Get historical traffic data
curl -k -u admin:password \
    "https://localhost:3001/lua/rest/v2/get/interface/timeseries.lua?ifid=0&ts_schema=iface:traffic&epoch_begin=1704067200&epoch_end=1704153600"
```

### Python API Client Example

Create a Python script to interact with ntopng API.

```python
#!/usr/bin/env python3
"""
ntopng API Client Example
Demonstrates how to interact with ntopng REST API
"""

import requests
import json
from urllib3.exceptions import InsecureRequestWarning

# Suppress SSL warnings for self-signed certificates
requests.packages.urllib3.disable_warnings(category=InsecureRequestWarning)

class NtopngClient:
    def __init__(self, host, username, password, port=3001, use_https=True):
        """Initialize ntopng API client"""
        protocol = "https" if use_https else "http"
        self.base_url = f"{protocol}://{host}:{port}/lua/rest/v2"
        self.auth = (username, password)
        self.verify_ssl = False  # Set to True with valid certificates

    def get_interfaces(self):
        """Get list of monitored interfaces"""
        url = f"{self.base_url}/get/ntopng/interfaces.lua"
        response = requests.get(url, auth=self.auth, verify=self.verify_ssl)
        return response.json()

    def get_interface_stats(self, ifid=0):
        """Get statistics for a specific interface"""
        url = f"{self.base_url}/get/interface/data.lua"
        params = {"ifid": ifid}
        response = requests.get(url, auth=self.auth, params=params, verify=self.verify_ssl)
        return response.json()

    def get_active_hosts(self, ifid=0):
        """Get list of active hosts"""
        url = f"{self.base_url}/get/host/active.lua"
        params = {"ifid": ifid}
        response = requests.get(url, auth=self.auth, params=params, verify=self.verify_ssl)
        return response.json()

    def get_host_details(self, ifid, host):
        """Get detailed information about a specific host"""
        url = f"{self.base_url}/get/host/data.lua"
        params = {"ifid": ifid, "host": host}
        response = requests.get(url, auth=self.auth, params=params, verify=self.verify_ssl)
        return response.json()

    def get_active_flows(self, ifid=0):
        """Get list of active flows"""
        url = f"{self.base_url}/get/flow/active.lua"
        params = {"ifid": ifid}
        response = requests.get(url, auth=self.auth, params=params, verify=self.verify_ssl)
        return response.json()

    def get_alerts(self, ifid=0):
        """Get current alerts"""
        url = f"{self.base_url}/get/alert/engaged.lua"
        params = {"ifid": ifid}
        response = requests.get(url, auth=self.auth, params=params, verify=self.verify_ssl)
        return response.json()


# Example usage
if __name__ == "__main__":
    # Initialize client
    client = NtopngClient(
        host="localhost",
        username="admin",
        password="your_password",
        port=3001
    )

    # Get interface statistics
    interfaces = client.get_interfaces()
    print("Interfaces:", json.dumps(interfaces, indent=2))

    # Get interface stats
    stats = client.get_interface_stats(ifid=0)
    print("Interface Stats:", json.dumps(stats, indent=2))

    # Get active hosts
    hosts = client.get_active_hosts(ifid=0)
    print("Active Hosts:", json.dumps(hosts, indent=2))
```

### Bash API Script Example

Create a bash script for quick API queries.

```bash
#!/bin/bash
# ntopng API query script

# Configuration
NTOPNG_HOST="localhost"
NTOPNG_PORT="3001"
NTOPNG_USER="admin"
NTOPNG_PASS="your_password"
BASE_URL="https://${NTOPNG_HOST}:${NTOPNG_PORT}/lua/rest/v2"

# Function to make API calls
api_call() {
    local endpoint=$1
    local params=$2
    curl -s -k -u "${NTOPNG_USER}:${NTOPNG_PASS}" \
        "${BASE_URL}/${endpoint}?${params}" | jq .
}

# Get interface statistics
echo "=== Interface Statistics ==="
api_call "get/interface/data.lua" "ifid=0"

# Get top talkers
echo "=== Top Talkers ==="
api_call "get/host/top_talkers.lua" "ifid=0"

# Get current alerts
echo "=== Current Alerts ==="
api_call "get/alert/engaged.lua" "ifid=0"

# Get traffic timeseries (last hour)
EPOCH_END=$(date +%s)
EPOCH_BEGIN=$((EPOCH_END - 3600))
echo "=== Traffic Last Hour ==="
api_call "get/interface/timeseries.lua" "ifid=0&ts_schema=iface:traffic&epoch_begin=${EPOCH_BEGIN}&epoch_end=${EPOCH_END}"
```

## Troubleshooting

Common issues and their solutions when running ntopng.

### Service Won't Start

Diagnose and fix ntopng startup issues.

```bash
# Check service status and logs
sudo systemctl status ntopng
sudo journalctl -u ntopng -n 100 --no-pager

# Common issues and solutions:

# 1. Port already in use
sudo lsof -i :3000
# Solution: Change port in ntopng.conf or stop conflicting service

# 2. Permission denied on interface
sudo setcap cap_net_raw,cap_net_admin=eip /usr/bin/ntopng
# Or run ntopng as root (not recommended for production)

# 3. Missing data directory
sudo mkdir -p /var/lib/ntopng
sudo chown ntopng:ntopng /var/lib/ntopng

# 4. Invalid configuration
ntopng --check-config -F /etc/ntopng/ntopng.conf
```

### No Traffic Detected

Troubleshoot traffic capture issues.

```bash
# Verify interface is up and receiving traffic
ip link show eth0
cat /sys/class/net/eth0/statistics/rx_packets

# Check if interface is in promiscuous mode
ip link show eth0 | grep PROMISC

# Enable promiscuous mode if needed
sudo ip link set eth0 promisc on

# Test packet capture with tcpdump
sudo tcpdump -i eth0 -c 10

# Check ntopng is monitoring the correct interface
grep "^-i=" /etc/ntopng/ntopng.conf

# Verify no firewall blocking
sudo iptables -L -n | grep DROP
```

### High CPU Usage

Optimize ntopng for better performance.

```bash
# Edit configuration to reduce resource usage
sudo nano /etc/ntopng/ntopng.conf

# Reduce tracked flows and hosts
--max-num-flows=100000
--max-num-hosts=32768

# Disable expensive features if not needed
--disable-dns-resolution
--disable-host-name-resolution

# Reduce timeseries resolution
--disable-minute-timeseries

# Increase idle timeouts to reduce flow churn
--host-idle-timeout=600
--flow-idle-timeout=60

# Consider using packet sampling on high-traffic interfaces
# (requires hardware/driver support)
```

### Database Issues

Troubleshoot data storage problems.

```bash
# Check disk space
df -h /var/lib/ntopng

# Check Redis connection (ntopng uses Redis for caching)
redis-cli ping
systemctl status redis

# Clear ntopng cache if corrupted
sudo systemctl stop ntopng
sudo rm -rf /var/lib/ntopng/cache/*
sudo systemctl start ntopng

# For InfluxDB issues
influx ping
sudo journalctl -u influxdb -n 50

# Check InfluxDB bucket size
influx bucket list
```

### Web Interface Issues

Fix web interface access problems.

```bash
# Test local connectivity
curl -v http://localhost:3000

# Check binding address
netstat -tlnp | grep ntopng

# Verify SSL certificates (for HTTPS)
openssl x509 -in /etc/ntopng/ssl/ntopng.crt -text -noout

# Check certificate permissions
ls -la /etc/ntopng/ssl/

# Test HTTPS connection
curl -kv https://localhost:3001

# Browser cache issues - try incognito mode
# or clear browser cache
```

### Log Analysis

Use logs for troubleshooting.

```bash
# View ntopng logs in real-time
sudo journalctl -u ntopng -f

# Export logs to file for analysis
sudo journalctl -u ntopng --since "1 hour ago" > ntopng_logs.txt

# Enable debug logging (temporarily)
sudo nano /etc/ntopng/ntopng.conf
# Add: --verbose=6

# Restart to apply
sudo systemctl restart ntopng

# Remember to disable debug logging after troubleshooting
# as it can fill disks quickly
```

### Network-Related Troubleshooting

Diagnose network configuration issues.

```bash
# Check interface configuration
ip addr show
ip route show

# Verify VLAN traffic (if monitoring VLAN-tagged traffic)
sudo tcpdump -i eth0 -e -c 10 | grep -i vlan

# Check for hardware offloading issues
ethtool -k eth0 | grep -E "(tcp-segmentation|generic-receive)"

# Disable offloading features that can interfere with capture
sudo ethtool -K eth0 gro off
sudo ethtool -K eth0 tso off
sudo ethtool -K eth0 gso off
```

## Conclusion

ntopng is a powerful network monitoring solution that provides deep visibility into your network traffic. With proper configuration, you can:

- Monitor real-time traffic across multiple interfaces
- Identify applications and protocols using deep packet inspection
- Collect and analyze flow data from network devices
- Set up alerts for bandwidth thresholds and security events
- Store historical data for trend analysis and capacity planning
- Integrate with external systems via REST API

For comprehensive infrastructure monitoring that goes beyond network traffic analysis, consider **OneUptime**. OneUptime provides unified monitoring for your entire stack including:

- **Server Monitoring**: CPU, memory, disk, and process monitoring
- **Application Performance Monitoring**: Track response times and errors across your applications
- **Synthetic Monitoring**: Proactively test your services from multiple global locations
- **Incident Management**: Automated alerting, on-call scheduling, and incident response workflows
- **Status Pages**: Keep your users informed with real-time status updates
- **Log Management**: Centralized logging with powerful search and analysis

Combine ntopng's detailed network insights with OneUptime's comprehensive monitoring platform for complete visibility into your infrastructure. Visit [oneuptime.com](https://oneuptime.com) to learn more about how OneUptime can help you maintain reliable, high-performing systems.
