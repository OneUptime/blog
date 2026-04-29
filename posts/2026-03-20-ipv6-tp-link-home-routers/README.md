# How to Configure IPv6 on TP-Link Home Routers - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, TP-Link, Home Router, DHCPv6, SLAAC

Description: Enable IPv6 on TP-Link Archer and Deco series routers, configure DHCPv6-PD, SLAAC for LAN devices, and troubleshoot common IPv6 connectivity issues.

## Supported TP-Link Models

Most TP-Link Archer series (C6, AX20, AX50, AX73, AX6000) and Deco mesh systems support IPv6. Check Advanced → IPv6 in the Archer web GUI, or More → Internet Connection → IPv6 in the Deco app.

## GUI Configuration (Archer Series)

Access the router web interface at `tplinkwifi.net` or your router's LAN IP.

```text
Path: Advanced → IPv6

IPv6: Enable

WAN IPv6 Connection Type: Dynamic IP (SLAAC/DHCPv6)
  (Most ISPs - automatically requests address and prefix)
  Advanced Settings:
    Get IPv6 Connection: Auto
    Prefix Delegation: Enable
    DNS Server: Get IPv6 DNS from ISP (enabled)

If your ISP specifically requires SLAAC:
  WAN IPv6 Connection Type: Dynamic IP (SLAAC/DHCPv6)
  Advanced Settings:
    Get IPv6 Connection: SLAAC+Stateless DHCP
    DNS Server: Get IPv6 DNS from ISP (enabled)
  or Manual DNS:
    Primary: 2606:4700:4700::1111
    Secondary: 2001:4860:4860::8888

LAN settings:
  Address Type: DHCPv6 or SLAAC+Stateless DHCP
  Address Prefix: (prefix provided by your ISP)

Firewall Rules:
  Leave default IPv6 protection enabled
  Add rules only if you need inbound IPv6 access
```

## TP-Link Deco (Mesh) IPv6

Deco systems configure IPv6 through the Deco mobile app.

```text
Deco App → Select Deco network → More → Internet Connection → IPv6

IPv6 Status: Enable

Internet Connection:
  Type: Dynamic IP (recommended for most ISPs)

LAN:
  Address Prefix: (shown after the WAN connection is established)
  DNS: Automatic (from ISP) or Manual

Note: Deco mesh nodes bridge IPv6 from the main node.
```

## Verify via Router Admin UI

Use the router's supported status pages instead of assuming SSH access is available on stock firmware.

```text
Archer web GUI:
  Advanced → IPv6
  Confirm WAN IPv6 shows a global address
  Confirm Prefix Delegation / Address Prefix is populated
  Confirm the selected LAN Address Type matches your clients

Deco app:
  More → Internet Connection → IPv6
  Confirm WAN IPv6 shows a global address
  Confirm an Address Prefix is shown for the LAN
  Review Firewall Rules only if you need inbound IPv6 access
```

## Troubleshooting TP-Link IPv6

Common issues and quick fixes.

```text
# Issue 1: Router shows an IPv6 address but devices do not get one
# Fix: On Archer, confirm Prefix Delegation is enabled and LAN Address Type is
# DHCPv6 or SLAAC+Stateless DHCP. On Deco, confirm IPv6 is enabled in
# More → Internet Connection → IPv6. Then reconnect the client.

# Issue 2: IPv6 intermittently drops
# Verify the WAN IPv6 connection type matches your ISP (Dynamic IP or PPPoE).
# If PPPoE is used, keep "Share the same PPPoE session with IPv4" enabled
# unless the ISP provided separate IPv6 credentials.

# Issue 3: Some sites are unreachable over IPv6
# MTU problems can occur on PPPoE links. Check the WAN MTU in the router UI and
# use the value recommended by your ISP instead of assuming a fixed 1452.

# Issue 4: Inbound IPv6 access is blocked
# Review IPv6 Firewall Rules in the router UI and add only the specific rule you
# need. Do not disable the firewall globally just to test connectivity.
```

## Test IPv6 From LAN Device

After configuring the router, verify from a device on the network.

```bash
# From a PC connected to TP-Link router

# Check device has IPv6
ip -6 addr show | grep "scope global"

# Ping router's LAN IPv6
ping -6 2001:db8:1:1::1    # substitute actual router LAN IPv6

# Ping internet
ping -6 2606:4700:4700::1111

# Check DNS works over IPv6
dig AAAA example.com @2606:4700:4700::1111

# Verify public IPv6 address
curl -6 https://ifconfig.co
```

## Conclusion

TP-Link Archer and Deco series routers configure IPv6 under Advanced → IPv6 in the Archer web GUI or More → Internet Connection → IPv6 in the Deco app. Select Dynamic IP (SLAAC/DHCPv6) for most ISPs, or PPPoE if your ISP requires it. On Archer models, enable Prefix Delegation and choose a LAN address type such as DHCPv6 or SLAAC+Stateless DHCP. Keep the default IPv6 firewall protection in place and add explicit firewall rules only when you need inbound IPv6 access. If devices on the LAN do not receive IPv6 addresses, confirm that the WAN connection type matches your ISP and that a delegated prefix or address prefix is present. MTU issues can happen on PPPoE links, so use the MTU recommended by your ISP rather than assuming one fixed value.
