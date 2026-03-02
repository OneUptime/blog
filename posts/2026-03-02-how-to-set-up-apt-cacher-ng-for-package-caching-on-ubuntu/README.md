# How to Set Up APT Cacher NG for Package Caching on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, APT, Package Caching, Network, System Administration

Description: Learn how to install and configure APT Cacher NG on Ubuntu to cache Debian and Ubuntu package downloads, reducing bandwidth usage and speeding up package installations across multiple machines.

---

APT Cacher NG is a proxy server specifically designed for caching Debian and Ubuntu package downloads. When multiple Ubuntu machines share the same network, without a cache each one downloads packages independently from the internet. With APT Cacher NG in place, the first machine to request a package downloads it, subsequent requests are served from the local cache - dramatically reducing bandwidth and making updates faster on slow or metered connections. This is particularly valuable in environments with many virtual machines, CI/CD runners, or developer workstations.

## Installing APT Cacher NG

APT Cacher NG is available in Ubuntu's package repositories and installs cleanly:

```bash
# Install apt-cacher-ng
sudo apt-get update
sudo apt-get install -y apt-cacher-ng

# Start and enable the service
sudo systemctl enable --now apt-cacher-ng

# Verify it's running
sudo systemctl status apt-cacher-ng

# Check the default port (3142)
ss -tlnp | grep 3142
```

The cache starts working immediately after installation with sensible defaults.

## Basic Configuration

The main configuration file is `/etc/apt-cacher-ng/acng.conf`. Review and adjust key settings:

```bash
sudo nano /etc/apt-cacher-ng/acng.conf
```

Important settings to review:

```conf
# /etc/apt-cacher-ng/acng.conf

# Directory where cached packages are stored
CacheDir: /var/cache/apt-cacher-ng

# Log directory
LogDir: /var/log/apt-cacher-ng

# Port to listen on (default 3142)
Port: 3142

# Bind to specific interface (empty = all interfaces)
# For security, bind to internal interface only
BindAddress: 192.168.1.100 localhost

# Maximum cache age for volatile data (Release files, Packages lists)
# 0 = check upstream on every request
ExTreshold: 4

# Maximum disk space for cache (in MB, 0 = unlimited)
# Set a limit to prevent the cache from filling your disk
# DiskFreeThreshold: 10
# CacheSizeMax: 50000  # 50GB maximum cache size

# Enable the web interface for statistics
ReportPage: acng-report.html

# Log format
VerboseLog: 0

# Allow CONNECT tunneling for HTTPS
PassThroughPattern: .*
```

After making changes, restart the service:

```bash
sudo systemctl restart apt-cacher-ng
```

## Configuring Client Machines

Each machine that should use the cache needs to point APT at the proxy.

### Method 1: APT Proxy Configuration File

```bash
# On each client machine, create a proxy configuration file
# Replace 192.168.1.100 with your APT Cacher NG server's IP address
echo 'Acquire::http::Proxy "http://192.168.1.100:3142";' | \
  sudo tee /etc/apt/apt.conf.d/01proxy

# Test by running apt-get update
sudo apt-get update
```

### Method 2: Proxy Auto-Detection

For networks where the server address may change, use auto-proxy detection:

```bash
# Install squid-deb-proxy-client which handles auto-detection
sudo apt-get install -y squid-deb-proxy-client

# This automatically discovers the proxy using avahi/mDNS
# Requires avahi-daemon on the server
sudo apt-get install -y avahi-daemon
```

### Method 3: Per-Session Proxy

For testing or one-off use:

```bash
# Set proxy for a single apt-get run
sudo apt-get -o Acquire::http::Proxy="http://192.168.1.100:3142" update
sudo apt-get -o Acquire::http::Proxy="http://192.168.1.100:3142" install nginx
```

### Configuring Docker Containers to Use the Cache

For Docker builds that need APT packages, pass the proxy setting as a build argument:

```dockerfile
# Dockerfile
FROM ubuntu:22.04

# Accept proxy as build argument
ARG APT_PROXY=""

# Configure proxy if provided
RUN if [ -n "$APT_PROXY" ]; then \
      echo "Acquire::http::Proxy \"$APT_PROXY\";" > /etc/apt/apt.conf.d/01proxy; \
    fi

RUN apt-get update && apt-get install -y \
    nginx \
    curl \
    && rm -rf /var/lib/apt/lists/*
```

Build with the proxy:

```bash
docker build --build-arg APT_PROXY="http://192.168.1.100:3142" -t myimage .
```

## Caching HTTPS Repositories

APT Cacher NG handles HTTP repositories natively. For HTTPS repositories (increasingly common with third-party repos), you need to configure transparent pass-through or SSL bumping.

### Pass-Through for HTTPS (Recommended)

The simplest approach is configuring specific HTTPS repositories to pass through as tunnels:

```conf
# /etc/apt-cacher-ng/acng.conf

# Allow HTTPS tunneling (CONNECT method) for these domains
# APT Cacher NG won't cache HTTPS content, but won't block it either
PassThroughPattern: (security\.ubuntu\.com|packages\.microsoft\.com|download\.docker\.com):443
```

On the client side, configure HTTPS repositories to bypass the proxy:

```bash
# /etc/apt/apt.conf.d/01proxy - Different settings for HTTP and HTTPS
Acquire::http::Proxy "http://192.168.1.100:3142";
# Don't proxy HTTPS - go direct
Acquire::https::Proxy "DIRECT";
```

### SSL Bumping for HTTPS Caching

For full HTTPS caching (more complex), APT Cacher NG can perform SSL inspection:

```bash
# Generate a CA certificate for SSL bumping
sudo openssl req -new -x509 -days 3650 -newkey rsa:4096 \
  -keyout /etc/apt-cacher-ng/ssl_key.pem \
  -out /etc/apt-cacher-ng/ssl_cert.pem \
  -nodes \
  -subj "/CN=APT Cacher NG SSL CA"

# On clients, install the CA certificate
sudo cp /etc/apt-cacher-ng/ssl_cert.pem /usr/local/share/ca-certificates/apt-cacher-ng.crt
sudo update-ca-certificates
```

## Managing the Cache

### Checking Cache Statistics

APT Cacher NG provides a web interface for statistics:

```bash
# Access the web interface
curl http://localhost:3142/acng-report.html

# Or open in a browser (if running locally)
xdg-open http://localhost:3142/acng-report.html
```

The web interface shows hit rate, cache size, traffic statistics, and top requested packages.

### Running Cache Expiration

Over time, the cache accumulates outdated package versions. Run expiration periodically to reclaim disk space:

```bash
# Trigger cache expiration via the web interface
curl "http://localhost:3142/acng-report.html?doExpire=Start+Expiration"

# Or use the command-line tool
sudo apt-cacher-ng-expiry

# Check disk usage before and after
du -sh /var/cache/apt-cacher-ng/
```

### Setting Up Automatic Expiration

```bash
# Create a weekly expiration cron job
sudo tee /etc/cron.weekly/apt-cacher-ng-expire << 'EOF'
#!/bin/bash
# Run APT Cacher NG cache expiration weekly
curl -s "http://localhost:3142/acng-report.html?doExpire=Start+Expiration" > /dev/null
logger "APT Cacher NG: Cache expiration triggered"
EOF

sudo chmod +x /etc/cron.weekly/apt-cacher-ng-expire
```

### Monitoring Cache Disk Usage

```bash
# Check cache size
du -sh /var/cache/apt-cacher-ng/

# Monitor log for hits and misses
tail -f /var/log/apt-cacher-ng/apt-cacher.log | \
  awk '{if (/MISS/) print "\033[0;31m"$0"\033[0m"; else print $0}'

# Count hits vs misses in the last hour
grep "$(date '+%Y-%m-%d %H')" /var/log/apt-cacher-ng/apt-cacher.log | \
  awk 'BEGIN{hits=0;miss=0} /HIT/{hits++} /MISS/{miss++} END{print "Hits:", hits, "Misses:", miss}'
```

## Security Considerations

### Firewall Rules

Restrict access to the APT Cacher NG port to your internal network:

```bash
# Allow APT Cacher NG port only from internal network (192.168.1.0/24)
sudo ufw allow from 192.168.1.0/24 to any port 3142 proto tcp
sudo ufw deny 3142

# Verify rules
sudo ufw status
```

### Binding to Specific Interface

Update the configuration to bind only to the internal interface:

```conf
# /etc/apt-cacher-ng/acng.conf
# Bind to internal network interface only (not exposed to internet)
BindAddress: 192.168.1.100 localhost
```

## Importing Existing Package Files

If you have packages already downloaded on other machines, import them into the cache to avoid re-downloading:

```bash
# Copy .deb files to a staging directory
sudo mkdir -p /tmp/import-packages
sudo cp /var/cache/apt/archives/*.deb /tmp/import-packages/

# Import via the web interface
curl "http://localhost:3142/acng-report.html?doImport=Start+Import&dir=/tmp/import-packages"

# Or place files directly in the cache directory structure
# The directory structure mirrors the repository layout
```

## Verifying the Cache is Working

From a client machine, check that packages come from the cache:

```bash
# Run apt-get update and watch for the proxy in the output
sudo apt-get update -o Debug::Acquire::http=true 2>&1 | grep -E "proxy|3142"

# Check a package download shows cache hit
sudo apt-get install -y --download-only wget 2>&1
# Look for "From cache" or similar in the APT Cacher NG logs
sudo grep "wget" /var/log/apt-cacher-ng/apt-cacher.log | tail -3
```

APT Cacher NG is one of the highest-ROI infrastructure investments for Ubuntu-heavy environments. A single server with a modest cache significantly reduces both bandwidth costs and package installation times, with minimal ongoing maintenance once configured.
