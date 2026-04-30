# How to Configure IPv6 on OpenWrt Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, OpenWrt, Router, DHCPv6, Odhcp6c, Networking

Description: Configure complete IPv6 support on OpenWrt routers including DHCPv6 prefix delegation from ISP, SLAAC for LAN clients, and IPv6 firewall rules.

## Introduction

OpenWrt provides a complete IPv6 stack via `odhcp6c` (DHCPv6 client), `odhcpd` (DHCPv6/RA server), and `firewall4` (`fw4`) for firewalling. This guide walks through a complete OpenWrt IPv6 setup from ISP connectivity to client distribution.

## Step 1: Configure WAN IPv6

```bash
# Edit the WAN6 interface via UCI

uci set network.wan6=interface
uci set network.wan6.device='eth0.2'      # WAN physical interface
uci set network.wan6.proto='dhcpv6'
uci set network.wan6.reqaddress='try'
uci set network.wan6.reqprefix='auto'     # Request prefix delegation
uci commit network
ifup wan6
```

For PPPoEv6 ISP connections:
```bash
uci set network.wan.proto='pppoe'
uci set network.wan.ipv6='1'    # Enable IPv6 over PPPoE
uci set network.wan6.device='@wan'
uci commit network
ifup wan
ifup wan6
```

## Step 2: Configure LAN IPv6 via odhcpd

```bash
# Request a delegated IPv6 prefix for LAN
uci set network.lan.ip6assign='60'

# Configure the LAN interface for SLAAC and DHCPv6
uci set dhcp.lan.ra='server'
uci set dhcp.lan.dhcpv6='server'
uci set dhcp.lan.ra_slaac='1'
uci set dhcp.lan.ra_default='1'
uci set dhcp.lan.ra_maxinterval='100'
uci set dhcp.lan.ra_mininterval='30'
uci set dhcp.lan.ra_lifetime='1800'

# DNS to advertise
uci add_list dhcp.lan.dns='2606:4700:4700::1111'
uci add_list dhcp.lan.dns='2001:4860:4860::8888'

uci commit network
uci commit dhcp
ifup lan
/etc/init.d/odhcpd restart
```

## Step 3: Configure IPv6 Firewall

```bash
# The default OpenWrt firewall already has IPv6 rules
# View current firewall4 ruleset
fw4 print

# Add a custom rule to allow specific forwarded IPv6 traffic to LAN clients
# Edit /etc/config/firewall:
uci add firewall rule
uci set firewall.@rule[-1].name='Allow-IPv6-HTTPS-Inbound'
uci set firewall.@rule[-1].src='wan'
uci set firewall.@rule[-1].dest='lan'
uci set firewall.@rule[-1].proto='tcp'
uci set firewall.@rule[-1].dest_port='443'
uci set firewall.@rule[-1].family='ipv6'
uci set firewall.@rule[-1].target='ACCEPT'
uci commit firewall
/etc/init.d/firewall restart
```

## Step 4: Verify Configuration

```bash
# Check WAN6 address and delegated prefix status
ubus call network.interface.wan6 status

# Check LAN IPv6 address assignment
ubus call network.interface.lan status

# Check that odhcpd is advertising RA
logread | grep odhcpd

# Test IPv6 connectivity from the router
ping -6 -c 3 2606:4700:4700::1111
```

## Step 5: Verify on LAN Clients

```bash
# On a Linux client
ip -6 addr show scope global
# Should show an address derived from the delegated prefix

ip -6 route show default
# Should show: default via fe80::... dev eth0 proto ra
```

## Using /etc/config/network Directly

```text
# /etc/config/network

config interface 'wan6'
    option device 'eth0.2'
    option proto 'dhcpv6'
    option reqaddress 'try'
    option reqprefix 'auto'

config interface 'lan'
    option device 'br-lan'
    option proto 'static'
    option ipaddr '192.168.1.1'
    option netmask '255.255.255.0'
    option ip6assign '60'
    # IPv6 address auto-assigned from delegated prefix
```

```text
# /etc/config/dhcp

config dhcp 'lan'
    option interface 'lan'
    option dhcpv6 'server'
    option ra 'server'
    option ra_slaac '1'
    option ra_default '1'
    option ra_maxinterval '100'
    option ra_mininterval '30'
    option ra_lifetime '1800'
    list dns '2606:4700:4700::1111'
    list domain 'example.com'
```

## Conclusion

OpenWrt provides a complete, integrated IPv6 stack through UCI-managed `odhcp6c` (WAN DHCPv6 client) and `odhcpd` (LAN RA/DHCPv6 server). The tight integration with the OpenWrt firewall framework makes it straightforward to add IPv6 firewall rules alongside IPv4 rules. After configuration, verify connectivity from both the router and LAN clients to confirm the full chain from ISP prefix delegation to SLAAC client addressing is working.
