# How to Configure IPv6 Privacy Extensions on macOS - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Privacy Extensions, macOS, Security, Networking, Terminal

Description: A guide to checking and configuring IPv6 privacy extensions on macOS, including verifying temporary address generation, system preferences configuration, and command-line management.

Current macOS versions generate temporary IPv6 addresses for outbound connections on typical client systems, helping avoid exposing a MAC-derived interface identifier in those temporary addresses. This guide explains how to verify and manage this behavior.

## Checking Current IPv6 Addresses on macOS

```bash
# List all IPv6 addresses on interfaces

ifconfig | grep "inet6"

# Replace en0 with your active interface if needed
# More detailed view for a specific interface
ifconfig en0 | grep "inet6"

# Expected output for a properly configured system:
# inet6 fe80::1%lo0 prefixlen 64 scopeid 0x1
# inet6 2001:db8:x:x:a1b2:c3d4:e5f6:7890 prefixlen 64 autoconf temporary
# inet6 2001:db8:x:x:4c1d:7d3b:794a:6834 prefixlen 64 autoconf secured

# Look for "temporary" - this is the rotating privacy address macOS prefers for outbound connections
# Look for "secured" - Apple marks these as cryptographically generated non-temporary addresses
```

## macOS IPv6 Address Types

macOS generates multiple types of IPv6 addresses:

```bash
# "temporary" = privacy extension address (RFC 8981)
#   Random interface ID, rotates periodically
#   macOS prefers these for outbound connections by default

# "secured" = non-temporary autoconfigured address marked by Apple as cryptographically generated
#   Not a MAC-derived EUI-64 address

# "autoconf" flag means the address was assigned via SLAAC

# Check via networksetup
networksetup -getinfo "Wi-Fi"
networksetup -getinfo "Ethernet"
```

## Configuring IPv6 via System Preferences / Settings

```bash
# macOS 13 (Ventura) and later: System Settings > Network > [Interface] > Details
# IPv6 Configure: Automatically

# macOS 12 (Monterey) and earlier: System Preferences > Network > Advanced > TCP/IP
# IPv6 Configure: Automatically

# When set to "Automatically" on a typical SLAAC-enabled network, macOS:
# 1. Receives Router Advertisement with prefix
# 2. Autoconfigures one or more non-temporary IPv6 addresses
# 3. Can also generate temporary IPv6 addresses for outbound privacy
```

## Managing IPv6 Privacy via Command Line

```bash
# Check IPv6 configuration for Wi-Fi
networksetup -getinfo "Wi-Fi"

# Set IPv6 to automatic
networksetup -setv6automatic "Wi-Fi"

# Check current IPv6 addressing
ifconfig en0 | grep "inet6"

# View the IPv6 routing table
netstat -rn -f inet6 | head -20
```

## Verifying Privacy Extensions Are Working

```bash
# Check which address is used for outbound connections to the internet
curl -6 https://ipv6.icanhazip.com

# On a typical client, this should match one of your temporary global IPv6 addresses

# Compare with the local temporary address
ifconfig en0 | grep "inet6.*temporary"
# If the temporary address contains "ff:fe" in the interface ID, privacy extensions are not working as expected

# List all your current global IPv6 addresses
ifconfig en0 | grep -E "inet6.*(autoconf|temporary|secured)"
```

## Address Rotation on macOS

```bash
# macOS rotates temporary addresses by default
# Check the current preferred lifetime
# (current Apple IPv6 stack defaults are 1 day preferred, 1 week valid)

# Disconnecting and reconnecting Wi-Fi, or toggling IPv6, can trigger reconfiguration
networksetup -setv6off "Wi-Fi"
networksetup -setv6automatic "Wi-Fi"

# After reconnecting, check new addresses
ifconfig en0 | grep "inet6.*temporary"

# You may see a different temporary address than before
```

## macOS Privacy Extensions vs VPN

```bash
# When connected to a VPN (OpenVPN, WireGuard, etc.):
# Many macOS VPN clients use utunN interfaces; the exact interface name varies
ifconfig | grep "^utun"

# Inspect the active tunnel interface if needed (replace utun0 with the interface you found)
ifconfig utun0 | grep "inet6"

# Verify outbound traffic uses VPN's IPv6
curl -6 https://ipv6.icanhazip.com
# If the VPN provides IPv6, this should show the VPN provider's IPv6, not your ISP's

# Check if there's an IPv6 leak (macOS may use the non-VPN IPv6)
# If curl -6 still shows your ISP's prefix while the VPN is expected to tunnel IPv6, you likely have an IPv6 leak
```

## Disabling IPv6 on an Interface (Not the Same as Disabling Privacy Extensions)

```bash
# macOS does not expose a supported toggle to disable only privacy extensions
# Disable IPv6 entirely for an interface (not recommended)
networksetup -setv6off "Wi-Fi"

# To use a static IPv6 address instead
networksetup -setv6manual "Wi-Fi" "2001:db8::10" 64 "2001:db8::1"

# Re-enable automatic IPv6 addressing
networksetup -setv6automatic "Wi-Fi"
```

## Checking macOS Privacy in macOS Sequoia (15.x)

```bash
# Privacy Report in macOS tracks web trackers, not IPv6
# For IPv6 tracking prevention, check via Terminal:
ifconfig en0 | grep -E "temporary|secured"

# The presence of a "temporary" address confirms privacy extensions are active
# Checking whether other addresses avoid EUI-64 ("ff:fe") is a separate sanity check

# Check with a test:
# 1. Disconnect from Wi-Fi and reconnect
# 2. Note the temporary address: ifconfig en0 | grep temporary
# 3. Disconnect and reconnect again
# 4. Check if temporary address changed: ifconfig en0 | grep temporary
# Addresses may be different, but rotation is not guaranteed on every reconnect
```

macOS implements IPv6 privacy by using RFC 8981 temporary addresses alongside other autoconfigured IPv6 addresses. Apple source marks some non-temporary autoconfigured addresses as "secured" (cryptographically generated), while temporary addresses are preferred for outbound connections on typical client systems. No additional configuration is needed on most Macs using automatic IPv6 configuration.
