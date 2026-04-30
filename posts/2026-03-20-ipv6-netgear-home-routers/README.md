# How to Configure IPv6 on Netgear Home Routers - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Netgear, Home Router, Orbi, DHCPv6

Description: Enable IPv6 on Netgear Nighthawk and Orbi routers, configure DHCPv6-PD from your ISP, and set up SLAAC for home devices.

## Supported Netgear Models

IPv6 is supported on Nighthawk (R7000, R8000, RAX series) and Orbi mesh systems. Access settings at `routerlogin.net` or `192.168.1.1`.

## GUI Configuration (Nighthawk)

```text
Path: Advanced → Advanced Setup → IPv6

Internet Connection Type:
  Auto Detect   - let router choose (recommended if unsure)
  or
  DHCP          - for native IPv6 from ISPs that use DHCPv6
  Auto Config   - for native IPv6 that does not use DHCP or PPPoE
  PPPoE         - only if your ISP uses PPPoE
  Fixed         - only if your ISP gave you static IPv6 settings
  6to4 Tunnel   - legacy tunnel (avoid unless required)

DHCP Settings:
  IPv6 DNS Address:
    Get Automatically from ISP
    or
    Use These DNS Servers
      Primary: 2606:4700:4700::1111
      Secondary: 2001:4860:4860::8888
  DHCP User Class (If Required): (leave blank unless ISP requires)
  Domain Name (If Required): (optional)

LAN:
  IP Address Assignment:
    Auto Config      - default; clients use SLAAC
    or
    Use DHCP Server  - pass DHCPv6 information to clients
  Use This Interface ID: (optional)
  IPv6 Filtering: Secured - default
```

## Orbi Mesh IPv6

Orbi systems use a similar Netgear web GUI via `orbilogin.local` on newer models or `orbilogin.com` on older ones.

```text
Path: Advanced → Advanced Setup → IPv6

Orbi-specific notes:
  - Main Orbi router handles the WAN IPv6 connection and LAN advertisement
  - Satellite nodes bridge the same LAN over the backhaul
  - IPv6 settings are unavailable when the Orbi is in AP mode
  - IPv6 Filtering defaults to Secured

LAN IPv6 Setup:
  IPv6 DNS Address:
    Get Automatically from ISP
    or
    Use These DNS Servers
  IP Address Assignment:
    Auto Config      - default
    or
    Use DHCP Server
```

## Verify Configuration via Router Diagnostics

Use the built-in diagnostics first. Stock Netgear firmware generally does not expose SSH or telnet; shell commands apply only on custom firmware.

```bash
# Netgear routers: Advanced → Administration → Diagnostics

# Ping test to IPv6 address from router GUI:

# Target: 2606:4700:4700::1111
# Result should show replies with no packet loss

# On custom firmware only:
ssh <router-user>@<router-lan-ip>

# Check IPv6 addresses
ip -6 addr show

# Check default IPv6 route
ip -6 route show
```

## Troubleshoot Common Issues

```bash
# Issue 1: "No IPv6 connection" in status page
# Cause: ISP not sending DHCPv6 offers, or wrong connection type
# Fix: Change from "Auto Detect" to explicit "DHCP" mode
# Then: Restart the modem and router if the WAN lease does not refresh

# Issue 2: Router has IPv6 but LAN devices don't
# Check: Is LAN "IP Address Assignment" set to "Auto Config" or "Use DHCP Server"?
# Also verify: the router is not running in AP mode, where IPv6 settings are disabled

# Issue 3: IPv6 works but slow (MTU issue)
# Nighthawk with PPPoE: MTU is commonly 1492 unless your ISP specifies otherwise
# Path: Advanced → Setup → WAN Setup → MTU Size

# Issue 4: IPv6 drops after a few hours (lease renewal)
# Update to the latest firmware and reconnect the WAN link
# Stock Netgear firmware does not expose DHCPv6 renewal timers

# Check status after changes
curl -6 https://ifconfig.co
```

## Testing IPv6 on LAN Devices

```bash
# From any device on the Netgear LAN

# Verify global IPv6 address
ip -6 addr show | grep "scope global"

# Verify default route
ip -6 route show default

# Test connectivity
ping -6 -c 4 2606:4700:4700::1111

# Test DNS over IPv6
dig -6 AAAA google.com @2606:4700:4700::1111 +short

# Verify internet-facing IPv6
curl -6 -s https://ifconfig.co
```

## Conclusion

Netgear Nighthawk and Orbi routers configure IPv6 under Advanced → Advanced Setup → IPv6. Select DHCP when your ISP provides native IPv6 over DHCPv6; Auto Detect is the safest choice if you are unsure, and Auto Config is used when the ISP does not use DHCP or PPPoE. When the ISP provides DHCPv6 prefix delegation, Netgear handles the delegated prefix automatically and LAN clients typically use Auto Config/SLAAC unless you choose Use DHCP Server. Configure Cloudflare or Google IPv6 DNS servers if you do not want to use the ISP-provided resolvers. Keep IPv6 Filtering set to Secured, which is Netgear's default. If the router acquires IPv6 but LAN devices do not, verify the LAN IP Address Assignment setting and make sure the router is not running in AP mode.
