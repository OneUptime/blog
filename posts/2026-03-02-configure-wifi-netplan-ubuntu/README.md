# How to Configure WiFi with Netplan on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Netplan, WiFi, Wireless

Description: Configure WiFi connections on Ubuntu using Netplan, covering WPA2, WPA3, hidden networks, multiple access points, and the networkd vs NetworkManager backends.

---

WiFi configuration with Netplan is slightly more involved than wired networking because of authentication. Most modern WiFi networks use WPA2 or WPA3, which requires a passphrase negotiation that Netplan handles through the `wpa_supplicant` daemon (when using the networkd backend) or directly through NetworkManager.

## Checking Your WiFi Interface

```bash
# List wireless interfaces
iw dev

# Or with ip command
ip link show | grep -i wlan

# Check if WiFi adapter is detected and enabled
rfkill list wifi

# If blocked by software:
rfkill unblock wifi
```

Common WiFi interface names: `wlan0`, `wlp2s0`, `wlx00112233aabb` (for USB adapters).

## Basic WPA2 WiFi Configuration

The simplest case - connecting to a WPA2 network:

```yaml
# /etc/netplan/01-wifi.yaml
network:
  version: 2
  renderer: networkd
  wifis:
    wlan0:
      dhcp4: true
      access-points:
        "MyNetwork":              # SSID in quotes
          password: "mypassword"  # WPA2 password
```

Apply it:

```bash
sudo netplan apply

# Check connection status
iw dev wlan0 link

# Verify IP was assigned
ip addr show wlan0
```

## NetworkManager Backend for WiFi (Recommended for Desktops)

On desktop Ubuntu, NetworkManager is the preferred backend for WiFi because it handles roaming between networks and has better driver support. For desktop systems:

```yaml
# /etc/netplan/01-wifi.yaml
network:
  version: 2
  renderer: NetworkManager    # capital N and M
  wifis:
    wlan0:
      dhcp4: true
      access-points:
        "MyNetwork":
          password: "mypassword"
```

With NetworkManager, you can also use `nmcli` alongside Netplan:

```bash
# Connect to a WiFi network using nmcli directly
nmcli device wifi connect "MyNetwork" password "mypassword"

# List available networks
nmcli device wifi list

# Show current connection
nmcli device show wlan0
```

## WPA2 with Static IP

For a server or device that needs a predictable IP on WiFi:

```yaml
network:
  version: 2
  renderer: networkd
  wifis:
    wlan0:
      dhcp4: false
      addresses:
        - 192.168.1.50/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 192.168.1.1
          - 8.8.8.8
      access-points:
        "MyNetwork":
          password: "mypassword"
```

## Hidden SSID Network

For networks with broadcast SSID disabled:

```yaml
network:
  version: 2
  renderer: networkd
  wifis:
    wlan0:
      dhcp4: true
      access-points:
        "HiddenNetworkSSID":
          password: "mypassword"
          hidden: true          # must scan for this network actively
```

## WPA3 (SAE) Configuration

WPA3 uses Simultaneous Authentication of Equals (SAE). Netplan supports it through the auth section:

```yaml
network:
  version: 2
  renderer: networkd
  wifis:
    wlan0:
      dhcp4: true
      access-points:
        "MyWPA3Network":
          auth:
            key-management: sae     # WPA3
            password: "mypassword"
```

For networks with both WPA2 and WPA3 (transition mode):

```yaml
network:
  version: 2
  renderer: networkd
  wifis:
    wlan0:
      dhcp4: true
      access-points:
        "MyNetwork":
          auth:
            key-management: psk     # WPA2/PSK
            password: "mypassword"
```

## Enterprise WiFi (WPA2-Enterprise / 802.1X)

Corporate networks often use 802.1X authentication with certificates or username/password:

```yaml
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
            method: peap              # PEAP-MSCHAPv2 is common in enterprise
            identity: "username"
            password: "password"
            phase2-auth: mschapv2
            ca-certificate: /etc/ssl/certs/corp-ca.pem
```

For EAP-TLS (certificate-based authentication):

```yaml
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
            method: tls
            identity: "username@corp.com"
            ca-certificate: /etc/ssl/certs/corp-ca.pem
            client-certificate: /etc/ssl/certs/client.pem
            client-key: /etc/ssl/private/client.key
            client-key-password: "key-passphrase"
```

## Multiple Access Points (Roaming)

You can configure multiple networks that the system will try to connect to in order:

```yaml
network:
  version: 2
  renderer: networkd
  wifis:
    wlan0:
      dhcp4: true
      access-points:
        "HomeNetwork":
          password: "homepassword"
        "OfficeNetwork":
          password: "officepassword"
        "MobileHotspot":
          password: "hotspotpassword"
```

The system connects to whichever network it sees first. For more control over roaming priority, NetworkManager is better suited than networkd.

## Connecting WiFi and Wired Simultaneously

Many laptops need both wired and wireless. Configure them both in one file:

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:
      dhcp4: true
      dhcp4-overrides:
        route-metric: 100       # wired gets priority (lower metric)
  wifis:
    wlan0:
      dhcp4: true
      dhcp4-overrides:
        route-metric: 200       # WiFi is fallback
      access-points:
        "MyNetwork":
          password: "mypassword"
```

With different route metrics, the wired connection is preferred but WiFi provides a working connection if the cable is unplugged.

## Checking WiFi Connection Status

```bash
# Show connection status and signal strength
iw dev wlan0 link

# Show more details including bitrate
iw dev wlan0 info

# Scan for available networks
sudo iw dev wlan0 scan | grep SSID

# Check signal quality continuously
watch -n 1 'iw dev wlan0 link | grep signal'

# With networkd backend, check status
networkctl status wlan0
```

## Troubleshooting WiFi Issues

**Interface not connecting:**

```bash
# Check if the interface is up
ip link show wlan0

# Check wpa_supplicant logs
sudo journalctl -u wpa_supplicant -f

# Check systemd-networkd logs
sudo journalctl -u systemd-networkd | grep wlan0

# Verify the password is correct (common mistake)
# Netplan stores wifi passwords in plaintext in the YAML file
cat /etc/netplan/01-wifi.yaml
```

**Wrong permissions on Netplan file:**

```bash
# Netplan files with passwords must not be world-readable
sudo chmod 600 /etc/netplan/01-wifi.yaml

# Then regenerate
sudo netplan generate
sudo netplan apply
```

**WiFi driver issues:**

```bash
# Check if the driver is loaded
lspci -k | grep -A 3 Network

# For USB WiFi adapters
lsusb

# Check dmesg for driver errors
dmesg | grep -i wifi

# Install additional firmware if needed (for Broadcom and some others)
sudo apt install -y linux-firmware
```

**wpa_supplicant not installed:**

```bash
# Install if missing
sudo apt install -y wpasupplicant

# Restart networking
sudo systemctl restart systemd-networkd
sudo netplan apply
```

## Security Notes for Passwords in Netplan

WiFi passwords in Netplan YAML files are stored in plaintext. Protect the files:

```bash
# Ensure only root can read Netplan configs
sudo chmod 600 /etc/netplan/*.yaml
sudo chown root:root /etc/netplan/*.yaml

# Verify permissions
ls -la /etc/netplan/
```

For environments where this is a concern, using NetworkManager with its credential storage (which encrypts passwords in the system keyring) is more appropriate than networkd with Netplan.
