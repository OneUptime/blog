# How to Set Up a WiFi Access Point on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, WiFi, Networking, Hostapd, Access Point

Description: Learn how to configure Ubuntu as a WiFi access point using hostapd and dnsmasq, with NAT routing to share an internet connection wirelessly.

---

Turning an Ubuntu machine into a WiFi access point is useful for creating a dedicated wireless network, sharing an internet connection, setting up a wireless bridge, or building custom router functionality. This guide covers the full setup using `hostapd` for the wireless access point daemon and `dnsmasq` for DHCP and DNS.

## Prerequisites

You need a system with:
- A wireless network interface that supports AP (access point) mode
- Optionally, a second interface (wired or another WiFi) connected to the internet for sharing

Check if your wireless card supports AP mode:

```bash
# Install iw if not present
sudo apt install iw -y

# Check supported interface modes
iw phy phy0 info | grep -A 10 "Supported interface modes"

# Output should include 'AP' in the list
# If it shows: * AP
# Your card supports access point mode
```

Also check for driver support:

```bash
# List wireless interfaces
iw dev

# Check the PHY (physical device) for your interface
# The interface name in 'iw dev' output shows phy#X
iw phy phy0 info | grep -E "AP|Modes"
```

## Installing Required Packages

```bash
# Update package lists
sudo apt update

# Install hostapd (access point daemon) and dnsmasq (DHCP/DNS)
sudo apt install hostapd dnsmasq -y

# Stop services while configuring
sudo systemctl stop hostapd
sudo systemctl stop dnsmasq
```

## Configuring hostapd

`hostapd` manages the wireless access point functionality.

```bash
# Create the hostapd configuration file
sudo tee /etc/hostapd/hostapd.conf << 'EOF'
# Wireless interface to use as the access point
interface=wlan0

# WiFi driver - nl80211 works for most modern cards
driver=nl80211

# Network name (SSID)
ssid=MyUbuntuAP

# Country code - required for regulatory compliance
country_code=US

# Channel to operate on (1-14 for 2.4GHz, varies for 5GHz)
channel=6

# Hardware mode: g = 2.4GHz 802.11g/n, a = 5GHz 802.11a/n/ac
hw_mode=g

# Enable 802.11n (WiFi 4) support
ieee80211n=1

# Enable WMM (WiFi Multimedia) - required for 802.11n
wmm_enabled=1

# Authentication: WPA2 (recommended)
auth_algs=1
wpa=2
wpa_key_mgmt=WPA-PSK
rsn_pairwise=CCMP

# WiFi password (minimum 8 characters)
wpa_passphrase=SecurePassword123

# Logging level (0=verbose, 1=info, 2=warning, 3=errors only)
logger_syslog=-1
logger_stdout=-1
EOF
```

Point hostapd to this configuration file:

```bash
# Edit the hostapd default file to specify the config location
sudo sed -i 's|#DAEMON_CONF=""|DAEMON_CONF="/etc/hostapd/hostapd.conf"|' /etc/default/hostapd

# Verify the change
grep DAEMON_CONF /etc/default/hostapd
```

## Configuring a Static IP on the AP Interface

The wireless interface acting as the access point needs a static IP:

```bash
# Configure static IP for the AP interface using netplan
sudo tee /etc/netplan/10-ap-interface.yaml << 'EOF'
network:
  version: 2
  renderer: networkd
  ethernets:
    wlan0:
      dhcp4: false
      addresses:
        - 10.0.0.1/24
EOF

# Apply the netplan configuration
sudo netplan apply

# Verify the IP is assigned
ip addr show wlan0
```

## Configuring dnsmasq for DHCP

`dnsmasq` provides DHCP so connected clients get IP addresses automatically:

```bash
# Backup the original dnsmasq config
sudo cp /etc/dnsmasq.conf /etc/dnsmasq.conf.backup

# Create a new dnsmasq configuration
sudo tee /etc/dnsmasq.conf << 'EOF'
# Only listen on the AP interface
interface=wlan0
bind-interfaces

# Disable DNS on the AP interface (optional - keep it for client DNS resolution)
# no-resolv

# DHCP range: start IP, end IP, subnet mask, lease time
dhcp-range=10.0.0.10,10.0.0.100,255.255.255.0,24h

# Default gateway for clients (the AP interface IP)
dhcp-option=3,10.0.0.1

# DNS server for clients (using Google DNS and Cloudflare)
dhcp-option=6,8.8.8.8,1.1.1.1

# Log DHCP assignments for troubleshooting
log-dhcp
EOF
```

## Setting Up NAT for Internet Sharing

If you want to share an internet connection (available on eth0 or another interface):

```bash
# Enable IP forwarding
echo 'net.ipv4.ip_forward=1' | sudo tee /etc/sysctl.d/99-ip-forward.conf
sudo sysctl --system

# Verify IP forwarding is enabled
cat /proc/sys/net/ipv4/ip_forward
# Should output: 1

# Set up NAT with iptables
# Replace eth0 with your internet-connected interface
sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
sudo iptables -A FORWARD -i eth0 -o wlan0 -m state --state RELATED,ESTABLISHED -j ACCEPT
sudo iptables -A FORWARD -i wlan0 -o eth0 -j ACCEPT

# Save iptables rules so they persist across reboots
sudo apt install iptables-persistent -y
sudo netfilter-persistent save
```

## Starting the Access Point

```bash
# Start dnsmasq first
sudo systemctl start dnsmasq
sudo systemctl status dnsmasq

# Start hostapd
sudo systemctl start hostapd
sudo systemctl status hostapd

# Enable both services to start at boot
sudo systemctl enable hostapd
sudo systemctl enable dnsmasq
```

Check for errors:

```bash
# View hostapd logs in real time
sudo journalctl -u hostapd -f

# Check if the AP interface is up and in AP mode
iw dev wlan0 info
# Should show: type AP

# List connected clients
iw dev wlan0 station dump
```

## Configuring 5GHz Operation

For 5GHz (802.11a/ac), adjust the hostapd configuration:

```bash
sudo tee /etc/hostapd/hostapd.conf << 'EOF'
interface=wlan0
driver=nl80211
ssid=MyUbuntuAP-5G
country_code=US

# 5GHz channel (36, 40, 44, 48 are common non-DFS channels)
channel=36

# 5GHz 802.11a mode
hw_mode=a

# Enable 802.11n and 802.11ac
ieee80211n=1
ieee80211ac=1
wmm_enabled=1

# VHT (802.11ac) capabilities - 80MHz channel width
vht_oper_chwidth=1
vht_oper_centr_freq_seg0_idx=42

auth_algs=1
wpa=2
wpa_key_mgmt=WPA-PSK
rsn_pairwise=CCMP
wpa_passphrase=SecurePassword123
EOF
```

## Troubleshooting Common Issues

```bash
# hostapd fails to start - check for conflicts
sudo rfkill list all
sudo rfkill unblock all

# Check if another process is using the interface
sudo fuser /dev/rfkill

# Verify hostapd can see the interface
sudo hostapd -dd /etc/hostapd/hostapd.conf 2>&1 | head -50

# dnsmasq fails - check for port 53 conflicts
sudo ss -tulpn | grep :53
# If systemd-resolved is using port 53, disable it
sudo systemctl disable systemd-resolved
sudo systemctl stop systemd-resolved
sudo rm /etc/resolv.conf
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf

# Clients connect but have no internet
# Verify IP forwarding
cat /proc/sys/net/ipv4/ip_forward
# Verify NAT rules
sudo iptables -t nat -L -v -n
```

## Monitoring Connected Clients

```bash
# List all connected WiFi clients
iw dev wlan0 station dump | grep -E "Station|rx bytes|tx bytes|signal"

# Watch for new associations in the hostapd log
sudo journalctl -u hostapd -f | grep -E "associated|authenticated|deauthenticated"

# Check DHCP leases
cat /var/lib/misc/dnsmasq.leases
```

This setup gives you a fully functional software access point. Combined with proper firewall rules and monitoring, it can serve as a reliable wireless gateway for home labs, IoT networks, or development environments.
