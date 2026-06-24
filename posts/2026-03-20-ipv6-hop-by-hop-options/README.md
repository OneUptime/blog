# How to Understand the Hop-by-Hop Options Header

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Hop-by-Hop, Extension Headers, Router Alert, Networking

Description: Understand the IPv6 Hop-by-Hop Options extension header, how it is processed by every router, and its practical uses for Router Alert and Jumbo Payload options.

## Introduction

The Hop-by-Hop Options Header (Next Header = 0) is the only IPv6 extension header that may be examined by nodes along the path. It carries information for nodes that are configured to process it before forwarding the packet. In practice, Hop-by-Hop is rare - most packets carry no extension headers at all. When present, the Hop-by-Hop header MUST be the first extension header immediately following the IPv6 base header.

## Performance Warning

A critical implementation detail: many modern routers either drop packets with a Hop-by-Hop header or send them to a slow path for control-plane processing. RFC 8200 and later guidance explicitly note that nodes may ignore the Hop-by-Hop Options header, drop these packets, or assign them to a slow processing path:

```text
Normal IPv6 packet → ASIC hardware fast path → line-rate forwarding
Hop-by-Hop packet → slow path / control plane → reduced throughput or drop
```

This means sending traffic with Hop-by-Hop Options can stress router control-plane resources or get dropped along the path.

## Header Format

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Next Header  |  Hdr Ext Len  |         Options               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+                               +
|                          Options ...                          |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

Total length = (Hdr Ext Len + 1) × 8 bytes
Minimum size: 8 bytes (Hdr Ext Len = 0)
Options must fill to 8-byte boundary (use Pad1/PadN options)
```

## TLV-Encoded Options

Options within the header use TLV (Type-Length-Value) encoding:

```text
Option Type (1 byte): Action bits + Option ID
Option Length (1 byte): Length of the Value field in bytes
Option Data (variable): The option payload

Option Type bits:
  Bits 7-6 (Action on Unknown Option):
    00 = Skip and continue processing
    01 = Discard packet silently
    10 = Discard and send ICMP Parameter Problem (even if multicast destination)
    11 = Discard and send ICMP Parameter Problem (only if destination is not multicast)
  Bit 5 (Change flag):
    0 = Option data does not change in transit
    1 = Option data may change in transit (important for AH)
```

## Well-Known Hop-by-Hop Options

| Option Type | Name | Use |
|---|---|---|
| 0x00 | Pad1 | 1-byte padding |
| 0x01 | PadN | Multi-byte padding |
| 0x05 | Router Alert | Signal routers to examine the packet |
| 0xC2 | Jumbo Payload | Payload length for jumbograms (> 65,535 bytes) |

## Router Alert Option

The Router Alert option (RFC 2711) signals to routers that they should examine the packet's payload - typically used for RSVP and MLD:

```python
import struct

def build_router_alert_option(alert_value: int = 0) -> bytes:
    """
    Build a Router Alert Hop-by-Hop option.

    Args:
        alert_value: 0 = MLD, 1 = RSVP, 2 = Active Networks, etc.

    Returns:
        8-byte Hop-by-Hop Options header with Router Alert
    """
    # Hop-by-Hop header:
    # Next Header (placeholder), Hdr Ext Len = 0 (means 8 bytes total)
    # Router Alert option: type=0x05, len=2, value=alert_value (2 bytes)
    # Padding: PadN option: type=0x01, len=0

    next_header_placeholder = 0  # Will be set to actual next header
    hdr_ext_len = 0              # (0+1)*8 = 8 bytes total

    # Router Alert TLV
    opt_type = 0x05
    opt_len = 2
    opt_value = struct.pack("!H", alert_value)

    # PadN to reach 8-byte boundary
    # Current: 2 (header) + 4 (router alert with type+len+value) = 6 bytes
    # Need 2 more: PadN type=0x01, len=0 (2 bytes)
    pad = struct.pack("BB", 0x01, 0)

    header = struct.pack("BB", next_header_placeholder, hdr_ext_len)
    header += struct.pack("BB", opt_type, opt_len) + opt_value
    header += pad

    return header

# Build MLD Router Alert

mld_alert = build_router_alert_option(0)  # 0 = Datagram contains MLD message
print(f"Router Alert header (hex): {mld_alert.hex()}")
print(f"Length: {len(mld_alert)} bytes")
```

## Jumbo Payload Option

For jumbograms (packets > 65,535 bytes payload), the IPv6 base header's Payload Length field must be set to 0 and no Fragment header may be present:

```python
import struct

def build_jumbo_payload_option(payload_length: int) -> bytes:
    """
    Build a Jumbo Payload Hop-by-Hop option for jumbograms.

    Args:
        payload_length: Actual payload length (must be > 65,535)
    """
    if payload_length <= 65535:
        raise ValueError("Jumbo Payload requires payload > 65,535 bytes")

    # Jumbo Payload option: type=0xC2, len=4, value=32-bit length
    # No extra padding is needed: 2-byte header + 6-byte option = 8 bytes
    next_header_placeholder = 0
    hdr_ext_len = 0  # 8-byte total

    opt_type = 0xC2
    opt_len = 4
    opt_value = struct.pack("!I", payload_length)

    header = struct.pack("BB", next_header_placeholder, hdr_ext_len)
    header += struct.pack("BB", opt_type, opt_len) + opt_value

    return header
```

## Capturing Hop-by-Hop in Practice

```bash
# Capture packets with Hop-by-Hop Options header
sudo tcpdump -i eth0 -XX "ip6[6] == 0"

# MLD (multicast listener discovery) uses Hop-by-Hop with Router Alert
sudo tcpdump -i eth0 "ip6[6] == 0 and ip6[40] == 58"
# ip6[6]==0 means HbH header, ip6[40] is the Next Header field inside HbH (58=ICMPv6)

# Example: capture MLD query/report packets
sudo tcpdump -i eth0 "ip6[6] == 0 and ip6[40] == 58 and (ip6[48] == 130 or ip6[48] == 131 or ip6[48] == 143)"
# For the common 8-byte Router Alert HbH header used by MLD, ip6[48] is the ICMPv6 type
```

## Conclusion

The Hop-by-Hop Options Header is operationally significant because it is the only IPv6 extension header that can be processed along the path before the packet reaches its destination. In practice, it is used primarily for MLD (via Router Alert) and jumbograms (via Jumbo Payload). Due to the performance and interoperability impact of Hop-by-Hop processing on router hardware, avoid using Hop-by-Hop in normal application traffic. On typical systems, MLD is generated by the network stack rather than by user applications, so this concern primarily applies to custom protocol implementations.
