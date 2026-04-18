# How to Understand IPv6 Global Unicast Addresses (2000::/3)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Global Unicast, Networking, Addressing, Routing, Fundamentals

Description: Understand the structure of IPv6 global unicast addresses (2000::/3), including the routing prefix, subnet ID, interface ID, SLAAC, EUI-64, and how they differ from IPv4 public addresses.

## Introduction

IPv6 global unicast addresses (GUA) are the internet-routable IPv6 addresses analogous to IPv4 public addresses. The current allocation is from `2000::/3` (addresses starting with binary `001`), though `2000::/3` technically covers more than what is currently assigned.

## GUA Address Structure

```text
Global Unicast Address = /48 routing prefix + /16 subnet ID + /64 interface ID

Example: 2001:0db8:1234:0001:0200:5eff:fe00:5234/64
         └──────────┘└────┘└────────────────────┘
         Routing prefix  Subnet  Interface ID
         (ISP assigns)    (site)  (host-assigned)

Bits:  48 bits routing prefix + 16 bits subnet + 64 bits interface ID = 128
```

## Real-World GUA Allocation

```text
IANA assigns to RIRs:        2001::/16, 2600::/12, etc.
RIR assigns to ISPs:         2001:db8::/32 (example documentation prefix)
ISP assigns to customers:    2001:db8:1234::/48
Customer divides into:       2001:db8:1234:0001::/64
                             2001:db8:1234:0002::/64
                             (65,536 possible /64 subnets per /48)
```

## Interface ID Assignment Methods

### SLAAC (Stateless Address Autoconfiguration)

```bash
# Router advertises the /64 prefix

# Host generates Interface ID automatically using:

# Method 1: EUI-64 (from MAC address)
# MAC: 00:1a:2b:3c:4d:5e
# EUI-64: 02:1a:2b:ff:fe:3c:4d:5e (insert fffe, flip bit 6)
# Result: 2001:db8:1234:1:021a:2bff:fe3c:4d5e

# Method 2: Privacy extensions (random, RFC 4941) - preferred
# Result: 2001:db8:1234:1:a3f2:b789:1234:5678 (random)
```

### Static Assignment

```bash
# Linux - assign static GUA
sudo ip -6 addr add 2001:db8:1234:1::10/64 dev eth0
sudo ip -6 route add default via 2001:db8:1234:1::1

# Verify
ip -6 addr show eth0
ip -6 route show default
```

## GUA vs Unique Local Unicast

```text
Global Unicast (GUA):          Unique Local Unicast (ULA):
  Prefix:  2000::/3              Prefix:  fc00::/7 (fd00::/8 in practice)
  Scope:   Global internet       Scope:   Organization-internal only
  Routing: Globally routable     Routing: NOT globally routable
  Analogy: IPv4 public IP        Analogy: RFC 1918 private IP (10.x, 192.168.x)
  Use:     Internet access       Use:     Internal LAN communication
```

## Subnetting a /48 Allocation

```python
import ipaddress

prefix = ipaddress.IPv6Network("2001:db8:1234::/48")
print(f"Prefix: {prefix}")
print(f"Subnets available (/64): {2**(64-48):,}")  # 65,536

# First few /64 subnets
for i, subnet in enumerate(prefix.subnets(new_prefix=64)):
    if i >= 5:
        break
    print(f"  Subnet {i+1}: {subnet}")
```

## Verify GUA from ISP

```bash
# Linux - show all IPv6 addresses
ip -6 addr show

# Show only global scope addresses
ip -6 addr show scope global

# Test internet reachability
ping6 2001:4860:4860::8888  # Google IPv6 DNS
```

## Conclusion

IPv6 global unicast addresses follow a hierarchical structure: /48 for site allocation, /64 for each subnet, and 64 bits for the interface ID. Interface IDs are assigned via SLAAC (EUI-64 or privacy extensions) or statically. GUAs from `2000::/3` are globally routable; use unique-local addresses (`fd00::/8`) for internal-only communication equivalent to IPv4 RFC 1918.
