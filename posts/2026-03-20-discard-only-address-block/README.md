# How to Understand the Discard-Only Address Block (100::/64)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DISCARD, Blackhole, 100::/64, RFC 6666, Networking

Description: Understand the Discard-Only Address Block 100::/64 (RFC 6666), its role as a remote-triggered blackhole target, and how to use it for traffic discarding.

## Introduction

`100::/64` is the IPv6 Discard-Only Address Block defined in RFC 6666. Addresses in this range are intended for use as discard next-hops in Remote Triggered Black Hole (RTBH) filtering. Unlike IPv6's dedicated discard block, operators have historically used various IPv4 addresses for RTBH, often drawn from private or documentation space. It is forwardable but not globally reachable.

## Key Properties

| Property | Value |
|---|---|
| Prefix | 100::/64 |
| RFC | RFC 6666 |
| Forwardable | Yes (used for RTBH) |
| Globally Reachable | No |
| Source | True (allowed, but unusual) |
| Destination | True (valid as an RTBH destination) |

## Remote Triggered Black Hole (RTBH) Filtering

```bash
# The typical RTBH use case:

# 1. Install a blackhole route to 100::/64 on participating routers
ip -6 route add blackhole 100::/64

# 2. When under DDoS, advertise the attacked prefix with a next-hop inside 100::/64
# Traffic matching that route is then discarded by the installed blackhole route

# Example: attacker targets 2001:db8::100/128
# BGP RTBH: advertise 2001:db8::100/128 → next-hop 100::1
```

## Python: Detect Discard-Only Addresses

```python
import ipaddress

DISCARD_BLOCK = ipaddress.IPv6Network("100::/64")

def is_discard_only(addr_str: str) -> bool:
    """Return True if address is in the Discard-Only block."""
    try:
        addr = ipaddress.IPv6Address(addr_str)
        return addr in DISCARD_BLOCK
    except ValueError:
        return False

# Tests
print(is_discard_only("100::1"))        # True
print(is_discard_only("100::ffff"))     # True
print(is_discard_only("100::"))         # True
print(is_discard_only("100:0:0:1::"))   # False (different /64)
print(is_discard_only("::1"))           # False
```

## Router Configuration for RTBH

```bash
# Cisco IOS-XR: null route for RTBH
router static
 address-family ipv6 unicast
  100::/64 null 0

# Juniper Junos
set routing-options rib inet6.0 static route 100::/64 discard

# Linux
ip -6 route add blackhole 100::/64

# FRR
ipv6 route 100::/64 Null0

# BGP RTBH trigger (RFC 7999 BLACKHOLE community)
# 65535:666 is the well-known BLACKHOLE community.
# Receiving routers apply local policy to discard traffic for the tagged prefix;
# NO_EXPORT or NO_ADVERTISE is often added to limit propagation.
```

## Firewall Rules

```bash
# Block inbound traffic FROM 100::/64 (spoofed source)
ip6tables -A INPUT -s 100::/64 -j DROP

# Block outbound traffic TO 100::/64 (misconfiguration protection)
ip6tables -A OUTPUT -d 100::/64 -j DROP
```

## Distinguishing from Documentation and Loopback

```python
import ipaddress

special = {
    "100::/64": "Discard-Only (RFC 6666)",
    "100:0:0:1::/64": "NOT Discard-Only (out of range)",
    "::1/128": "Loopback",
    "2001:db8::/32": "Documentation",
}

for addr, expected in special.items():
    net = ipaddress.IPv6Network(addr, strict=False)
    in_discard = net.subnet_of(ipaddress.IPv6Network("100::/64")) if net.prefixlen >= 64 else False
    print(f"{addr}: discard={in_discard} ({expected})")
```

## Conclusion

`100::/64` is a dedicated IPv6 discard block primarily used for RTBH filtering. Routers participating in an RTBH design typically install a discard or null route for this prefix. In BGP deployments, RTBH communities can trigger local policy that discards attack traffic network-wide. Monitor your BGP RTBH activations with OneUptime to track DDoS mitigation events.
