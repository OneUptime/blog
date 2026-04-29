# How to Understand Link-Local Addresses (fe80::/10) - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Link-Local, Fe80, RFC 4291, NDP, Networking

Description: Understand IPv6 link-local addresses (fe80::/10), how they are auto-generated, their scope limitations, and how to use them in applications with zone IDs.

## Introduction

Link-local addresses (fe80::/10) are IPv6 addresses that are valid only on a single network link. On enabled interfaces, they are typically auto-configured by combining the link-local prefix with an interface identifier. Historically this was often a modified EUI-64 derived from the MAC address, but modern systems may use a stable generated IID instead. They are used by NDP, DHCPv6, and routing protocols.

## Key Properties

- **Prefix**: fe80::/10 reserved block; auto-configured link-local addresses are normally formed from fe80::/64
- **Scope**: Link-local only (non-forwardable)
- **Auto-configured**: Yes, typically when IPv6 is enabled on an interface
- **Zone ID**: Usually required in applications and CLI tools to identify the interface

## How Link-Local Addresses Are Generated

```bash
# View auto-generated link-local on all interfaces

ip -6 addr show scope link

# One common IID form is Modified EUI-64 (from MAC address aa:bb:cc:dd:ee:ff):
# 1. Split MAC: aabb:cc / ddeeff
# 2. Insert 0xfffe: aabb:ccff:fedd:eeff
# 3. Flip Universal/Local bit (7th bit of first octet): aabb → a8bb
# fe80::a8bb:ccff:fedd:eeff

# On Linux, addr_gen_mode controls how link-local/autoconf IIDs are generated
sysctl net.ipv6.conf.eth0.addr_gen_mode  # 0=eui64, 2=stable_secret, 3=stable privacy with random secret
```

## Zone IDs in Applications

```python
import socket

# Zone ID (scope ID) disambiguates link-local addresses across interfaces
# Format: fe80::1%eth0 or fe80::1%1 (interface index)

# Get the interface index for eth0
iface_index = socket.if_nametoindex("eth0")

# Connect to a link-local address with zone ID
sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)

# Address tuple for IPv6: (addr, port, flowinfo, scope_id)
addr = ("fe80::1", 80, 0, iface_index)
sock.connect(addr)

# Some user interfaces also use the string form fe80::1%eth0
# but Python socket addresses carry the scope in the 4th tuple element
```

```bash
# CLI tools accept the % zone ID syntax
ping6 fe80::1%eth0
curl http://[fe80::1%25eth0]/   # %25 = URL-encoded %
ssh fe80::1%eth0

# With explicit interface binding
ping6 -I eth0 fe80::1
```

## Link-Local in Routing Protocols

```bash
# OSPFv3 uses link-local addresses as next-hops
ip -6 route show | grep "via fe80"
# 2001:db8::/32 via fe80::1 dev eth0 proto ospf metric 20

# MP-BGP may also include a link-local IPv6 next hop on a shared link,
# together with a global IPv6 next hop (RFC 2545)
```

## Filtering Link-Local

```bash
# Link-local should NEVER be forwarded between interfaces
ip6tables -A FORWARD -s fe80::/10 -j DROP
ip6tables -A FORWARD -d fe80::/10 -j DROP

# Allow link-local for local NDP and DHCPv6 client traffic
ip6tables -A INPUT -s fe80::/10 -p icmpv6 -j ACCEPT
ip6tables -A INPUT -s fe80::/10 -p udp --dport 546 -j ACCEPT
```

## Conclusion

Link-local addresses are fundamental to IPv6 operation - NDP, router discovery, and several routing protocols rely on them. When using link-local addresses in applications, always include the zone ID (interface scope). Never forward link-local traffic. Use OneUptime to monitor NDP health indirectly through neighbor table metrics.
