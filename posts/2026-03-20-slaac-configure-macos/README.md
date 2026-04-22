# How to Configure SLAAC on macOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SLAAC, macOS, IPv6, Address Autoconfiguration, Networksetup, System Preferences

Description: Configure and verify IPv6 SLAAC on macOS using System Settings, networksetup command-line tool, and sysctl to manage automatic IPv6 address assignment.

## Introduction

macOS enables IPv6 SLAAC by default for network services. The macOS networking stack processes Router Advertisements and automatically generates stable CGA-based IPv6 addresses (RFC 3972) plus temporary privacy addresses (RFC 8981). macOS does not use MAC-derived EUI-64 interface identifiers by default. Configuration is available through System Settings (GUI), the `networksetup` command-line tool, and sysctl parameters.

## Verifying SLAAC on macOS

```bash
# Show all IPv6 addresses including SLAAC-generated

ifconfig en0 inet6

# Example output:
# en0: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
#     inet6 fe80::1c8e:abc2:3f41:9d05%en0 prefixlen 64 secured scopeid 0x5
#     inet6 2001:db8::a3f2:1b8c:9d4e:7f05 prefixlen 64 autoconf secured
#     inet6 2001:db8::5c3a:f912:8b4e:2d07 prefixlen 64 autoconf temporary
#
# "autoconf" = SLAAC-generated address
# "secured" = stable CGA-based address (RFC 3972 on Apple platforms)
# "temporary" = privacy extensions (RFC 8981)

# Show SLAAC addresses across all interfaces
ifconfig -a | grep "autoconf"

# Show IPv6 routing table (including RA default route)
netstat -rn -f inet6 | grep default
# default     fe80::1%en0   UGScg   en0
```

## Configuring SLAAC via networksetup

```bash
# Show current IPv6 configuration method
networksetup -getinfo "Wi-Fi"
# IPv6: Automatic          ← SLAAC enabled
# IPv6 IP address: 2001:db8::a3f2:1b8c:9d4e:7f05
# IPv6 Router: fe80::1

# Set IPv6 to Automatic (SLAAC)
sudo networksetup -setv6automatic "Wi-Fi"

# Set to static IPv6 address
sudo networksetup -setv6manual "Wi-Fi" 2001:db8::10 64 fe80::1

# Disable IPv6 on an interface
sudo networksetup -setv6off "Wi-Fi"

# Enable IPv6 (back to SLAAC)
sudo networksetup -setv6automatic "Wi-Fi"

# List all network services
networksetup -listallnetworkservices
# An asterisk (*) denotes that a network service is disabled.
# Wi-Fi
# Ethernet
# Thunderbolt Bridge
```

## macOS Privacy Extensions

```bash
# Check privacy extension status
sysctl net.inet6.ip6.use_tempaddr
# net.inet6.ip6.use_tempaddr: 1   ← Temporary addresses enabled

sysctl net.inet6.ip6.prefer_tempaddr
# net.inet6.ip6.prefer_tempaddr: 1   ← Prefer temporary addresses for new connections

# Values:
# use_tempaddr: 0 = disabled, 1 = enabled
# prefer_tempaddr: 0 = prefer stable, 1 = prefer temporary (default on macOS)

# Disable privacy extensions (use stable addresses only)
sudo sysctl -w net.inet6.ip6.use_tempaddr=0

# Enable privacy extensions (default)
sudo sysctl -w net.inet6.ip6.use_tempaddr=1
sudo sysctl -w net.inet6.ip6.prefer_tempaddr=1

# Prefer stable addresses while still generating temporary addresses
sudo sysctl -w net.inet6.ip6.prefer_tempaddr=0

# Temporary address preferred lifetime
sysctl net.inet6.ip6.temppltime
# net.inet6.ip6.temppltime: 86400  ← 1 day (seconds)

# Temporary address valid lifetime
sysctl net.inet6.ip6.tempvltime
# net.inet6.ip6.tempvltime: 604800  ← 7 days (seconds)

# Change preferred lifetime to 6 hours
sudo sysctl -w net.inet6.ip6.temppltime=21600
```

## System Settings (macOS Ventura and later)

```text
Graphical configuration in macOS:

1. Open System Settings → Network
2. Select your network interface (Wi-Fi or Ethernet)
3. Click "Details..."
4. Select "TCP/IP" tab
5. Under "Configure IPv6":
   - "Automatically" = SLAAC (default)
   - "Link-local only" = link-local address only, no global
   - "Manually" = static IPv6 configuration
   - "Off" = disable IPv6 (if shown for that network service)

For Automatic:
  macOS uses SLAAC when RA Prefix Information has the Autonomous (A) flag
  If RA has O flag: DHCPv6 may provide other configuration such as DNS
  If RA has M flag: DHCPv6 may provide addresses; SLAAC still depends on the A flag
```

## Forcing SLAAC Refresh on macOS

```bash
# Method 1: Recreate a temporary automatic IPv6 service with ipconfig
# (debug/temporary; not a persistent System Settings change)
sudo ipconfig set en0 AUTOMATIC-V6

# Method 2: Turn interface off and on
# Using networksetup:
sudo networksetup -setv6off "Wi-Fi"
sleep 2
sudo networksetup -setv6automatic "Wi-Fi"

# Method 3: Send Router Solicitation manually (requires ndisc6)
# brew install ndisc6
sudo rdisc6 en0

# Method 4: Using scutil to trigger renew
# scutil --set IPv6Configuration ...
# (complex, prefer other methods)

# Verify new addresses after refresh
ifconfig en0 inet6
```

## Troubleshooting SLAAC on macOS

```bash
# Problem: No SLAAC global address

# Check 1: Is IPv6 set to Automatic?
networksetup -getinfo "Wi-Fi" | grep IPv6

# Check 2: Are RA messages arriving?
# Use tcpdump to capture RAs
sudo tcpdump -i en0 -v "icmp6 and ip6[40] == 134"
# If no output: RA not being sent by router (check router config)

# Check 3: Is there a link-local address?
ifconfig en0 inet6 | grep "fe80"
# Must have link-local before SLAAC can work
# Link-local is generated independently of RA

# Check 4: Check system log for IPv6 events
log show --predicate 'process == "configd" AND messageType == "error"' \
    --last 10m | grep -i ipv6

# Check 5: Verify network prefix is /64
# SLAAC only works with /64 prefixes
# /128, /48, etc. will not trigger SLAAC

# Check 6: Check if the network service itself is disabled
networksetup -getnetworkserviceenabled "Wi-Fi"
```

## Reading macOS IPv6 Address Details

```bash
# Detailed IPv6 address information
ifconfig en0 | grep "inet6"

# Address types:
# "autoconf" = SLAAC-generated
# "secured" = stable CGA-based address (RFC 3972 on Apple platforms)
# "temporary" = random privacy extensions (RFC 8981)
# "deprecated" = preferred lifetime expired

# Check address lifetimes
# macOS doesn't show lifetimes in ifconfig by default
ifconfig -L en0 inet6

# Show full IPv6 info
ipconfig getsummary en0        # IPConfiguration state summary
ipconfig getra en0             # Latest accepted Router Advertisement
ipconfig getv6packet en0       # Latest DHCPv6 packet, if DHCPv6 is active
```

## Conclusion

macOS configures SLAAC automatically with privacy extensions enabled by default (`use_tempaddr=1`, `prefer_tempaddr=1`). Both stable CGA-based addresses (marked "secured") and temporary addresses are generated. Use `sudo networksetup -setv6automatic` to ensure SLAAC is configured, and `ifconfig en0 inet6` to verify addresses were received. For troubleshooting, use tcpdump to verify RA messages are arriving and `networksetup -getinfo` to check the configuration method. Privacy extensions can be controlled via sysctl `net.inet6.ip6.use_tempaddr` and `net.inet6.ip6.prefer_tempaddr`.
