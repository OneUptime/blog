# How to Understand the Destination Options Header

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Destination Options, Extension Headers, Networking, Protocol

Description: Understand the IPv6 Destination Options extension header, its two positional meanings in the header chain, and practical options it carries including Home Address and CALIPSO.

## Introduction

The Destination Options Header (Next Header = 60) carries information that the final destination (and potentially intermediate routing destinations) needs to process. Unlike the Hop-by-Hop Options Header, Destination Options are ignored by ordinary transit routers - they are processed only by the packet's destination node(s).

## The Two Positions of Destination Options

The Destination Options Header can appear in two places in the extension header chain with different processing semantics:

```text
Position 1: Before the Routing Header
  IPv6 Base → HbH (0) → [Dest Options (60)] → Routing (43) → Fragment (44) → TCP (6)
  → Processed by the first destination in the IPv6 Destination Address field
    and any subsequent destinations listed in the Routing Header
  → Applies to routing destinations

Position 2: After the Routing Header
  IPv6 Base → HbH (0) → Routing (43) → Fragment (44) → [Dest Options (60)] → TCP (6)
  → Processed ONLY by the final destination
  → Used for options intended only for the final destination
```

## Header Format

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Next Header  |  Hdr Ext Len  |                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+                               +
|                            Options                            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

Length = (Hdr Ext Len + 1) × 8 bytes (minimum 8 bytes)
Options use TLV encoding (same as Hop-by-Hop)
```

## TLV Option Format

Options within Destination Options use the same TLV encoding as Hop-by-Hop:

```text
Option Type bits [7:6]:
  00 = skip unknown option, continue
  01 = discard packet silently
  10 = discard + send ICMPv6 Parameter Problem (even to multicast)
  11 = discard + send ICMPv6 Parameter Problem only if destination is not multicast

Bit 5: Change flag (0 = immutable, 1 = may change in transit)
Bits [4:0]: Actual option identifier
```

## Well-Known Destination Options

| Option Type | Name | Use Case |
|---|---|---|
| 0x00 | Pad1 | Single-byte padding |
| 0x01 | PadN | Multi-byte padding |
| 0x04 | Tunnel Encap Limit | Max encapsulation depth |
| 0xC9 | Home Address (HAO) | IPv6 Mobile IP (RFC 6275) |
| 0x0F | PDM | In-band performance diagnostics (RFC 8250) |
| 0x8C | Line-Identification Option | Access-line identification in tunneled ND (RFC 6788) |

## Home Address Option (Mobile IPv6)

The most commonly discussed Destination Option is the Home Address Option (HAO) used in Mobile IPv6. It lets a mobile node send from its care-of address on the wire while carrying its home address in the option. In Mobile IPv6, the Home Address option itself must appear after any Routing header and before any Fragment, AH, or ESP headers:

```python
import struct
import socket

def build_home_address_option(
    home_address: str,
    next_header: int = socket.IPPROTO_TCP,
) -> bytes:
    """
    Build a Destination Options header with the Home Address Option.
    Used in Mobile IPv6 (RFC 6275).

    When a mobile node sends from its care-of address,
    it includes its home address in the Home Address Option.
    The correspondent node processes the packet as if the
    IPv6 Source Address were the home address for this packet.

    Args:
        home_address: The mobile node's home address (string)
        next_header: Next Header value for the header that follows this one
    """
    home_bytes = socket.inet_pton(socket.AF_INET6, home_address)

    # Option: type=0xC9, len=16, value=home address (16 bytes)
    opt_type = 0xC9
    opt_len = 16  # 128-bit IPv6 address

    # The Home Address option requires 8n+6 alignment. Add a 4-byte PadN
    # first so the option starts 6 bytes from the start of the header.
    hdr_ext_len = 2  # (2+1)*8 = 24 bytes total

    header = struct.pack("BB", next_header, hdr_ext_len)
    header += struct.pack("BB", 0x01, 2) + bytes(2)  # PadN: total 4 bytes
    header += struct.pack("BB", opt_type, opt_len)
    header += home_bytes

    return header

home_opt = build_home_address_option("2001:db8:1::1")
print(f"Home Address Option header: {home_opt.hex()}")
print(f"Length: {len(home_opt)} bytes")
```

## Parsing Destination Options

```python
def parse_destination_options(header_bytes: bytes) -> list:
    """Parse options from a Destination Options header."""
    options = []
    offset = 2  # Skip Next Header (0) and Hdr Ext Len (1) bytes

    while offset < len(header_bytes):
        opt_type = header_bytes[offset]

        if opt_type == 0x00:  # Pad1
            options.append({"type": "Pad1", "length": 0})
            offset += 1
            continue

        if offset + 1 >= len(header_bytes):
            break

        opt_len = header_bytes[offset + 1]
        opt_data = header_bytes[offset + 2: offset + 2 + opt_len]

        opt_names = {
            0x01: "PadN",
            0x04: "Tunnel Encap Limit",
            0x0F: "PDM",
            0x8C: "Line-Identification Option",
            0xC9: "Home Address",
        }

        options.append({
            "type_byte": f"0x{opt_type:02X}",
            "name": opt_names.get(opt_type, f"Unknown (0x{opt_type:02X})"),
            "length": opt_len,
            "data": opt_data.hex(),
            "action_on_unknown": (opt_type >> 6) & 0x3,
            "may_change": bool((opt_type >> 5) & 0x1),
        })
        offset += 2 + opt_len

    return options
```

## Viewing Destination Options in Traffic

```bash
# Packets whose IPv6 base header points directly to Destination Options (60)

sudo tcpdump -i eth0 -vv "ip6[6] == 60"

# Packets with a Destination Options header anywhere in the extension chain
sudo tcpdump -i eth0 -vv "ip6 protochain 60"

# Note: "ip6 protochain 60" follows the extension-header chain, so it can
# match final-destination Destination Options after Routing/Fragment/AH/ESP
```

## Conclusion

The Destination Options Header is a flexible container for per-destination processing instructions. Its two positional semantics (before vs after the Routing Header) allow targeting either routing destinations or only the final destination. While rarely seen in everyday traffic, it enables important capabilities like Mobile IPv6 Home Address binding, in-band performance diagnostics (PDM), and tunnel encapsulation depth limiting. The TLV option format with explicit action bits for unknown options makes it forward-compatible with future option additions.
