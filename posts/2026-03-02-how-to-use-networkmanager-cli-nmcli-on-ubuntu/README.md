# How to Use NetworkManager CLI (nmcli) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, NetworkManager, Nmcli

Description: A thorough guide to managing network connections on Ubuntu using nmcli, the command-line interface for NetworkManager, covering wired, wireless, VPN, and connection profiles.

---

`nmcli` is the command-line tool for NetworkManager, the service that manages network connections on most Ubuntu desktop and server installations. While the GUI network settings panel handles common tasks, `nmcli` is indispensable for scripting, remote management, and configuration that the GUI doesn't expose.

This guide covers everyday `nmcli` usage from checking status to setting up complex connection profiles.

## Checking Network Status

Start with a general status overview:

```bash
# General NetworkManager status
nmcli general status

# Show all network devices
nmcli device

# Show detailed device info
nmcli device show

# Show status for a specific device
nmcli device show eth0

# List all connection profiles
nmcli connection show

# Show only active connections
nmcli connection show --active
```

The `nmcli device` command shows devices (physical or virtual interfaces) while `nmcli connection` shows connection profiles (configurations that can be applied to devices). A device can have multiple profiles but only one active at a time.

## Managing Wired Connections

```bash
# Bring up a connection profile
nmcli connection up "Wired connection 1"

# Bring down a connection
nmcli connection down "Wired connection 1"

# Connect a device using its best available connection
nmcli device connect eth0

# Disconnect a device
nmcli device disconnect eth0

# Reload all connection files from disk
nmcli connection reload
```

### Creating a Static IP Connection

```bash
# Create a new Ethernet connection with a static IP
nmcli connection add \
  type ethernet \
  con-name "static-office" \
  ifname eth0 \
  ipv4.method manual \
  ipv4.addresses 192.168.1.100/24 \
  ipv4.gateway 192.168.1.1 \
  ipv4.dns "8.8.8.8,8.8.4.4"

# Activate the new connection
nmcli connection up "static-office"
```

### Creating a DHCP Connection

```bash
# Create a DHCP Ethernet connection
nmcli connection add \
  type ethernet \
  con-name "dhcp-home" \
  ifname eth0 \
  ipv4.method auto

nmcli connection up "dhcp-home"
```

### Modifying an Existing Connection

```bash
# Change the IP address of an existing connection
nmcli connection modify "static-office" ipv4.addresses 192.168.1.150/24

# Change the DNS servers
nmcli connection modify "static-office" ipv4.dns "1.1.1.1,1.0.0.1"

# Add a second DNS server without replacing the first
nmcli connection modify "static-office" +ipv4.dns 9.9.9.9

# Remove a specific DNS server
nmcli connection modify "static-office" -ipv4.dns 9.9.9.9

# Activate changes
nmcli connection up "static-office"
```

## Managing Wireless Connections

```bash
# List available WiFi networks
nmcli device wifi list

# Rescan for networks
nmcli device wifi rescan

# Connect to a WiFi network
nmcli device wifi connect "NetworkSSID" password "yourpassword"

# Connect using a specific device
nmcli device wifi connect "NetworkSSID" password "yourpassword" ifname wlan0

# Show saved WiFi passwords (requires sudo)
sudo nmcli connection show "NetworkSSID" | grep psk
```

### Create a WiFi Connection Profile

```bash
# Create a WPA2 personal connection profile
nmcli connection add \
  type wifi \
  con-name "home-wifi" \
  ifname wlan0 \
  ssid "HomeNetwork" \
  wifi-sec.key-mgmt wpa-psk \
  wifi-sec.psk "yourpassword"

# Activate it
nmcli connection up "home-wifi"
```

### WiFi Hotspot (Access Point)

```bash
# Create a WiFi hotspot
nmcli connection add \
  type wifi \
  con-name "my-hotspot" \
  ifname wlan0 \
  ssid "MyHotspot" \
  mode ap \
  wifi-sec.key-mgmt wpa-psk \
  wifi-sec.psk "hotspotpassword" \
  ipv4.method shared

nmcli connection up "my-hotspot"
```

## Managing Connection Profiles

```bash
# Delete a connection profile
nmcli connection delete "old-connection"

# Rename a connection
nmcli connection modify "old-name" connection.id "new-name"

# Clone a connection
nmcli connection clone "existing-connection" "new-connection"

# Export a connection to a file (creates a .nmconnection file)
nmcli connection export "my-vpn" /tmp/my-vpn.ovpn

# Import a VPN config
nmcli connection import type openvpn file /tmp/my-vpn.ovpn
```

## VPN Connections

```bash
# Import an OpenVPN configuration
nmcli connection import type openvpn file /path/to/config.ovpn

# Set VPN credentials
nmcli connection modify "vpn-name" \
  vpn.data "username=myuser" \
  vpn.secrets "password=mypassword"

# Connect to VPN
nmcli connection up "vpn-name"

# Disconnect from VPN
nmcli connection down "vpn-name"

# Check VPN status
nmcli connection show "vpn-name" | grep vpn
```

## Network Monitoring

```bash
# Monitor network events in real time
nmcli monitor

# Watch device state changes
nmcli device monitor

# Show connectivity status
nmcli networking connectivity

# Check if NetworkManager thinks internet is reachable
nmcli general connectivity
```

## IPv6 Configuration

```bash
# Disable IPv6 on a connection
nmcli connection modify "my-connection" ipv6.method disabled

# Set a static IPv6 address
nmcli connection modify "my-connection" \
  ipv6.method manual \
  ipv6.addresses "2001:db8::1/64" \
  ipv6.gateway "2001:db8::ff"

# Enable SLAAC (stateless autoconfiguration)
nmcli connection modify "my-connection" ipv6.method auto
```

## Controlling NetworkManager

```bash
# Disable all networking
nmcli networking off

# Re-enable networking
nmcli networking on

# Enable/disable WiFi radio
nmcli radio wifi off
nmcli radio wifi on

# Enable/disable all radios (WiFi + mobile broadband)
nmcli radio all off
nmcli radio all on
```

## Useful Scripting Patterns

```bash
# Get the IP address of a specific interface
nmcli -g IP4.ADDRESS device show eth0

# Get just the active connections' names
nmcli -t -f NAME connection show --active

# Check if a specific SSID is available
nmcli device wifi list | grep -i "MySSID"

# Wait for network connectivity before running a command
while ! nmcli networking connectivity | grep -q "full"; do
  sleep 2
done
echo "Network is up"

# Get MAC address of a device
nmcli -g GENERAL.HWADDR device show eth0
```

## Output Formatting

`nmcli` has flexible output formatting options:

```bash
# Tabular output (default)
nmcli device

# Machine-readable (colon-separated)
nmcli -t device

# Select specific fields
nmcli -f NAME,TYPE,STATE connection

# Pretty format with full details
nmcli -p connection show

# Output as JSON (useful for scripting)
nmcli --mode json device
```

## Troubleshooting with nmcli

```bash
# Check why a connection failed
nmcli connection show "my-connection" | grep -i state

# View NetworkManager logs
journalctl -u NetworkManager -f

# Force NetworkManager to re-read connection files
nmcli connection reload

# Check if NetworkManager is managing a device
nmcli device show eth0 | grep GENERAL.STATE

# List devices NetworkManager isn't managing
nmcli device status | grep unmanaged
```

`nmcli` covers nearly everything the GUI does and much more. For server environments where GUI tools aren't available, it's the primary way to configure and manage network connections without editing raw configuration files.
