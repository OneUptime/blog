# How to Understand IPv6 Jumbograms

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Jumbograms, Jumbo Payload, RFC 2675, HPC Networking

Description: Understand IPv6 jumbograms - packets exceeding 65535 bytes - how they work using the Jumbo Payload option, when they are useful, and their requirements.

## Introduction

IPv6's Payload Length field is 16 bits, supporting a maximum payload of 65535 bytes. For high-performance computing, storage area networks, and other specialized high-MTU interconnects, larger packets are desirable to reduce per-packet overhead. IPv6 jumbograms (RFC 2675) extend the maximum IPv6 payload beyond 65535 bytes using the Jumbo Payload option in a Hop-by-Hop header, enabling payloads up to 4,294,967,295 bytes (approximately 4 GB).

## Standard IPv6 vs Jumbogram Size Limits

```text
Standard IPv6 packet:
  Payload Length field: 16 bits → max 65535 bytes payload
  Total packet size: 40 (header) + 65535 = 65575 bytes maximum

IPv6 Jumbogram (RFC 2675):
  Payload Length field: set to 0 (signals jumbogram)
  Jumbo Payload Length: 32-bit field in Hop-by-Hop option
  Maximum payload: 2^32 - 1 = 4,294,967,295 bytes
  Total packet size: up to ~4 GB plus the 40-byte IPv6 header

Practical maximum (limited by link MTU):
  Standard Ethernet: 1500 bytes (cannot carry jumbograms)
  Ethernet jumbo frames (9000 bytes): still too small for jumbograms
  Jumbograms require links with MTUs greater than 65575 octets
  Typically limited to specialized high-MTU interconnects
```

## The Jumbo Payload Hop-by-Hop Option

Jumbograms use a Hop-by-Hop Options extension header with the Jumbo Payload option:

```text
Hop-by-Hop Options Header with Jumbo Payload option:

Byte 0: Next Header (type of header after Hop-by-Hop)
Byte 1: Hdr Ext Len = 0 (8-byte header total)
Byte 2: Option Type = 0xC2 (Jumbo Payload, 2 high bits: 11 = discard and send ICMP if unrecognized, unless the destination is multicast)
Byte 3: Option Length = 4 (the value field is 4 bytes)
Byte 4-7: Jumbo Payload Length (32-bit big-endian)

When a jumbogram is sent:
  1. IPv6 Payload Length field is set to 0
  2. Hop-by-Hop Options header is added as the first extension header
  3. Hop-by-Hop Options contains the Jumbo Payload option
  4. Jumbo Payload Length contains the IPv6 packet length excluding the 40-byte IPv6 header, including this Hop-by-Hop header (≥ 65536)
```

## Jumbogram Requirements and Constraints

```text
RFC 2675 requirements:

1. Must not be fragmented
   → Jumbograms cannot use the Fragment Header
   → The source must ensure the entire jumbogram fits in the path MTU, or a router will return ICMPv6 Packet Too Big

2. Hop-by-Hop Options header must be first extension header
   → The Jumbo Payload option is defined only in that header
   → It must immediately follow the IPv6 header

3. Malformed jumbograms trigger ICMPv6 Parameter Problem
   → Example: Payload Length = 0 but the Jumbo Payload option is missing
   → Example: Jumbo Payload Length is present but less than 65536

4. Link must support the required MTU
   → Relevant only on links with MTUs greater than 65575 octets
   → Standard Ethernet (1500) and 9000-byte Ethernet jumbo frames are too small

5. Upper-layer protocols must handle large sizes
   → TCP implementations need RFC 2675's MSS and urgent-pointer handling
   → UDP jumbograms set the UDP Length field to 0 and use the actual UDP length for checksum calculation
```

## Building a Jumbogram Hop-by-Hop Header

```python
import struct

def build_jumbo_payload_header(next_header: int,
                                jumbo_length: int) -> bytes:
    """
    Build an IPv6 Hop-by-Hop Options header with Jumbo Payload option.
    Used to create IPv6 jumbograms (RFC 2675).

    Args:
        next_header:  Type of the following header (6=TCP, 17=UDP)
        jumbo_length: IPv6 packet length excluding the IPv6 header
                      (must be >= 65536, and includes this Hop-by-Hop header)

    Returns:
        8-byte Hop-by-Hop Options header with Jumbo Payload option
    """
    if jumbo_length < 65536:
        raise ValueError(f"Jumbo payload length must be >= 65536, got {jumbo_length}")
    if jumbo_length > 0xFFFFFFFF:
        raise ValueError("Jumbo payload length exceeds 32-bit maximum")

    JUMBO_PAYLOAD_OPTION_TYPE = 0xC2

    return struct.pack(
        "!BBBBI",
        next_header,              # Next Header
        0,                        # Hdr Ext Len = 0 (8 bytes total)
        JUMBO_PAYLOAD_OPTION_TYPE,# Jumbo Payload option type
        4,                        # Option data length = 4 bytes
        jumbo_length              # 32-bit jumbo payload length
    )

def parse_jumbo_payload_header(data: bytes) -> dict:
    """Parse a Hop-by-Hop Options header for the Jumbo Payload option."""
    if len(data) < 8:
        raise ValueError("Need at least 8 bytes")

    next_header, hdr_ext_len = data[0], data[1]
    total_bytes = (hdr_ext_len + 1) * 8
    if len(data) < total_bytes:
        raise ValueError(f"Need {total_bytes} bytes for this Hop-by-Hop header, got {len(data)}")

    # Scan for Jumbo Payload option (type 0xC2)
    offset = 2
    while offset < total_bytes:
        opt_type = data[offset]
        if opt_type == 0:     # Pad1
            offset += 1
            continue
        if offset + 1 >= total_bytes:
            raise ValueError("Truncated option header")
        opt_len = data[offset + 1]
        if opt_type == 0xC2:  # Jumbo Payload
            if opt_len != 4 or offset + 6 > total_bytes:
                raise ValueError("Invalid Jumbo Payload option")
            jumbo_length = struct.unpack("!I", data[offset+2:offset+6])[0]
            if jumbo_length < 65536:
                raise ValueError("Jumbo Payload Length must be >= 65536")
            return {"has_jumbo": True, "jumbo_length": jumbo_length, "next_header": next_header}
        offset += 2 + opt_len

    return {"has_jumbo": False, "next_header": next_header}

# Example: Build a Hop-by-Hop header whose Jumbo Payload Length is 100,000 bytes

header = build_jumbo_payload_header(17, 100000)  # 17 = UDP
print(f"Hop-by-Hop header: {header.hex()}")

parsed = parse_jumbo_payload_header(header)
print(f"Jumbo length: {parsed['jumbo_length']} bytes")
```

## Conclusion

IPv6 jumbograms address the 65535-byte payload limit by using a 32-bit Jumbo Payload Length option in a Hop-by-Hop Options header. They are applicable only on high-performance network links that support MTUs above 65575 octets, such as specialized HPC and storage interconnects. On standard Ethernet (1500 or 9000 bytes jumbo frames), jumbograms provide no benefit. The most important constraint: jumbograms cannot be fragmented, so the path MTU must be large enough to carry the entire packet.
