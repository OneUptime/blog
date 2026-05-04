# How to Configure a Wi-Fi Connection with nmcli

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: nmcli, WiFi, NetworkManager, Linux, WPA2, WPA3, Wireless, Connection

Description: Learn how to configure Wi-Fi connections on Linux using nmcli, including WPA2/WPA3 personal and enterprise authentication, hidden SSIDs, and static IP assignment.

---

nmcli provides full Wi-Fi management via NetworkManager on Linux, supporting WPA2/WPA3 personal and enterprise (802.1X) configurations.

## Scanning for Networks

```bash
# Turn on Wi-Fi

nmcli radio wifi on

# List available networks
nmcli device wifi list

# Output:
# IN-USE  BSSID              SSID          MODE   CHAN  RATE  SIGNAL  SECURITY
#         aa:bb:cc:dd:ee:ff  MyNetwork     Infra  6     130   85      WPA2
#         ...

# Refresh scan
nmcli device wifi rescan
```

## Connecting to WPA2/WPA3 Personal Network

```bash
# Connect with password prompt
nmcli device wifi connect MyNetwork password "mysecretpassword"

# Or using connection add:
nmcli connection add type wifi \
  ifname wlan0 \
  con-name wifi-home \
  ssid "MyNetwork" \
  wifi-sec.key-mgmt wpa-psk \
  wifi-sec.psk "mysecretpassword"

nmcli connection up wifi-home
```

## Connecting to a Hidden SSID

```bash
nmcli connection add type wifi \
  ifname wlan0 \
  con-name wifi-hidden \
  ssid "HiddenNetwork" \
  wifi.hidden yes \
  wifi-sec.key-mgmt wpa-psk \
  wifi-sec.psk "mysecretpassword"

nmcli connection up wifi-hidden
```

## WPA2 Enterprise (802.1X with EAP-PEAP)

```bash
nmcli connection add type wifi \
  ifname wlan0 \
  con-name wifi-enterprise \
  ssid "CorpWiFi" \
  wifi-sec.key-mgmt wpa-eap \
  802-1x.eap peap \
  802-1x.phase2-auth mschapv2 \
  802-1x.identity "user@example.com" \
  802-1x.password "userpassword" \
  802-1x.ca-cert /etc/ssl/certs/corp-ca.pem

nmcli connection up wifi-enterprise
```

## Setting Static IP on Wi-Fi Connection

```bash
nmcli connection modify wifi-home \
  ipv4.method manual \
  ipv4.addresses "192.168.1.50/24" \
  ipv4.gateway "192.168.1.1" \
  ipv4.dns "192.168.1.1 8.8.8.8"

nmcli connection up wifi-home
```

## Managing Wi-Fi Connections

```bash
# Show all Wi-Fi connections
nmcli connection show | grep wifi

# Disconnect from Wi-Fi
nmcli connection down wifi-home

# Delete a Wi-Fi connection
nmcli connection delete wifi-home

# Show current Wi-Fi interface status
nmcli device show wlan0

# Show signal strength and current AP
nmcli device wifi
```

## Disabling Wi-Fi

```bash
# Disable Wi-Fi radio
nmcli radio wifi off

# Re-enable
nmcli radio wifi on
```

## Key Takeaways

- `nmcli device wifi connect <SSID> password <pass>` is the quickest way to connect to a WPA2 network.
- For hidden networks, add `wifi.hidden yes` to the connection profile.
- WPA2 Enterprise (EAP-PEAP/MSCHAPv2) requires `802-1x.*` settings in addition to `wifi-sec.key-mgmt wpa-eap`.
- Store Wi-Fi credentials securely in NM's connection profiles; they are written in plaintext under `/etc/NetworkManager/system-connections/` with `0600` permissions, so root-only access is the protection mechanism.
