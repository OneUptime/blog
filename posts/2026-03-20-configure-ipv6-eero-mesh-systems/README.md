# How to Configure IPv6 on Eero Mesh Systems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Eero, Amazon, Mesh Network, Home Networking, Consumer

Description: Configure and verify IPv6 on Amazon Eero mesh systems using the Eero mobile app and understand Eero's automatic IPv6 handling.

## Eero IPv6 Overview

Amazon Eero (acquired by Amazon in 2019) supports IPv6 and handles most configuration automatically. Eero uses SLAAC to distribute IPv6 to connected devices and requests prefix delegation from the ISP automatically.

## Supported Eero Models

All current Eero models support IPv6:
- Eero 6, Eero 6+, Eero Pro 6, Eero Pro 6E
- Eero Max 7
- Previous generation: Eero, Eero Pro, Eero Beacon

## Setting Up IPv6 on Eero

Eero automatically enables IPv6 when your ISP provides it. An IPv6 toggle is available under **Settings → Advanced Settings → IPv6**, but no manual configuration is required - Eero detects ISP IPv6 availability and configures it automatically. Toggling this setting reboots the network.

**The automatic process:**
1. Eero gateway device requests a WAN IPv6 address via DHCPv6 and prefix delegation via DHCPv6-PD (a /56 is preferred, /60 is accepted)
2. Eero distributes a /64 prefix to LAN clients via SLAAC (stateful DHCPv6 for LAN clients is not supported)
3. Eero sends Router Advertisements to all connected devices
4. Eero beacon and satellite nodes receive IPv6 from the main gateway

## Checking IPv6 Status in the Eero App

1. Open the **Eero** app (iOS or Android)
2. Tap the main menu (three dots or gear icon)
3. Go to **Settings** → **Network Settings** → **Advanced Settings** → **DNS**
4. Check if IPv6 DNS servers are listed

To see active IPv6 connections:

1. Tap **Devices** in the Eero app
2. Select a specific device
3. The device details show both IPv4 and IPv6 addresses if available

## Verifying IPv6 from Connected Devices

Since Eero manages IPv6 automatically, verify from connected devices:

```bash
# macOS/Linux

ip -6 addr show scope global
# or
ifconfig | grep "inet6" | grep -v fe80

# Windows
ipconfig | findstr "IPv6"

# Test connectivity
ping6 ipv6.google.com

# Comprehensive test
curl -6 https://ipv6.icanhazip.com
```

For a full test, visit `https://test-ipv6.com` from any connected device.

## Eero DNS Configuration for IPv6

Eero supports custom DNS settings in the app. You can set IPv6-capable DNS servers:

1. Open Eero app
2. Go to **Settings → Network Settings → Advanced Settings → DNS**
3. Select **Custom DNS**
4. Enter IPv6 DNS addresses:

```text
Primary:   2001:4860:4860::8888   (Google)
Secondary: 2606:4700:4700::1111   (Cloudflare)
```

Note: Some versions of the Eero app may only accept IPv4 DNS entries. If this is the case, use IPv4 DNS addresses - these can still resolve AAAA records for IPv6 routing.

## Eero IPv6 Firewall Behavior

Eero applies a stateful firewall that blocks unsolicited inbound IPv6 connections by default. This is good security for a home network but blocks inbound access to home servers.

To allow inbound connections, use **Port Forwarding** in the Eero app for IPv4 traffic and **IPv6 Firewall Rules** for IPv6 traffic (both managed under Settings → Network Settings → Reservations & Port Forwarding).

## Eero Secure and IPv6

Eero Secure (subscription service) includes DNS filtering. All DNS queries route through Amazon's DNS infrastructure, which fully supports IPv6. IPv6 traffic is filtered alongside IPv4 when Eero Secure is active.

## Troubleshooting Eero IPv6

**No IPv6 addresses on devices:**
1. Check ISP provides IPv6 - test at `test-ipv6.com` from a device connected directly to the modem
2. Power cycle the Eero gateway (unplug 30 seconds)
3. In Eero app: **Settings** → **Troubleshooting** → **Restart Network**

**IPv6 works on some devices but not others:**
- Some older IoT devices don't support IPv6 - this is normal
- Devices running IPv4 only will still work; IPv6 is additive

## Conclusion

Eero automatically enables and manages IPv6 when ISP support is available. No manual configuration is required beyond verifying that your ISP provides IPv6. Use the Eero app to check device IPv6 addresses and configure custom IPv6-capable DNS servers for optimal performance.
