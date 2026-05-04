# How to Configure Static IPv6 Addresses on macOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, macOS, Static Address, Networksetup, Network Configuration

Description: Learn how to assign a static IPv6 address on macOS using System Settings and the networksetup command, including configuring a default gateway and verifying the configuration.

## Configure Static IPv6 via System Settings

```sql
Steps:
1. System Settings → Network

2. Select your connection → Click "Details..."

3. Click "TCP/IP" tab

4. Change "Configure IPv6" to "Manually"

5. Enter:
   - IPv6 Address: 2001:db8::10
   - Prefix Length: 64
   - Router: 2001:db8::1

6. Click "OK"

Note: DNS is configured separately in the "DNS" tab
```

## Configure Static IPv6 via networksetup

```bash
# Set a static IPv6 address on Wi-Fi

networksetup -setv6manual Wi-Fi 2001:db8::10 64 2001:db8::1
# Format: -setv6manual <service> <address> <prefixlength> <router>

# Set static IPv6 on Ethernet
networksetup -setv6manual Ethernet 2001:db8::10 64 2001:db8::1

# Verify
networksetup -getinfo Wi-Fi
```

## Configure Static IPv6 via ifconfig (Temporary)

```bash
# Add a static IPv6 address temporarily (lost on reboot)
sudo ifconfig en0 inet6 2001:db8::10 prefixlen 64

# Add default IPv6 route
sudo route -n add -inet6 default 2001:db8::1

# Verify
ifconfig en0 | grep inet6
netstat -rn -f inet6 | grep default
```

## Set IPv6 DNS Servers

```bash
# Set DNS servers (works for both IPv4 and IPv6 DNS)
networksetup -setdnsservers Wi-Fi 2001:4860:4860::8888 2001:4860:4860::8844 8.8.8.8

# View current DNS
networksetup -getdnsservers Wi-Fi

# Clear DNS (revert to DHCP/RA-provided)
networksetup -setdnsservers Wi-Fi "empty"
```

## Verify Static IPv6 Configuration

```bash
# Show IPv6 addresses
ifconfig en0 | grep inet6

# Expected output:
# inet6 fe80::1234:5678:9abc:def0%en0 prefixlen 64 scopeid 0x4  (link-local, auto)
# inet6 2001:db8::10 prefixlen 64                                 (static)

# Check routes
netstat -rn -f inet6

# Test gateway connectivity
ping6 -c 3 2001:db8::1

# Test external connectivity
ping6 -c 3 2001:4860:4860::8888

# Check DNS
dig AAAA google.com
```

## Multiple Static IPv6 Addresses

```bash
# macOS allows adding multiple IPv6 addresses via ifconfig
sudo ifconfig en0 inet6 2001:db8::10 prefixlen 64
sudo ifconfig en0 inet6 2001:db8::20 prefixlen 64 alias

# Or add a second address via alias
sudo ifconfig en0 inet6 alias 2001:db8::20 prefixlen 64

# View all addresses
ifconfig en0 | grep inet6
```

## Revert to Automatic IPv6

```bash
# Switch back to SLAAC/automatic
networksetup -setv6automatic Wi-Fi

# Or in System Settings:
# TCP/IP tab → Configure IPv6 → Automatically
```

## Summary

Assign a static IPv6 address on macOS with `networksetup -setv6manual Wi-Fi <address> <prefixlen> <gateway>` or via **System Settings → Network → Details → TCP/IP → Manually**. Set DNS with `networksetup -setdnsservers`. For temporary assignment, use `sudo ifconfig en0 inet6 2001:db8::10 prefixlen 64`. Verify with `ifconfig en0 | grep inet6` and `ping6 2001:db8::1`. Switch back to automatic with `networksetup -setv6automatic`.
