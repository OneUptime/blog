# How to Configure IPv6 on Linksys Home Routers - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Linksys, Velop, Home Router, DHCPv6

Description: Configure IPv6 on Linksys WRT, EA, and Velop mesh routers including DHCPv6-PD setup, LAN SLAAC, and troubleshooting common connectivity problems.

## Supported Linksys Models

IPv6 is supported on Linksys WRT series, EA series, and Velop mesh systems, including models such as the WRT3200ACM, WRT32X, EA6900, and EA8300. Access the local interface via `myrouter.local` or `https://192.168.1.1`. Linksys documents DHCPv6-PD support on Velop, Velop Jr, EA, and WRT-series routers except the WRT54GL and WRT32X.

## GUI Configuration (EA/WRT Series)

```text
Path: Router Settings → Connectivity → Internet Settings → IPv6

Documented IPv6 options in Linksys Smart Wi-Fi:
  IPv6 Automatic  - native IPv6 from ISP
  6rd Tunnel      - ISP-provided 6rd tunnel

For native IPv6 on most ISPs:
  Type of Internet Connection: IPv6 Automatic
  DUID: router-generated DHCPv6 identifier

For 6rd only:
  Prefix / Prefix Length / Border Relay / IPv4 Mask Length
  Enter the values supplied by your ISP

Optional:
  MTU: Auto by default
  MAC Address Clone: enable only if required by ISP
```

## Velop Mesh IPv6

Linksys Velop uses the Linksys app and a simplified web interface.

```nginx
Linksys App → Menu → Advanced Settings → Internet Settings → IPv6

Or local web GUI:
  myrouter.local or https://192.168.1.1
  Menu → Advanced Settings → Internet Settings → IPv6

Velop Notes:
  - IPv6 options in the app are Automatic, PPPoE, and Passthrough
  - DHCPv6-PD is supported on Velop
  - If DHCPv6-PD does not work with your ISP combination, Linksys' DHCPv6-PD support article points to Bridge mode on the parent node

For bridge/AP mode (no routing):
  The upstream router handles IPv6 addressing and routing
```

## WRT Series with OpenWrt

WRT3200ACM and WRT32X are supported by OpenWrt.

```bash
# Install OpenWrt on WRT series - check openwrt.org for image

# After installation, configure via LuCI or CLI

# Configure DHCPv6-PD client on WAN
uci set network.wan6.proto='dhcpv6'
uci set network.wan6.reqprefix='auto'
uci set network.wan6.reqaddress='try'

# Configure RA on LAN
uci set network.lan.ip6assign='64'
uci commit network
/etc/init.d/network restart

# Verify on OpenWrt
ip -6 addr show
ip -6 route show
```

## Troubleshoot Linksys IPv6

```bash
# Issue 1: IPv6 not detected - wrong mode selected
# Fix: Use "IPv6 Automatic" for native IPv6 or "6rd Tunnel" only if your ISP requires 6rd

# Issue 2: Router shows IPv6 WAN but LAN devices have no IPv6
# Cause: Router is not using native IPv6 mode or clients have not renewed IPv6 settings
# Fix: Confirm the IPv6 mode, then reconnect or renew the client and test again

# Issue 3: Velop does not work with your ISP's DHCPv6-PD combination
# Cause: The ISP combination may require IPv6 Passthrough
# Fix: Linksys' DHCPv6-PD support article points to Bridge mode on the parent node

# Issue 4: IPv6 works on 5GHz but not 2.4GHz
# Review firmware and MTU settings
# Linksys' documented stock UI does not include an RA interval control

# Diagnostic from connected device
ping6 -c 3 2606:4700:4700::1111
traceroute6 2001:4860:4860::8888
curl -6 https://ifconfig.co
```

## Test from LAN Device

```bash
# Verify LAN device has received IPv6 from Linksys router

# Linux/macOS
ip -6 addr show | grep "scope global"
ip -6 route show default

# Windows PowerShell
Get-NetIPAddress -AddressFamily IPv6 | Where-Object PrefixOrigin -eq 'RouterAdvertisement'

# Full connectivity test
ping6 2606:4700:4700::1111      # Cloudflare DNS
ping6 2001:4860:4860::8888      # Google DNS
curl -6 https://ifconfig.co      # HTTP over IPv6
```

## Conclusion

Linksys Smart Wi-Fi routers configure IPv6 under Connectivity → Internet Settings → IPv6, where the documented stock-firmware choices are `IPv6 Automatic` for native IPv6 and `6rd Tunnel` when required by your ISP. Velop systems expose IPv6 under Advanced Settings in the Linksys app or local web UI; the app documentation lists `Automatic`, `PPPoE`, and `Passthrough` options. Linksys documents DHCPv6-PD support on Velop, EA, and WRT-series routers except WRT54GL and WRT32X; for advanced users, OpenWrt on supported WRT models provides fuller IPv6 control through `wan6` DHCPv6 settings and `ip6assign` on the LAN.
