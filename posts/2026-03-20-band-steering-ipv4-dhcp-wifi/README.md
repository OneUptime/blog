# How to Configure Band Steering with Proper IPv4 DHCP for 2.4GHz and 5GHz

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Band Steering, WiFi, DHCP, IPv4, 802.11, Wireless, 2.4GHz, 5GHz

Description: Learn how to configure band steering on wireless access points to prefer 5GHz connections for capable clients while ensuring proper IPv4 DHCP assignment across both frequency bands.

---

Band steering encourages dual-band clients to connect on 5GHz for better throughput and less congestion, while 2.4GHz serves legacy devices or clients with weak 5GHz signal.

## SSID Strategy: Single SSID vs. Separate SSIDs

**Recommended: Single SSID with band steering**
- Both bands share the same SSID and, if bridged to the same LAN/VLAN, the same DHCP pool
- Access point steers capable clients to 5GHz
- Simplest experience for users

**Alternative: Separate SSIDs**
```text
SSID: MyNetwork        (2.4GHz)
SSID: MyNetwork_5G     (5GHz)
```
- Gives users explicit control
- Requires separate DHCP pools or shared pool

## Configuring Band Steering on Ubiquiti UniFi

```text
Settings → WiFi → MyNetwork
  Band Steering: Enabled

UniFi Devices → <AP> → Settings
  Minimum RSSI: Optional; disconnects low-signal clients when the threshold is crossed
```

## Configuring Band Steering on OpenWrt

OpenWrt typically uses a service such as `usteer` or `DAWN` for band steering; in `/etc/config/wireless`, enable the 802.11k/v features those services rely on:

```bash
# /etc/config/wireless

config wifi-iface 'default_radio0'   # 2.4GHz
    option ssid 'MyNetwork'
    option ieee80211k '1'            # 802.11k neighbor reports
    option bss_transition '1'        # 802.11v BSS Transition Management

config wifi-iface 'default_radio1'   # 5GHz
    option ssid 'MyNetwork'
    option ieee80211k '1'
    option bss_transition '1'
```

## DHCP Pool Configuration for Band Steering

With a single shared SSID on the same LAN/VLAN, all clients (both bands) use one DHCP pool:

```bash
# /etc/dnsmasq.conf

dhcp-range=192.168.10.50,192.168.10.200,24h
dhcp-option=3,192.168.10.1        # Default gateway
dhcp-option=6,8.8.8.8,8.8.4.4    # DNS servers
```

With separate SSIDs and VLANs:

```bash
# 2.4GHz VLAN 20 pool
dhcp-range=set:vlan20,192.168.20.50,192.168.20.200,24h
dhcp-option=tag:vlan20,3,192.168.20.1

# 5GHz VLAN 50 pool
dhcp-range=set:vlan50,192.168.50.50,192.168.50.200,24h
dhcp-option=tag:vlan50,3,192.168.50.1
```

## Verifying Band Assignment

```bash
# On OpenWrt: list associated clients and their band
iwinfo wlan0 assoclist   # 2.4GHz clients
iwinfo wlan1 assoclist   # 5GHz clients

# Check DHCP leases
cat /tmp/dhcp.leases
```

## Key Takeaways

- Use a single SSID with band steering enabled for the simplest deployment; the AP can encourage compatible clients toward 5GHz.
- Use Minimum RSSI cautiously; it disconnects clients below the threshold, and the client decides what to join next.
- With a single SSID on one LAN/VLAN, use one DHCP pool; with separate SSIDs mapped to separate VLANs/subnets, use separate pools.
- 802.11v BSS Transition Management can assist band steering, but clients ultimately decide whether to roam.
