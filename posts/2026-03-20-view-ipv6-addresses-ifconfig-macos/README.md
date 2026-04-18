# How to View IPv6 Addresses with ifconfig on macOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, macOS, ifconfig, Network Diagnostics, Address Management

Description: Learn how to use ifconfig to view, interpret, and filter IPv6 address information on macOS, including scope, address types, and flags.

## Basic IPv6 Address Display

```bash
# Show all interfaces with all addresses

ifconfig

# Show a specific interface (en0 = Wi-Fi on most Macs)
ifconfig en0

# Show only inet6 lines for all interfaces
ifconfig | grep inet6

# Show inet6 for a specific interface
ifconfig en0 | grep inet6
```

## Understanding ifconfig inet6 Output

```bash
$ ifconfig en0

en0: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
    ...
    inet6 fe80::1234:5678:9abc:def0%en0 prefixlen 64 scopeid 0x4
    inet6 2001:db8::1234:5678:9abc:def0 prefixlen 64 autoconf
    inet6 2001:db8::a1b2:c3d4:e5f6:7890 prefixlen 64 autoconf temporary
    inet6 fd12:3456:789a::10 prefixlen 64
```

Address types explained:
- `fe80::...%en0 scopeid 0x4` - Link-local, `%en0` is zone ID (interface scoping)
- `2001:db8::... autoconf` - SLAAC-generated global address
- `2001:db8::... autoconf temporary` - RFC 4941 privacy extension address
- `fd12:3456:789a::10` - Static ULA address (no flags = static)

## ifconfig Flags for IPv6 Addresses

```bash
# Common flags shown after IPv6 addresses:
# autoconf           = assigned via SLAAC
# temporary          = RFC 4941 privacy extension address
# secured            = CGA (Cryptographically Generated Address)
# deprecated         = preferred_lft expired but valid_lft not expired
# dynamic            = assigned via DHCPv6
# tentative          = DAD in progress

# Examples:
ifconfig en0 | grep inet6 | grep autoconf      # SLAAC addresses
ifconfig en0 | grep inet6 | grep temporary     # Privacy extension addresses
ifconfig en0 | grep inet6 | grep deprecated    # Deprecated addresses
```

## Zone IDs (Interface Scope Identifiers)

```bash
# Link-local addresses require a zone ID for routing
# The %en0 suffix identifies the interface

# fe80::1234:5678%en0 means "link-local on en0"

# Use zone ID when pinging link-local addresses
ping6 fe80::1%en0

# Without zone ID, ping6 fails with:
# "ping6: UDP connect: No route to host"
```

## Filtering and Extracting IPv6 Addresses

```bash
# Show only global (non-link-local) IPv6 addresses
ifconfig | grep 'inet6' | grep -v 'fe80\|::1'

# Extract just the IP address (without prefix length)
ifconfig en0 | grep inet6 | awk '{print $2}' | cut -d'/' -f1 | cut -d'%' -f1

# Get the first non-link-local IPv6 address on en0
ifconfig en0 | grep 'inet6' | grep -v 'fe80\|%' | head -1 | awk '{print $2}'

# Show all interfaces that have global IPv6
ifconfig | grep -B 10 'inet6 2' | grep -E '^[a-z]|inet6 2'
```

## Viewing Routing Table for IPv6

```bash
# Show IPv6 routing table
netstat -rn -f inet6

# Show only default route
netstat -rn -f inet6 | grep default

# Trace route to an IPv6 destination (macOS uses traceroute6 for IPv6)
traceroute6 2001:4860:4860::8888
```

## Neighbor Cache (NDP)

```bash
# Show NDP neighbor cache (equivalent to IPv4 ARP)
ndp -a
# or
ndp -an   # numeric, no DNS resolution

# Filter neighbors by interface (ndp -a shows the cache for all interfaces)
ndp -a | grep en0
```

## Summary

Use `ifconfig en0 | grep inet6` to view IPv6 addresses on macOS. Address types: link-local (`fe80::%en0`), SLAAC global (`autoconf`), privacy extension (`temporary`), static (no special flag). Zone IDs (e.g., `%en0`) are required when routing to link-local addresses: `ping6 fe80::1%en0`. Extract just the IP with `awk '{print $2}'`. View the routing table with `netstat -rn -f inet6`.
