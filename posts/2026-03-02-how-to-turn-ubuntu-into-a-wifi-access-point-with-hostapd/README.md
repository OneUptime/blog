# How to Turn Ubuntu into a WiFi Access Point with hostapd

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, WiFi, Hostapd, Access Point

Description: Configure Ubuntu as a WiFi access point using hostapd and dnsmasq, creating a functional wireless router from a standard Ubuntu system with a compatible wireless adapter.

---

Running Ubuntu as a WiFi access point is useful for sharing an internet connection, creating a test network, building a captive portal, or setting up a dedicated wireless controller. The key tool is `hostapd` - a user-space daemon that implements IEEE 802.11 access point and authentication server functionality.

## Hardware Requirements

Not all wireless adapters support AP mode. Check your adapter's capabilities first:

```bash
# Install iw for wireless interface information
sudo apt-get install -y iw

# Check your wireless interface name
ip link show | grep wlan

# Check if the adapter supports AP mode
sudo iw list | grep -A 10 "Supported interface modes"

# Example output showing AP is supported:
# Supported interface modes:
#          * IBSS
#          * managed
#          * AP          ← This is required
#          * AP/VLAN
#          * monitor
```

If AP mode is not listed, this adapter cannot be used as a hotspot.

For Intel-based adapters, check if it supports virtual interfaces:

```bash
sudo iw phy phy0 info | grep "valid interface combinations" -A 20
```

## Overview of the Setup

The complete access point setup requires:

1. **hostapd**: Manages the WiFi AP - handles authentication, beacon frames, association
2. **dnsmasq**: Provides DHCP (IP assignment to clients) and optionally DNS
3. **IP forwarding + NAT**: Routes traffic from the WiFi clients to the internet via another interface

For this setup:
- `wlan0` = WiFi interface (will become the access point)
- `eth0` = Upstream internet connection

## Installing Required Packages

```bash
sudo apt-get update
sudo apt-get install -y hostapd dnsmasq iptables

# Stop NetworkManager from managing the wireless interface
# (NetworkManager and hostapd will conflict)
sudo systemctl stop NetworkManager
```

### Preventing NetworkManager from Controlling the AP Interface

Tell NetworkManager to leave `wlan0` alone:

```bash
sudo nano /etc/NetworkManager/NetworkManager.conf
```

Add this section:

```ini
[keyfile]
unmanaged-devices=interface-name:wlan0
```

Or use a more specific method with the MAC address:

```bash
# Get the MAC address of your wireless interface
ip link show wlan0 | grep link/ether
# 00:11:22:33:44:55

# Create an unmanaged device configuration
sudo nano /etc/NetworkManager/conf.d/ignore-wlan0.conf
```

```ini
[keyfile]
unmanaged-devices=mac:00:11:22:33:44:55
```

```bash
sudo systemctl restart NetworkManager
```

## Configuring the Wireless Interface

Set a static IP on the wireless interface (this will be the AP's gateway address):

```bash
sudo nano /etc/netplan/01-netcfg.yaml
```

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: true

  wifis:
    wlan0:
      dhcp4: false
      addresses:
        - 10.0.0.1/24
      # Don't configure access-points here - hostapd handles that
```

```bash
sudo netplan apply

# Verify the IP is set
ip addr show wlan0
```

## Configuring hostapd

Create the hostapd configuration file:

```bash
sudo nano /etc/hostapd/hostapd.conf
```

```ini
# /etc/hostapd/hostapd.conf
# Basic WPA2 Personal access point configuration

# Network interface
interface=wlan0

# Bridge for LAN connectivity (optional - for bridged mode)
# bridge=br0

# WiFi driver
driver=nl80211

# SSID (network name)
ssid=MyUbuntuAP

# Country code - REQUIRED for legal frequency/power use
# Use your actual country code: US, GB, DE, AU, etc.
country_code=US

# Operating mode: a=5GHz, g=2.4GHz
hw_mode=g

# Channel - use 1, 6, or 11 for 2.4GHz to minimize interference
channel=6

# Enable 802.11n (HT) if supported - improves throughput
ieee80211n=1
ht_capab=[HT40+][SHORT-GI-40][DSSS_CCK-40]

# Maximum number of simultaneous clients
max_num_sta=30

# Client isolation - prevents clients from communicating with each other
# ap_isolate=1  # Uncomment if you want clients isolated from each other

# Authentication settings
# WPA2-PSK (most common, good security for home/office)
wpa=2
wpa_key_mgmt=WPA-PSK
wpa_passphrase=YourSecurePassword123

# Encryption
rsn_pairwise=CCMP
wpa_pairwise=TKIP CCMP

# Enable WPA2 RSN (Robust Security Network)
wpa_group_rekey=86400

# Logging
logger_syslog=-1
logger_syslog_level=2
logger_stdout=-1
logger_stdout_level=2
```

Tell hostapd where to find this configuration:

```bash
sudo nano /etc/default/hostapd
```

```text
DAEMON_CONF="/etc/hostapd/hostapd.conf"
```

## Configuring dnsmasq for DHCP

Stop the default dnsmasq service if running and create a configuration for the AP:

```bash
# Back up original dnsmasq config
sudo mv /etc/dnsmasq.conf /etc/dnsmasq.conf.orig

sudo nano /etc/dnsmasq.conf
```

```ini
# /etc/dnsmasq.conf - DHCP server for WiFi clients

# Only listen on the wireless interface
interface=wlan0

# Don't forward DNS queries without a domain to upstream
domain-needed
bogus-priv

# DHCP range and lease time
# Assign IPs from 10.0.0.100 to 10.0.0.200 with 12 hour leases
dhcp-range=10.0.0.100,10.0.0.200,255.255.255.0,12h

# Set the router/gateway (our AP's IP)
dhcp-option=3,10.0.0.1

# DNS servers for clients
dhcp-option=6,1.1.1.1,8.8.8.8

# Log DHCP transactions
log-dhcp

# Set the domain for the AP network
domain=ap.local

# Enable the DHCP server on this interface
dhcp-authoritative
```

## Enabling IP Forwarding and NAT

For internet access, enable IP forwarding and configure NAT:

```bash
# Enable IP forwarding immediately
echo 1 | sudo tee /proc/sys/net/ipv4/ip_forward

# Make IP forwarding permanent
sudo nano /etc/sysctl.d/99-ip-forward.conf
```

```ini
# Enable IP forwarding for access point routing
net.ipv4.ip_forward = 1
```

```bash
sudo sysctl -p /etc/sysctl.d/99-ip-forward.conf

# Set up NAT - masquerade traffic from WiFi clients going out through eth0
# This allows WiFi clients to reach the internet
sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE

# Allow forwarding between interfaces
sudo iptables -A FORWARD -i wlan0 -o eth0 -j ACCEPT
sudo iptables -A FORWARD -i eth0 -o wlan0 -m state --state RELATED,ESTABLISHED -j ACCEPT

# Save iptables rules to persist across reboots
sudo apt-get install -y iptables-persistent
sudo netfilter-persistent save
```

## Starting the Services

```bash
# Unmask and enable hostapd (it's masked by default on Ubuntu)
sudo systemctl unmask hostapd
sudo systemctl enable hostapd

# Start hostapd
sudo systemctl start hostapd
sudo systemctl status hostapd

# Start dnsmasq
sudo systemctl enable dnsmasq
sudo systemctl start dnsmasq
sudo systemctl status dnsmasq
```

### Checking hostapd is Running

```bash
# Check if the access point is up
sudo hostapd_cli status

# View connected clients
sudo hostapd_cli all_sta

# If hostapd failed to start, check logs
sudo journalctl -u hostapd -n 50
sudo tail -f /var/log/syslog | grep hostapd
```

## Verifying the Setup

```bash
# Check that wlan0 has the right IP
ip addr show wlan0

# Check that DHCP is serving leases
cat /var/lib/misc/dnsmasq.leases

# Check connected WiFi clients
iw dev wlan0 station dump

# Monitor traffic on the access point interface
sudo tcpdump -i wlan0 -n
```

## Troubleshooting Common Issues

### hostapd: Failed to create interface mon.wlan0

```bash
# Remove existing monitor interface if it exists
sudo iw dev mon.wlan0 del 2>/dev/null
# Then restart hostapd
sudo systemctl restart hostapd
```

### Clients Connect but Get No IP

```bash
# Check dnsmasq is running and listening on wlan0
sudo ss -ulnp | grep dnsmasq
# Should show port 67 listening

# Check firewall isn't blocking DHCP
sudo iptables -L -n | grep -E "67|DHCP"

# Allow DHCP through firewall
sudo iptables -A INPUT -i wlan0 -p udp --dport 67 -j ACCEPT
```

### No Internet Access for Clients

```bash
# Verify IP forwarding is enabled
cat /proc/sys/net/ipv4/ip_forward
# Should be 1

# Check NAT rules are in place
sudo iptables -t nat -L -n -v

# Check eth0 has internet access
ping -I eth0 8.8.8.8
```

## Creating a Startup Script

Consolidate all the startup steps:

```bash
#!/bin/bash
# /usr/local/bin/start-ap.sh

set -e

echo "Starting Ubuntu Access Point..."

# Set static IP on wireless interface
ip addr flush dev wlan0
ip addr add 10.0.0.1/24 dev wlan0
ip link set wlan0 up

# Enable IP forwarding
echo 1 > /proc/sys/net/ipv4/ip_forward

# Configure NAT
iptables -t nat -F
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
iptables -F FORWARD
iptables -A FORWARD -i wlan0 -o eth0 -j ACCEPT
iptables -A FORWARD -i eth0 -o wlan0 -m state --state RELATED,ESTABLISHED -j ACCEPT

# Start services
systemctl start hostapd
systemctl start dnsmasq

echo "Access Point started. SSID: $(grep '^ssid=' /etc/hostapd/hostapd.conf | cut -d= -f2)"
```

```bash
chmod +x /usr/local/bin/start-ap.sh
```

## Summary

Turning Ubuntu into a WiFi access point with hostapd requires:

1. A wireless adapter that supports AP mode (check with `iw list`)
2. hostapd configured with your SSID, password, and country code
3. dnsmasq for DHCP to assign IPs to connected clients
4. IP forwarding and iptables NAT for internet access

The combination works reliably once the initial configuration is correct. The most common issues are: wrong country code causing regulatory domain problems, NetworkManager fighting with hostapd for the wireless interface, and IP forwarding not enabled.
