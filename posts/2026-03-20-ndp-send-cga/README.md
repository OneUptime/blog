# How to Understand SEND Cryptographically Generated Addresses (CGA)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SEND, CGA, Cryptographic Addresses, IPv6 Security, RFC 3972

Description: Understand how Cryptographically Generated Addresses (CGA) bind an IPv6 address to a public key, the CGA generation algorithm, and how CGAs prevent address spoofing in SEND.

## Introduction

Cryptographically Generated Addresses (CGA, RFC 3972) are IPv6 addresses where the interface identifier (low 64 bits) is derived from a hash of the owner's public key and other parameters. This binding means that only the entity holding the corresponding private key can generate valid SEND NDP messages for that address. CGAs are the foundation of SEND's address authentication mechanism.

## CGA Generation Algorithm

```text
CGA Generation (RFC 3972 Section 4):

Inputs:
  - Modifier: 128-bit random value (chosen by the host)
  - SubnetPrefix: The 64-bit prefix for the subnet
  - Public Key: Host's RSA or ECDSA public key
  - CollisionCount: 0, 1, or 2 (incremented on DAD failure)
  - Sec: Security parameter (0-7, affects hash computation cost)

Step 1: Hash2 = SHA1(Modifier + 0x00..0 (9 bytes) + Key)
  - If Sec > 0: repeat with different modifiers until first 16×Sec bits are 0
  - Store Modifier that produces this

Step 2: Hash1 = SHA1(Modifier + SubnetPrefix + CollisionCount + Key + ExtFields)

Step 3: Interface Identifier (64 bits):
  - Take the first 64 bits of Hash1
  - Set bits 0-2 (the "sec" bits, leftmost three bits) to Sec value
  - Zero bits 6 and 7 (bits u and g in IPv6 notation)
  - Result: 64-bit interface identifier

Step 4: CGA = SubnetPrefix + InterfaceIdentifier
```

## CGA Structure

```text
IPv6 CGA Interface Identifier layout (64 bits):

 0 1 2 3 4 5 6 7  (first byte)
+-+-+-+-+-+-+-+-+
|S|S|S|H|H|H|0|0|  ← bits 0-2: Sec value; bits 3-5: from hash; bits 6-7: u/g cleared
+-+-+-+-+-+-+-+-+

Bits 0-2: Sec value (0b000 to 0b111, indicating security parameter)
Bits 6-7: 00 (u and g bits set to zero)
Other bits (3-5 of first byte, plus bytes 1-7): From SHA1 hash of (Modifier + SubnetPrefix + ColCount + PubKey)

The Sec value controls cost of generating a forgeable CGA:
Sec=0: Attacker needs ~2^59 hash operations
Sec=1: Attacker needs ~2^75 hash operations
Sec=2: Attacker needs ~2^91 hash operations
Higher Sec = more generation time for legitimate user AND attacker
```

## Implementing CGA Verification (Simplified)

```python
import hashlib
import struct

def verify_cga(
    ipv6_address: str,
    subnet_prefix_bytes: bytes,  # 8 bytes
    modifier: bytes,              # 16 bytes
    public_key_der: bytes,        # DER-encoded public key
    collision_count: int = 0,
    sec: int = 0,
) -> bool:
    """
    Verify a Cryptographically Generated Address (RFC 3972).
    Returns True if the CGA is valid for the given public key.
    """
    import socket
    import ipaddress

    addr_bytes = socket.inet_pton(socket.AF_INET6, ipv6_address)
    interface_id = addr_bytes[8:]  # Low 64 bits

    # Verify Sec value matches the leftmost 3 bits (bits 0-2) of interface ID
    advertised_sec = (interface_id[0] >> 5) & 0x07
    if advertised_sec != sec:
        return False

    # Step 1: Verify Hash2 (for Sec > 0)
    if sec > 0:
        hash2_input = modifier + b'\x00' * 9 + public_key_der
        hash2 = hashlib.sha1(hash2_input).digest()
        # First 16*Sec bits of Hash2 must be 0
        required_zero_bits = 16 * sec
        for i in range(required_zero_bits // 8):
            if hash2[i] != 0:
                return False

    # Step 2: Compute Hash1 and verify interface identifier
    hash1_input = (
        modifier +
        subnet_prefix_bytes +
        struct.pack("!B", collision_count) +
        public_key_der
    )
    hash1 = hashlib.sha1(hash1_input).digest()

    # Interface identifier from Hash1 (first 64 bits, with adjustments)
    computed_id = bytearray(hash1[:8])
    # Mask 0x1C = 0b00011100 keeps middle bits 3-5 and clears Sec (0-2) and u,g (6-7)
    computed_id[0] &= 0x1C
    computed_id[0] |= (sec << 5)  # Set Sec bits to Sec value

    # A valid CGA already has u/g = 0 and Sec set, so compare directly
    return bytes(computed_id) == bytes(interface_id)
```

## Conclusion

CGAs bind IPv6 addresses to public keys through SHA1 hashes, making address spoofing computationally infeasible. The Sec parameter controls the security level, with Sec=0 providing basic protection and Sec=2 providing strong protection at the cost of longer address generation time (on the order of seconds to minutes at Sec=2). In SEND deployments, CGAs are included in NDP messages via the CGA option, allowing any receiver to verify address ownership without a central authority. For most operational deployments, the simpler RA Guard is preferred over SEND/CGA.
