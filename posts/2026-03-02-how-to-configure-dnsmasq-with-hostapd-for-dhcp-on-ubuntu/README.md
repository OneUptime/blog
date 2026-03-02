# How to Configure dnsmasq with hostapd for DHCP on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, dnsmasq, hostapd, DHCP, Networking

Description: Configure dnsmasq to provide DHCP and DNS services for a hostapd WiFi access point on Ubuntu, with static leases, multiple subnets, and DNS customization.

---

dnsmasq is a lightweight DNS forwarder and DHCP server commonly paired with hostapd when building a WiFi access point on Ubuntu. It handles IP address assignment to connecting clients (DHCP) and can also serve as a local DNS resolver. This guide covers a complete dnsmasq configuration for an access point environment, including static leases, DNS customization, and multi-subnet support.

## Prerequisites

This guide assumes hostapd is already running as a WiFi access point with `wlan0` configured at `10.0.0.1/24`. If not, set that up first.

## Basic Installation

```bash
# Install dnsmasq
sudo apt-get install -y dnsmasq

# Stop any existing systemd-resolved that might conflict on port 53
sudo systemctl stop systemd-resolved
sudo systemctl disable systemd-resolved

# Backup the original configuration
sudo cp /etc/dnsmasq.conf /etc/dnsmasq.conf.orig
```

### Handling systemd-resolved Conflicts

On Ubuntu 22.04+, `systemd-resolved` runs a stub DNS listener on 127.0.0.53:53. dnsmasq needs to bind to all interfaces on port 53, which conflicts:

```bash
# Option 1: Disable systemd-resolved (simple but loses some system DNS features)
sudo systemctl disable --now systemd-resolved
sudo rm /etc/resolv.conf
echo "nameserver 1.1.1.1" | sudo tee /etc/resolv.conf

# Option 2: Configure systemd-resolved to use dnsmasq
# Tell resolved not to listen on the loopback
sudo nano /etc/systemd/resolved.conf
```

```ini
[Resolve]
# Disable the stub resolver to free up port 53
DNSStubListener=no
```

```bash
sudo systemctl restart systemd-resolved
# Now dnsmasq can bind to port 53
```

## Complete dnsmasq Configuration

```bash
sudo nano /etc/dnsmasq.conf
```

```ini
# /etc/dnsmasq.conf - DHCP and DNS for hostapd WiFi access point

# ==================== Interface Configuration ====================

# Only listen on the wireless interface and loopback
# Don't touch the upstream internet interface (eth0)
interface=wlan0
interface=lo

# Alternatively, explicitly exclude the upstream interface
# except-interface=eth0

# Bind only to the specified interfaces (prevents port conflicts)
bind-interfaces

# ==================== DNS Settings ====================

# Don't forward simple hostnames to upstream DNS
domain-needed

# Don't forward queries for non-routable IP space to upstream
bogus-priv

# Use these upstream DNS servers for forwarding
# Can also read from /etc/resolv.conf by default
server=1.1.1.1
server=1.0.0.1
server=8.8.8.8
server=8.8.4.4

# Set the DNS search domain for the AP network
domain=ap.local

# Expand simple hostnames: "mydevice" queries become "mydevice.ap.local"
expand-hosts

# Cache up to 1000 DNS entries locally
cache-size=1000

# Negative caching (cache NXDOMAIN responses)
no-negcache

# DNS TTL for local DHCP assignments (seconds)
local-ttl=3600

# ==================== DHCP Configuration ====================

# DHCP range: addresses from .100 to .200 with 12 hour lease time
dhcp-range=10.0.0.100,10.0.0.200,255.255.255.0,12h

# DHCP options for clients:
# Option 3 = default gateway (our AP IP)
dhcp-option=3,10.0.0.1

# Option 6 = DNS servers (can point to dnsmasq itself or upstream)
dhcp-option=6,10.0.0.1,1.1.1.1

# Option 42 = NTP server
dhcp-option=42,216.239.35.0

# Maximum lease time (seconds) - clients can't request longer than this
dhcp-lease-max=250

# The AP is authoritative for this DHCP domain
# Causes dnsmasq to reply to INFORM requests even when not the original lease server
dhcp-authoritative

# Log DHCP transactions
log-dhcp

# ==================== Static DHCP Leases ====================

# Assign fixed IPs to specific devices by MAC address
# Format: dhcp-host=<mac>,<ip>,<hostname>,<lease-time>

# Example static leases:
dhcp-host=aa:bb:cc:11:22:33,10.0.0.10,printer,infinite
dhcp-host=aa:bb:cc:44:55:66,10.0.0.11,smart-tv,infinite

# Assign by hostname instead of MAC (less reliable)
# dhcp-host=laptop01,10.0.0.20

# Block a specific device from getting a DHCP lease
# dhcp-host=aa:bb:cc:dd:ee:ff,ignore

# ==================== PXE Boot (Optional) ====================
# Uncomment to enable network booting for PXE clients
# dhcp-boot=pxelinux.0,pxeserver,10.0.0.1
# enable-tftp
# tftp-root=/var/lib/tftpboot

# ==================== Local DNS Entries ====================

# Add local A records (hostname to IP)
address=/printer.ap.local/10.0.0.10
address=/fileserver.ap.local/10.0.0.50

# Redirect specific domains to different IPs
# (useful for captive portals or split-horizon DNS)
address=/internal-app.company.com/10.0.0.50

# Block ads/trackers by resolving them to 0.0.0.0
address=/ads.example.com/0.0.0.0

# ==================== Logging ====================

# Log queries (useful for debugging, disable in production for performance)
# log-queries

# Log facility
log-facility=/var/log/dnsmasq.log

# ==================== Security ====================

# Stop dnsmasq from running as root after startup
user=dnsmasq
group=dnsmasq
```

## Multi-Subnet Configuration

If you're running multiple access points or VLANs on the same server:

```bash
# Add second wireless interface configuration
sudo nano /etc/dnsmasq.d/guest-network.conf
```

```ini
# /etc/dnsmasq.d/guest-network.conf
# Guest network on wlan1 (separate subnet)

interface=wlan1

# Different subnet for guest network
dhcp-range=10.0.1.100,10.0.1.200,255.255.255.0,4h

# Guest network uses shorter leases
# Guest clients get different gateway and DNS
dhcp-option=tag:wlan1,3,10.0.1.1
dhcp-option=tag:wlan1,6,1.1.1.1
```

For interface-specific DHCP options, use tags:

```ini
# Main network DHCP range
dhcp-range=interface:wlan0,10.0.0.100,10.0.0.200,255.255.255.0,12h

# Guest network DHCP range
dhcp-range=interface:wlan1,10.0.1.100,10.0.1.200,255.255.255.0,4h

# Different DNS for each subnet
dhcp-option=tag:wlan0-range,6,10.0.0.1
dhcp-option=tag:wlan1-range,6,1.1.1.1
```

## Managing DHCP Leases

```bash
# View all current DHCP leases
cat /var/lib/misc/dnsmasq.leases

# Format: expiry-time mac-address ip-address hostname client-id
# 1234567890 aa:bb:cc:dd:ee:ff 10.0.0.105 android-phone *

# Watch leases update in real-time
watch cat /var/lib/misc/dnsmasq.leases

# Count active leases
wc -l /var/lib/misc/dnsmasq.leases

# Find the lease for a specific device
grep "aa:bb:cc:dd:ee:ff" /var/lib/misc/dnsmasq.leases
```

### Releasing a Specific DHCP Lease

dnsmasq doesn't provide a direct command to release a specific lease. To force a client to get a new IP:

```bash
# Method 1: Remove from lease file (requires dnsmasq restart)
sudo grep -v "aa:bb:cc:dd:ee:ff" /var/lib/misc/dnsmasq.leases > /tmp/leases
sudo cp /tmp/leases /var/lib/misc/dnsmasq.leases
sudo systemctl restart dnsmasq

# Method 2: Use dhcp-host to block the MAC temporarily
echo "dhcp-host=aa:bb:cc:dd:ee:ff,ignore" | sudo tee /etc/dnsmasq.d/block-client.conf
sudo systemctl reload dnsmasq
# Wait for client to try to renew (gets no response)
# Then remove the block file and reload
sudo rm /etc/dnsmasq.d/block-client.conf
sudo systemctl reload dnsmasq
```

## Testing dnsmasq Configuration

```bash
# Syntax check before applying
sudo dnsmasq --test

# Test DHCP configuration
sudo dnsmasq --test --conf-file=/etc/dnsmasq.conf

# Start dnsmasq in foreground for debugging
sudo dnsmasq --no-daemon --log-queries --log-dhcp

# Test DNS resolution (from a client or the server itself)
dig @10.0.0.1 google.com
nslookup printer.ap.local 10.0.0.1

# Verify DHCP offers are going out
sudo tcpdump -i wlan0 -n port 67 or port 68 -e
```

## Integrating with hostapd Events

When a client connects or disconnects from hostapd, you can trigger dnsmasq updates:

```bash
# Create a hostapd event script
sudo nano /etc/hostapd/hostapd-event.sh
```

```bash
#!/bin/bash
# /etc/hostapd/hostapd-event.sh
# Called by hostapd when client events occur

EVENT=$1
MAC=$2
IFACE=$3

case "$EVENT" in
    AP-STA-CONNECTED)
        logger "WiFi client connected: $MAC on $IFACE"
        ;;
    AP-STA-DISCONNECTED)
        logger "WiFi client disconnected: $MAC on $IFACE"
        # Optionally remove DHCP lease on disconnect
        ;;
esac
```

```bash
chmod +x /etc/hostapd/hostapd-event.sh

# Configure hostapd to call the script
echo "ap_event_script=/etc/hostapd/hostapd-event.sh" | sudo tee -a /etc/hostapd/hostapd.conf

sudo systemctl restart hostapd
```

## Performance Tuning

```bash
# For high client counts, increase system DNS cache
# Also limit dnsmasq memory usage
cat >> /etc/dnsmasq.conf << 'EOF'

# Performance settings for high client count
cache-size=10000
min-cache-ttl=3600
neg-ttl=60

# Limit DNS query forwarding parallelism
dns-forward-max=150
EOF

sudo systemctl restart dnsmasq

# Monitor dnsmasq performance
sudo systemctl status dnsmasq

# View DNS cache statistics (use dnsmasq's SIGUSR1)
sudo kill -USR1 $(pidof dnsmasq)
sudo journalctl -u dnsmasq | tail -20 | grep "cache"
```

## Summary

A complete dnsmasq setup for a hostapd access point requires:

- Restricting dnsmasq to listen only on the AP interface (`wlan0`) and not the upstream interface
- Configuring a DHCP range, gateway, and DNS options appropriate for your network
- Setting `dhcp-authoritative` so dnsmasq responds correctly to all DHCP requests
- Using static leases (`dhcp-host`) for printers and servers that need consistent IPs
- Handling the systemd-resolved conflict on Ubuntu 22.04+

The combination of hostapd (WiFi management) and dnsmasq (DHCP/DNS) forms a complete, lightweight access point stack that handles everything from raw 802.11 frames to IP address assignment and name resolution.
