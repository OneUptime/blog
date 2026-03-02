# How to Use nmcli for Network Manager Control on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, nmcli, NetworkManager, WiFi

Description: Learn how to use nmcli to manage network connections on Ubuntu, including WiFi, Ethernet, VPN, and connection profiles from the command line.

---

`nmcli` is the command-line interface for NetworkManager, and it's the most capable tool for managing network connections on Ubuntu from a terminal. It can do everything the GUI network settings can do, plus scripting-friendly output, connection profiles, and more advanced configuration options.

## Basic nmcli Usage

```bash
# Show NetworkManager status and all connections at a glance
nmcli

# Show connection status (cleaner summary)
nmcli connection show

# Show device status (interfaces and their state)
nmcli device status

# Show detailed device information
nmcli device show

# Show only a specific device
nmcli device show wlan0
```

## Checking Network Status

```bash
# Overall network connectivity status
nmcli networking connectivity

# Possible values:
# none - no connection
# portal - captive portal, not yet authenticated
# limited - connected but no internet
# full - connected with internet access
# unknown - status unknown

# Check if networking is enabled
nmcli networking

# Check if WiFi is enabled
nmcli radio wifi

# Check all radio status
nmcli radio
```

## WiFi Operations

### Scanning and Connecting

```bash
# Scan for available WiFi networks
nmcli device wifi list

# Refresh the scan
nmcli device wifi rescan
nmcli device wifi list

# Connect to a WiFi network (creates a connection profile)
nmcli device wifi connect "NetworkName" password "yourpassword"

# Connect on a specific interface (when you have multiple WiFi adapters)
nmcli device wifi connect "NetworkName" password "yourpassword" ifname wlan0

# Connect to a hidden network
nmcli device wifi connect "HiddenSSID" password "yourpassword" hidden yes
```

### Managing WiFi Radio

```bash
# Disable WiFi (useful for troubleshooting or power saving)
nmcli radio wifi off

# Re-enable WiFi
nmcli radio wifi on

# Turn off all radios (WiFi + Bluetooth + WiMAX)
nmcli radio all off
nmcli radio all on
```

## Managing Connection Profiles

NetworkManager stores network configurations as "connection profiles" in `/etc/NetworkManager/system-connections/`.

### Listing and Viewing Connections

```bash
# List all saved connection profiles
nmcli connection show

# Show details of a specific connection
nmcli connection show "MyHomeNetwork"

# Show only active connections
nmcli connection show --active

# Show connection in a parseable format (useful for scripts)
nmcli -t -f NAME,STATE,TYPE connection show
```

### Creating Connection Profiles

```bash
# Create a new WiFi connection profile without connecting immediately
nmcli connection add \
    type wifi \
    con-name "HomeWiFi" \
    ssid "MyHomeNetwork" \
    wifi-sec.key-mgmt wpa-psk \
    wifi-sec.psk "yourpassword"

# Create an Ethernet connection with static IP
nmcli connection add \
    type ethernet \
    con-name "StaticEth" \
    ifname eth0 \
    ipv4.addresses "192.168.1.100/24" \
    ipv4.gateway "192.168.1.1" \
    ipv4.dns "8.8.8.8,1.1.1.1" \
    ipv4.method manual

# Create a DHCP Ethernet connection
nmcli connection add \
    type ethernet \
    con-name "DynamicEth" \
    ifname eth0 \
    ipv4.method auto
```

### Modifying Existing Connections

```bash
# Change the password for a WiFi connection
nmcli connection modify "HomeWiFi" wifi-sec.psk "newpassword"

# Change DNS servers for a connection
nmcli connection modify "HomeWiFi" ipv4.dns "8.8.8.8 8.8.4.4"

# Add a second DNS server (use + to append instead of replace)
nmcli connection modify "HomeWiFi" +ipv4.dns "1.1.1.1"

# Change IP address for a static connection
nmcli connection modify "StaticEth" ipv4.addresses "192.168.1.200/24"

# Set connection to auto-connect on boot
nmcli connection modify "HomeWiFi" connection.autoconnect yes

# Set connection priority (higher = preferred when multiple match)
nmcli connection modify "HomeWiFi" connection.autoconnect-priority 100

# Disable autoconnect
nmcli connection modify "OldConnection" connection.autoconnect no
```

### Activating and Deactivating Connections

```bash
# Connect using a saved profile
nmcli connection up "HomeWiFi"

# Disconnect
nmcli connection down "HomeWiFi"

# Activate a connection on a specific device
nmcli connection up "HomeWiFi" ifname wlan0

# Disconnect a device from all connections
nmcli device disconnect wlan0
```

### Deleting Connection Profiles

```bash
# Delete a saved connection profile
nmcli connection delete "OldNetwork"

# Delete by UUID
nmcli connection delete uuid "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

## Setting Up a Static IP Connection

```bash
# Modify an existing connection to use static IP
nmcli connection modify "Wired connection 1" \
    ipv4.method manual \
    ipv4.addresses "192.168.1.50/24" \
    ipv4.gateway "192.168.1.1" \
    ipv4.dns "8.8.8.8"

# Apply the changes by reactivating the connection
nmcli connection down "Wired connection 1"
nmcli connection up "Wired connection 1"

# Verify the IP address
ip addr show eth0
```

## VPN Connections

```bash
# List available VPN types
nmcli connection add help

# Add an OpenVPN connection
nmcli connection import type openvpn file /path/to/client.ovpn

# Add a WireGuard connection
nmcli connection add \
    type wireguard \
    con-name "MyVPN" \
    ifname wg0

# Activate a VPN
nmcli connection up "MyVPN"

# Check VPN status
nmcli connection show "MyVPN" | grep -E "GENERAL.STATE|VPN.VPN-STATE"
```

## Scripting with nmcli

`nmcli` has a terse output mode designed for scripting:

```bash
# Get just the connection state (no headers)
nmcli -t -f GENERAL.STATE device show wlan0

# Check if connected (returns "connected" or other state)
STATE=$(nmcli -t -f GENERAL.STATE device show wlan0 | cut -d: -f2)
if [ "$STATE" = "connected" ]; then
    echo "WiFi is connected"
else
    echo "WiFi is not connected"
fi

# Get the current IP address of an interface
nmcli -g IP4.ADDRESS device show wlan0

# Get the SSID currently connected to
nmcli -g GENERAL.CONNECTION device show wlan0

# Wait for a connection and then take action
nmcli -w 30 device connect wlan0 && echo "Connected successfully"
```

### Auto-reconnect Script

```bash
#!/bin/bash
# wifi-watchdog.sh - Check WiFi and reconnect if needed

INTERFACE="wlan0"
CONNECTION="HomeWiFi"
CHECK_HOST="8.8.8.8"

# Check if we can reach the internet
if ! ping -c 1 -W 5 "$CHECK_HOST" &>/dev/null; then
    echo "$(date): Network unreachable, attempting reconnect..."
    nmcli connection down "$CONNECTION" 2>/dev/null
    sleep 2
    nmcli connection up "$CONNECTION"
    sleep 10

    if ping -c 1 -W 5 "$CHECK_HOST" &>/dev/null; then
        echo "$(date): Reconnected successfully"
    else
        echo "$(date): Reconnect failed"
    fi
fi
```

## Troubleshooting with nmcli

```bash
# View NetworkManager logs
sudo journalctl -u NetworkManager -f

# Show verbose output for a connection attempt
nmcli -v device wifi connect "NetworkName" password "password"

# Check NetworkManager daemon status
nmcli general status

# Toggle logging level
sudo nmcli general logging level DEBUG domains ALL

# Reset logging to default
sudo nmcli general logging level INFO domains DEFAULT

# Check if an interface is managed by NetworkManager
nmcli device show wlan0 | grep "GENERAL.NM-MANAGED"
# If this shows "no", NetworkManager is ignoring the device

# Force NetworkManager to manage an interface
nmcli device set wlan0 managed yes
```

## Useful Output Formatting

```bash
# Show specific fields only
nmcli -f NAME,TYPE,STATE,DEVICE connection show

# Machine-readable output (colon-separated)
nmcli -t -f NAME,STATE connection show

# Pretty-print a specific connection's full details
nmcli -p connection show "HomeWiFi"
```

`nmcli` makes NetworkManager fully scriptable, which is valuable for automated provisioning, configuration management with tools like Ansible, and building custom networking tools. The consistent interface works the same way on desktop Ubuntu and headless server installations.
