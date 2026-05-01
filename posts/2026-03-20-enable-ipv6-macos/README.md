# How to Enable IPv6 on macOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, macOS, Network Configuration, Networksetup, System Settings

Description: Learn how to enable IPv6 on macOS using System Settings, the networksetup command, and how to verify IPv6 is working correctly.

## IPv6 Status on macOS

IPv6 is typically enabled by default on macOS. Check the current status:

```bash
# Check common network services for IPv6 info

networksetup -getinfo "Wi-Fi"
networksetup -getinfo "Ethernet"

# List available network services
networksetup -listallnetworkservices

# Check using ifconfig
ifconfig en0 | grep inet6

# Show all IPv6 addresses
ifconfig | grep inet6
```

## Enable IPv6 via System Settings (macOS Ventura/Sonoma)

```sql
Steps:
1. Apple menu → System Settings

2. Click "Network" in the sidebar

3. Select your network connection (Wi-Fi or Ethernet)

4. Click "Details..." (next to the connection)

5. Click "TCP/IP" tab

6. For "Configure IPv6" dropdown, select:
   - Automatically: Receive an IPv6 address automatically (recommended)
   - Manually: Enter static IPv6 address
   - Link-local only: Only link-local addressing

7. Click "OK"
```

## Enable IPv6 via networksetup

```bash
# Enable IPv6 automatic configuration (SLAAC) on Wi-Fi
networksetup -setv6automatic Wi-Fi

# Enable IPv6 automatic on Ethernet
networksetup -setv6automatic Ethernet

# Check available network services
networksetup -listallnetworkservices

# Set IPv6 link-local only (minimal IPv6)
networksetup -setv6linklocal Wi-Fi

# Disable IPv6 (set to off)
networksetup -setv6off Wi-Fi
```

## Enable IPv6 via System Preferences (macOS Monterey and earlier)

```sql
Steps:
1. System Preferences → Network

2. Select network interface (Wi-Fi / Ethernet)

3. Click "Advanced..."

4. Click "TCP/IP" tab

5. "Configure IPv6" dropdown → "Automatically"

6. Click "OK" → "Apply"
```

## Verify IPv6 is Working

```bash
# Show IPv6 addresses on en0
ifconfig en0 | grep inet6

# Expected output includes:
# inet6 fe80::1234:5678:9abc:def0%en0 prefixlen 64 scopeid 0x4
# inet6 2001:db8::1234:5678:9abc:def0 prefixlen 64 autoconf
# inet6 2001:db8::a1b2:c3d4:e5f6:7890 prefixlen 64 autoconf temporary

# Show only global IPv6 addresses
ifconfig en0 | grep 'inet6 ' | grep -v 'fe80::'

# Test IPv6 connectivity
ping6 2001:4860:4860::8888
ping6 ipv6.google.com

# Test DNS over IPv6
dig AAAA google.com @2001:4860:4860::8888

# Show IPv6 routing table
netstat -rn -f inet6
```

## Check IPv6 Route

```bash
# Show default IPv6 route
netstat -rn -f inet6 | grep default

# Expected output resembles:
# default   fe80::1%en0   UGcg   en0

# Show all IPv6 routes
netstat -rn -f inet6
```

## Summary

On macOS, enable IPv6 via **System Settings → Network → [connection] → Details → TCP/IP → Configure IPv6 → Automatically** or with `networksetup -setv6automatic Wi-Fi`. Verify with `ifconfig en0 | grep inet6` - you should see a link-local (`fe80::`) and, if a router is present, a global (`2xxx::`) address. Test connectivity with `ping6 ipv6.google.com`. Use `networksetup -getinfo "Wi-Fi"` to view current IPv6 settings.
