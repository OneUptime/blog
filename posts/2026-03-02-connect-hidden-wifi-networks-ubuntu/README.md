# How to Connect to Hidden WiFi Networks on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, WiFi, Networking, Nmcli, Security

Description: Learn how to connect to hidden WiFi networks (SSIDs not broadcast) on Ubuntu using nmcli, wpa_supplicant, and Netplan from both the command line and GUI.

---

Hidden WiFi networks do not broadcast their SSID (network name) in beacon frames. While this provides minimal security through obscurity, many corporate and home networks use this setting. Connecting to a hidden network requires explicitly telling your client software the SSID rather than selecting it from a scan list.

## Understanding Hidden Networks

When a WiFi access point is configured to not broadcast its SSID, network scanning tools show it as an unnamed network or don't show it at all. To connect, you must know:
- The exact SSID (network name)
- The security type (WPA2, WPA3, etc.)
- The password

```bash
# Scanning shows hidden networks with empty SSID
sudo iw dev wlan0 scan | grep -E "SSID:|signal:"
# Hidden networks appear as: SSID: (empty line)

# Or with nmcli - hidden networks show up without a name
nmcli device wifi list
```

## Method 1: nmcli (NetworkManager)

The most straightforward approach on Ubuntu is using `nmcli`:

```bash
# Connect to a hidden WPA2 network
# The 'hidden yes' flag tells nmcli not to expect the SSID in scan results
nmcli device wifi connect "HiddenNetworkName" \
    password "yourpassword" \
    hidden yes

# If you need to specify the interface
nmcli device wifi connect "HiddenNetworkName" \
    password "yourpassword" \
    hidden yes \
    ifname wlan0
```

### Creating a Persistent Hidden Network Profile

The command above creates a connection profile, but let's verify it's configured correctly for hidden networks:

```bash
# After connecting, check the connection profile
nmcli connection show "HiddenNetworkName"

# The critical field should show:
# 802-11-wireless.hidden: yes
nmcli -g 802-11-wireless.hidden connection show "HiddenNetworkName"

# If it shows 'no', update it
nmcli connection modify "HiddenNetworkName" 802-11-wireless.hidden yes

# Save and reconnect
nmcli connection down "HiddenNetworkName"
nmcli connection up "HiddenNetworkName"
```

### Creating a Hidden Network Profile Without Connecting

```bash
# Create the profile first (useful for server provisioning)
nmcli connection add \
    type wifi \
    con-name "HiddenOfficeNetwork" \
    ssid "OfficeHiddenSSID" \
    802-11-wireless.hidden yes \
    wifi-sec.key-mgmt wpa-psk \
    wifi-sec.psk "officepassword" \
    connection.autoconnect yes

# List saved connections to verify
nmcli connection show | grep "HiddenOfficeNetwork"

# Connect when ready
nmcli connection up "HiddenOfficeNetwork"
```

## Method 2: wpa_supplicant Configuration

For systems that use `wpa_supplicant` directly (common on Ubuntu Server):

```bash
# Edit or create the wpa_supplicant configuration
sudo tee /etc/wpa_supplicant/wpa_supplicant.conf << 'EOF'
country=US
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1

network={
    ssid="HiddenNetworkName"
    psk="yourpassword"
    key_mgmt=WPA-PSK

    # This is the critical line for hidden networks
    # scan_ssid=1 tells wpa_supplicant to probe for this SSID specifically
    scan_ssid=1

    priority=10
}
EOF
```

```bash
# Connect using wpa_supplicant
sudo wpa_supplicant -B -i wlan0 -c /etc/wpa_supplicant/wpa_supplicant.conf

# Request an IP address
sudo dhclient wlan0

# Verify connection
iw dev wlan0 link
ip addr show wlan0
```

The `scan_ssid=1` parameter is the key setting for hidden networks. Without it, `wpa_supplicant` only responds to broadcast beacons and will never discover the hidden network.

### Adding Multiple Networks with One Hidden

```bash
sudo tee /etc/wpa_supplicant/wpa_supplicant.conf << 'EOF'
country=US
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1

# Regular visible network (priority 5)
network={
    ssid="RegularVisibleNetwork"
    psk="regularpassword"
    key_mgmt=WPA-PSK
    priority=5
}

# Hidden network (higher priority - preferred when available)
network={
    ssid="HiddenNetworkName"
    psk="hiddenpassword"
    key_mgmt=WPA-PSK
    scan_ssid=1
    priority=10
}
EOF
```

## Method 3: Netplan (Ubuntu Server)

For Ubuntu Server using Netplan, hidden networks require the `hidden: true` option:

```bash
sudo tee /etc/netplan/50-wifi.yaml << 'EOF'
network:
  version: 2
  renderer: NetworkManager
  wifis:
    wlan0:
      dhcp4: true
      access-points:
        "HiddenNetworkSSID":
          hidden: true
          password: "yourpassword"
          auth:
            key-management: psk
EOF

# Validate and apply
sudo netplan generate
sudo netplan apply

# Check connection
ip addr show wlan0
```

For Netplan with `networkd` renderer, the hidden network configuration is the same - the `hidden: true` key tells the backend to use directed probe requests.

## Connecting via GNOME GUI (Ubuntu Desktop)

On Ubuntu Desktop with GNOME:

1. Click the network icon in the top-right corner
2. Select "Select Network" or "Wi-Fi Settings"
3. Click "Connect to Hidden Network"
4. Enter the Network Name (SSID) exactly as configured on the router
5. Select the security type (WPA/WPA2 Personal is most common)
6. Enter the password
7. Click Connect

## Verifying the Connection

```bash
# Check that you're connected to the right SSID
iw dev wlan0 link
# Output should show SSID even for hidden networks once connected

# Check IP address assignment
ip addr show wlan0

# Test internet connectivity
ping -c 4 8.8.8.8

# Check signal strength to the hidden AP
iw dev wlan0 link | grep signal
```

## Troubleshooting Hidden Network Connections

```bash
# Verify wpa_supplicant is probing for the SSID
sudo wpa_cli -i wlan0 scan_results | grep -i "hidden\|your-ssid"

# Watch wpa_supplicant logs for connection attempts
sudo journalctl -u wpa_supplicant -f

# If using NetworkManager, check logs
sudo journalctl -u NetworkManager -f

# Force a reconnect attempt
nmcli device disconnect wlan0
nmcli device connect wlan0

# Manually trigger a WiFi scan
nmcli device wifi rescan
nmcli device wifi list
# Hidden networks might appear with empty SSID field

# Check if the profile is set to hidden
nmcli connection show "HiddenNetworkName" | grep hidden
```

### Common Issues

**SSID typo**: Hidden SSIDs must match exactly, including capitalization and spaces. There is no autocomplete - verify the SSID character by character.

**Wrong security type**: If the AP uses WPA3 but you're connecting with WPA2 settings, the handshake will fail silently. Check the router's configuration.

**scan_ssid missing in wpa_supplicant**: If you manually edit the config file and forget `scan_ssid=1`, the network will never be discovered.

**NetworkManager ignoring the hidden flag**: After adding via GUI, verify with `nmcli connection show "YourSSID" | grep hidden`. If it shows `no`, update it with `nmcli connection modify "YourSSID" 802-11-wireless.hidden yes`.

Hidden networks add a small barrier to casual discovery but should not be the sole security mechanism - use strong WPA3 authentication and a strong passphrase as the actual security layer.
