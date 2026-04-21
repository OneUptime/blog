# Temporary vs Stable IPv6 Addresses Explained

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Privacy Extensions, Temporary Address, Stable Address, RFC 8981, RFC 7217

Description: A comprehensive guide to understanding the difference between temporary and stable IPv6 addresses, when each is used, their lifecycle, and how operating systems use them for privacy and reliability.

Modern operating systems assign multiple IPv6 addresses to each interface simultaneously: temporary addresses for outbound privacy and stable addresses for reliable inbound connectivity. Understanding the difference and purpose of each type is essential for correctly configuring IPv6 deployments.

## The Two Address Types

```text
IPv6 Global Address Types on a Client Interface:
│
├── Stable/template Address (Linux may show mngtmpaddr)
│   ├── Purpose: Inbound connections, server-reachable identity
│   ├── Interface ID: Derived from RFC 7217 (stable-privacy) or EUI-64
│   ├── Lifetime: Long (days to weeks, from RA preferred lifetime)
│   ├── Rotation: Changes when the prefix/network or generation secret changes
│   └── Example: 2001:db8:abcd:1234:aabb:ccff:fedd:eeff/64
│
└── Temporary Address (RFC 8981)
    ├── Purpose: Outbound connections (privacy protection)
    ├── Interface ID: Randomly generated
    ├── Lifetime: Short (hours to 24 hours preferred lifetime)
    ├── Rotation: Periodically replaced by new temporary address
    └── Example: 2001:db8:abcd:1234:1234:5678:9abc:def0/64
```

## Lifecycle of Each Address Type

```bash
# Check address lifetimes on Linux

ip -6 addr show eth0

# Typical output showing both address types:
#
# inet6 2001:db8:abcd:1234:a1b2:c3d4:e5f6:7890/64 scope global temporary dynamic
#   valid_lft 79800sec preferred_lft 7800sec    ← Short preferred (rotation soon)
#
# inet6 2001:db8:abcd:1234:aabb:ccff:fedd:eeff/64 scope global dynamic mngtmpaddr
#   valid_lft 2591990sec preferred_lft 604790sec  ← Long preferred (stable)

# "preferred_lft" = still preferred for NEW outgoing connections
# "valid_lft" = still valid for packets and EXISTING connections
# When preferred_lft reaches 0, address becomes "deprecated"
# Deprecated address: normally avoided for new connections; existing continue until valid_lft = 0
```

## Address Selection Rules (RFC 6724)

The OS source address selection algorithm determines which address is used for outbound connections:

```bash
# Rule 7 in RFC 6724: Prefer temporary addresses for privacy
# When use_tempaddr = 2 (Linux) or privacy extensions enabled:
# - Outbound to external hosts: temporary address is usually chosen
# - Peer connections: temporary address is preferred when otherwise eligible

# Verify the selection
ip -6 route get 2001:4860:4860::8888 | grep "src"
# Should show temporary address as "src"

# On macOS:
# % route -n get -inet6 2001:4860:4860::8888
# Shows the selected IPv6 route/interface; use the curl test below to see the source address

# Test with actual outbound connection
curl -6 https://ipv6.icanhazip.com
# Returns the temporary address (what the server sees)
```

## Stable Address Use Cases

```bash
# When is the stable address used instead of temporary?

# 1. Inbound connections (server reaches back to you)
# If a server sends data to your temporary address and it has expired,
# the connection fails. Publish or configure callbacks using your stable address.

# 2. Server roles (when use_tempaddr = 0 or interface is a server)
# Web servers, SSH servers, databases - need stable address for DNS

# 3. Local network communication
# Link-local (fe80::) is not globally routable; its IID depends on OS/config
# For intranet services: stable address is appropriate

# 4. Some protocols that embed IP addresses
# SIP, FTP active mode - may need stable address for reverse connectivity
```

## Stable Privacy Addresses (RFC 7217)

RFC 7217 provides stable privacy addresses that don't expose the MAC address:

```bash
# Traditional EUI-64 stable address:
# MAC: 00:11:22:33:44:55 → Interface ID: 0211:22ff:fe33:4455
# Address: 2001:db8::211:22ff:fe33:4455
# PROBLEM: Reveals MAC address, consistent across all networks

# RFC 7217 stable privacy address:
# Interface ID = PRF(prefix, interface, network_id, DAD_counter, secret_key)
# Result is stable per {prefix, interface, network} combination
# BENEFIT: No MAC exposure, still stable per network

# Enable RFC 7217 on Linux (systemd-networkd)
# In /etc/systemd/network/eth0.network:
[Network]
IPv6AcceptRA=yes

[IPv6AcceptRA]
Token=prefixstable

# Enable RFC 7217 on Linux (NetworkManager, per connection)
CONNECTION="Wired connection 1"
nmcli connection modify "$CONNECTION" ipv6.addr-gen-mode stable-privacy
nmcli connection up "$CONNECTION"
```

## Comparing All Address Types

| Address Type | Interface ID Source | Stable Per Network | Globally Trackable |
|---|---|---|---|
| EUI-64 | MAC address | Yes | Yes (same across networks) |
| RFC 7217 stable-privacy | PRF(prefix+iface+network_id+DAD_counter+secret) | Yes | No |
| RFC 8981 temporary | Random | No (rotates) | No |
| Manual/Static | Operator configured | Yes | Depends on configuration |

## When Applications Should Use Stable vs Temporary

```python
# Python: Binding to the right address type

import socket

# For a SERVER (needs stable inbound connectivity):
# Bind to "::" - socket accepts traffic sent to any local IPv6 address
# Publish the stable address in DNS for reliable inbound reachability
server = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
server.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 1)
server.bind(('::', 8080))
server.listen(5)

# For a CLIENT (wants privacy for outbound):
# Connect to destination - OS chooses temporary address automatically
client = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
# Don't bind - let OS choose source address (usually temporary when preferred)
client.connect(('2001:4860:4860::8888', 53))

# To force using a specific address (e.g., stable for API keys):
# Replace these documentation addresses with addresses assigned in your network.
client.bind(('2001:db8:abcd:1234:aabb:ccff:fedd:eeff', 0))
client.connect(('2001:db8:abcd:1234::10', 443))
```

## Troubleshooting Address Type Issues

```bash
# Problem: Server can't be reached reliably
# Cause: DNS points to temporary address that expired
# Fix: Ensure DNS points to stable address, not temporary

# Identify which address is temporary vs stable
ip -6 addr show eth0 | grep -E "temporary|mngtmpaddr|valid_lft"

# For servers: disable temporary addresses
sysctl -w net.ipv6.conf.eth0.use_tempaddr=0

# Problem: Outbound connections don't use temporary address
# Check use_tempaddr is set to 2 (not 1)
sysctl net.ipv6.conf.eth0.use_tempaddr
sysctl net.ipv6.conf.all.use_tempaddr
# If it shows 1, change to 2:
sysctl -w net.ipv6.conf.eth0.use_tempaddr=2
sysctl -w net.ipv6.conf.all.use_tempaddr=2

# Problem: Too many IPv6 addresses on interface
# Old temporary addresses in "deprecated" state accumulate
# They disappear when valid_lft expires
# To clean up: flush deprecated addresses
ip -6 addr flush dev eth0 scope global deprecated
```

The interplay between temporary and stable IPv6 addresses is designed to provide both privacy and reliability: temporary addresses protect client privacy on outbound connections (what the world sees changes frequently), while stable addresses ensure inbound connectivity remains consistent. Correctly tuning these lifetimes and address selection preferences is key to a well-functioning dual-stack network.
