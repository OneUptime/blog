# How to Set Up ntopng for Network Traffic Analysis on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Network Monitoring, ntopng, Traffic Analysis, Networking

Description: Install and configure ntopng on Ubuntu for real-time network traffic analysis, including flow monitoring, protocol detection, and traffic visualization.

---

Understanding what is actually happening on your network requires more than just bandwidth graphs. ntopng (network top, next generation) provides deep packet inspection, flow tracking, protocol analysis, and host-based traffic statistics in real time through a web interface. It is the practical choice for network administrators who need to answer questions like "which host is consuming the most bandwidth", "what protocols are in use on this subnet", and "is there any anomalous traffic".

## How ntopng Works

ntopng reads network traffic from:
- A network interface in promiscuous mode (sees all traffic on the wire/switch)
- An nProbe flow collector (receives NetFlow/sFlow from routers)
- PF_RING (high-speed packet capture for busy networks)

It processes packets into flows, identifies protocols using deep packet inspection, and presents the results in a web dashboard. The free Community Edition handles most monitoring needs. Enterprise editions add alerting, threat intelligence, and longer data retention.

## Install ntopng

ntopng provides official packages for Ubuntu:

```bash
# Add the ntop repository
wget https://packages.ntop.org/apt-stable/22.04/all/apt-ntop-stable.deb
sudo dpkg -i apt-ntop-stable.deb

sudo apt-get update
sudo apt-get install -y ntopng

# Verify installation
ntopng --version
```

For Ubuntu 24.04:

```bash
wget https://packages.ntop.org/apt-stable/24.04/all/apt-ntop-stable.deb
sudo dpkg -i apt-ntop-stable.deb
sudo apt-get update
sudo apt-get install -y ntopng
```

## Configure ntopng

The main configuration file is `/etc/ntopng/ntopng.conf`:

```bash
sudo nano /etc/ntopng/ntopng.conf
```

```ini
# Network interface to monitor
# Use 'any' to capture on all interfaces
# Or specify an interface like eth0, ens3
-i=ens3

# Listen port for the web interface
-w=3000

# Data directory
-d=/var/lib/ntopng

# Admin password (change this)
# Set once; ntopng hashes and stores it
# After first run, manage through the UI
-A=strongpassword

# Local networks (comma-separated CIDR notation)
# Used to distinguish local vs remote hosts
-m=192.168.1.0/24,10.0.0.0/8,172.16.0.0/12

# Enable GeoIP for geographic visualization
# (requires MaxMind database - see below)

# Log verbosity (0=errors only, 6=debug)
-v=4

# Maximum number of flows to track
--max-num-flows=50000

# Maximum number of hosts to track
--max-num-hosts=25000

# How long to retain flow data in days
--lifetime=7
```

```bash
# Start ntopng
sudo systemctl enable --now ntopng

# Verify it is running
sudo systemctl status ntopng

# Check what port it is listening on
ss -tlnp | grep ntopng
```

## Access the Web Interface

```bash
# If accessing from the local machine
# Open a browser to http://localhost:3000

# If accessing from a remote machine, forward the port via SSH
ssh -L 3000:localhost:3000 ubuntu@server-ip

# Then open http://localhost:3000 in your local browser

# Default login: admin / admin (or the password set in config)
# Change the password immediately after first login
```

The web interface shows:

- **Dashboard** - live traffic charts, top talkers, top protocols
- **Hosts** - per-host traffic breakdown, geo-location, application detection
- **Flows** - active connections with protocol, bytes, and duration
- **Interfaces** - per-interface statistics
- **Charts** - historical traffic graphs
- **Alerts** - threshold-based and behavioral alerts (Enterprise)

## Monitor Specific Interfaces

If you have multiple network interfaces and only want to monitor specific ones:

```bash
# Monitor multiple interfaces
sudo nano /etc/ntopng/ntopng.conf
```

```ini
# Monitor two interfaces separately
-i=ens3
-i=ens4

# Or monitor a bridge or bond interface
-i=bond0
```

```bash
sudo systemctl restart ntopng
```

## Capture from Multiple Sources

### NetFlow/IPFIX from Routers

For monitoring traffic on a router or firewall (not directly capturing on the Ubuntu host), configure the router to send NetFlow and ntopng to receive it:

```bash
# Install nProbe (ntop's flow collector)
sudo apt-get install -y nprobe

# Configure nProbe to receive NetFlow and forward to ntopng
sudo nano /etc/nprobe/nprobe.conf
```

```ini
# Listen for NetFlow on UDP port 2055
-i=none
--collector-port=2055

# Forward to ntopng's ZMQ interface
-P=tcp://127.0.0.1:5556

# Local network hint
-m=192.168.1.0/24
```

```bash
# Update ntopng to receive from nProbe
sudo nano /etc/ntopng/ntopng.conf
```

```ini
# Use ZMQ to receive from nProbe instead of direct capture
-i=tcp://127.0.0.1:5556
```

```bash
sudo systemctl enable --now nprobe
sudo systemctl restart ntopng
```

## Configure GeoIP for Geographic Visualization

ntopng uses MaxMind's GeoLite2 database for mapping IPs to countries and cities:

```bash
# Set up MaxMind database (free account required at maxmind.com)
sudo apt-get install -y geoipupdate

sudo nano /etc/GeoIP.conf
```

```
AccountID YOUR_ACCOUNT_ID
LicenseKey YOUR_LICENSE_KEY
EditionIDs GeoLite2-Country GeoLite2-City GeoLite2-ASN
```

```bash
# Download the databases
sudo geoipupdate

# Configure ntopng to use them
sudo nano /etc/ntopng/ntopng.conf
```

```ini
# Path to GeoIP databases
--geoip-database-path=/var/lib/GeoIP
```

```bash
sudo systemctl restart ntopng
```

## Set Up Custom Alert Thresholds

ntopng Community Edition supports basic threshold alerts via the web UI:

1. Navigate to **Settings > Alerts**
2. Configure thresholds for:
   - Host exceeds X Mbps
   - Flow duration exceeds Y minutes
   - New host discovered on network

For script-based alerting, use the ntopng REST API:

```bash
# Query current traffic via API
curl -s -u admin:password \
    "http://localhost:3000/lua/rest/v2/get/host/active.lua?ifid=0" | \
    python3 -m json.tool | head -50

# Get top talkers
curl -s -u admin:password \
    "http://localhost:3000/lua/rest/v2/get/interface/top_hosts.lua?ifid=0&max_hits=10" | \
    python3 -m json.tool
```

## Firewall Configuration for Access

```bash
# Allow ntopng web interface from your management network
sudo ufw allow from 192.168.1.0/24 to any port 3000 proto tcp comment "ntopng web UI"

# If receiving NetFlow from routers
sudo ufw allow 2055/udp comment "NetFlow collector"

# Block external access to the web interface
sudo ufw deny 3000/tcp
```

## Tune ntopng Performance

For high-traffic networks, tune ntopng's resource usage:

```bash
sudo nano /etc/ntopng/ntopng.conf
```

```ini
# Increase flow capacity for busy networks
--max-num-flows=200000
--max-num-hosts=100000

# Use Redis for session storage (install redis-server first)
--redis=127.0.0.1:6379

# Limit CPU cores
--cpu-affinity=0,1,2,3

# Reduce data retention to save disk space
--lifetime=3

# Set disk usage limit for the data directory
--local-networks-and-hosts 192.168.1.0/24
```

For very high-speed networks (multiple Gbps), install PF_RING for kernel-level packet capture that avoids the overhead of normal socket-based capture:

```bash
sudo apt-get install -y pfring pfring-dkms
sudo modprobe pf_ring enable_tx_capture=0 min_num_slots=65536

# Use PF_RING interface
# Change the interface line in ntopng.conf to:
# -i=zc:ens3  (for PF_RING ZC drivers, hardware dependent)
```

## Monitor ntopng Health

```bash
# Check memory and CPU usage
sudo systemctl status ntopng
ps aux | grep ntopng

# Check the ntopng log
sudo journalctl -u ntopng -n 100

# Check data directory size
du -sh /var/lib/ntopng/

# Clean up old data if disk is filling up
# Through the web UI: Settings > Data Management > Flush Data
# Or via CLI:
sudo systemctl stop ntopng
sudo rm -rf /var/lib/ntopng/rrd
sudo systemctl start ntopng
```

## Export Data for External Analysis

```bash
# Export flow data via the REST API
curl -s -u admin:password \
    "http://localhost:3000/lua/rest/v2/get/flow/active.lua?ifid=0&max_hits=100" | \
    python3 -m json.tool > /tmp/flows-$(date +%Y%m%d-%H%M).json

# Collect data periodically
echo "*/5 * * * * root curl -s -u admin:password \
    'http://localhost:3000/lua/rest/v2/get/interface/data.lua?ifid=0' >> \
    /var/log/ntopng-data.jsonl" | \
    sudo tee /etc/cron.d/ntopng-export
```

ntopng provides a level of network visibility that is difficult to achieve with simpler tools. Once running, you will quickly build an accurate picture of what is happening on your network - which services are consuming bandwidth, which hosts are communicating with unexpected destinations, and where performance bottlenecks are occurring.
