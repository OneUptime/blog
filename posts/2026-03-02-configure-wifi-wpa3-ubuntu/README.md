# How to Configure WiFi with WPA3 on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, WiFi, WPA3, Security, Networking

Description: Learn how to configure WPA3 WiFi connections on Ubuntu, including SAE authentication, transition mode, and troubleshooting WPA3 compatibility issues.

---

WPA3 is the latest WiFi security standard, replacing WPA2 with stronger authentication and forward secrecy. It uses Simultaneous Authentication of Equals (SAE) instead of the Pre-Shared Key (PSK) handshake used in WPA2, which eliminates offline dictionary attacks even if an attacker captures the handshake. Ubuntu 20.04 and newer support WPA3 with sufficiently modern hardware and drivers.

## WPA3 Modes

There are two main WPA3 operating modes:

- **WPA3-Personal (SAE)**: Pure WPA3 mode, requires all clients to support WPA3
- **WPA3-Transition (WPA2/WPA3 mixed)**: The access point accepts both WPA2 and WPA3 clients simultaneously - this is the most practical choice for networks with mixed devices

## Checking WPA3 Support

Before configuring WPA3, verify your hardware and driver support it:

```bash
# Check if your WiFi adapter supports WPA3 (SAE)
iw phy phy0 info | grep -A 30 "Supported interface modes"
iw phy phy0 info | grep -i "sae\|wpa3"

# Check kernel version (WPA3 support improved significantly in 5.x)
uname -r

# Check wpa_supplicant version (2.9+ for stable WPA3)
wpa_supplicant -v 2>&1 | head -1

# Check if SAE is compiled into wpa_supplicant
wpa_supplicant -h 2>&1 | grep -i "CONFIG_SAE"
```

If your `wpa_supplicant` doesn't show SAE support, install a newer version:

```bash
# Check available version in Ubuntu repos
apt-cache show wpasupplicant | grep Version

# On Ubuntu 22.04+, wpa_supplicant 2.10+ is available which has good WPA3 support
sudo apt install wpasupplicant -y
```

## Connecting to WPA3 with nmcli

NetworkManager supports WPA3 from version 1.20+, available on Ubuntu 20.04 and newer:

```bash
# Check NetworkManager version
nmcli --version

# Scan for networks and identify WPA3 ones
nmcli device wifi list
# WPA3 networks show "WPA3" in the SECURITY column

# Connect to a WPA3-Personal (SAE) network
nmcli device wifi connect "WPA3Network" password "yourpassword"

# NetworkManager auto-negotiates WPA3 when the AP supports it
# Verify WPA3 is being used
nmcli connection show "WPA3Network" | grep -i "802-11-wireless-security"
```

### Explicitly Setting WPA3 on a Connection Profile

```bash
# Create a connection profile explicitly using WPA3 (SAE)
nmcli connection add \
    type wifi \
    con-name "WPA3Office" \
    ssid "OfficeWPA3Network" \
    wifi-sec.key-mgmt sae \
    wifi-sec.psk "strongpassword"

# For WPA2/WPA3 transition mode (accepts both)
nmcli connection add \
    type wifi \
    con-name "WPA3Transition" \
    ssid "MixedNetwork" \
    wifi-sec.key-mgmt wpa-psk \
    wifi-sec.psk "password"
# nmcli will use WPA3 SAE when available, WPA2 PSK as fallback
```

Check the security protocol in use after connecting:

```bash
# Show current connection security details
nmcli connection show "WPA3Office" | grep -E "key-mgmt|psk|pairwise|group"

# Check the active connection details
nmcli -f GENERAL.STATE,GENERAL.CONNECTION,IP4.ADDRESS device show wlan0
```

## Configuring WPA3 with wpa_supplicant

For systems without NetworkManager or for more control:

### WPA3-Personal (SAE Only)

```bash
sudo tee /etc/wpa_supplicant/wpa_supplicant.conf << 'EOF'
country=US
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1

network={
    ssid="WPA3OnlyNetwork"

    # SAE is the WPA3-Personal authentication method
    key_mgmt=SAE

    # The passphrase (works the same as WPA2-PSK)
    psk="yourpassword"

    # Require WPA3 (PMF - Protected Management Frames - required for WPA3)
    ieee80211w=2

    # SAE groups to allow (19 = 256-bit ECC, 20 = 384-bit ECC)
    sae_groups=19 20

    priority=10
}
EOF
```

### WPA3-Transition Mode (WPA2/WPA3 Mixed)

```bash
sudo tee /etc/wpa_supplicant/wpa_supplicant.conf << 'EOF'
country=US
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1

network={
    ssid="TransitionNetwork"

    # Accept both SAE (WPA3) and WPA-PSK (WPA2)
    key_mgmt=SAE WPA-PSK

    # Shared passphrase for both modes
    psk="yourpassword"

    # PMF optional (required for SAE, optional for transition mode)
    ieee80211w=1

    priority=10
}
EOF
```

```bash
# Connect using the configuration
sudo wpa_supplicant -B -i wlan0 -c /etc/wpa_supplicant/wpa_supplicant.conf

# Get an IP address
sudo dhclient wlan0

# Verify the connection type
sudo wpa_cli -i wlan0 status
# Look for key_mgmt=SAE to confirm WPA3 is in use
```

## Configuring WPA3 with Netplan

```yaml
# /etc/netplan/50-wifi.yaml
network:
  version: 2
  renderer: NetworkManager
  wifis:
    wlan0:
      dhcp4: true
      access-points:
        "WPA3NetworkName":
          auth:
            key-management: sae
            password: "yourpassword"
```

```bash
# For WPA3 with NetworkManager renderer
sudo netplan generate
sudo netplan apply

# Verify connection
ip addr show wlan0
nmcli connection show --active
```

## WPA3-Enterprise (802.1X with WPA3)

For enterprise networks using RADIUS authentication:

```bash
# wpa_supplicant configuration for WPA3-Enterprise
sudo tee /etc/wpa_supplicant/wpa_supplicant-enterprise.conf << 'EOF'
country=US
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev

network={
    ssid="EnterpriseWPA3"

    # WPA3-Enterprise uses SUITE-B or EAP-based authentication
    key_mgmt=WPA-EAP

    # PEAP with MS-CHAPv2 (common in enterprise environments)
    eap=PEAP
    identity="username@company.com"
    password="enterprisepassword"
    phase2="auth=MSCHAPV2"
    ca_cert="/etc/ssl/certs/ca-certificates.crt"

    # Protected Management Frames required for WPA3
    ieee80211w=2
}
EOF
```

## Troubleshooting WPA3 Connection Issues

```bash
# Check for WPA3 support errors in wpa_supplicant
sudo journalctl -u wpa_supplicant -f
# Look for: "CTRL-EVENT-ASSOC-REJECT" or "SAE-HASH-TO-ELEMENT"

# Common error: PMF (Protected Management Frames) mismatch
# Fix: check your AP's PMF setting and match in client config

# If connection fails, try WPA2 fallback first to verify AP is working
# Then gradually add WPA3 parameters

# Check if the AP actually supports WPA3
sudo iw dev wlan0 scan | grep -A 20 "SSID: YourNetwork" | grep -i "RSN\|WPA"

# Debug wpa_supplicant in verbose mode
sudo wpa_supplicant -d -i wlan0 -c /etc/wpa_supplicant/wpa_supplicant.conf 2>&1 | head -100
```

### Driver-Specific WPA3 Issues

Some older drivers have incomplete WPA3 support:

```bash
# For Intel iwlwifi - check if WPA3 SAE is supported
iw phy phy0 info | grep -i "sae\|wpa3\|pmf"

# For Realtek drivers - WPA3 support varies by chip generation
# RTL8852 and newer support WPA3; RTL8812 may not

# Check kernel driver version
modinfo iwlwifi | grep "^version\|^firmware"

# Update to latest firmware for better WPA3 support
sudo apt install linux-firmware -y

# After firmware update, reload the driver
sudo modprobe -r iwlwifi && sudo modprobe iwlwifi
```

## Verifying WPA3 is Active

```bash
# Confirm WPA3 SAE is the authentication method in use
sudo wpa_cli -i wlan0 status | grep key_mgmt
# Expected: key_mgmt=SAE

# Check connection via nmcli
nmcli device show wlan0 | grep -i "802-11-wireless"

# View the active security suite using iw
iw dev wlan0 link
# The "tx bitrates" and association data appears here

# Check NetworkManager's view
nmcli connection show "WPA3Office" | grep -i "key-mgmt"
# Should show: 802-11-wireless-security.key-mgmt: sae
```

WPA3 provides meaningful security improvements over WPA2, particularly protection against offline password brute-force attacks. For new Ubuntu deployments connecting to modern access points, WPA3 in transition mode is the recommended configuration - it works with WPA3 clients while remaining backward compatible.
