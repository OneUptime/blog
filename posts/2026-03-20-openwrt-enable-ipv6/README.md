# How to Enable IPv6 on OpenWrt

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenWrt, IPv6, Router, Configuration, Networking

Description: Enable IPv6 support on OpenWrt routers by configuring the IPv6 stack and verifying the odhcp6c and odhcpd packages are installed.

## Overview

Enable IPv6 support on OpenWrt routers by configuring the IPv6 stack and verifying the odhcp6c and odhcpd packages are installed.

## Prerequisites

- OpenWrt 22.03+ (for fw4/nftables-based IPv6 firewall); 21.02+ also works with fw3/iptables
- SSH access to the router
- IPv6 connectivity from ISP or tunnel

## OpenWrt IPv6 Architecture

OpenWrt uses several components for IPv6:
- **odhcp6c**: DHCPv6 client for WAN
- **odhcpd**: DHCPv6 server + RA daemon for LAN
- **dnsmasq**: DNS resolver (handles AAAA records)
- **fw4/nftables** or **iptables**: IPv6 firewall

## UCI Configuration

OpenWrt uses UCI (Unified Configuration Interface) for all configuration:

```bash
# View current network configuration

uci show network

# View IPv6 specific settings
uci show network | grep ipv6

# Apply changes
uci commit network
/etc/init.d/network restart
```

## Network Interface Configuration

### WAN6 (DHCPv6)

```bash
# Configure WAN6 for DHCPv6
uci set network.wan6.proto='dhcpv6'
uci set network.wan6.reqaddress='try'
uci set network.wan6.reqprefix='auto'
uci commit network
```

### In /etc/config/network

```text
config interface 'wan6'
    option device 'eth0'
    option proto 'dhcpv6'
    option reqaddress 'try'
    option reqprefix 'auto'

config interface 'lan'
    option device 'br-lan'
    option proto 'static'
    option ipaddr '192.168.1.1'
    option netmask '255.255.255.0'
    # IPv6 via prefix delegation
    option ip6assign '60'
```

## DHCP/RA Configuration (/etc/config/dhcp)

```text
config dhcp 'lan'
    option interface 'lan'
    option start '100'
    option limit '150'
    option leasetime '12h'
    option dhcpv6 'server'
    option ra 'server'
    list ra_flags 'managed-config'
    list ra_flags 'other-config'
    list dns '2001:4860:4860::8888'
```

## IPv6 Firewall Rules

```bash
# For fw4 (nftables-based, OpenWrt 22.03+)
# /etc/config/firewall

# Allow ICMPv6 (essential!)
uci add firewall rule
uci set firewall.@rule[-1].name='Allow-ICMPv6'
uci set firewall.@rule[-1].proto='icmp'
uci set firewall.@rule[-1].family='ipv6'
uci add_list firewall.@rule[-1].icmp_type='echo-request'
uci add_list firewall.@rule[-1].icmp_type='destination-unreachable'
uci set firewall.@rule[-1].target='ACCEPT'
uci commit firewall
```

## Checking IPv6 Status

```bash
# Check IPv6 addresses
ip -6 addr show

# Check IPv6 routes
ip -6 route show

# Check DHCPv6 client status
logread | grep odhcp6c | tail -20

# Check RA daemon
logread | grep odhcpd | tail -20

# Test IPv6 connectivity
ping6 -c 3 2001:4860:4860::8888

# Check NDP neighbors
ip -6 neigh show
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your OpenWrt router's IPv6 connectivity. Ping monitors targeting the router's IPv6 LAN address and IPv6 DNS servers verify the full IPv6 stack is functional.

## Conclusion

How to Enable IPv6 on OpenWrt primarily involves UCI configuration files at `/etc/config/network` and `/etc/config/dhcp`. The key components are odhcp6c (WAN DHCPv6 client) and odhcpd (LAN DHCPv6 server + RA). Always check logs with `logread` when troubleshooting IPv6 issues.
