# How to Understand the ORCHIDv2 Address Space (2001:20::/28) - 200120

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, ORCHIDv2, Cryptographic Hash, RFC 7343, Networking

Description: Understand the ORCHIDv2 address space 2001:20::/28 (RFC 7343) used for Overlay Routable Cryptographic Hash IDentifiers in overlay networks.

## Introduction

ORCHIDv2 (Overlay Routable Cryptographic Hash IDentifiers version 2), defined in RFC 7343, uses the `2001:20::/28` prefix to create endpoint identifiers that are derived from public keys rather than topological location. They are used in HIP (Host Identity Protocol) and overlay networks.

## ORCHIDv2 Structure

```text
2001:20::/28 - ORCHIDv2 prefix
  Prefix: 2001:20:: (28 bits)
  Suffix: 4-bit OGA ID + 96-bit hash output (Encode_96)

Format:
  |  28-bit prefix  |  4-bit OGA ID  |    96-bit hash    |
  |  2001:20::/28   |   algorithm    |  Encode_96(Hash)  |
```

## Generating an ORCHIDv2 Address

```python
import hashlib
import ipaddress
import os

def generate_orchidv2(public_key: bytes,
                      context_id: bytes = None,
                      oga_id: int = 0) -> str:
    """
    Generate an ORCHIDv2 address from a public key.
    RFC 7343 §2 (Cryptographic Hash Identifier Construction).
    The Context ID is allocated per protocol (e.g., HIPv2 in RFC 7401);
    RFC 7343 itself defines no specific value.
    """
    if context_id is None:
        # Placeholder 128-bit Context ID for illustration only.
        # Real deployments use the value defined by their protocol.
        context_id = bytes.fromhex(
            "f0eff02fbff43d0fe7930c3c6e6174ea"
        )

    # Hash input: Context ID || Input
    hash_input = context_id + public_key
    hash_value = hashlib.sha256(hash_input).digest()

    # Encode_96: extract the middle 96 bits of the hash (RFC 7343 §2).
    # SHA-256 -> 32 bytes; middle 12 bytes are bytes [10:22].
    hash_96 = int.from_bytes(hash_value[10:22], 'big')

    # ORCHIDv2 prefix: 2001:20::/28
    prefix_int = int(ipaddress.IPv6Address("2001:20::"))
    # Keep only the 28 prefix bits, then add 4-bit OGA ID + 96-bit hash.
    orchid_int = (
        (prefix_int & ~((1 << 100) - 1))
        | ((oga_id & 0xF) << 96)
        | hash_96
    )

    return str(ipaddress.IPv6Address(orchid_int))

# Example

pubkey = os.urandom(32)  # Simulated public key
orchid = generate_orchidv2(pubkey)
print(f"ORCHIDv2: {orchid}")
```

## Use Cases

- **HIP (Host Identity Protocol)**: Endpoint identifiers independent of network location
- **P2P overlays**: Stable identifiers for distributed hash tables
- **Mobile networks**: Identity-based addressing for mobile hosts

## Filtering

```bash
# ORCHIDv2 should not appear in production routing
ip6tables -A FORWARD -s 2001:20::/28 -j DROP
ip6tables -A FORWARD -d 2001:20::/28 -j DROP
```

## Conclusion

ORCHIDv2 addresses provide cryptographically derived identifiers for overlay networks. They are not meant for standard IPv6 routing. Filter `2001:20::/28` at network boundaries and monitor with OneUptime to detect any unexpected traffic.
