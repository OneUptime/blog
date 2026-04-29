# How to Understand the IPv6 Unspecified Address (::/128)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Unspecified Address, ::, RFC 4291, Networking, Wildcard

Description: Understand the IPv6 unspecified address ::/128, its role as a source address during initialization, and how it differs from the wildcard bind address.

## Introduction

The IPv6 unspecified address `::` (or `::/128`) serves as a placeholder when a device has no assigned IPv6 address yet. It can appear as a source address during early IPv6 initialization, most notably during Duplicate Address Detection (DAD), before a usable address is available.

## Key Properties

| Property | Value |
|---|---|
| Address | :: |
| Prefix | ::/128 |
| IPv4 equivalent | 0.0.0.0 |
| Can be source? | Yes (only during initialization) |
| Can be destination? | No |
| Forwardable | No |
| Globally reachable | No |

## Uses of the Unspecified Address

### 1. Neighbor Solicitation for DAD

During Duplicate Address Detection, a node uses `::` as the source before the tentative address is confirmed.

```bash
# Capture DAD Neighbor Solicitations (source = ::)
sudo tcpdump -i eth0 -n "icmp6 and src host :: and dst net ff02::1:ff00:0/104"

# More general filter: any ICMPv6 packet sourced from ::
sudo tcpdump -i eth0 -n "icmp6 and src host ::"
```

### 2. DHCPv6 Uses Link-Local, Not ::

Unlike DAD, DHCPv6 clients normally use a link-local source address in initial Solicit messages rather than `::`.

```bash
# Capture initial DHCPv6 Solicit packets
# Source is typically link-local (fe80::/10), destination is ff02::1:2:547
sudo tcpdump -i eth0 -n \
  "udp src port 546 and udp dst port 547 and src net fe80::/10 and dst host ff02::1:2"
```

### 3. Wildcard Bind Address

`::` as a socket bind address means "all IPv6 interfaces" (wildcard). This is NOT the same as the unspecified address semantically.

```python
import socket

# Wildcard bind - listens on ALL IPv6 interfaces
server = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
server.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)

# Bind to :: = listen on all interfaces (wildcard)
server.bind(("::", 8080, 0, 0))
server.listen(5)
print("Listening on all IPv6 interfaces on port 8080")

# Note: when IPV6_V6ONLY = 0 on a platform that supports dual-stack IPv6 sockets,
# "::" also accepts IPv4 connections via IPv4-mapped IPv6 addresses (::ffff:x.x.x.x)
```

### IPv6-Only vs Dual-Stack Wildcard Bind

```python
import socket

def create_server(port: int, ipv6_only: bool = True):
    """
    Create server with clear IPv6 binding semantics.
    """
    server = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

    if ipv6_only:
        # IPv6 only - :: only matches IPv6 connections
        server.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 1)
    else:
        # Dual-stack where supported - :: also accepts IPv4 via IPv4-mapped
        server.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)

    server.bind(("::", port, 0, 0))
    server.listen(128)
    return server
```

## The Unspecified Address in Routing

```bash
# ::/0 is the default IPv6 route (not the unspecified address)
# This is different from ::/128
ip -6 route show default
# default via fe80::1 dev eth0

# RFC 4291 forbids using :: as a destination address
# ::/128 names the unspecified address; ::/0 is the default-route prefix
```

## Distinguishing :: from ::1 and ::/0

```python
import ipaddress

addr = ipaddress.IPv6Address("::")

print(f"Is unspecified: {addr.is_unspecified}")  # True
print(f"Is loopback:    {addr.is_loopback}")     # False
print(f"Is global:      {addr.is_global}")       # False

# Default route prefix
default_route = ipaddress.IPv6Network("::/0")
print(f":: is in ::/0: {addr in default_route}")  # True
print(f"All addresses are in ::/0: "
      f"{ipaddress.IPv6Address('2001:db8::1') in default_route}")  # True
```

## Application Validation

```python
import ipaddress

def is_valid_peer_address(addr: str) -> bool:
    """
    Return False if the address is the unspecified address
    (unsuitable as a peer or destination address).
    """
    try:
        a = ipaddress.ip_address(addr)
        if a.is_unspecified:
            return False  # :: is not a valid peer
        if a.is_loopback:
            return False  # ::1 is loopback only
        return True
    except ValueError:
        return False
```

## Conclusion

The IPv6 unspecified address `::` plays a specific protocol role during address initialization. When used as a socket bind address (wildcard), it means "all interfaces" - a semantically different use. Applications must not use `::` as a destination or peer address. Use OneUptime's validation checks to detect services inadvertently binding to `::` in production when `::1` was intended.
