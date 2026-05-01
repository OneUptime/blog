# How to Configure Dual-Stack on macOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPv4, Dual-Stack, macOS, Networking

Description: Learn how to configure dual-stack IPv4 and IPv6 networking on macOS using System Settings, networksetup CLI, and manual configuration for static and dynamic addressing.

## Overview

macOS supports dual-stack out of the box. By default, it accepts Router Advertisements for SLAAC IPv6 and uses DHCPv4 for IPv4. For servers and development machines that require static addresses, configuration is done through System Settings or the `networksetup` command-line tool.

## Check Current Dual-Stack Status

```bash
# Show all interface addresses

ifconfig en0

# Sample output:
# en0: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
#     inet  192.168.1.10 netmask 0xffffff00 broadcast 192.168.1.255
#     inet6 fe80::1%en0 prefixlen 64 scopeid 0x5
#     inet6 2001:db8::10 prefixlen 64 autoconf

# Check routing tables
netstat -rn -f inet   # IPv4 routes
netstat -rn -f inet6  # IPv6 routes

# Test connectivity
ping 8.8.8.8
ping6 2001:4860:4860::8888

# DNS resolution - both families
dns-sd -G v4v6 example.com
```

## Using networksetup CLI

```bash
# List available network services
networksetup -listallnetworkservices
# Returns: Wi-Fi, Ethernet, etc.

# --- IPv4 Configuration ---
# Set static IPv4
networksetup -setmanual "Ethernet" 192.0.2.10 255.255.255.0 192.0.2.1

# Or DHCP
networksetup -setdhcp "Ethernet"

# --- IPv6 Configuration ---
# Set static IPv6
networksetup -setv6manual "Ethernet" 2001:db8::10 64 2001:db8::1

# Enable automatic (SLAAC/RA)
networksetup -setv6automatic "Ethernet"

# Disable IPv6 on interface
networksetup -setv6off "Ethernet"

# Set DNS servers (both IPv4 and IPv6 resolvers)
networksetup -setdnsservers "Ethernet" 192.0.2.53 2001:db8::53 8.8.8.8 2001:4860:4860::8888

# Verify
networksetup -getinfo "Ethernet"
networksetup -getdnsservers "Ethernet"
```

## GUI: System Settings (macOS Ventura / Sonoma)

```text
System Settings → Network → [Interface] → Details → TCP/IP

IPv4:
  Configure IPv4:  Manually
  IP Address:      192.0.2.10
  Subnet Mask:     255.255.255.0
  Router:          192.0.2.1

IPv6:
  Configure IPv6:  Manually
  IPv6 Address:    2001:db8::10
  Prefix Length:   64
  Router:          2001:db8::1

System Settings → Network → [Interface] → Details → DNS

DNS:
  DNS Servers:     192.0.2.53
                   2001:db8::53
```

## Verify Address Selection

macOS follows RFC 6724 default address selection. When both A and AAAA records are available and IPv6 connectivity is usable, IPv6 generally has higher precedence than IPv4:

```bash
# Inspect resolver configuration used by lookups
scutil --dns

# Check active connections - which family is being used
netstat -an -f inet   # IPv4 connections
netstat -an -f inet6  # IPv6 connections

# Test with curl - force IPv4 or IPv6
curl -4 https://example.com -s -o /dev/null -w "%{remote_ip}\n"
curl -6 https://example.com -s -o /dev/null -w "%{remote_ip}\n"
```

## Privacy Extensions (RFC 4941)

macOS uses temporary IPv6 addresses for outbound connections by default:

```bash
# Show all IPv6 addresses on interface
ifconfig en0 inet6

# Addresses with "temporary" flag are RFC 4941 privacy addresses
# Addresses with "autoconf" are stable SLAAC addresses

# Privacy extensions are enabled by default in macOS
```

## Multiple IPv6 Addresses

macOS supports multiple IPv6 addresses per interface:

```bash
# Add additional IPv6 address (temporary - lost on reboot)
sudo ifconfig en0 inet6 2001:db8:alt::10 prefixlen 64 alias

# Remove
sudo ifconfig en0 inet6 2001:db8:alt::10 prefixlen 64 -alias

# For persistent additional addresses, use a startup script or launchd plist
```

## Firewall Considerations

macOS pf and the application firewall both need to handle IPv6:

```bash
# Check pf status
sudo pfctl -s info | grep Status

# Add dual-stack pf rules - /etc/pf.conf should address both families
# Allow SSH inbound (both families):
# pass in proto tcp to any port 22

# Application firewall (socketfilterfw) - applies to both families by default
/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
```

## Troubleshooting

```bash
# Check for IPv6 default route
netstat -rn -f inet6 | grep default

# No default route? If you're troubleshooting Wi-Fi, use Wireless Diagnostics → Window → Sniffer
# and inspect the capture for ICMPv6 Router Advertisement (type 134) traffic

# Probe MTU issues with an unfragmented IPv6 packet
ping6 -D -s 1452 2001:4860:4860::8888

# Check DNS is returning AAAA:
dig AAAA example.com @2001:db8::53

# Flush DNS cache
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

## Summary

macOS dual-stack is enabled by default for dynamic (SLAAC + DHCPv4) environments. Use `networksetup -setmanual` and `networksetup -setv6manual` for static addressing, or configure through System Settings → Network → TCP/IP. macOS follows RFC 6724 default address selection and generally prefers IPv6 when both families are available and usable, and it uses temporary privacy addresses (RFC 4941) for outbound connections. Use `curl -4/-6` to test which family is being used, and `netstat -rn -f inet6` to verify the IPv6 default route is present.
