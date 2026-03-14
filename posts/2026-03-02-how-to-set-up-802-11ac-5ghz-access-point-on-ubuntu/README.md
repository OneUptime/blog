# How to Set Up 802.11ac (5GHz) Access Point on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, WiFi, Hostapd, 5GHz, Networking

Description: Configure a 5GHz 802.11ac WiFi access point on Ubuntu using hostapd, with proper channel selection, VHT capabilities configuration, and DFS channel handling.

---

802.11ac (Wi-Fi 5) operates in the 5GHz band and offers significantly higher throughput than 2.4GHz 802.11n. Typical 802.11ac speeds range from 300 Mbps to over 1 Gbps in real-world conditions, compared to 150-300 Mbps for 802.11n at 2.4GHz. The 5GHz band is also less congested in most environments.

The tradeoff is shorter range - 5GHz signals don't penetrate walls as well as 2.4GHz. For a single-room or small office deployment, this is rarely an issue.

## Checking 5GHz and 802.11ac Support

Your wireless adapter must explicitly support 5GHz and 802.11ac in AP mode:

```bash
# Check supported bands and modes
sudo iw list | grep -E "Band|Frequencies|VHT"

# Check for 5GHz band support
sudo iw list | grep -A 30 "Band 2"
# Band 2 = 5GHz

# Check for VHT (Very High Throughput = 802.11ac) capabilities
sudo iw list | grep -i "VHT Capabilities"

# Check if AP mode is supported on 5GHz
sudo iw list | grep -B 5 "AP" | grep -E "AP|5"

# Get detailed capability information
sudo iw phy phy0 info | grep -E "vht_capa|802.11ac|VHT"
```

If VHT capabilities are listed, your adapter supports 802.11ac.

## Understanding 5GHz Channels

5GHz has more channels than 2.4GHz, but they're divided into categories:

**UNII-1 (5.15-5.25 GHz) - Indoor only in many countries:**
- Channels 36, 40, 44, 48
- No DFS required
- Safe for indoor use

**UNII-2 (5.25-5.35 GHz) - DFS channels:**
- Channels 52, 56, 60, 64
- Requires Dynamic Frequency Selection (DFS)
- Must vacate if radar is detected

**UNII-2 Extended (5.47-5.725 GHz) - DFS channels:**
- Channels 100-144
- Requires DFS
- More channels available but DFS overhead

**UNII-3 (5.725-5.875 GHz):**
- Channels 149, 153, 157, 161, 165
- No DFS in most countries
- Commonly used for 5GHz APs

For reliability without DFS complications, use channels 36-48 (UNII-1) or 149-165 (UNII-3).

## Basic 802.11ac Configuration

```bash
sudo nano /etc/hostapd/hostapd.conf
```

```ini
# /etc/hostapd/hostapd.conf - 802.11ac 5GHz access point

# Interface and driver
interface=wlan0
driver=nl80211

# Network name
ssid=MyNetwork-5G

# IMPORTANT: Set your country code - required for legal frequency operation
# This determines which channels are available
country_code=US

# ==================== 5GHz 802.11ac Settings ====================

# Operating in 5GHz band (802.11a/n/ac)
hw_mode=a

# Channel selection:
# Non-DFS channels (safest choice): 36, 40, 44, 48, 149, 153, 157, 161, 165
# Using 40-wide channel centered at 38 (channels 36+40)
channel=36

# Enable 802.11n (required for 802.11ac)
ieee80211n=1

# Enable 802.11ac (VHT - Very High Throughput)
ieee80211ac=1

# Enable 802.11d (country information in beacons)
ieee80211d=1

# Enable 802.11h (DFS and TPC - required for UNII-2 channels)
# Also required if using channels 52-64 or 100-144
ieee80211h=1

# ==================== HT (802.11n) Capabilities ====================
# These must match what your adapter actually supports
# Get them from: iw list | grep -A 20 "HT"

ht_capab=[HT40+][SHORT-GI-20][SHORT-GI-40][DSSS_CCK-40]

# HT40+: use channel above as secondary (channel 36+40)
# HT40-: use channel below as secondary
# SHORT-GI-20/40: short guard interval for 20/40 MHz channels

# ==================== VHT (802.11ac) Capabilities ====================
# Get these from: iw list | grep -A 30 "VHT Capabilities"

# Channel width: 0=20/40MHz, 1=80MHz, 2=160MHz, 3=80+80MHz
vht_oper_chwidth=1

# Center frequency for the 80MHz channel
# For channel 36 (36,40,44,48 = center at channel 42)
vht_oper_centr_freq_seg0_idx=42

# VHT capabilities - adjust to match your adapter
vht_capab=[MAX-MPDU-11454][RXLDPC][SHORT-GI-80][TX-STBC-2BY1][RX-STBC-1][MAX-A-MPDU-LEN-EXP7]

# ==================== Security ====================
wpa=2
wpa_key_mgmt=WPA-PSK SAE
wpa_passphrase=YourSecurePassword

rsn_pairwise=CCMP
ieee80211w=1

# ==================== Performance Settings ====================

# Maximum number of clients
max_num_sta=50

# DTIM period - higher values save power for clients, lower improves latency
dtim_period=1

# Beacon interval in TU (1 TU = 1024 microseconds)
beacon_int=100

# Enable fast BSS transition (802.11r) for faster roaming
# Useful if you have multiple APs
# ieee80211r=1

# Multicast to unicast conversion (improves multicast reliability)
multicast_to_unicast=1
```

## Finding Your Adapter's VHT Capabilities

The VHT capabilities must match your specific adapter:

```bash
# Get VHT capabilities for your adapter
sudo iw list | grep -A 60 "VHT Capabilities"

# Sample output for an Intel wireless adapter:
# VHT Capabilities (0x339071b2):
#     Max MPDU length: 11454
#     Supported Channel Width: neither 160 nor 80+80
#     RX LDPC
#     Short GI (80 MHz)
#     TX STBC
#     RX STBC 1-stream
#     SU Beamformee
#     MU Beamformee
#     Max A-MPDU length exponent: 7

# Map capabilities to hostapd vht_capab flags:
# Max MPDU 11454 → [MAX-MPDU-11454]
# RX LDPC → [RXLDPC]
# Short GI 80 MHz → [SHORT-GI-80]
# Short GI 160 MHz → [SHORT-GI-160]
# TX STBC → [TX-STBC-2BY1]
# RX STBC 1 → [RX-STBC-1]
# Max A-MPDU exp 7 → [MAX-A-MPDU-LEN-EXP7]
# SU Beamformee → [SU-BEAMFORMEE]
```

## Channel and Width Selection

```bash
# Show available 5GHz channels for your region
sudo iw reg get          # Current regulatory domain
sudo iw phy phy0 channels | grep -E "5[0-9]{3}|Channel"

# For US regulatory domain, typical 5GHz channels available:
# 36, 40, 44, 48 (UNII-1, 20dBm max)
# 52, 56, 60, 64 (UNII-2, DFS)
# 100-144 (UNII-2E, DFS)
# 149, 153, 157, 161, 165 (UNII-3, 23dBm max)
```

Channel and center frequency combinations for 80MHz operation:

```text
# 80MHz channel groups and their center frequency indexes:
# Channels 36,40,44,48 → center = 42
# Channels 52,56,60,64 → center = 58 (DFS)
# Channels 100,104,108,112 → center = 106 (DFS)
# Channels 116,120,124,128 → center = 122 (DFS)
# Channels 132,136,140,144 → center = 138 (DFS)
# Channels 149,153,157,161 → center = 155

# In hostapd.conf:
# channel=36 + vht_oper_centr_freq_seg0_idx=42 → 80MHz at 5GHz UNII-1
# channel=149 + vht_oper_centr_freq_seg0_idx=155 → 80MHz at 5GHz UNII-3
```

## Handling DFS Channels

DFS channels require radar detection. When radar is detected, the AP must vacate the channel for 30 minutes:

```bash
# If using DFS channels (52-64 or 100-144), enable these in hostapd.conf:

# Required for DFS channel operation
ieee80211h=1

# DFS channels need CAC (Channel Availability Check) before use
# CAC takes 60 seconds - the AP is not available during this time
# You'll see: "DFS-CAC-START" and "DFS-CAC-COMPLETED" in logs

# Monitor DFS events
sudo journalctl -u hostapd -f | grep -E "DFS|CAC|RADAR"
```

## 160MHz Wide Channels

For maximum 802.11ac throughput, some adapters support 160MHz channels:

```ini
# 160MHz configuration (requires adapter support)
channel=36

# Channel width 2 = 160MHz
vht_oper_chwidth=2

# Center frequency for 160MHz: channels 36-64 → center = 50
vht_oper_centr_freq_seg0_idx=50

# Update HT capabilities for 40MHz component
ht_capab=[HT40+][SHORT-GI-20][SHORT-GI-40]

# 160MHz VHT capability required
vht_capab=[VHT160][MAX-MPDU-11454][SHORT-GI-80][SHORT-GI-160]
```

Note: 160MHz channels span DFS channels in most regulatory domains, so they require DFS support.

## Starting and Testing

```bash
# Restart hostapd with new configuration
sudo systemctl restart hostapd

# Check hostapd is running correctly
sudo systemctl status hostapd

# Monitor for errors
sudo journalctl -u hostapd -f &

# Wait for the AP to come up, then scan from a client to verify:
# Should see your SSID on 5GHz band

# Check connected clients and their rates
sudo iw dev wlan0 station dump

# Example output:
# Station AA:BB:CC:DD:EE:FF (on wlan0)
#         tx bitrate:     867.0 MBit/s VHT-MCS 9 80MHz short GI VHT-NSS 2
#         ← This shows 867 Mbps 802.11ac connection with 2 spatial streams
```

## Dual-Band Configuration

For both 2.4GHz and 5GHz simultaneously, you need two wireless interfaces (two physical adapters, or a dual-band adapter that supports virtual interfaces):

```bash
# Check if your adapter supports multiple virtual interfaces
sudo iw list | grep -A 10 "valid interface combinations"

# If supported, create a second virtual interface
sudo iw dev wlan0 interface add wlan1 type __ap

# Configure hostapd with two configurations
# Run hostapd with both config files
sudo hostapd /etc/hostapd/hostapd-2g.conf /etc/hostapd/hostapd-5g.conf
```

## Tuning for Performance

```bash
# After clients connect, check achieved throughput
# On the AP:
sudo iw dev wlan0 station dump | grep "tx bitrate"

# Test bandwidth from a connected client
# On client:
iperf3 -c 10.0.0.1 -t 30 -P 4

# On AP (server side):
iperf3 -s

# Common performance improvements:
# 1. Use channels 149-161 (higher power allowed in US than 36-48)
# 2. Ensure short guard interval is enabled in vht_capab
# 3. Enable TX STBC for multi-antenna performance
# 4. Reduce DTIM period to 1 for low latency
```

## Summary

Setting up an 802.11ac 5GHz access point with hostapd requires:

1. Verifying adapter supports VHT (802.11ac) in AP mode
2. Setting the correct country code (regulatory domain)
3. Choosing non-DFS channels for reliability (36-48 or 149-161)
4. Configuring HT and VHT capabilities to match your adapter exactly
5. Setting the correct VHT center frequency index for your channel group

The most common issue is VHT capability mismatch - copy the capabilities from `iw list` output rather than using generic values. Starting with 80MHz channels (not 160MHz) avoids DFS complications while still delivering strong 802.11ac performance.
