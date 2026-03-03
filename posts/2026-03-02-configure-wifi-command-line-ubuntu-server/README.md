# How to Configure WiFi from the Command Line on Ubuntu Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, WiFi, Networking, Server, Netplan

Description: Learn how to configure WiFi connections from the command line on Ubuntu Server using Netplan and NetworkManager, including WPA2 authentication and static IPs.

---

Ubuntu Server doesn't ship with a graphical desktop, which means WiFi configuration happens entirely through the command line. Whether you're setting up a Raspberry Pi, a headless NUC, or any server that connects via wireless, knowing how to configure WiFi without a GUI is an essential skill.

## Identifying Your WiFi Interface

Before configuring anything, find your wireless interface name:

```bash
# List all network interfaces
ip link show

# Filter to show only wireless interfaces
ip link show | grep -E "^[0-9]+: w"

# Use iw to show wireless-specific information
sudo apt install iw -y
iw dev

# List available wireless interfaces
iwconfig 2>/dev/null | grep -v "^$" | grep -v "no wireless"
```

Modern Ubuntu uses predictable interface names like `wlan0`, `wlp2s0`, or `wlx001c101234ab`. The `wlp2s0` format indicates a wireless device on PCI bus 2, slot 0.

## Scanning for Available Networks

```bash
# Scan for available WiFi networks
sudo iw dev wlan0 scan | grep SSID

# More detailed scan
sudo iw dev wlan0 scan | grep -E "SSID|signal|freq"

# Using nmcli (if NetworkManager is installed)
nmcli device wifi list

# Refresh the scan
nmcli device wifi rescan && nmcli device wifi list
```

## Method 1: Netplan (Ubuntu 18.04+)

Netplan is the default network configuration system on Ubuntu Server. It uses YAML files in `/etc/netplan/` and generates configuration for the underlying network backend (systemd-networkd or NetworkManager).

### Basic WPA2 Configuration

```bash
# List existing netplan configuration files
ls /etc/netplan/

# Edit the existing configuration or create a new one
sudo nano /etc/netplan/00-installer-config.yaml
```

Add WiFi configuration to the file:

```yaml
# /etc/netplan/00-installer-config.yaml
network:
  version: 2
  renderer: networkd
  wifis:
    wlan0:
      dhcp4: true
      access-points:
        "MyHomeNetwork":
          password: "mysecretpassword"
```

```bash
# Validate the configuration syntax
sudo netplan generate

# Apply the configuration
sudo netplan apply

# Check connection status
ip addr show wlan0
```

### Static IP WiFi Configuration

```yaml
# /etc/netplan/00-installer-config.yaml
network:
  version: 2
  renderer: networkd
  wifis:
    wlan0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 1.1.1.1
      access-points:
        "MyHomeNetwork":
          password: "mysecretpassword"
```

### Enterprise WPA2 (EAP/PEAP) Configuration

```yaml
# /etc/netplan/00-installer-config.yaml
network:
  version: 2
  renderer: networkd
  wifis:
    wlan0:
      dhcp4: true
      access-points:
        "CorpWiFi":
          auth:
            key-management: eap
            method: peap
            identity: "username@company.com"
            password: "enterprisepassword"
            ca-certificate: /etc/ssl/certs/ca-certificates.crt
```

```bash
# Apply and verify
sudo netplan apply
ip addr show wlan0
ping -c 4 8.8.8.8
```

## Method 2: wpa_supplicant (Direct)

`wpa_supplicant` is the underlying tool that handles WPA/WPA2 authentication. You can configure it directly for more control.

### Install and Configure wpa_supplicant

```bash
# Install wpa_supplicant
sudo apt install wpasupplicant -y

# Generate a WPA passphrase hash (more secure than plaintext)
wpa_passphrase "MyHomeNetwork" "mysecretpassword"
```

The `wpa_passphrase` output looks like:

```text
network={
    ssid="MyHomeNetwork"
    #psk="mysecretpassword"
    psk=a8f32bc1234567890abcdef1234567890abcdef1234567890abcdef12345678
}
```

```bash
# Create the wpa_supplicant configuration file
sudo tee /etc/wpa_supplicant/wpa_supplicant.conf << 'EOF'
country=US
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1

network={
    ssid="MyHomeNetwork"
    psk=a8f32bc1234567890abcdef1234567890abcdef1234567890abcdef12345678
    key_mgmt=WPA-PSK
    priority=2
}

# Second network as fallback
network={
    ssid="BackupNetwork"
    psk=b9e43cd2345678901bcdef23456789012bcdef23456789012bcdef2345678901
    key_mgmt=WPA-PSK
    priority=1
}
EOF
```

```bash
# Start wpa_supplicant manually to test
sudo wpa_supplicant -B -i wlan0 -c /etc/wpa_supplicant/wpa_supplicant.conf

# Request an IP address via DHCP
sudo dhclient wlan0

# Verify connectivity
ip addr show wlan0
ping -c 4 8.8.8.8
```

### Make wpa_supplicant Start at Boot

```bash
# Enable the systemd service for wpa_supplicant
sudo systemctl enable wpa_supplicant@wlan0
sudo systemctl start wpa_supplicant@wlan0

# Check service status
sudo systemctl status wpa_supplicant@wlan0
```

## Method 3: NetworkManager (nmcli)

If your Ubuntu Server installation uses NetworkManager (common with Ubuntu 20.04+ server installations):

```bash
# Check if NetworkManager is running
systemctl status NetworkManager

# Connect to a WiFi network
nmcli device wifi connect "MyHomeNetwork" password "mysecretpassword"

# Connect to a specific BSSID (useful when multiple APs have the same SSID)
nmcli device wifi connect "MyHomeNetwork" \
    password "mysecretpassword" \
    bssid "aa:bb:cc:dd:ee:ff"

# List saved connections
nmcli connection show

# Check connection status
nmcli device status
```

## Troubleshooting WiFi Connection Issues

```bash
# Check kernel messages for WiFi driver errors
dmesg | grep -i wifi
dmesg | grep -i wlan
dmesg | tail -50

# Check if the interface is up
ip link show wlan0

# Bring the interface up if it's down
sudo ip link set wlan0 up

# Check for RF kill switch (hardware or software WiFi disable)
rfkill list all

# Unblock software kill switch
sudo rfkill unblock wifi

# Check wpa_supplicant connection status
sudo wpa_cli -i wlan0 status

# Show current signal strength
iw dev wlan0 link
```

## Persisting Configuration Across Reboots

The most reliable approach for Ubuntu Server is Netplan. Verify your configuration persists:

```bash
# Test configuration applies correctly after reboot
sudo netplan try

# If no issues within 120 seconds, confirm the change
# Press Enter to confirm, or wait for automatic revert

# Reboot to verify persistence
sudo reboot

# After reboot, check WiFi is connected
ip addr show wlan0
ping -c 4 8.8.8.8
```

For servers that need both wired and wireless connectivity, Netplan supports configuring both in the same file - just add an `ethernets:` section alongside the `wifis:` section.
