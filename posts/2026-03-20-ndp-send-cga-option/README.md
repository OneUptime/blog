# How to Understand SEND CGA Option Format

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SEND, CGA Option, Cryptographic Addresses, IPv6 Security, RFC 3971, NDP Options

Description: Understand the SEND CGA option (Type 11) format, its fields, the CGA Parameters Data Structure, and how it carries the public key that binds an IPv6 address to its owner.

## Introduction

The CGA option (NDP option Type 11, defined in RFC 3971) carries the CGA Parameters Data Structure in SEND NDP messages. This data structure contains the public key whose hash is embedded in the sender's IPv6 address, along with the modifier and subnet prefix used in the CGA generation algorithm. Verifiers use the CGA option to retrieve the public key, verify the CGA address derivation, and then verify the RSA Signature over the NDP message. The CGA option is the link between the IPv6 address and the public key.

## CGA Option Wire Format

```text
CGA Option (Type 11) Wire Format:

 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|     Type=11   |    Length     |  Pad Length   |   Reserved    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
.              CGA Parameters Data Structure                    .
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                  Padding (0 to 7 bytes)                       |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

Fields:
  Type:       8 bits = 11 (CGA option)
  Length:     8 bits = total option length in units of 8 bytes
  Pad Length: 8 bits = number of padding bytes at end of option
  Reserved:   8 bits = 0

The CGA Parameters Data Structure is the core of the option.
```

## CGA Parameters Data Structure

```yaml
CGA Parameters Data Structure (RFC 3972 Section 4):

 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                       Modifier (128 bits)                     |
|                                                               |
|                                                               |
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Subnet Prefix (64 bits)                    |
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Collision Count (8 bits)  |                                  |
+-+-+-+-+-+-+-+-+-+-+-----------+                              |
|                                                               |
.                    Subject Public Key Info                    .
.          (DER-encoded SubjectPublicKeyInfo from X.509)        .
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                   Extension Fields (variable)                 |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

Fields:
  Modifier (128 bits):
    Random value chosen during CGA generation
    Used in Hash2 (Sec verification) and Hash1 (address derivation)

  Subnet Prefix (64 bits):
    The network prefix of the interface
    Example: 2001:db8:: for a host on 2001:db8::/64

  Collision Count (8 bits):
    Value 0, 1, or 2
    Incremented when DAD detects address collision
    Allows up to 3 attempts at finding a unique CGA

  Subject Public Key Info:
    DER-encoded RSA public key (RFC 3972 mandates RSA)
    Format: X.509 SubjectPublicKeyInfo ASN.1 structure
    Used to verify address derivation and RSA signature

  Extension Fields:
    Optional TLV-encoded extensions
    Type 0: CGA Extension (for future use)
    Sec information may be encoded here
```

## CGA Parameters Construction in Python

This shows how the CGA Parameters Data Structure is assembled.

```python
import struct
import hashlib
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend

def build_cga_parameters(
    modifier: bytes,           # 16-byte random modifier
    subnet_prefix: bytes,      # 8-byte subnet prefix
    collision_count: int,      # 0, 1, or 2
    public_key_pem: bytes,     # PEM-encoded RSA public key
) -> bytes:
    """
    Build CGA Parameters Data Structure for SEND CGA option.
    """
    # Load and convert public key to DER SubjectPublicKeyInfo
    public_key = serialization.load_pem_public_key(
        public_key_pem, backend=default_backend()
    )
    public_key_der = public_key.public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )

    # Build CGA Parameters Data Structure
    cga_params = (
        modifier +                          # 16 bytes
        subnet_prefix +                     # 8 bytes
        struct.pack("!B", collision_count) + # 1 byte
        public_key_der                      # Variable (DER-encoded key)
        # Extension fields: empty for basic CGA
    )

    return cga_params

def compute_hash1(cga_params: bytes) -> bytes:
    """Compute Hash1 for CGA interface identifier."""
    return hashlib.sha1(cga_params).digest()

def derive_interface_id(hash1: bytes, sec: int) -> bytes:
    """Derive CGA interface identifier from Hash1."""
    iid = bytearray(hash1[:8])
    # Clear universal/group bits (bits 0-1) and sec bit positions (5-7)
    iid[0] &= 0x1C   # Keep only bits 2-4 pattern from hash
    iid[0] |= (sec << 5)  # Set Sec value in bits 5-7
    return bytes(iid)
```

## CGA Option Verification Logic

```text
CGA Option Verification Steps (RFC 3971 Section 5):

Input:
  - Received NDP message with CGA option
  - Source IPv6 address of the NDP message

Step 1: Extract fields from CGA Parameters:
  - modifier = CGA_params[0:16]
  - subnet_prefix = CGA_params[16:24]
  - collision_count = CGA_params[24]
  - public_key_der = CGA_params[25:]

Step 2: Extract Sec from source address:
  - interface_id = source_addr[8:16]
  - sec = (interface_id[0] >> 5) & 0x07  ← bits 5-7

Step 3: Verify Hash2 (if Sec > 0):
  - hash2_input = modifier + b'\x00'*9 + public_key_der
  - hash2 = SHA1(hash2_input)
  - Verify: first 16*Sec bits of hash2 are all zero

Step 4: Verify Hash1 (address derivation):
  - hash1 = SHA1(CGA_params)
  - computed_iid = first 8 bytes of hash1
  - Clear bits 0-1 and 5-7, set Sec in bits 5-7
  - Compare computed_iid with source address interface ID

Step 5: Verify subnet prefix:
  - Check CGA_params.subnet_prefix == source_addr[0:8]

Step 6: Verify collision count:
  - Must be 0, 1, or 2 (reject if > 2)
```

## CGA Option in NDP Message Flow

```text
SEND-enabled Neighbor Solicitation:

IPv6 Header:
  src: 2001:db8::3a8f:29c0:1234:5678 (CGA address)
  dst: ff02::1:ff00:200 (solicited-node multicast for target)

ICMPv6 Header: Type=135 (NS), Code=0

NS Body:
  Target: 2001:db8::200 (address being resolved)

NDP Options:
  Option 1: Source Link-Layer Address (Type 1)
    SLLA: aa:bb:cc:dd:ee:ff

  Option 2: CGA Option (Type 11)        ← Carries public key
    Modifier: [16 random bytes]
    SubnetPrefix: 2001:db8::
    CollisionCount: 0
    PublicKey: [DER-encoded RSA 2048-bit key]

  Option 3: RSA Signature (Type 12)    ← Signs the message
    KeyHash: [SHA-1 of public key]
    Signature: [RSA signature over message + CGA params]

  Option 4: Timestamp (Type 13)        ← Prevents replay
    Timestamp: [seconds since 1970-01-01 UTC, 48.16 fixed-point]

  Option 5: Nonce (Type 14)            ← Prevents reflection
    Nonce: [8 random bytes]
```

## Conclusion

The CGA option (Type 11) carries the CGA Parameters Data Structure that binds an IPv6 address to a public key. It contains the modifier, subnet prefix, collision count, and the DER-encoded public key. Verifiers use the CGA option to extract the public key, recompute the Hash1, and verify that the source IPv6 address's interface identifier was derived from that key. This binding means only the holder of the corresponding private key can generate valid SEND NDP messages for the CGA address. The CGA option works together with the RSA Signature option to provide complete SEND authentication.
