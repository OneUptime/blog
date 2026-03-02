# How to Configure NTP Server with chrony on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, chrony, NTP, Network, System Administration

Description: Configure Ubuntu as an NTP time server using chrony to serve accurate time to client machines on your network, with proper access controls and monitoring.

---

Running your own NTP server within your infrastructure reduces external dependencies, ensures faster synchronization for local clients, and gives you centralized time management for your network. Ubuntu with chrony makes an excellent NTP server that can serve hundreds of clients while maintaining accuracy through upstream NTP synchronization.

## Architecture Overview

A typical internal NTP infrastructure has two tiers:

- **Tier 1 NTP servers** - synchronize directly with upstream internet NTP servers (pool.ntp.org, Google, Cloudflare), typically 2-3 servers for redundancy
- **Tier 2 client servers** - synchronize with your internal Tier 1 servers

This design means most of your machines never reach out to the internet for time, and your Tier 1 servers are your single point of control for timekeeping across the organization.

## Installing chrony

```bash
# Install chrony
sudo apt update
sudo apt install chrony

# Stop systemd-timesyncd to avoid conflicts
sudo systemctl stop systemd-timesyncd
sudo systemctl disable systemd-timesyncd

# Enable chrony
sudo systemctl enable chrony
```

## Configuring chrony as an NTP Server

Edit the chrony configuration:

```bash
sudo nano /etc/chrony/chrony.conf
```

```bash
# /etc/chrony/chrony.conf (NTP Server configuration)

# === Upstream Time Sources ===
# Use upstream NTP pool for accurate time
pool 0.pool.ntp.org iburst
pool 1.pool.ntp.org iburst
pool 2.pool.ntp.org iburst
pool 3.pool.ntp.org iburst

# High-accuracy sources (optional, add for better accuracy)
server time.cloudflare.com iburst
server time.google.com iburst

# === Server Settings ===

# Record frequency drift to improve accuracy on restart
driftfile /var/lib/chrony/chrony.drift

# Enable logging
logdir /var/log/chrony
log measurements statistics tracking

# Step clock on startup if off by more than 1 second
# After initial 3 updates, only slew (gradual adjustment)
makestep 1.0 3

# Sync hardware clock periodically
rtcsync

# Stratum to announce to clients when not synchronized
local stratum 10

# === Access Control ===
# Allow NTP queries from your local networks
allow 10.0.0.0/8
allow 192.168.0.0/16
allow 172.16.0.0/12

# Deny all other hosts
deny all

# Allow localhost
allow 127.0.0.1
allow ::1

# === Network Settings ===
# Bind to specific interface (optional - restricts to one interface)
# bindaddress 10.0.0.1

# Port to listen on (default 123)
# port 123
```

```bash
# Restart chrony to apply configuration
sudo systemctl restart chrony
sudo systemctl status chrony
```

## Opening the Firewall

```bash
# Allow NTP traffic (UDP port 123)
sudo ufw allow 123/udp

# If using specific source networks
sudo ufw allow from 10.0.0.0/8 to any port 123 proto udp
sudo ufw allow from 192.168.0.0/16 to any port 123 proto udp

# Check firewall status
sudo ufw status

# Using iptables directly
sudo iptables -A INPUT -p udp --dport 123 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 123 -j ACCEPT
```

## Verifying the Server is Working

```bash
# Check chrony is synchronized with upstream
chronyc tracking

# Check configured sources
chronyc sources -v

# Verify it's listening on port 123
ss -ulnp | grep :123
# or
sudo netstat -ulnp | grep chrony

# Check that chrony responds to NTP queries (from another host)
# From a client machine:
# ntpdate -q your-ntp-server-ip
# or: chronyc -h your-ntp-server-ip tracking
```

## Configuring NTP Clients to Use Your Server

On client machines, configure chrony to use your internal server:

```bash
sudo nano /etc/chrony/chrony.conf
```

```bash
# /etc/chrony/chrony.conf (Client configuration)

# Use your internal NTP servers (add both for redundancy)
server ntp1.internal.example.com iburst prefer
server ntp2.internal.example.com iburst

# Fallback to internet NTP if internal servers are unavailable
pool pool.ntp.org iburst

# Require at least one good source
minsources 1

# Standard settings
driftfile /var/lib/chrony/chrony.drift
makestep 1.0 3
rtcsync

# No serving to other clients
deny all
```

```bash
sudo systemctl restart chrony

# Verify the client is using your server
chronyc sources -v
chronyc tracking | grep "Reference ID"
```

## Access Control Configuration

chrony's access control is granular:

```bash
# /etc/chrony/chrony.conf access control examples

# Allow specific host
allow 10.0.1.50

# Allow entire subnet
allow 10.0.0.0/24

# Allow multiple networks
allow 10.0.0.0/8
allow 192.168.1.0/24

# Deny a specific host within an allowed network
deny 10.0.0.100

# Allow only queries, not clock modifications
# (more restrictive than allow)
# This is useful for monitoring clients
allow 10.0.0.0/8

# If you want to allow client access but not for adjusting the server
# (prevent clients from sending time adjustments to your server)
cmdallow 127.0.0.1   # Only allow chronyc control from localhost
cmddeny all
```

## Monitoring the NTP Server

```bash
# Check how many clients are connecting
# (chrony doesn't track client connections like ntpd does by default)

# View server activity
chronyc activity

# Show tracking information
chronyc tracking

# Show source statistics (useful for assessing upstream quality)
chronyc sourcestats -v

# View measurements log
cat /var/log/chrony/measurements.log | tail -20

# Monitor in real-time
watch -n 5 'chronyc tracking; echo; chronyc sources'
```

## Handling Multiple Server Redundancy

For high availability, run two or more NTP servers:

```bash
# Server 1: ntp1.example.com
# /etc/chrony/chrony.conf on ntp1:
pool pool.ntp.org iburst
# Reference ntp2 as peer for cross-checking
peer ntp2.internal.example.com
allow 10.0.0.0/8
driftfile /var/lib/chrony/chrony.drift
makestep 1.0 3
rtcsync
local stratum 10
```

```bash
# Server 2: ntp2.example.com
# /etc/chrony/chrony.conf on ntp2:
pool pool.ntp.org iburst
# Reference ntp1 as peer
peer ntp1.internal.example.com
allow 10.0.0.0/8
driftfile /var/lib/chrony/chrony.drift
makestep 1.0 3
rtcsync
local stratum 10
```

The `peer` directive creates a symmetric peer relationship between servers, allowing them to cross-check each other.

## Setting Up NTP via DNS Records

For easy client configuration, create NTP SRV records or use a hostname:

```bash
# DNS configuration example (in your DNS server):
# A records
ntp1.internal.example.com.    IN  A  10.0.0.10
ntp2.internal.example.com.    IN  A  10.0.0.11

# SRV record for NTP service discovery (RFC 4085)
_ntp._udp.internal.example.com.  IN  SRV  1 0 123 ntp1.internal.example.com.
_ntp._udp.internal.example.com.  IN  SRV  2 0 123 ntp2.internal.example.com.
```

Clients can then use `ntp.internal.example.com` as their server address.

## Using the `local` Directive for Isolated Networks

For air-gapped networks with no internet access, chrony can serve as an authoritative time source even without upstream synchronization:

```bash
# /etc/chrony/chrony.conf for isolated network

# No external servers - we are the reference
# (No pool or server directives)

# Announce we're stratum 10 (indicate we're not super accurate)
local stratum 10

# Allow clients
allow 10.0.0.0/8

# Load drift file (helps maintain accuracy over time)
driftfile /var/lib/chrony/chrony.drift

# Step large offsets on startup
makestep 1.0 3

# Sync to hardware clock
rtcsync
```

```bash
# Manually set the hardware clock accurately before going offline
# Then chrony will maintain that time
sudo hwclock --set --date="2026-03-02 14:30:00 UTC"
sudo hwclock --hctosys
```

## Testing NTP Server Connectivity

From a client machine:

```bash
# Test if the server responds to NTP queries
# Install ntpdate: sudo apt install ntpdate
ntpdate -q 10.0.0.10

# Using chrony itself
chronyc -h 10.0.0.10 tracking

# Using sntp (part of ntp package)
sntp -n 10.0.0.10

# Check network connectivity on the NTP port
nmap -sU -p 123 10.0.0.10
```

## Log Rotation for chrony Logs

```bash
sudo nano /etc/logrotate.d/chrony
```

```bash
/var/log/chrony/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
    postrotate
        # Signal chrony to reopen log files
        systemctl kill -s HUP chrony || true
    endscript
}
```

## Monitoring Server Health with a Script

```bash
cat << 'EOF' | sudo tee /usr/local/bin/ntp-server-health
#!/bin/bash
# NTP server health check

echo "=== NTP Server Status ==="
echo ""

echo "--- Chrony Tracking ---"
chronyc tracking

echo ""
echo "--- Sources ---"
chronyc sources -v

echo ""
echo "--- Activity ---"
chronyc activity

echo ""
echo "--- Server Listening ---"
ss -ulnp | grep :123 || echo "WARNING: Not listening on UDP 123!"

echo ""
echo "--- Recent Log ---"
tail -20 /var/log/chrony/tracking.log 2>/dev/null || echo "No tracking log found"
EOF

sudo chmod +x /usr/local/bin/ntp-server-health
```

Running an internal NTP server is a worthwhile investment for any infrastructure with more than a handful of machines. The centralized time control simplifies log correlation, reduces external dependencies, and ensures all systems share consistent timestamps - which matters more than it might seem until you're trying to debug a distributed issue and find that two systems' logs are 30 seconds out of sync.
