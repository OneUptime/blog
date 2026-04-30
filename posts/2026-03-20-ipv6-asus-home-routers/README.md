# How to Configure IPv6 on ASUS Home Routers - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Asus, Home Router, DHCPv6, Router Configuration

Description: Enable and configure IPv6 on ASUS routers running ASUSWRT firmware, including DHCPv6-PD, SLAAC, DNS settings, and firewall configuration.

## ASUS Router IPv6 Overview

ASUS routers running ASUSWRT (and Merlin) support multiple IPv6 connection types. Many ISPs use Native IPv6, often with DHCPv6 prefix delegation (DHCP-PD).

## GUI Configuration

Navigate to the IPv6 settings page in the ASUS web interface.

```text
Path: Advanced Settings → IPv6

Common Connection Type options:
  - Native               - Native IPv6 on the WAN; enable DHCP-PD if your ISP delegates a prefix
  - Passthrough          - Common with some Automatic IP WAN setups
  - Static IPv6          - Fixed IPv6 settings from your ISP
  - 6in4 Static          - Hurricane Electric tunnel
  - Tunnel 6rd           - ISP-provided transition mechanism
  - Automatic 6to4       - Legacy tunnel (avoid if native IPv6 is available)
  - FLET's IPv6 Service  - Japan NTT specific

Common settings for an ISP that provides Native IPv6 with prefix delegation:
  Connection Type: Native
  DHCP-PD: Enabled
  Connect to DNS Server automatically: No
  DNS Server 1: 2606:4700:4700::1111   (Cloudflare)
  DNS Server 2: 2001:4860:4860::8888   (Google)
  Auto Configuration Setting: Stateless
  Enable Router Advertisement: Yes
  LAN IPv6 prefix: (auto-filled from the delegated prefix)
```

## ASUSWRT-Merlin CLI Configuration

Advanced configuration via SSH on Merlin firmware.

```bash
# SSH into ASUS router (enable SSH in Administration → System)

ssh admin@192.168.1.1

# Show the IPv6 default route and identify the active WAN interface
ip -6 route show default
WAN_IF=$(ip -6 route show default | awk '{print $5; exit}')

# Check current IPv6 WAN address
ip -6 addr show dev "$WAN_IF"

# Check LAN prefix
ip -6 addr show dev br0    # LAN bridge

# Locate generated Router Advertisement configuration
find /etc /tmp /var -maxdepth 2 -name 'radvd*.conf' 2>/dev/null

# Check recent IPv6 / DHCPv6 log entries
logread | grep -Ei 'odhcp6c|dhcp6|ipv6' | tail -20
```

## Custom radvd Configuration (Merlin)

For advanced users who need custom RA settings. In Merlin, enable JFFS custom scripts and configs first in Administration → System.

```bash
# /jffs/configs/radvd.conf.add - extra radvd options appended by Merlin
# (do not replace the whole file)

interface br0 {
    MinRtrAdvInterval 30;
    MaxRtrAdvInterval 100;
    AdvLinkMTU 1492;    # Typical for PPPoE unless your ISP supports RFC 4638 jumbo frames

    RDNSS 2606:4700:4700::1111 2001:4860:4860::8888 {
        AdvRDNSSLifetime 300;
    };
};
```

## IPv6 Firewall on ASUS

ASUS routers have an IPv6 firewall that may block inbound connections.

```text
GUI Path: Firewall → General

Default: IPv6 Firewall enabled (blocks unsolicited inbound IPv6 traffic)
Options:
  - Disable (allow all inbound - not recommended)
  - Enable (recommended)
  - Add custom rules in Inbound Firewall Rules

To allow a specific service (e.g., SSH on a home server):
  Service Name: SSH_inbound
  Remote IP / CIDR: (leave blank for any source)
  Local IP: 2001:db8:1::10
  Port Range: 22
  Protocol: TCP
```

## Testing IPv6 on ASUS Router

Verify everything is working from the router's console.

```bash
# SSH into router and run tests

# Check WAN IPv6 address
WAN_IF=$(ip -6 route show default | awk '{print $5; exit}')
ip -6 addr show dev "$WAN_IF" | grep "scope global"

# Ping upstream gateway
ping -6 -c 3 $(ip -6 route show default | awk '{print $3; exit}')

# Check internet reachability
ping -6 -c 3 2606:4700:4700::1111

# Check DNS
nslookup -type=AAAA ipv6.google.com 2606:4700:4700::1111

# Count LAN devices with IPv6
echo -n "LAN devices with non-link-local IPv6 on br0: "
ip -6 neigh show dev br0 | grep -v "fe80" | wc -l
```

## Conclusion

ASUS routers using ASUSWRT or Merlin firmware configure IPv6 via the IPv6 section of the web GUI. For ISPs that provide native IPv6 with prefix delegation, select `Native` and enable `DHCP-PD`. The router then advertises a LAN /64 derived from the delegated prefix to clients via SLAAC. If you want to override ISP-provided DNS, disable automatic DNS and set Cloudflare (2606:4700:4700::1111) or Google (2001:4860:4860::8888) as IPv6 DNS servers. Keep the IPv6 firewall enabled and add explicit inbound rules only for services you intentionally expose. For advanced customization, use Merlin firmware with `/jffs/configs/radvd.conf.add` and custom scripts.
