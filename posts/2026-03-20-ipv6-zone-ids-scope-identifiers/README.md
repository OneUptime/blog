# How to Use IPv6 Zone IDs and Scope Identifiers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Networking, Link-Local, Zone ID, Scope

Description: Learn how IPv6 zone IDs (scope identifiers) disambiguate link-local addresses when a host has multiple network interfaces, and how to use them in commands and applications.

## Introduction

IPv6 link-local addresses (fe80::/10) are not globally unique - the same address can exist on multiple interfaces simultaneously. When you have more than one network interface, the OS needs to know which interface to use when you target a link-local address. This is solved by **zone IDs** (also called scope identifiers).

## The Problem Zone IDs Solve

Consider a host with two interfaces:
- `eth0`: fe80::1%eth0
- `eth1`: fe80::1%eth1

Without a zone ID, `ping6 fe80::1` is ambiguous - the OS cannot know which interface to use. The zone ID appended with `%` disambiguates this.

## Zone ID Syntax

The zone ID is appended to an IPv6 address using the `%` character:

```text
<address>%<zone_id>

# Examples

fe80::1%eth0          # Linux/macOS: interface name
fe80::1%2             # Windows: interface index number
ff02::1%eth0          # Scoped multicast addresses can also use zone IDs
```

## Using Zone IDs in Commands

```bash
# Linux/macOS: use interface name as zone ID
ping6 fe80::1%eth0
ping6 fe80::aabb:ccdd:eeff%wlan0

# Windows: use interface index number
ping -6 fe80::1%12

# Find the interface index on Windows
netsh interface ipv6 show interfaces

# SSH to a link-local address (must specify interface)
ssh -6 user@fe80::1%eth0

# curl to a link-local address
curl -6 "http://[fe80::1%25eth0]:8080/"
# Note: %25 is URL-encoded % in the URL

# SCP using link-local with zone ID
scp -6 file.txt user@"[fe80::1%eth0]":/remote/path/
```

## Zone IDs in URLs

When a tool or API accepts a zone ID inside a bracketed IPv6 literal URL, it typically expects the `%` to be percent-encoded as `%25`. This RFC 6874-style syntax remains common in tools, but RFC 6874 was obsoleted by RFC 9844 in 2025, so support is not universal:

```text
# Correct URL format with zone ID
http://[fe80::1%25eth0]/
http://[fe80::1%25eth0]:8080/api/v1/

# Incorrect (raw % in URL is illegal)
http://[fe80::1%eth0]/   # WRONG - % must be encoded
```

```python
# Python: construct URL with zone ID correctly
import urllib.parse

def ipv6_url_with_zone(address, zone_id, port=None, path="/"):
    # Zone ID % must be encoded as %25 in URL
    encoded_zone = urllib.parse.quote(zone_id, safe="")
    encoded_addr = f"{address}%25{encoded_zone}"
    if port:
        host = f"[{encoded_addr}]:{port}"
    else:
        host = f"[{encoded_addr}]"
    return f"http://{host}{path}"

print(ipv6_url_with_zone("fe80::1", "eth0", 8080))
# Output: http://[fe80::1%25eth0]:8080/
```

## Discovering Zone IDs on Your System

```bash
# Linux: list all interfaces with their IPv6 addresses
ip -6 addr show

# macOS: list interfaces
ifconfig | grep -E "^[a-z]|inet6"

# Show only link-local addresses with their interfaces
ip -o -6 addr show scope link
# Output example:
# 2: eth0    inet6 fe80::a00:27ff:fe4e:66a1/64 scope link

# Get interface names with link-local addresses
ip -o -6 addr show scope link | awk '{print $2, $4}'
```

## Zone IDs in Application Code

```python
# Python socket: connect to link-local address with scope
import socket

# Parse an address string with zone ID
addr_with_zone = "fe80::1%eth0"
if "%" in addr_with_zone:
    addr, zone = addr_with_zone.split("%", 1)
    # Get the interface index from name
    scope_id = socket.if_nametoindex(zone)
else:
    addr = addr_with_zone
    scope_id = 0

# Connect using (address, port, flowinfo, scope_id)
sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
sock.connect((addr, 80, 0, scope_id))
```

## Common Pitfalls

1. **Forgetting the zone ID for link-local**: `ping6 fe80::1` without a zone ID will typically fail or be ambiguous when the interface is not otherwise implied.
2. **Using % directly in URLs**: Always encode as `%25` in URL contexts.
3. **Windows vs Linux**: Windows uses numeric interface indices; Linux and macOS use interface names.

## Conclusion

Zone IDs are a small but critical detail when working with IPv6 link-local addresses in multi-interface environments. Always include the zone ID when referencing `fe80::` addresses in commands, configuration files, and application code to ensure traffic goes out the correct interface.
