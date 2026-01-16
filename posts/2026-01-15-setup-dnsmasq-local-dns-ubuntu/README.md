# How to Set Up dnsmasq as a Local DNS Server on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, dnsmasq, DNS, DHCP, Network, Tutorial

Description: Complete guide to setting up dnsmasq for local DNS and DHCP services on Ubuntu.

---

## Introduction

Managing DNS and DHCP services on a local network can significantly improve network performance, provide better control over name resolution, and enable features like ad blocking at the network level. **dnsmasq** is a lightweight, easy-to-configure DNS forwarder and DHCP server that is perfect for small to medium-sized networks, home labs, and development environments.

In this comprehensive guide, we will walk through setting up dnsmasq as a local DNS server on Ubuntu, covering everything from basic installation to advanced configurations like DNS caching, DHCP services, and DNS-based ad blocking.

## Understanding dnsmasq

### What is dnsmasq?

dnsmasq is a lightweight DNS, DHCP, and TFTP server designed for small networks. It provides:

- **DNS Forwarding**: Forwards DNS queries to upstream servers while caching results locally
- **DNS Caching**: Caches DNS responses to speed up repeated queries
- **Local DNS**: Resolves local hostnames without needing a full-fledged DNS server
- **DHCP Server**: Assigns IP addresses to devices on your network
- **TFTP Server**: Supports network booting (PXE)

### Why Use dnsmasq?

| Feature | Benefit |
|---------|---------|
| Lightweight | Minimal resource usage, runs efficiently on low-powered devices |
| Easy Configuration | Single configuration file with intuitive syntax |
| DNS Caching | Faster DNS resolution for frequently accessed domains |
| Local Hostnames | Easy internal name resolution without editing `/etc/hosts` on every machine |
| Ad Blocking | Block ads and malware at the DNS level for all network devices |
| DHCP Integration | Combined DNS and DHCP means automatic DNS registration |

## Prerequisites

Before we begin, ensure you have:

- Ubuntu 20.04, 22.04, or 24.04 (this guide works on all recent LTS versions)
- Root or sudo access
- A static IP address configured on your server
- Basic familiarity with the Linux command line

## Installing dnsmasq

### Step 1: Update Your System

First, update your package lists and upgrade existing packages:

```bash
# Update package lists
sudo apt update

# Upgrade installed packages (optional but recommended)
sudo apt upgrade -y
```

### Step 2: Install dnsmasq

Install dnsmasq using apt:

```bash
# Install dnsmasq package
sudo apt install dnsmasq -y
```

After installation, dnsmasq will attempt to start but may fail due to a conflict with systemd-resolved. This is expected, and we will resolve it in the next section.

## Resolving the systemd-resolved Conflict

### Understanding the Conflict

Ubuntu uses **systemd-resolved** as the default DNS resolver, which listens on port 53 (the standard DNS port). Since dnsmasq also needs port 53, they conflict with each other.

You have several options to resolve this:

### Option 1: Disable systemd-resolved (Recommended for Dedicated DNS Servers)

This is the cleanest approach if your machine will be a dedicated DNS server:

```bash
# Stop the systemd-resolved service
sudo systemctl stop systemd-resolved

# Disable systemd-resolved from starting at boot
sudo systemctl disable systemd-resolved

# Remove the symbolic link to systemd-resolved's stub resolver
sudo rm /etc/resolv.conf

# Create a new resolv.conf pointing to localhost (dnsmasq)
echo "nameserver 127.0.0.1" | sudo tee /etc/resolv.conf

# Prevent NetworkManager from overwriting resolv.conf
sudo chattr +i /etc/resolv.conf
```

### Option 2: Configure systemd-resolved to Use dnsmasq

If you want to keep systemd-resolved running (useful for desktop systems):

```bash
# Edit the systemd-resolved configuration
sudo nano /etc/systemd/resolved.conf
```

Add or modify the following lines:

```ini
[Resolve]
# Tell systemd-resolved to use dnsmasq as the DNS server
DNS=127.0.0.1

# Disable the stub listener to free up port 53
DNSStubListener=no
```

Then apply the changes:

```bash
# Restart systemd-resolved to apply changes
sudo systemctl restart systemd-resolved

# Update the resolv.conf symlink
sudo ln -sf /run/systemd/resolve/resolv.conf /etc/resolv.conf
```

### Option 3: Run dnsmasq on a Different Port

You can configure dnsmasq to listen on a non-standard port:

```bash
# In /etc/dnsmasq.conf, add:
port=5353
```

Then configure systemd-resolved or your clients to use this port. This is less common but useful in specific scenarios.

### Verify the Conflict is Resolved

Check that port 53 is available:

```bash
# Check what's listening on port 53
sudo ss -tulnp | grep :53
```

If nothing is listening (or only dnsmasq appears after starting it), you are ready to proceed.

## Basic DNS Configuration

### Understanding the Configuration File

The main dnsmasq configuration file is located at `/etc/dnsmasq.conf`. The default file contains many commented examples. For clarity, we will create a clean configuration.

### Step 1: Backup the Original Configuration

```bash
# Create a backup of the original configuration
sudo cp /etc/dnsmasq.conf /etc/dnsmasq.conf.backup
```

### Step 2: Create a New Configuration

Create a fresh configuration file:

```bash
sudo nano /etc/dnsmasq.conf
```

Add the following basic configuration:

```bash
# /etc/dnsmasq.conf - dnsmasq configuration file
# ================================================

# GENERAL SETTINGS
# ----------------

# Never forward plain names (without a dot or domain part)
domain-needed

# Never forward addresses in the non-routed address spaces
bogus-priv

# Don't read /etc/resolv.conf for upstream servers
# We'll specify our own upstream servers below
no-resolv

# Don't poll /etc/resolv.conf for changes
no-poll

# INTERFACE SETTINGS
# ------------------

# Listen on specific interface(s)
# Replace 'eth0' with your actual interface name
interface=eth0

# Also listen on localhost for local queries
interface=lo

# Or listen on all interfaces (use with caution)
# interface=*

# Bind to specific interfaces only (more secure)
bind-interfaces

# DOMAIN SETTINGS
# ---------------

# Set the domain for the local network
# This allows short hostnames to be resolved
domain=home.local

# Automatically add the domain to simple hostnames
expand-hosts

# LOCAL HOSTNAME RESOLUTION
# -------------------------

# Read additional hosts from this file
# This allows you to add local hostnames without editing /etc/hosts
addn-hosts=/etc/dnsmasq.hosts

# DNS SERVER SETTINGS
# -------------------

# Set the cache size (default is 150, increase for busy networks)
cache-size=1000

# Don't cache negative responses (NXDOMAIN)
# Uncomment if you have frequently changing DNS
# no-negcache

# Set the time-to-live for cached entries in seconds
# This overrides the TTL from upstream servers
# local-ttl=300
```

### Step 3: Restart dnsmasq

Apply the configuration:

```bash
# Restart dnsmasq to apply the new configuration
sudo systemctl restart dnsmasq

# Check the status
sudo systemctl status dnsmasq

# Enable dnsmasq to start at boot
sudo systemctl enable dnsmasq
```

## Setting Up Local Hostnames

One of the most useful features of dnsmasq is the ability to resolve local hostnames. This eliminates the need to remember IP addresses or update `/etc/hosts` on every machine.

### Method 1: Using /etc/hosts

dnsmasq reads `/etc/hosts` by default and makes those entries available via DNS:

```bash
# Edit /etc/hosts
sudo nano /etc/hosts
```

Add your local hostnames:

```bash
# Local network hosts
# Format: IP_ADDRESS    HOSTNAME    ALIASES

# Server hosts
192.168.1.10    nas.home.local          nas fileserver
192.168.1.11    plex.home.local         plex mediaserver
192.168.1.12    homeassistant.home.local  homeassistant ha
192.168.1.13    pihole.home.local       pihole

# Development servers
192.168.1.20    gitlab.home.local       gitlab
192.168.1.21    jenkins.home.local      jenkins ci
192.168.1.22    docker.home.local       docker

# Workstations
192.168.1.100   desktop.home.local      desktop
192.168.1.101   laptop.home.local       laptop
```

### Method 2: Using a Separate Hosts File

For better organization, use a dedicated hosts file:

```bash
# Create a separate hosts file for dnsmasq
sudo nano /etc/dnsmasq.hosts
```

Add your entries:

```bash
# /etc/dnsmasq.hosts - Local DNS entries for dnsmasq
# ===================================================

# Infrastructure
192.168.1.1     router.home.local       router gateway
192.168.1.2     switch.home.local       switch
192.168.1.3     ap.home.local           ap accesspoint

# Servers
192.168.1.10    server1.home.local      server1
192.168.1.11    server2.home.local      server2
192.168.1.12    server3.home.local      server3

# IoT Devices
192.168.1.200   thermostat.home.local   thermostat nest
192.168.1.201   doorbell.home.local     doorbell ring
192.168.1.202   camera1.home.local      camera1
```

Make sure this file is referenced in your dnsmasq configuration:

```bash
# In /etc/dnsmasq.conf
addn-hosts=/etc/dnsmasq.hosts
```

### Method 3: Using Address Records

For more control, use the `address` directive in dnsmasq.conf:

```bash
# Point specific domains to IP addresses
address=/myapp.local/192.168.1.50
address=/testsite.local/192.168.1.51

# Wildcard DNS - all subdomains resolve to the same IP
# Useful for development with multiple virtual hosts
address=/.dev.local/192.168.1.100
```

Restart dnsmasq after making changes:

```bash
sudo systemctl restart dnsmasq
```

## DNS Caching

DNS caching is enabled by default in dnsmasq. Cached responses speed up repeated queries significantly.

### Configuring Cache Settings

Add these options to `/etc/dnsmasq.conf`:

```bash
# DNS CACHE SETTINGS
# ------------------

# Set the cache size (number of DNS records to cache)
# Default is 150; increase for networks with many queries
cache-size=10000

# Cache negative responses (NXDOMAIN) - enabled by default
# Time in seconds to cache negative responses
neg-ttl=60

# Set minimum TTL for cached entries
# This ensures entries stay cached even if upstream returns low TTL
min-cache-ttl=300

# Set maximum TTL for cached entries
# Prevents stale entries from persisting too long
max-cache-ttl=3600

# Log cache statistics periodically (useful for monitoring)
# Sends SIGUSR1 to dump cache statistics to log
```

### Monitoring Cache Statistics

You can check cache statistics by sending a signal to dnsmasq:

```bash
# Send SIGUSR1 to dump cache statistics to syslog
sudo kill -USR1 $(cat /var/run/dnsmasq/dnsmasq.pid)

# View the statistics
sudo journalctl -u dnsmasq | tail -20
```

Or create a simple script:

```bash
#!/bin/bash
# /usr/local/bin/dnsmasq-stats.sh
# Display dnsmasq cache statistics

# Send signal to dnsmasq
sudo kill -USR1 $(cat /var/run/dnsmasq/dnsmasq.pid) 2>/dev/null

# Wait for log entry
sleep 1

# Display recent statistics
sudo journalctl -u dnsmasq --since "1 minute ago" | grep -E "(queries|cache)"
```

## Configuring Upstream DNS Servers

dnsmasq needs to know where to forward queries it cannot resolve locally. Configure upstream DNS servers for reliability and performance.

### Basic Upstream Configuration

Add to `/etc/dnsmasq.conf`:

```bash
# UPSTREAM DNS SERVERS
# --------------------

# Don't use /etc/resolv.conf for upstream servers
no-resolv

# Primary upstream DNS servers (Cloudflare)
server=1.1.1.1
server=1.0.0.1

# Secondary upstream DNS servers (Google)
server=8.8.8.8
server=8.8.4.4

# Alternative: Quad9 (includes malware blocking)
# server=9.9.9.9
# server=149.112.112.112

# Alternative: OpenDNS
# server=208.67.222.222
# server=208.67.220.220
```

### Using DNS over TLS (Encrypted DNS)

For privacy, you can use DNS-over-TLS with stubby as a proxy:

```bash
# Install stubby
sudo apt install stubby -y

# Configure stubby as the upstream for dnsmasq
# In /etc/dnsmasq.conf:
server=127.0.0.1#5353
```

### Domain-Specific DNS Servers

Route queries for specific domains to different DNS servers:

```bash
# Use specific DNS server for company domain (e.g., VPN)
server=/company.com/10.0.0.1
server=/internal.company.com/10.0.0.1

# Use ISP DNS for local ISP services
server=/isp-services.net/192.168.1.1

# Use specific server for reverse DNS lookups
server=/168.192.in-addr.arpa/192.168.1.1
```

### Strict Order and All Servers

Control how dnsmasq queries upstream servers:

```bash
# Query upstream servers in the order listed
# (default is to use the fastest responding server)
strict-order

# Or query all servers and use the first response
all-servers
```

## DHCP Server Setup

dnsmasq can also function as a DHCP server, which is useful for managing IP address assignment on your network.

### Basic DHCP Configuration

Add to `/etc/dnsmasq.conf`:

```bash
# DHCP SERVER SETTINGS
# --------------------

# Enable DHCP server on eth0 interface
# Format: dhcp-range=START_IP,END_IP,NETMASK,LEASE_TIME
dhcp-range=192.168.1.100,192.168.1.200,255.255.255.0,24h

# Set the default gateway for DHCP clients
dhcp-option=option:router,192.168.1.1

# Set DNS server for DHCP clients (this dnsmasq server)
dhcp-option=option:dns-server,192.168.1.10

# Set the domain name for DHCP clients
dhcp-option=option:domain-name,home.local

# Set the NTP server for time synchronization
dhcp-option=option:ntp-server,192.168.1.1

# Set the lease time default and maximum
# dhcp-lease-max=150

# Store DHCP leases in this file
dhcp-leasefile=/var/lib/misc/dnsmasq.leases

# Send DHCP lease changes to this script (optional)
# dhcp-script=/usr/local/bin/dhcp-event.sh

# Enable DHCPv4 rapid commit for faster address assignment
dhcp-rapid-commit
```

### DHCP Options Reference

Common DHCP options you might want to configure:

```bash
# Option 1: Subnet Mask
dhcp-option=1,255.255.255.0

# Option 3: Default Gateway/Router
dhcp-option=3,192.168.1.1

# Option 6: DNS Servers
dhcp-option=6,192.168.1.10,192.168.1.11

# Option 15: Domain Name
dhcp-option=15,home.local

# Option 28: Broadcast Address
dhcp-option=28,192.168.1.255

# Option 42: NTP Servers
dhcp-option=42,192.168.1.1

# Option 119: DNS Search Domain
dhcp-option=119,home.local,local
```

## Static DHCP Leases

Assign fixed IP addresses to specific devices based on their MAC address.

### Configuring Static Leases

Add to `/etc/dnsmasq.conf`:

```bash
# STATIC DHCP LEASES (DHCP Reservations)
# --------------------------------------
# Format: dhcp-host=MAC_ADDRESS,IP_ADDRESS,HOSTNAME,LEASE_TIME

# Network Infrastructure
dhcp-host=00:11:22:33:44:55,192.168.1.2,main-switch,infinite
dhcp-host=00:11:22:33:44:56,192.168.1.3,access-point,infinite

# Servers (use 'infinite' lease for servers)
dhcp-host=aa:bb:cc:dd:ee:01,192.168.1.10,server1,infinite
dhcp-host=aa:bb:cc:dd:ee:02,192.168.1.11,server2,infinite
dhcp-host=aa:bb:cc:dd:ee:03,192.168.1.12,server3,infinite

# Workstations
dhcp-host=11:22:33:44:55:66,192.168.1.50,desktop-pc,24h
dhcp-host=11:22:33:44:55:67,192.168.1.51,laptop,24h

# IoT Devices (isolate in specific range)
dhcp-host=de:ad:be:ef:00:01,192.168.1.200,smart-tv,24h
dhcp-host=de:ad:be:ef:00:02,192.168.1.201,thermostat,24h
dhcp-host=de:ad:be:ef:00:03,192.168.1.202,doorbell,24h

# Ignore specific devices (don't give them an IP)
# dhcp-host=00:00:00:00:00:00,ignore

# Set hostname for a device that doesn't send one
dhcp-host=aa:bb:cc:dd:ee:ff,set:needs-hostname
dhcp-option=tag:needs-hostname,option:hostname,mystery-device
```

### Using a Separate File for Static Leases

For easier management, store static leases in a separate file:

```bash
# In /etc/dnsmasq.conf
dhcp-hostsfile=/etc/dnsmasq.dhcp-hosts
```

Create the hosts file:

```bash
# /etc/dnsmasq.dhcp-hosts
# Format: MAC,IP,hostname,lease-time

# Servers
aa:bb:cc:dd:ee:01,192.168.1.10,server1,infinite
aa:bb:cc:dd:ee:02,192.168.1.11,server2,infinite

# Desktops
11:22:33:44:55:66,192.168.1.50,desktop,24h
```

## DNS Blocking (Ads and Malware)

One powerful feature of running your own DNS server is the ability to block ads, trackers, and malware at the DNS level.

### Method 1: Using Address Directives

Block specific domains by returning 0.0.0.0:

```bash
# In /etc/dnsmasq.conf

# Block specific ad domains
address=/ads.example.com/0.0.0.0
address=/tracking.example.com/0.0.0.0
address=/malware.example.com/0.0.0.0

# Block entire ad networks with wildcards
address=/.doubleclick.net/0.0.0.0
address=/.googlesyndication.com/0.0.0.0
address=/.googleadservices.com/0.0.0.0
```

### Method 2: Using a Blocklist File

Create a comprehensive blocklist:

```bash
# Download a blocklist (e.g., Steven Black's hosts file)
sudo wget -O /etc/dnsmasq.blocklist.tmp \
  https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts

# Convert to dnsmasq format
sudo grep '^0.0.0.0' /etc/dnsmasq.blocklist.tmp | \
  awk '{print "address=/"$2"/0.0.0.0"}' | \
  sudo tee /etc/dnsmasq.blocklist

# Clean up
sudo rm /etc/dnsmasq.blocklist.tmp
```

Reference the blocklist in dnsmasq.conf:

```bash
# Include the blocklist file
conf-file=/etc/dnsmasq.blocklist
```

### Method 3: Automated Blocklist Updates

Create a script to update blocklists automatically:

```bash
#!/bin/bash
# /usr/local/bin/update-dns-blocklist.sh
# Update dnsmasq blocklist from multiple sources

BLOCKLIST_DIR="/etc/dnsmasq.d"
TEMP_FILE="/tmp/blocklist.tmp"
OUTPUT_FILE="${BLOCKLIST_DIR}/blocklist.conf"

# Blocklist sources
SOURCES=(
  "https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts"
  "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/hosts/pro.txt"
)

# Create temporary file
> "$TEMP_FILE"

# Download and process each source
for source in "${SOURCES[@]}"; do
  echo "Downloading: $source"
  curl -s "$source" >> "$TEMP_FILE"
done

# Convert to dnsmasq format and remove duplicates
echo "Processing blocklist..."
grep -E '^(0\.0\.0\.0|127\.0\.0\.1)' "$TEMP_FILE" | \
  awk '{print $2}' | \
  grep -v 'localhost' | \
  sort -u | \
  awk '{print "address=/"$1"/0.0.0.0"}' > "$OUTPUT_FILE"

# Count entries
ENTRIES=$(wc -l < "$OUTPUT_FILE")
echo "Blocklist updated with $ENTRIES entries"

# Restart dnsmasq
sudo systemctl restart dnsmasq

# Cleanup
rm -f "$TEMP_FILE"
```

Add to cron for automatic updates:

```bash
# Edit crontab
sudo crontab -e

# Add weekly update (every Sunday at 3 AM)
0 3 * * 0 /usr/local/bin/update-dns-blocklist.sh >> /var/log/blocklist-update.log 2>&1
```

### Whitelisting Domains

If blocking causes issues with certain sites, whitelist them:

```bash
# In /etc/dnsmasq.conf

# Whitelist specific domains (don't block these)
server=/allowed-ads.example.com/1.1.1.1
server=/necessary-tracking.example.com/1.1.1.1
```

## Logging and Monitoring

Proper logging helps you understand DNS query patterns and troubleshoot issues.

### Configuring Logging

Add to `/etc/dnsmasq.conf`:

```bash
# LOGGING SETTINGS
# ----------------

# Log all DNS queries (useful for debugging, can be verbose)
log-queries

# Log extra information about DHCP transactions
log-dhcp

# Log to a specific facility
log-facility=/var/log/dnsmasq.log

# Or use syslog (default)
# log-facility=daemon

# Log asynchronously for better performance
log-async=25
```

### Setting Up Log Rotation

Create a logrotate configuration:

```bash
sudo nano /etc/logrotate.d/dnsmasq
```

Add:

```
/var/log/dnsmasq.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 640 root adm
    postrotate
        systemctl reload dnsmasq > /dev/null 2>&1 || true
    endscript
}
```

### Monitoring with Journalctl

View real-time logs:

```bash
# Follow dnsmasq logs in real-time
sudo journalctl -u dnsmasq -f

# View logs from the last hour
sudo journalctl -u dnsmasq --since "1 hour ago"

# View only error messages
sudo journalctl -u dnsmasq -p err

# View logs with timestamps
sudo journalctl -u dnsmasq -o short-precise
```

### Creating a Simple Monitoring Script

```bash
#!/bin/bash
# /usr/local/bin/dnsmasq-monitor.sh
# Monitor dnsmasq status and statistics

echo "=== dnsmasq Status ==="
systemctl status dnsmasq --no-pager

echo ""
echo "=== Cache Statistics ==="
kill -USR1 $(cat /var/run/dnsmasq/dnsmasq.pid) 2>/dev/null
sleep 1
journalctl -u dnsmasq --since "1 minute ago" | grep -E "(cache|queries)" | tail -5

echo ""
echo "=== DHCP Leases ==="
cat /var/lib/misc/dnsmasq.leases 2>/dev/null | \
  awk '{print $3 "\t" $4 "\t" $2}' | \
  column -t

echo ""
echo "=== Recent Queries (last 10) ==="
journalctl -u dnsmasq --since "5 minutes ago" | \
  grep "query\[" | \
  tail -10

echo ""
echo "=== Top Queried Domains (last hour) ==="
journalctl -u dnsmasq --since "1 hour ago" | \
  grep "query\[" | \
  awk -F'query\\[' '{print $2}' | \
  awk '{print $2}' | \
  sort | uniq -c | sort -rn | head -10
```

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: dnsmasq Won't Start (Port 53 in Use)

```bash
# Check what's using port 53
sudo ss -tulnp | grep :53

# If systemd-resolved is the culprit
sudo systemctl stop systemd-resolved
sudo systemctl disable systemd-resolved

# Verify dnsmasq can now start
sudo systemctl start dnsmasq
```

#### Issue 2: DNS Queries Not Being Resolved

```bash
# Test DNS resolution directly through dnsmasq
dig @127.0.0.1 google.com

# Check if dnsmasq is listening
sudo netstat -tulnp | grep dnsmasq

# Check dnsmasq configuration for errors
sudo dnsmasq --test

# View dnsmasq logs for errors
sudo journalctl -u dnsmasq -e
```

#### Issue 3: DHCP Not Assigning Addresses

```bash
# Ensure DHCP is enabled in config
grep -E "^dhcp-range" /etc/dnsmasq.conf

# Check that dnsmasq is listening on the correct interface
grep -E "^interface" /etc/dnsmasq.conf

# View DHCP-related logs
sudo journalctl -u dnsmasq | grep -i dhcp

# Check current leases
cat /var/lib/misc/dnsmasq.leases
```

#### Issue 4: Local Hostnames Not Resolving

```bash
# Check hosts file syntax
cat /etc/hosts

# Verify dnsmasq reads the hosts file
grep -E "^addn-hosts|^no-hosts" /etc/dnsmasq.conf

# Test local hostname resolution
dig @127.0.0.1 myserver.home.local

# Restart dnsmasq after hosts file changes
sudo systemctl restart dnsmasq
```

#### Issue 5: Slow DNS Resolution

```bash
# Check upstream server response times
for server in 1.1.1.1 8.8.8.8 9.9.9.9; do
  echo "Testing $server:"
  dig @$server google.com | grep "Query time"
done

# Increase cache size
# In /etc/dnsmasq.conf:
# cache-size=10000

# Disable strict-order if enabled (allows parallel queries)
# Comment out: strict-order
```

### Useful Diagnostic Commands

```bash
# Test configuration syntax
sudo dnsmasq --test

# Run dnsmasq in foreground with debug output
sudo dnsmasq -d --log-queries

# Check DNS resolution path
nslookup google.com 127.0.0.1

# Detailed DNS query
dig @127.0.0.1 google.com +trace

# Check current resolver configuration
resolvectl status

# List all dnsmasq processes
ps aux | grep dnsmasq

# Check network interfaces
ip addr show

# Test specific upstream server
dig @1.1.1.1 google.com
```

## Complete Configuration Example

Here is a complete, well-commented configuration file combining all the features discussed:

```bash
# /etc/dnsmasq.conf
# Complete dnsmasq Configuration
# ==============================

# GENERAL SETTINGS
# ----------------
# Never forward queries for plain names (without dots)
domain-needed

# Never forward addresses in non-routed address space
bogus-priv

# Reject private addresses from upstream servers (anti-spoofing)
stop-dns-rebind

# Allow localhost replies from upstream (needed for some setups)
rebind-localhost-ok

# INTERFACE CONFIGURATION
# -----------------------
# Listen on these interfaces
interface=eth0
interface=lo

# Bind only to specified interfaces (security)
bind-interfaces

# UPSTREAM DNS SERVERS
# --------------------
# Don't read /etc/resolv.conf
no-resolv
no-poll

# Primary DNS servers (Cloudflare - fast and privacy-focused)
server=1.1.1.1
server=1.0.0.1

# Backup DNS servers (Google)
server=8.8.8.8
server=8.8.4.4

# DOMAIN AND LOCAL DNS
# --------------------
# Local domain name
domain=home.local

# Add domain to simple hostnames
expand-hosts

# Additional hosts file for local entries
addn-hosts=/etc/dnsmasq.hosts

# Local-only domains (never forward these)
local=/home.local/
local=/168.192.in-addr.arpa/

# DNS CACHE SETTINGS
# ------------------
# Cache size (number of entries)
cache-size=10000

# Minimum cache TTL in seconds
min-cache-ttl=300

# Maximum cache TTL in seconds
max-cache-ttl=86400

# DHCP SERVER CONFIGURATION
# -------------------------
# Enable DHCP on eth0
dhcp-range=192.168.1.100,192.168.1.200,255.255.255.0,24h

# DHCP options
dhcp-option=option:router,192.168.1.1
dhcp-option=option:dns-server,192.168.1.10
dhcp-option=option:domain-name,home.local
dhcp-option=option:ntp-server,pool.ntp.org

# DHCP lease file
dhcp-leasefile=/var/lib/misc/dnsmasq.leases

# Faster DHCP assignment
dhcp-rapid-commit

# Authoritative DHCP server
dhcp-authoritative

# STATIC DHCP RESERVATIONS
# ------------------------
# Servers
dhcp-host=aa:bb:cc:dd:ee:01,192.168.1.10,dns-server,infinite
dhcp-host=aa:bb:cc:dd:ee:02,192.168.1.11,file-server,infinite
dhcp-host=aa:bb:cc:dd:ee:03,192.168.1.12,media-server,infinite

# Workstations
dhcp-host=11:22:33:44:55:66,192.168.1.50,main-desktop,24h
dhcp-host=11:22:33:44:55:67,192.168.1.51,laptop,24h

# LOGGING
# -------
# Log all DNS queries (comment out in production if too verbose)
log-queries

# Log DHCP transactions
log-dhcp

# Log facility
log-facility=/var/log/dnsmasq.log

# Async logging for performance
log-async=25

# SECURITY
# --------
# Run as non-root user after binding to port 53
user=dnsmasq
group=dnsmasq

# ADDITIONAL CONFIGURATION FILES
# ------------------------------
# Include all files in dnsmasq.d directory
conf-dir=/etc/dnsmasq.d/,*.conf
```

## Monitoring with OneUptime

While dnsmasq provides excellent local logging capabilities, for production environments or critical infrastructure, you need comprehensive monitoring that can alert you to issues before they impact your users.

**OneUptime** (https://oneuptime.com) offers a complete observability platform that can help you monitor your DNS infrastructure:

- **Uptime Monitoring**: Set up synthetic checks to verify your DNS server responds correctly to queries, alerting you immediately if resolution fails.
- **Performance Metrics**: Track DNS query response times and cache hit rates to ensure optimal performance.
- **Log Management**: Centralize dnsmasq logs for analysis, searching, and correlation with other system events.
- **Alerting**: Configure intelligent alerts for DNS failures, high query latency, or unusual traffic patterns.
- **Dashboards**: Visualize your DNS infrastructure health with customizable dashboards showing query volumes, cache statistics, and error rates.
- **Incident Management**: When DNS issues occur, OneUptime helps you track, manage, and resolve incidents efficiently.

By integrating OneUptime with your dnsmasq deployment, you can ensure your local DNS infrastructure remains reliable, performant, and secure. Visit https://oneuptime.com to learn more about monitoring your critical infrastructure.

## Conclusion

dnsmasq is an incredibly versatile tool for managing DNS and DHCP on local networks. In this guide, we have covered:

- Installing and configuring dnsmasq on Ubuntu
- Resolving conflicts with systemd-resolved
- Setting up local hostname resolution
- Configuring DNS caching for improved performance
- Managing upstream DNS servers
- Running a DHCP server with static leases
- Implementing DNS-based ad and malware blocking
- Logging and monitoring your DNS infrastructure
- Troubleshooting common issues

With this foundation, you can customize dnsmasq to meet your specific network requirements, whether for a home lab, development environment, or small business network. Remember to regularly update your configuration, monitor logs for unusual activity, and keep your blocklists current for the best security and performance.
