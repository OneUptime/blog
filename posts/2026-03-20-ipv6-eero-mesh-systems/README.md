# How to Configure IPv6 on eero Mesh Systems - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Eero, Mesh Network, Amazon, DHCPv6

Description: Enable IPv6 on Amazon eero mesh systems, verify DHCPv6-PD prefix delegation, and troubleshoot IPv6 connectivity for home networks using eero as the router.

## eero IPv6 Overview

eero (owned by Amazon) supports native dual-stack IPv6. If your ISP supports global IPv6 addresses, you can enable them in the eero mobile app - there is no traditional web GUI.

## Enable IPv6 in eero App

```text
eero App → Settings → Advanced networking → IPv6 → Enable

eero IPv6 behavior:
  - Uses global IPv6 addresses when your ISP supports IPv6
  - Restarts the network automatically after the setting is changed
  - Lets you view IPv6 addresses for each eero and connected device in the app
```

## Verify IPv6 from a Connected Device

Since eero has no CLI, test from a Linux device on the network.

```bash
# From a Linux device on the eero network

# Check for a global IPv6 address

ip -6 addr show | grep "scope global"
# Should show at least one: inet6 2001:db8:.../64 scope global

# Check for IPv6 default route
ip -6 route show default

# Test internet reachability
ping -6 -c 4 2606:4700:4700::1111    # Cloudflare
ping -6 -c 4 2001:4860:4860::8888    # Google

# Check public IPv6 address
curl -6 https://ifconfig.co

# Test IPv6 DNS resolution
dig AAAA google.com @2606:4700:4700::1111
```

## eero with ISP Modem in Bridge Mode

If your ISP device is a modem/router combo and you want eero to act as the main router, bridge mode is the recommended setup.

```text
Step 1: Set ISP modem/router combo to bridge mode
  - Log into the modem admin page
  - Find the option to enable bridge mode
  - Save the setting and let the device reboot

Step 2: Let eero handle the WAN connection
  - Connect the gateway eero directly to the modem/router combo
  - Enable IPv6 in the eero app: Settings → Advanced networking → IPv6

Step 3: Verify in eero app
  Home tab → tap the gateway eero → IP addresses
  Shows: the eero's IPv4 and IPv6 addresses
```

## Amazon eero Pro 6 / 6E IPv6 Details

```text
# eero Pro 6/6E supports Thread border routing
# Thread is an IPv6-based mesh protocol used by Matter-compatible devices
# Each Thread-capable eero acts as a border router between the Thread mesh
# network and your other Wi-Fi/Ethernet devices

# Check a device's IP information in the app:
eero App → Devices → [device] → IP addresses
# Shows the device's IPv4 and IPv6 addresses when available

# Regular Wi-Fi clients can also receive global IPv6 addresses
# when the ISP connection provides IPv6
```

## Troubleshoot eero IPv6

```bash
# Issue 1: IPv6 disabled or not working after enabling
# Fix: Let the network restart after changing the IPv6 toggle
# Then check: Settings → Advanced networking → IPv6

# Issue 2: Upstream modem/router combo still handling routing
# eero gateway shows no IPv6 WAN address
# Fix: If you want eero to be the router, enable bridge mode on the
# modem/router combo or contact your ISP for the correct upstream setup

# Issue 3: eero has IPv6 WAN but clients not getting addresses
# Fix: Restart the eero network and reconnect the client, then verify the
# client's IPv6 address under Devices → [device] → IP addresses

# Issue 4: IPv6 works but some sites unreachable
# Fix: Test from a second client, verify custom DNS settings, and review
# ISP-specific requirements such as PPPoE or VLAN tagging if your provider
# requires them

# Verify fix from connected device
ping -6 -c 3 2606:4700:4700::1111
curl -6 https://ifconfig.co
```

## eero in Bridge Mode

If eero is behind another router, use eero in bridge mode.

```text
eero App → Settings → Advanced networking → DHCP & NAT → Bridge

In bridge mode:
  - eero acts as an access point and your upstream router handles routing
  - You lose access to advanced network settings in the eero app
  - Thread and Upstream IPv6 are unavailable
  - Several eero Plus security features do not work in bridge mode
```

## Conclusion

eero mesh systems can use IPv6 once it is enabled in the eero app under Settings → Advanced networking → IPv6 and the ISP supports global IPv6 addresses. If you want eero to handle routing, bridge the upstream modem/router combo; if another router stays upstream, put eero in bridge mode and let that router manage IPv6. eero Pro 6/6E also supports Thread border routing for compatible smart home devices, but Thread and Upstream IPv6 are unavailable when the eeros themselves are placed in bridge mode. Since eero has no traditional CLI, verify IPv6 from a connected Linux device using `ping -6` and `curl -6`.
