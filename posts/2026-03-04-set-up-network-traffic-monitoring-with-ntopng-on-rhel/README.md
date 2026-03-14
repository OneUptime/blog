# How to Set Up Network Traffic Monitoring with ntopng on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ntopng, Network Monitoring, Traffic Analysis, Security

Description: Install and configure ntopng on RHEL to monitor network traffic in real time with a web-based interface showing flows, protocols, and top talkers.

---

ntopng is a network traffic analysis tool that provides a web-based dashboard for monitoring flows, protocols, hosts, and bandwidth usage in real time.

## Install ntopng

```bash
# Add the ntop repository
sudo tee /etc/yum.repos.d/ntop.repo << 'REPO'
[ntop]
name=ntop packages
baseurl=https://packages.ntop.org/centos/$releasever/$basearch/
enabled=1
gpgcheck=1
gpgkey=https://packages.ntop.org/centos/RPM-GPG-KEY-packages.ntop.org
REPO

# Install ntopng and its dependencies
sudo dnf install -y ntopng nDPI

# If pfring is available for better packet capture:
sudo dnf install -y pfring
```

## Configure ntopng

```bash
# Edit the ntopng configuration
sudo tee /etc/ntopng/ntopng.conf << 'CONF'
# Web interface settings
-w=3000

# Interface to monitor
-i=ens192

# Data directory
-d=/var/lib/ntopng

# DNS resolution mode (1 = decode, 0 = no decode)
-n=1

# Local networks (skip detailed tracking for external)
--local-networks="192.168.1.0/24,10.0.0.0/8"

# Disable login for initial setup (re-enable in production)
#--disable-login
CONF
```

## Start ntopng

```bash
# Enable and start ntopng
sudo systemctl enable --now ntopng

# Check the status
sudo systemctl status ntopng
```

## Open the Firewall

```bash
# Allow the ntopng web interface port
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## Access the Web Interface

Open a browser and navigate to:

```bash
http://your-server-ip:3000
```

Default credentials are `admin` / `admin`. Change the password on first login.

## Using ntopng

The web dashboard provides:

```bash
# Key pages to explore:
# - Dashboard: Overall traffic summary
# - Flows: Active network connections
# - Hosts: Top communicating hosts
# - Interfaces: Per-interface statistics
# - Alerts: Security and performance alerts
```

## Command-Line Monitoring

```bash
# Check ntopng statistics via the API
curl -u admin:admin http://localhost:3000/lua/rest/v2/get/interface/data.lua

# Export flow data
curl -u admin:admin "http://localhost:3000/lua/rest/v2/get/flow/active.lua"
```

## Performance Tuning

```bash
# For high-traffic interfaces, increase the capture buffer
# Add to /etc/ntopng/ntopng.conf:
# --capture-direction=2
# --max-num-flows=200000
# --max-num-hosts=200000

# Restart after changes
sudo systemctl restart ntopng
```

ntopng provides deep visibility into network traffic patterns and can help identify bandwidth hogs, security anomalies, and misconfigured applications.
