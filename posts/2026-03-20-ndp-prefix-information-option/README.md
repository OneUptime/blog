# How to Understand the Prefix Information Option in NDP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NDP, Prefix Information Option, IPv6, SLAAC, Router Advertisement

Description: Understand the NDP Prefix Information option structure, all its flags and lifetime fields, and how hosts use it for SLAAC address formation and on-link determination.

## Introduction

The Prefix Information option (Type 3) is the most important option in Router Advertisements for hosts performing SLAAC. It provides the IPv6 prefix, two flags (L for on-link, A for autonomous/SLAAC), and two lifetime values (Valid and Preferred). Hosts use this information to form SLAAC addresses and determine which destinations are on the local link.

## Prefix Information Option Format

```text
NDP Prefix Information Option (Type 3, Length = 4):

 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|     Type = 3  |    Length = 4 |  Prefix Length|L|A|R| Rsvd1  |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                         Valid Lifetime                        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                       Preferred Lifetime                      |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                           Reserved2                           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                            Prefix                             +
|                        (128 bits)                             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

Total: 32 bytes (Length=4 units of 8 bytes)
```

## Fields Explained

```text
Prefix Length (8 bits):
  Number of high-order bits in the Prefix that are valid
  Typically 64 (for SLAAC)
  MUST be 64 for SLAAC (A=1) per RFC 4862

L flag (On-Link, 1 bit):
  1 = Addresses in this prefix are on-link (directly reachable)
  0 = No on-link assertion (use routing table for on-link determination)
  Setting L=1 allows hosts to communicate directly without a router

A flag (Autonomous, 1 bit):
  1 = Hosts may form SLAAC address from this prefix
  0 = Do not form SLAAC address (use DHCPv6 if M=1 in RA)

R flag (Router Address, 1 bit):
  Used in Mobile IPv6 (RFC 6275, which obsoleted RFC 3775)
  1 = Prefix contains a complete router address in the Prefix field
  Generally 0 for non-Mobile-IPv6 deployments

Valid Lifetime (32 bits, seconds):
  Duration that the prefix is valid for on-link determination
  0xFFFFFFFF = infinity
  When expires: addresses formed from this prefix become INVALID

Preferred Lifetime (32 bits, seconds):
  Duration that SLAAC addresses are preferred for new connections
  Must be ≤ Valid Lifetime
  0xFFFFFFFF = infinity
  When expires: addresses become DEPRECATED (existing connections continue)
```

## Parsing and Building Prefix Information Options

```python
import struct
import socket
import ipaddress

def parse_prefix_information_option(data: bytes) -> dict:
    """Parse NDP Prefix Information option (Type 3)."""
    if len(data) < 32:
        raise ValueError("Prefix Information requires 32 bytes")

    opt_type = data[0]
    opt_len_units = data[1]
    prefix_length = data[2]
    flags = data[3]

    l_flag = bool(flags & 0x80)
    a_flag = bool(flags & 0x40)
    r_flag = bool(flags & 0x20)

    valid_lifetime, preferred_lifetime = struct.unpack_from("!II", data, 4)
    reserved2 = struct.unpack_from("!I", data, 12)[0]
    prefix = socket.inet_ntop(socket.AF_INET6, data[16:32])

    return {
        "prefix": f"{prefix}/{prefix_length}",
        "prefix_length": prefix_length,
        "L_on_link": l_flag,
        "A_autonomous": a_flag,
        "R_router_address": r_flag,
        "valid_lifetime": valid_lifetime,
        "valid_lifetime_days": valid_lifetime / 86400 if valid_lifetime != 0xFFFFFFFF else "infinity",
        "preferred_lifetime": preferred_lifetime,
        "preferred_lifetime_days": preferred_lifetime / 86400 if preferred_lifetime != 0xFFFFFFFF else "infinity",
    }

def build_prefix_information_option(
    prefix: str, prefix_length: int,
    l_flag: bool = True, a_flag: bool = True,
    valid_lifetime: int = 2592000,     # 30 days
    preferred_lifetime: int = 604800,  # 7 days
) -> bytes:
    """Build NDP Prefix Information option."""
    flags = 0
    if l_flag: flags |= 0x80
    if a_flag: flags |= 0x40

    prefix_bytes = socket.inet_pton(socket.AF_INET6, prefix)

    return struct.pack("!BBBBII I 16s",
        3,                  # Type
        4,                  # Length (4 units × 8 = 32 bytes)
        prefix_length,      # Prefix length
        flags,              # L, A, R flags
        valid_lifetime,
        preferred_lifetime,
        0,                  # Reserved2
        prefix_bytes
    )

# Test

option = build_prefix_information_option("2001:db8::", 64)
parsed = parse_prefix_information_option(option)
print(f"Prefix: {parsed['prefix']}")
print(f"On-link: {parsed['L_on_link']}, Autonomous: {parsed['A_autonomous']}")
print(f"Valid: {parsed['valid_lifetime_days']} days")
print(f"Preferred: {parsed['preferred_lifetime_days']} days")
```

## Conclusion

The Prefix Information option is the core of SLAAC address configuration. The L flag controls on-link prefix determination, the A flag enables SLAAC address formation, and the two lifetime values manage the address lifecycle. Prefix Length must be exactly 64 for SLAAC to work (so the interface identifier fills the low 64 bits). The combination of Valid and Preferred lifetimes enables graceful network renumbering by allowing deprecation of old addresses before they expire entirely.
