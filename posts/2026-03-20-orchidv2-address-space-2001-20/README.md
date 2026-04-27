# How to Understand the ORCHIDv2 Address Space (2001:20::/28)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, ORCHIDv2, 2001:20::/28, RFC 7343, Cryptographic, HIP

Description: Understand the ORCHIDv2 address space 2001:20::/28 (RFC 7343), its use for Host Identity Protocol cryptographic identifiers, and why it appears in some environments.

## Introduction

`2001:20::/28` is the ORCHIDv2 (Overlay Routable Cryptographic Hash Identifiers version 2) address space defined in RFC 7343. These addresses are derived from cryptographic hashes and used by the Host Identity Protocol (HIP). They are not routable on the public internet and serve as stable identifiers independent of network topology.

## Key Properties

| Property | Value |
|---|---|
| Prefix | 2001:20::/28 |
| RFC | RFC 7343 (obsoletes RFC 4843) |
| Source | True |
| Destination | True |
| Forwardable | True |
| Globally Reachable | True |
| Reserved-by-Protocol | False |

## What is HIP?

Host Identity Protocol (HIP) separates the host identity from its network location:
- **Host Identity (HI)**: A cryptographic public key that uniquely identifies a host
- **ORCHID**: A 128-bit hash derived from the HI, used as an IPv6 address
- **Locator**: The regular IPv6 address used for actual routing

```text
Traditional IPv6:
  address = identity + location  (both in one address)

HIP with ORCHIDv2:
  ORCHID = identity (cryptographic hash, 2001:20::/28)
  IPv6 address = location (changes when host moves)
```

## ORCHID Address Generation

```python
import hashlib
import ipaddress
import struct

ORCHID_PREFIX = 0x2001  # First 16 bits
ORCHID_PREFIX_BITS = 28  # /28

OGA_ID_HIP_SHA1 = 3  # HIPv2 OGA ID for truncated SHA-1 (RFC 7401)

def generate_orchid(context_id: bytes, input_bits: bytes, oga_id: int = OGA_ID_HIP_SHA1) -> str:
    """
    Generate an ORCHIDv2 address (RFC 7343).
    context_id: 128-bit context identifier (defined per usage context)
    input_bits: typically a Host Identity public key encoding
    oga_id: 4-bit ORCHID Generation Algorithm ID (per the context's registry)
    """
    # Hash Input = Context ID | Input
    hash_input = context_id + input_bits

    # ORCHIDv2 supports algorithm agility via the OGA ID. For HIPv2 with
    # OGA ID 3, the hash function is truncated SHA-1 (RFC 7401 Appendix E).
    sha1 = hashlib.sha1(hash_input).digest()  # 160 bits

    # Encode_96: extract the MIDDLE 96 bits of the hash output (RFC 7343 §2).
    # For a 160-bit SHA-1 digest, drop 32 bits from each end → bytes [4:16].
    hash_96 = int.from_bytes(sha1[4:16], 'big')

    # ORCHID := Prefix (28 bits) | OGA ID (4 bits) | Encode_96(Hash) (96 bits)
    prefix_28 = 0x2001002            # 28-bit ORCHID prefix (2001:20::/28)
    prefix_oga = (prefix_28 << 4) | (oga_id & 0xF)  # 32-bit prefix||OGA
    orchid_int = (prefix_oga << 96) | hash_96

    return str(ipaddress.IPv6Address(orchid_int))

# HIPv2 ORCHID Context ID (RFC 7401 §3.2)

HIP_CONTEXT_ID = bytes.fromhex("F0EFF02FBFF43D0FE7930C3C6E6174EA")

# Simulate a host public key
fake_public_key = b"example-host-public-key-material-32b"

orchid = generate_orchid(HIP_CONTEXT_ID, fake_public_key)
print(f"Generated ORCHID: {orchid}")
print(f"In 2001:20::/28: {ipaddress.IPv6Address(orchid) in ipaddress.IPv6Network('2001:20::/28')}")
```

## Detecting ORCHIDv2 Addresses

```python
import ipaddress

ORCHID_BLOCK = ipaddress.IPv6Network("2001:20::/28")

def is_orchid(addr_str: str) -> bool:
    """Return True if address is an ORCHIDv2 address."""
    try:
        return ipaddress.IPv6Address(addr_str) in ORCHID_BLOCK
    except ValueError:
        return False

# Tests
print(is_orchid("2001:20::1"))          # True
print(is_orchid("2001:2f::1"))          # True (still in /28)
print(is_orchid("2001:30::1"))          # False (outside /28)
print(is_orchid("2001:2::/48"))         # False (benchmarking)
```

## Firewall Filtering

```bash
# ORCHID addresses should not appear in routing
# Block them at network boundaries
ip6tables -A FORWARD -s 2001:20::/28 -j DROP
ip6tables -A FORWARD -d 2001:20::/28 -j DROP
ip6tables -A INPUT -s 2001:20::/28 -j DROP
```

## Conclusion

ORCHIDv2 addresses (`2001:20::/28`) are cryptographic host identifiers used by the Host Identity Protocol. They are not routable and should be filtered at network boundaries. If you see ORCHID addresses in traffic logs, it may indicate HIP-capable applications or misconfiguration. Monitor for unexpected ORCHID traffic with OneUptime security monitoring.
