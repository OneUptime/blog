# How to Configure hostapd for WPA2/WPA3 on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, WiFi, hostapd, Security, Networking

Description: Configure hostapd on Ubuntu for WPA2 Personal, WPA3 SAE, and WPA2/WPA3 transition mode, with proper security settings and cipher configuration for modern wireless networks.

---

WPA3 brings significant security improvements over WPA2, primarily through Simultaneous Authentication of Equals (SAE) which replaces the Pre-Shared Key (PSK) handshake. SAE is resistant to offline dictionary attacks - a critical weakness of WPA2. This guide covers configuring hostapd for WPA2-only, WPA3-only, and WPA2/WPA3 transition mode (which supports both simultaneously).

## Checking WPA3 Support

Before configuring WPA3, verify your wireless adapter and kernel support it:

```bash
# Check if your adapter supports SAE (WPA3)
sudo iw list | grep -i sae

# Example output showing SAE support:
# Supported extended features:
#     * [ SAE_OFFLOAD_AP ]: AP SAE offloading

# Check hostapd version and compiled-in features
hostapd -v 2>&1
# Look for: OpenSSL and SAE in the configuration line

# Check kernel SAE support
grep -i sae /boot/config-$(uname -r) 2>/dev/null
# CONFIG_IEEE80211W=y  ← Required for WPA3
```

## WPA2 Personal Configuration

Standard WPA2 configuration is reliable and supported by all modern devices:

```ini
# /etc/hostapd/hostapd.conf - WPA2 Personal

interface=wlan0
driver=nl80211
ssid=MyNetwork
country_code=US
hw_mode=g
channel=6

# 802.11n
ieee80211n=1
ht_capab=[HT40+][SHORT-GI-40][SHORT-GI-20]

# ==================== WPA2 Configuration ====================

# WPA2 only (not WPA1)
wpa=2

# Authentication: PSK (pre-shared key)
wpa_key_mgmt=WPA-PSK

# Passphrase (8-63 printable ASCII characters)
wpa_passphrase=YourSecurePassphrase

# CCMP (AES) is required for WPA2; TKIP is deprecated and insecure
rsn_pairwise=CCMP

# Group cipher - must include CCMP for WPA2 compliance
wpa_group_rekey=86400
```

## WPA3 SAE Configuration

Pure WPA3 drops all WPA2 support - only devices that support WPA3 can connect:

```ini
# /etc/hostapd/hostapd.conf - WPA3 SAE only

interface=wlan0
driver=nl80211
ssid=MySecureNetwork
country_code=US
hw_mode=a      # 5GHz - recommended for WPA3
channel=36

# 802.11n and 802.11ac for 5GHz
ieee80211n=1
ieee80211ac=1
vht_capab=[MAX-MPDU-11454][SHORT-GI-80][TX-STBC-2BY1][RX-STBC-1]
vht_oper_chwidth=1
vht_oper_centr_freq_seg0_idx=42

# ==================== WPA3 SAE Configuration ====================

# WPA3 uses SAE (Simultaneous Authentication of Equals)
wpa=2

# SAE replaces PSK
wpa_key_mgmt=SAE

# SAE passphrase (same parameter as WPA2, but processed differently)
wpa_passphrase=YourSecurePassphrase

# CCMP only - required for WPA3
rsn_pairwise=CCMP

# IEEE 802.11w - Management Frame Protection (REQUIRED for WPA3)
ieee80211w=2          # 2 = required (mandatory for WPA3)

# SAE specific settings
sae_require_mfp=1     # Require MFP for SAE associations
sae_pwe=2             # SAE Password Element: 2 = H2E (hash-to-element, more secure)

# Optional: Set SAE anti-clogging threshold
sae_anti_clogging_threshold=5

# Groups allowed for SAE: 19=256-bit ECC (NIST P-256), 20=384-bit, 21=521-bit
sae_groups=19 20 21
```

## WPA2/WPA3 Transition Mode (Recommended)

Transition mode allows WPA2 and WPA3 clients to connect to the same network simultaneously. This is the best choice for most environments during the transition to WPA3:

```ini
# /etc/hostapd/hostapd.conf - WPA2/WPA3 Mixed Mode

interface=wlan0
driver=nl80211

# You can use a single SSID for both WPA2 and WPA3
ssid=MyNetwork
country_code=US

# 5GHz is preferred for WPA3
hw_mode=a
channel=36

# 802.11n and 802.11ac for 5GHz
ieee80211n=1
ieee80211ac=1

# ==================== WPA2/WPA3 Transition Mode ====================

# Enable WPA2/3 (2 = RSN/WPA2, the base for both)
wpa=2

# Both PSK (WPA2) and SAE (WPA3) methods
wpa_key_mgmt=WPA-PSK SAE

# Same passphrase works for both
wpa_passphrase=YourSecurePassphrase

# CCMP for encryption (required)
rsn_pairwise=CCMP

# Management Frame Protection:
# 1 = optional (WPA2 clients may not support MFP)
# WPA3 clients will negotiate to use MFP
ieee80211w=1          # 1 = optional

# SAE settings for WPA3 clients
sae_require_mfp=1
sae_pwe=2

# SAE groups
sae_groups=19 20 21

# For WPA2 clients - allow TKIP as group cipher fallback (not recommended but needed for old devices)
# wpa_pairwise=TKIP CCMP  # Uncomment ONLY if you have very old WPA2 devices
```

## WPA2/WPA3 Enterprise with RADIUS

For enterprise deployments, WPA3 Enterprise uses 802.1X authentication against a RADIUS server:

```ini
# /etc/hostapd/hostapd.conf - WPA3 Enterprise

interface=wlan0
driver=nl80211
ssid=CorpNetwork
country_code=US
hw_mode=a
channel=36

ieee80211n=1
ieee80211ac=1

# ==================== WPA3 Enterprise ====================

wpa=2
wpa_key_mgmt=WPA-EAP WPA-EAP-SHA256

# No wpa_passphrase - authentication is via RADIUS
rsn_pairwise=CCMP
ieee80211w=2

# RADIUS server configuration
auth_server_addr=192.168.1.50
auth_server_port=1812
auth_server_shared_secret=radius_shared_secret

# RADIUS accounting (optional)
acct_server_addr=192.168.1.50
acct_server_port=1813
acct_server_shared_secret=radius_shared_secret

# EAP settings
eap_server=0  # 0 = use external RADIUS
```

## Improving Security Settings

Beyond the basic WPA3 configuration, additional hostapd settings improve security:

```ini
# ==================== Additional Security Settings ====================

# Prevent clients from communicating with each other
# Useful for public networks where you don't want client-to-client traffic
ap_isolate=1

# Don't broadcast SSID in beacon frames (security through obscurity)
# Note: Not a strong security measure, but adds a layer
ignore_broadcast_ssid=0  # 0 = broadcast, 1 = hidden, 2 = broadcast empty string

# Require supported rates for faster, more secure connections
require_ht=1      # Require 802.11n
# require_vht=1   # Require 802.11ac (drops older clients)

# Control the key rotation intervals
wpa_group_rekey=3600    # Rotate group key hourly
wpa_strict_rekey=1      # Rekey group when a client leaves

# Deauthenticate clients that fail authentication
wpa_ptk_rekey=0

# Limit failed authentication attempts (basic brute-force protection)
max_auth_tries=5

# Beacon interval (default 100ms = 10 beacons per second)
beacon_int=100

# DTIM period - affects battery life of clients
dtim_period=2

# Minimum RSN capability (require CCMP, disable TKIP for all but group)
rsn_preauth=1
rsn_preauth_interfaces=wlan0
```

## Debugging WPA3 Issues

WPA3 compatibility issues are common during the transition. Debug them with:

```bash
# Run hostapd in debug mode - shows detailed authentication exchanges
sudo hostapd -dd /etc/hostapd/hostapd.conf

# Key things to look for in debug output:
# SAE authentication: Success → client supports WPA3
# WPA-PSK authentication: Success → client fell back to WPA2 (in transition mode)
# SAE: commit fail → client doesn't support WPA3 properly

# Check connected client information including security used
sudo hostapd_cli all_sta | grep -A 20 "Station"

# Check if a specific client used WPA2 or WPA3
sudo hostapd_cli sta <mac-address>
# Look for: AKMSuiteSelector: 00-0f-ac-2 (PSK=WPA2) or 00-0f-ac-8 (SAE=WPA3)
```

## Common Issues and Fixes

### SAE not supported by kernel

```bash
# Check if CONFIG_IEEE80211W is enabled
grep IEEE80211W /boot/config-$(uname -r)
# Should show: CONFIG_IEEE80211W=y

# If not, upgrade to a newer kernel
sudo apt-get install linux-generic
sudo reboot
```

### WPA3 clients fail to connect but WPA2 works

```bash
# Ensure ieee80211w=1 (optional MFP) in transition mode
# ieee80211w=2 is too strict and prevents WPA2 client connections

# Also check sae_pwe setting
# sae_pwe=0 = hunting-and-pecking only (older)
# sae_pwe=1 = H2E only (newer, some clients don't support)
# sae_pwe=2 = H2E only (newer)
# For compatibility, use sae_pwe=0 or don't set it initially
```

### Management frame errors

```bash
# If you see "CTRL-EVENT-DISCONNECTED reason=14" (MFP required)
# The client doesn't support MFP but ieee80211w=2 requires it
# Change to ieee80211w=1 for transition mode
sudo sed -i 's/ieee80211w=2/ieee80211w=1/' /etc/hostapd/hostapd.conf
sudo systemctl restart hostapd
```

## Summary

The recommended configuration for most deployments is WPA2/WPA3 transition mode:

- Set `wpa_key_mgmt=WPA-PSK SAE` to support both
- Use `ieee80211w=1` (optional MFP) to allow WPA2 clients while enabling MFP for WPA3
- Use 5GHz (hw_mode=a) where possible for better WPA3 support
- Set `sae_pwe=2` for H2E mode if all your clients support it, or omit for maximum compatibility

WPA3 provides genuine security improvements over WPA2, particularly resistance to offline dictionary attacks. Transition mode gives you these benefits for WPA3-capable clients while maintaining backward compatibility.
