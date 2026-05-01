# How to Configure Dual-Stack on MikroTik Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPv4, Dual-Stack, MikroTik, RouterOS

Description: Learn how to configure dual-stack IPv4 and IPv6 networking on MikroTik RouterOS, including interface addressing, Router Advertisement, DHCPv6, and firewall configuration.

## Overview

MikroTik RouterOS supports dual-stack through parallel IPv4 and IPv6 configuration. RouterOS uses separate address spaces and routing tables for each family, with independent OSPF/BGP configuration. IPv6 features are found under the `/ipv6` menu hierarchy.

## Check IPv6 Package

```text
# Verify RouterOS package state and IPv6 settings

/system package print
/ipv6 settings print

# On current RouterOS 7 releases, IPv6 is included in the main routeros package.
# If IPv6 is disabled system-wide, enable it in /ipv6 settings before continuing.
```

## Interface Addressing

```text
# Add IPv4 address (if not already configured)
/ip address add address=192.0.2.1/24 interface=ether1-wan comment="WAN IPv4"
/ip address add address=10.0.0.1/24  interface=ether2-lan comment="LAN IPv4"

# Add IPv6 addresses
/ipv6 address add address=2001:db8:0:1::1/64 interface=ether1-wan advertise=no
/ipv6 address add address=2001:db8:1::1/64 interface=ether2-lan advertise=yes

# The 'advertise=yes' flag adds this prefix to Router Advertisement on the LAN interface

# View addresses
/ip address print
/ipv6 address print
```

## Static Routes

```text
# IPv4 default route
/ip route add dst-address=0.0.0.0/0 gateway=192.0.2.254

# IPv6 default route
/ipv6 route add dst-address=::/0 gateway=2001:db8:0:1::254

# Verify
/ip route print
/ipv6 route print
```

## Router Advertisement (RA) for Hosts

```text
# Configure RA on LAN interface
/ipv6 nd add interface=ether2-lan \
    ra-interval=60s-200s \
    ra-lifetime=600s \
    advertise-dns=yes \
    dns-servers=2001:db8:1::53 \
    managed-address-configuration=no \
    other-configuration=no

# Options:
#   managed-address-configuration=yes → M flag → use DHCPv6 for addresses
#   other-configuration=yes → O flag → use DHCPv6 for DNS/options only
#   advertise-dns=yes → include RDNSS option (RFC 8106)

# Verify RA is being sent
/ipv6 nd print
```

## DHCPv6 Server (Optional)

```text
# Create DHCPv6 pool
/ipv6 pool add name=v6-address-pool prefix=2001:db8:1::100/120 prefix-length=128

# If hosts should request IPv6 addresses via DHCPv6, set the M flag on the same LAN interface
/ipv6 nd set [find interface=ether2-lan] managed-address-configuration=yes

# Create DHCPv6 server on LAN
/ipv6 dhcp-server add name=dhcpv6-lan interface=ether2-lan address-pool=v6-address-pool \
    preference=255

# View DHCPv6 leases
/ipv6 dhcp-server binding print
```

## Firewall Configuration for Dual-Stack

```text
# IPv6 firewall - basic rules
# Allow established/related traffic
/ipv6 firewall filter add chain=input connection-state=established,related action=accept comment="Allow established"
/ipv6 firewall filter add chain=forward connection-state=established,related action=accept

# Allow ICMPv6 (required types)
/ipv6 firewall filter add chain=input protocol=icmpv6 action=accept comment="Allow ICMPv6"
/ipv6 firewall filter add chain=forward protocol=icmpv6 action=accept

# Allow link-local
/ipv6 firewall filter add chain=input src-address=fe80::/10 action=accept comment="Allow link-local"

# Allow management SSH from specific prefix
/ipv6 firewall filter add chain=input protocol=tcp dst-port=22 \
    src-address=2001:db8:1::/64 action=accept comment="Allow SSH management"

# Drop invalid
/ipv6 firewall filter add chain=input connection-state=invalid action=drop

# Default drop for traffic to the router
/ipv6 firewall filter add chain=input action=drop comment="Default drop"
/ipv6 firewall filter add chain=forward src-address=!2001:db8:1::/64 action=drop comment="Block non-LAN forward"

# IPv4 firewall (parallel - mirror rules)
/ip firewall filter add chain=input connection-state=established,related action=accept
/ip firewall filter add chain=input protocol=icmp action=accept
/ip firewall filter add chain=input src-address=10.0.0.0/24 protocol=tcp dst-port=22 action=accept
/ip firewall filter add chain=input connection-state=invalid action=drop
/ip firewall filter add chain=input action=drop
```

## BGP Dual-Stack on MikroTik

```text
# RouterOS 7 - new BGP implementation
/routing bgp instance add name=dualstack as=65001

/routing bgp connection add \
    name=upstream-v4 \
    remote.address=192.0.2.2 \
    remote.as=65002 \
    instance=dualstack \
    local.role=ebgp \
    afi=ip

/routing bgp connection add \
    name=upstream-v6 \
    remote.address=2001:db8:0:1::2 \
    remote.as=65002 \
    instance=dualstack \
    local.role=ebgp \
    afi=ipv6

# View BGP sessions
/routing bgp session print
```

## Verification

```text
# Interface addresses
/ip address print
/ipv6 address print

# Routing
/ip route print
/ipv6 route print

# NDP neighbor cache
/ipv6 neighbor print

# ARP cache (IPv4)
/ip arp print

# Ping both families
/ping 8.8.8.8
/ping 2001:4860:4860::8888

# Traceroute
/tool traceroute 8.8.8.8
/tool traceroute 2001:4860:4860::8888
```

## Summary

MikroTik RouterOS dual-stack uses parallel `/ip` and `/ipv6` command trees for addressing, routing, firewall, and DHCP. Add IPv6 addresses with `/ipv6 address add`, configure RA with `/ipv6 nd add` (set `advertise=yes` on LAN-facing addresses so the prefix is advertised), and add the IPv6 default route with `/ipv6 route add`. Create matching firewall rules under `/ipv6 firewall filter` alongside the existing `/ip firewall filter` rules. Use RouterOS 7's `/routing bgp connection` for dual-stack BGP with `afi=ip` and `afi=ipv6`, and define a BGP instance or template with the local AS first.
