# How to Configure WiFi Roaming with Seamless IPv4 Address Retention

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: WiFi, Roaming, 802.11r, IPv4, DHCP, Seamless Roaming

Description: Learn how to configure WiFi roaming to allow clients to move between access points while retaining their IPv4 address and minimizing connectivity interruption.

## The Roaming Challenge

When a WiFi client moves from one access point to another, it must:
1. Detect the current AP's signal is weak
2. Find a better AP
3. Re-associate with the new AP
4. Re-authenticate (can take 200-1000ms with WPA2)
5. Keep or get a new IP address

The IP address retention issue: if the new AP is on a different subnet, the client gets a new DHCP IP, breaking active connections.

## Step 1: Requirements for Seamless Roaming

For seamless IP retention:
- All access points must be on the **same subnet/VLAN**
- All APs should share the same SSID and security settings
- 802.11r (Fast BSS Transition) reduces re-authentication to <50ms
- 802.11k helps clients find better APs
- 802.11v allows APs to suggest transitions to clients

## Step 2: Configure 802.11r (Fast BSS Transition)

**OpenWrt configuration:**
```bash
# /etc/config/wireless

config wifi-iface 'corporate_wifi'
    option ssid 'CorporateWiFi'
    option mode 'ap'
    option encryption 'psk2'
    option key 'wpa2password'

    # 802.11r - Fast BSS Transition
    option ieee80211r '1'
    option mobility_domain 'a1b2'    # Same across all APs
    option ft_over_ds '1'            # Fast transition over distribution system
    option ft_psk_generate_local '1'  # For PSK (non-802.1X)

    # 802.11k - Neighbor reporting
    option ieee80211k '1'

    # 802.11v - BSS transition management
    option bss_transition '1'
```

**Cisco WLC configuration:**
```text
wlan CorporateWiFi 1 CorporateWiFi
  client vlan 10                   # All APs map the WLAN to the same VLAN
  session-timeout 1800
  ft dot11r
  ft-over-ds enable
  ccx aironetiesupport enable
```

## Step 3: Configure DHCP for Rapid Lease Renewal

When roaming, clients try to renew their existing DHCP lease:

```bash
# /etc/dhcp/dhcpd.conf - configure for roaming clients

subnet 192.168.10.0 netmask 255.255.255.0 {
    range 192.168.10.100 192.168.10.200;
    option routers 192.168.10.1;
    option domain-name-servers 8.8.8.8;

    # Moderate lease time - long enough to survive brief disconnections
    default-lease-time 43200;    # 12 hours
    max-lease-time 86400;        # 24 hours

    # Respond quickly to renewal requests
    # (default behavior is fine)
}
```

## Step 4: Configure Client Roaming Aggressiveness

**Linux (wpa_supplicant):**
```bash
# /etc/wpa_supplicant/wpa_supplicant.conf
ctrl_interface=/run/wpa_supplicant
update_config=1

network={
    ssid="CorporateWiFi"
    psk="wpa2password"

    # Roaming settings
    bgscan="simple:30:-70:300"    # Background scan every 30s if RSSI < -70dBm

    # Enable 802.11r (Fast BSS Transition) with PSK
    key_mgmt=WPA-PSK FT-PSK
}
```

**Windows (via netsh):**
```cmd
REM Set the profile to auto-connect to this SSID when in range
netsh wlan set profileparameter name="CorporateWiFi" connectionmode=auto

REM Roaming aggressiveness is a driver-specific adapter property and
REM cannot be configured via netsh. Set it via adapter properties:
REM Device Manager → Network Adapter → Advanced → "Roaming Aggressiveness"
REM or "Roam Tendency" (values typically range from 1=lowest to 5=highest)
```

## Step 5: Monitor Roaming Events

```bash
# Linux: Watch for roaming events
journalctl -u NetworkManager -f | grep -i "roam\|associate\|connect"

# Check roaming counters
iw dev wlan0 station dump | grep "connected time"

# Test roaming: move between AP coverage areas and monitor
ping -i 0.2 8.8.8.8 | awk '{print strftime("%T"), $0}'
# Gaps in ping timestamps show roaming disruption duration
```

## Conclusion

Seamless WiFi roaming requires all access points on the same subnet/VLAN so the DHCP IP address remains valid across AP transitions. Enable 802.11r (Fast BSS Transition) on all APs with a shared `mobility_domain` to reduce re-authentication latency from ~500ms to under 50ms. Configure DHCP with 12-24 hour leases so roaming clients can renew without obtaining a new IP. Monitor roaming transitions with `journalctl -u NetworkManager` and `ping` to measure disruption duration.
