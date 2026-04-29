# How to Configure IPv6 on TP-Link Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, TP-Link, Router, DHCPv6, SLAAC, Home Network

Description: Configure IPv6 on TP-Link routers through the web interface, enabling DHCPv6 prefix delegation from your ISP and SLAAC for home network devices.

## Introduction

TP-Link routers support IPv6 through their web interface, and Deco systems can also be configured in the Deco app. This guide covers enabling IPv6 WAN connectivity and DHCPv6 prefix delegation where your ISP supports it, then configuring the LAN for client addressing.

## Prerequisites

- TP-Link router with firmware supporting IPv6 (check router model's specifications)
- ISP that provides IPv6 connectivity
- Access to the router's admin interface at `http://tplinkwifi.net` or the router's current LAN IP address

## Step 1: Configure WAN IPv6

1. Log in to the router admin interface
2. Navigate to **Advanced > IPv6**
3. Toggle **IPv6** to **On** (if shown)
4. Under **Internet Connection Type**, select the option provided by your ISP:
   - **Dynamic IP (SLAAC/DHCPv6)**: Common when the ISP auto-provisions IPv6
   - **PPPoE**: For ISPs using PPPoE
   - **Pass-Through (Bridge)**: If another upstream router is handling IPv6
   - **Static IP**: If your ISP provided a static IPv6 address
5. For **Dynamic IP** (and **PPPoE** on models that expose the same advanced settings):
   - Expand **Advanced** settings
   - Set **Get IPv6 Address** to **Auto** if that option is shown
   - Enable **Prefix Delegation** if your ISP delegates a LAN prefix
6. Click **Save**

## Step 2: Configure LAN IPv6

1. On the same **IPv6** settings page, open **IPv6 LAN Settings** if your model exposes separate LAN settings
2. Choose the LAN assignment mode exposed by your firmware:
   - **SLAAC + RDNSS** or **RADVD**: Clients autoconfigure addresses from Router Advertisements; on supported models DNS can also be advertised in RA
   - **SLAAC + Stateless DHCP**: Clients use SLAAC for addresses and DHCPv6 for other settings such as DNS
   - **DHCPv6**: Clients receive IPv6 addresses and other settings from DHCPv6, but still learn the default gateway from Router Advertisements
3. If WAN **Prefix Delegation** is enabled:
   - Keep the LAN prefix/site prefix setting on **Delegated**, **Get from Prefix Delegation**, or the model's default auto-assigned setting
   - If you must enter a LAN prefix manually, use the prefix information provided by your ISP; SLAAC LANs normally use a `/64`
4. If your model exposes manual **DNS** settings and you are not using ISP-provided DNS:
   - Primary: `2606:4700:4700::1111`
   - Secondary: `2606:4700:4700::1001`
5. Click **Save**

## Step 3: Verify on the Router Status Page

1. Navigate to the router's IPv6 status page, such as **Network > Status** or **IPv6 > IPv6 Status**
2. Check that the WAN IPv6 address shows a valid global unicast address (not just link-local)
3. Verify that the delegated prefix or LAN IPv6 address appears in the LAN section

## Step 4: Verify on Client Devices

From a Windows client:
```cmd
ipconfig /all
:: Look for IPv6 addresses under the network adapter
:: A valid global unicast address (2001:... or similar) should appear
```

From a Linux client:
```bash
# Check for global IPv6 address

ip -6 addr show scope global

# Check for a default IPv6 route
ip -6 route show default

# Test connectivity
ping -6 2606:4700:4700::1111

# Verify AAAA DNS resolution
nslookup -type=AAAA example.com
```

## Common TP-Link IPv6 Issues

**Issue: IPv6 option not visible in settings**

Some TP-Link firmware versions hide IPv6 under different menus:
- Try **Advanced > IPv6** or **Advanced > Network > IPv6**
- If still not visible, update the router firmware
- Check the TP-Link product page to confirm your model supports IPv6

**Issue: WAN gets a link-local address only (no global)**
- The ISP may not be providing IPv6 on your plan
- Check with your ISP if IPv6 is available and if it needs to be enabled on your account
- Confirm the IPv6 connection type with your ISP; some use **PPPoE** or **Pass-Through (Bridge)** instead of **Dynamic IP**

**Issue: LAN devices don't get IPv6 addresses**
```bash
# Check whether the client has a global IPv6 address
ip -6 addr show scope global

# Check for a default IPv6 route learned from Router Advertisements
ip -6 route show default

# If the router is set to DHCPv6, clients still need Router Advertisements
# to learn the default gateway
```

## TP-Link Deco (Mesh) Notes

For TP-Link Deco mesh systems:
1. Open the **Deco** app
2. Go to **More > Internet Connection > IPv6**
3. Enable IPv6 and select the connection type provided by your ISP
4. Use **Firewall Rules** on the IPv6 page if you need to permit inbound IPv6 services

## Conclusion

TP-Link routers provide a straightforward IPv6 configuration experience. The key settings are the WAN connection type and, when supported by your ISP, Prefix Delegation for the LAN. Once configured, connected devices can receive global IPv6 addresses and use native IPv6 without NAT. Inbound IPv6 access still depends on the router's firewall rules.
