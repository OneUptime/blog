# How to Understand IPv4-Compatible IPv6 Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPv4, Transition Mechanisms, RFC 4291, Networking

Description: Understand IPv4-compatible IPv6 addresses, why they were deprecated, how they differ from IPv4-mapped addresses, and what transition mechanisms replaced them.

## Introduction

IPv4-compatible IPv6 addresses (`::w.x.y.z` or `::0:w.x.y.z/96`) were an early IPv6 transition mechanism defined in RFC 1884 (later updated by RFC 2373). They embedded an IPv4 address in the lower 32 bits of an IPv6 address with all other bits set to zero. While now deprecated by RFC 4291, they appear in legacy documentation and are important to understand for historical context.

## Address Structure

```yaml
|<-------------- 96 bits of zeros ------------->|<-- 32 bits -->|
|  0000:0000:0000:0000:0000:0000                 |  IPv4 address |

Example:
IPv4:  192.0.2.1
IPv4-compatible IPv6: ::192.0.2.1  (or equivalently ::c000:0201)

Full 128-bit representation:
0000:0000:0000:0000:0000:0000:c000:0201
```

## IPv4-Compatible vs IPv4-Mapped

These two address types are easily confused:

| Property | IPv4-Compatible | IPv4-Mapped |
|---|---|---|
| Prefix | `::w.x.y.z` (all zeros) | `::ffff:w.x.y.z` |
| 80-bit prefix | All zeros | All zeros |
| Bits 81-96 | `0x0000` | `0xFFFF` |
| Status | **Deprecated** (RFC 4291) | Active, widely used |
| Use case | Obsolete automatic tunneling | Dual-stack sockets |

```python
import ipaddress

# IPv4-compatible (DEPRECATED - all zeros in bits 81-96)

compat = ipaddress.IPv6Address("::192.0.2.1")
print(f"IPv4-compatible: {compat}")
print(f"Mapped IPv4 view: {compat.ipv4_mapped}")  # None
# Python treats ::w.x.y.z as a regular IPv6 address

# IPv4-mapped (still used)
mapped = ipaddress.IPv6Address("::ffff:192.0.2.1")
print(f"IPv4-mapped: {mapped}")
print(f"IPv4 address: {mapped.ipv4_mapped}")  # 192.0.2.1
```

## Why IPv4-Compatible Addresses Were Deprecated

IPv4-compatible addresses were designed for the automatic tunneling mechanism described in RFC 2893, where the IPv4 tunnel endpoint was derived from the embedded IPv4 address in the IPv6 destination.

**Problems that led to deprecation:**
1. Required every IPv4 host to also run IPv6, which never happened at scale
2. Created security issues - any IPv4 host could send IPv6 packets to any other IPv4 host
3. The `::/96` space also contains the IPv6 unspecified address (`::`) and loopback (`::1`), so implementations had to treat those as special cases
4. Later mechanisms such as 6to4 and ISATAP handled tunneling differently, while NAT64/DNS64 addressed IPv6-only to IPv4-only communication without using IPv4-compatible addresses

## Later Transition Mechanisms

What replaced IPv4-compatible addresses:

**6to4 (RFC 3056)**: Uses the `2002::/16` prefix with the IPv4 address embedded in bits 17-48:
```text
IPv4: 198.51.100.1 → 6to4: 2002:c633:6401::/48
```

**ISATAP (RFC 5214)**: Intra-site tunneling using interface identifiers such as `::0:5efe:w.x.y.z` (or `::200:5efe:w.x.y.z` when the embedded IPv4 address is globally unique).

**NAT64 + DNS64 (RFC 6146)**: Translates between IPv6-only clients and IPv4-only servers, a common modern approach.

## Identifying Legacy IPv4-Compatible Addresses

```python
# Python: detect an IPv4-compatible address
def is_ipv4_compatible(addr_str):
    """
    Returns True if addr is an IPv4-compatible IPv6 address.
    These have the format ::w.x.y.z with all-zero prefix (no 0xFFFF).
    """
    try:
        addr = ipaddress.IPv6Address(addr_str)
        addr_int = int(addr)
        # Check: upper 96 bits must be all zeros
        # AND it must not be ::1 (loopback) or :: (unspecified)
        upper_96 = addr_int >> 32
        lower_32 = addr_int & 0xFFFFFFFF
        if upper_96 == 0 and lower_32 != 0 and lower_32 != 1:
            return True
        return False
    except ValueError:
        return False

print(is_ipv4_compatible("::192.0.2.1"))   # True (deprecated)
print(is_ipv4_compatible("::ffff:192.0.2.1"))  # False (this is mapped)
print(is_ipv4_compatible("::1"))              # False (loopback)
```

## Legacy System Considerations

If you encounter IPv4-compatible addresses in legacy configurations:

```bash
# Old Cisco IOS syntax for 6to4 (not IPv4-compatible)
# interface Tunnel0
#  no ip address
#  ipv6 address 2002:c633:6401::1/64
#  tunnel source GigabitEthernet0/0/0
#  tunnel mode ipv6ip 6to4

# Wireshark display filter to catch IPv4-compatible packets (rare)
# (ipv6.src > ::1 and ipv6.src < ::1:0:0) or (ipv6.dst > ::1 and ipv6.dst < ::1:0:0)

# Check for configured addresses in the deprecated ::/96 range
# (If you only see ::1/128, that's just loopback.)
ip -6 addr show to ::/96
```

## Conclusion

IPv4-compatible IPv6 addresses are a deprecated relic of early IPv6 transition planning. While unlikely to be encountered in modern deployments, understanding them prevents confusion when reading older RFCs and network documentation. Today, IPv4-mapped addresses (`::ffff:/96`) serve the dual-stack socket role, and NAT64/DNS64 handles IPv6-only to IPv4-only communication without embedding IPv4 in IPv6 addresses.
