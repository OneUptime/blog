# How to Understand IPv6 Link-Local Addresses (fe80::/10)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Link-Local, Networking, Addressing, NDP, Router Discovery

Description: Understand IPv6 link-local addresses (fe80::/10), how they are automatically generated, their scope limitations, zone IDs, and their role in Neighbor Discovery and router discovery.

## Introduction

IPv6 link-local addresses are automatically assigned to every IPv6-enabled interface as soon as the protocol is enabled. They exist only within a single network segment (link) and are never forwarded by routers, making them essential for bootstrapping IPv6 communication.

## Properties of Link-Local Addresses

```text
Prefix:     fe80::/10
Range:      fe80:: to febf::
Scope:      Link-only - NOT routable across subnets
Auto-assign: Mandatory on every IPv6 interface
Uniqueness: Unique per link (not globally unique)

Full example: fe80::1a2b:3cff:fe4d:5e6f
```

## How Link-Local Addresses Are Generated

```bash
# Modified EUI-64 from MAC address (RFC 4291 Appendix A)

# MAC:    00:1a:2b:3c:4d:5e
# Step 1: Split into two halves: 00:1a:2b | 3c:4d:5e
# Step 2: Insert ff:fe in the middle: 00:1a:2b:ff:fe:3c:4d:5e
# Step 3: Flip bit 6 of first byte: 00 → 02
# Result: 02:1a:2b:ff:fe:3c:4d:5e
# Interface ID: 021a:2bff:fe3c:4d5e
# Link-local:   fe80::021a:2bff:fe3c:4d5e
#             = fe80::21a:2bff:fe3c:4d5e (leading zero dropped)
```

```bash
# View link-local on Linux
ip -6 addr show | grep "fe80"

# Example output:
# inet6 fe80::21a:2bff:fe3c:4d5e/64 scope link

# View on macOS
ifconfig en0 | grep "fe80"
```

## Zone ID (Interface Scope)

Link-local addresses are ambiguous across interfaces - the same `fe80::1` could exist on `eth0` and `eth1`. A zone ID (interface name or number) disambiguates them:

```bash
# Linux - zone ID with %interface
ping6 fe80::21a:2bff:fe3c:4d5e%eth0
ping6 fe80::1%eth1

# In URLs the % must be percent-encoded as %25 (RFC 6874)
http://[fe80::1%25eth0]:8080/

# In Python sockets
import socket
addr = ("fe80::1%eth0", 8080, 0, 0)
sock.connect(addr)
```

## Key Uses of Link-Local Addresses

```text
1. Neighbor Discovery Protocol (NDP)
   - Neighbor Solicitation/Advertisement
   - All NDP traffic uses link-local source addresses
   - Source: fe80::host-id
   - Destination: ff02::1:ff<last 24 bits> (solicited-node multicast)

2. Router Discovery (SLAAC)
   - Routers send Router Advertisements from fe80:: address
   - Hosts send Router Solicitations to ff02::2 (all-routers multicast)

3. Routing Protocol Next-Hops (OSPFv3, RIPng, BGP)
   - Next-hop in routes is often the router's link-local address
   - ip -6 route show → next-hop is fe80::router-id%eth0

4. Default Gateway Discovery
   - After SLAAC: default route via fe80::router-id
```

## Verify Link-Local Routing

```bash
# Show IPv6 routing table with link-local next-hops
ip -6 route show

# Example:
# default via fe80::1 dev eth0 proto ra metric 100 expires 1795sec
# 2001:db8::/64 dev eth0 proto kernel scope link src 2001:db8::2

# DHCPv6 - identify server from link-local source
tcpdump -i eth0 -n 'ip6 and udp and (port 546 or port 547)'
```

## Static Link-Local Address

```bash
# Assign a static link-local (useful for consistent router addressing)
sudo ip -6 addr add fe80::1/64 dev eth0 scope link
```

## Check Link-Local in Python

```python
import ipaddress

def is_link_local(addr: str) -> bool:
    return ipaddress.IPv6Address(addr.split('%')[0]).is_link_local

print(is_link_local("fe80::1"))         # True
print(is_link_local("fe80::1%eth0"))    # True (zone stripped)
print(is_link_local("2001:db8::1"))     # False
print(is_link_local("fd00::1"))         # False
```

## Conclusion

IPv6 link-local addresses (`fe80::/10`) are automatically assigned to every IPv6 interface and are essential for Neighbor Discovery, Router Advertisements, and routing protocol next-hops. They are never routed beyond the local link. When using link-local addresses in applications or commands, always include the zone ID (`%interface`) to specify which interface to use when the same link-local address exists on multiple interfaces.
