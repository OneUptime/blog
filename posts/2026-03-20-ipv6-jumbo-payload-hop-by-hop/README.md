# How to Understand the IPv6 Jumbo Payload Hop-by-Hop Option

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Hop-by-Hop Options, Jumbo Payload, Jumbograms, Extension Headers

Description: Understand how the Jumbo Payload Hop-by-Hop option enables IPv6 packets larger than 65535 bytes, its encoding rules, and why it must be a Hop-by-Hop option.

## Introduction

The Jumbo Payload option (RFC 2675) is a Hop-by-Hop option that enables IPv6 jumbograms - packets with payloads larger than 65535 bytes. RFC 2675 places it in a Hop-by-Hop Options header immediately following the IPv6 header so nodes that need to interpret a zero IPv6 Payload Length can find the 32-bit jumbo length. The option type value (0xC2) is carefully chosen so that nodes that don't understand it discard the packet and, for non-multicast destinations, report the problem with ICMPv6 rather than silently skipping the option.

## Why It Must Be a Hop-by-Hop Option

```text
How RFC 2675 places the Jumbo Payload option:
  → It is carried in a Hop-by-Hop Options header
  → The Hop-by-Hop header, when present, must immediately follow the IPv6 header
  → The Jumbo Payload option itself has an alignment requirement of 4n + 2

Contrast with Destination Options:
  → Processed only by the destination node(s)
  → Not suitable for a field that changes packet-wide payload length semantics

What the Jumbo Payload length is used for:
  1. Recovering the real IPv6 payload length when the base header's Payload Length is 0
  2. Validating the packet format
  3. Computing upper-layer pseudo-header lengths for checksums
  4. Reporting ICMPv6 Parameter Problem errors for malformed packets
```

## Option Type Encoding: 0xC2

The option type byte encodes behavior for unknown options:

```text
Option Type 0xC2 = 11000010 binary

Bits 7-6 (top 2): 11 = "discard the packet and send ICMPv6 Parameter Problem
                        if the destination is not multicast"
  Other values:
    00 = skip over this option and continue processing
    01 = discard packet quietly
    10 = discard and send ICMPv6 Parameter Problem (any dest)
    11 = discard and send ICMPv6 Parameter Problem (not multicast dest)

0xC2 = 11000010:
  Bits 7-6: 11 = discard + send ICMPv6 Parameter Problem if destination is not multicast
  Bit 5:    0  = option data does NOT change en route
  Bits 4-0: 00010 = option type identifier

RFC 2675 uses 0xC2 so that an unrecognized Jumbo Payload option is
rejected explicitly rather than silently skipped
```

## Complete Option Encoding

```python
import struct

# Jumbo Payload option encoding (RFC 2675)

JUMBO_PAYLOAD_OPTION_TYPE = 0xC2
JUMBO_PAYLOAD_OPTION_LENGTH = 4   # 4 bytes of option data

def encode_jumbo_payload_option(jumbo_payload_length: int) -> bytes:
    """
    Encode the Jumbo Payload TLV option.
    Returns just the option bytes (to be placed inside Hop-by-Hop header).
    """
    if jumbo_payload_length < 65536:
        raise ValueError("Jumbo payload length must be at least 65536")

    return struct.pack(
        "!BBI",
        JUMBO_PAYLOAD_OPTION_TYPE,   # Type: 0xC2
        JUMBO_PAYLOAD_OPTION_LENGTH, # Length: 4 bytes
        jumbo_payload_length         # 32-bit length value
    )

def build_hop_by_hop_with_jumbo(next_header: int,
                                  jumbo_length: int) -> bytes:
    """
    Build a complete Hop-by-Hop Options header containing the
    Jumbo Payload option, padded to a multiple of 8 bytes.

    Args:
        next_header:  Next Header type following Hop-by-Hop
        jumbo_length: Actual payload length (>= 65536)

    Returns:
        Complete Hop-by-Hop Options header (8 bytes minimum)
    """
    option = encode_jumbo_payload_option(jumbo_length)  # 6 bytes

    # Hop-by-Hop header must be multiple of 8 bytes
    # Fixed 2 bytes (next_header + hdr_ext_len) + 6 bytes option = 8 bytes total
    # Hdr Ext Len = (total_bytes / 8) - 1 = (8/8) - 1 = 0

    return struct.pack(
        "!BB",
        next_header,  # Next Header
        0,            # Hdr Ext Len = 0 (8 bytes total)
    ) + option

def decode_hop_by_hop_jumbo(data: bytes) -> dict:
    """
    Decode a Hop-by-Hop Options header, extracting Jumbo Payload if present.
    """
    if len(data) < 2:
        return {"error": "Too short"}

    next_header = data[0]
    hdr_ext_len = data[1]
    total_bytes = (hdr_ext_len + 1) * 8

    result = {
        "next_header": next_header,
        "total_bytes": total_bytes,
        "jumbo_payload_length": None,
    }

    offset = 2
    while offset < total_bytes and offset < len(data):
        opt_type = data[offset]
        if opt_type == 0:          # Pad1: single byte, no length
            offset += 1
            continue
        if offset + 1 >= len(data):
            break
        opt_len = data[offset + 1]
        if opt_type == JUMBO_PAYLOAD_OPTION_TYPE and opt_len == 4:
            jp_len = struct.unpack("!I", data[offset+2:offset+6])[0]
            result["jumbo_payload_length"] = jp_len
        offset += 2 + opt_len

    return result

# Test encode/decode round-trip
payload_size = 100_000  # 100 KB jumbogram
header = build_hop_by_hop_with_jumbo(17, payload_size)  # 17 = UDP
print(f"Hop-by-Hop header: {header.hex()} ({len(header)} bytes)")

decoded = decode_hop_by_hop_jumbo(header)
print(f"Decoded: next_header={decoded['next_header']}, jumbo_length={decoded['jumbo_payload_length']}")
```

## Rules When Using the Jumbo Payload Option

```text
RFC 2675 rules for jumbogram senders:

1. IPv6 Payload Length field MUST be set to 0
   → Signals to the receiver that a Jumbo Payload option is present

2. The Hop-by-Hop Options header MUST be the first extension header
   → Placed immediately after the IPv6 base header

3. The Jumbo Payload option MUST satisfy its 4n + 2 alignment requirement
   → Placing it first in the Hop-by-Hop header naturally satisfies this

4. The packet MUST NOT contain a Fragment Header
   → Jumbograms cannot be fragmented
   → Violating this is invalid; receiver discards

5. Upper-layer length fields must use the Jumbo Payload Length
   → TCP: checksum uses the upper-layer packet length derived from the Jumbo Payload Length; RFC 2675 also defines MSS and Urgent Pointer handling
   → UDP: length field set to 0 if and only if UDP header + data exceeds 65535 bytes (RFC 2675 Section 4)
   → ICMPv6: pseudo-header uses the upper-layer packet length derived from the Jumbo Payload Length
```

## Conclusion

The Jumbo Payload Hop-by-Hop option is a carefully designed mechanism that extends IPv6 beyond its 65535-byte payload limit. Its placement in the Hop-by-Hop Options header puts the 32-bit payload length immediately after the IPv6 header, where compliant nodes can interpret it when the base header's Payload Length is zero. The option type value 0xC2 ensures an unrecognized Jumbo Payload option is rejected explicitly and, for non-multicast destinations, reported with an ICMPv6 error rather than silently skipped. In practice, jumbograms are rare and only applicable on specialized high-performance networks where every link supports the required large MTU.
