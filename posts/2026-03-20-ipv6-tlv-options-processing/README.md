# How to Process TLV-Encoded Options in IPv6 Extension Headers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, TLV, Extension Headers, Options, Protocol

Description: Learn how to parse and process TLV (Type-Length-Value) encoded options found in IPv6 Hop-by-Hop and Destination Options headers.

## Introduction

Options within IPv6's Hop-by-Hop and Destination Options headers use TLV (Type-Length-Value) encoding. Each option starts with a 1-byte Type, followed by a 1-byte Length (for most options), followed by the option data. Understanding how to correctly parse these options is essential for implementing IPv6 protocol stacks, network analyzers, and custom protocol extensions.

## TLV Encoding Rules

```yaml
General option format (except Pad1):
  +---+---+---+---+---+---+---+---+
  | Action|C| Option Type (5 bits)|
  +---+---+---+---+---+---+---+---+
  |         Opt Data Len          |
  +---+---+---+---+---+---+---+---+
  |                               |
  .          Option Data          .
  .                               .
  +---+---+---+---+---+---+---+---+

Special: Pad1 option (type = 0x00):
  +---+---+---+---+---+---+---+---+
  |         0x00                  |  ← Just one byte, no Length or Data
  +---+---+---+---+---+---+---+---+
```

## Option Type Byte Breakdown

```text
Bit 7-6: Action when unrecognized:
  00 = skip option, continue processing
  01 = discard packet silently
  10 = discard packet + send ICMPv6 Parameter Problem, even for multicast destinations
  11 = discard packet + send ICMPv6 only if the destination was not multicast

Bit 5: Change flag:
  0 = option data unchanged in transit
  1 = option data may change in transit (affects AH authentication)

Bits 4-0: low 5 bits of the full 8-bit Option Type value
```

## Complete TLV Parser

```python
from dataclasses import dataclass
from typing import Optional

KNOWN_OPTIONS = {
    0x00: "Pad1",
    0x01: "PadN",
    0x04: "Tunnel Encapsulation Limit",
    0x05: "Router Alert",
    0x07: "CALIPSO",
    0x08: "SMF_DPD",
    0xC2: "Jumbo Payload",
    0xC9: "Home Address",
}

@dataclass
class TLVOption:
    option_type: int
    option_name: str
    data_len: int
    data: bytes
    action_bits: int
    may_change: bool

    @property
    def action_description(self) -> str:
        actions = {
            0: "skip and continue",
            1: "discard silently",
            2: "discard + ICMP, even for multicast dst",
            3: "discard + ICMP if dst is not multicast",
        }
        return actions[self.action_bits]

def parse_tlv_options(options_bytes: bytes) -> list[TLVOption]:
    """
    Parse TLV-encoded options from a Hop-by-Hop or Destination Options header.

    Args:
        options_bytes: Raw bytes starting after the 2-byte header prefix
                       (Next Header + Hdr Ext Len fields)

    Returns:
        List of TLVOption objects
    """
    options = []
    offset = 0

    while offset < len(options_bytes):
        opt_type = options_bytes[offset]

        if opt_type == 0x00:  # Pad1 - special case
            options.append(TLVOption(
                option_type=0x00,
                option_name="Pad1",
                data_len=0,
                data=b"",
                action_bits=0,
                may_change=False,
            ))
            offset += 1
            continue

        if offset + 1 >= len(options_bytes):
            raise ValueError("Truncated option: missing Opt Data Len")

        opt_len = options_bytes[offset + 1]
        if offset + 2 + opt_len > len(options_bytes):
            raise ValueError("Truncated option: option data exceeds available bytes")
        opt_data = options_bytes[offset + 2: offset + 2 + opt_len]

        action_bits = (opt_type >> 6) & 0x3
        may_change = bool((opt_type >> 5) & 0x1)
        name = KNOWN_OPTIONS.get(opt_type, f"Unknown (0x{opt_type:02X})")

        options.append(TLVOption(
            option_type=opt_type,
            option_name=name,
            data_len=opt_len,
            data=opt_data,
            action_bits=action_bits,
            may_change=may_change,
        ))

        offset += 2 + opt_len

    return options

def handle_unknown_option(opt: TLVOption, destination_is_multicast: bool):
    """Process an unknown option according to its action bits."""
    if opt.action_bits == 0:
        print(f"  Unknown option 0x{opt.option_type:02X}: skip and continue")
    elif opt.action_bits == 1:
        print(f"  Unknown option 0x{opt.option_type:02X}: discard packet (silent)")
        raise StopIteration("Discard packet")
    elif opt.action_bits == 2:
        print(f"  Unknown option 0x{opt.option_type:02X}: discard + ICMPv6 (even multicast)")
        raise StopIteration("Send ICMPv6 Parameter Problem")
    elif opt.action_bits == 3:
        if destination_is_multicast:
            print(f"  Unknown option 0x{opt.option_type:02X}: discard packet (no ICMPv6 for multicast)")
            raise StopIteration("Discard packet")
        print(f"  Unknown option 0x{opt.option_type:02X}: discard + ICMPv6")
        raise StopIteration("Send ICMPv6 Parameter Problem")

# Example: parse a Hop-by-Hop header with Router Alert + PadN

# Router Alert: type=0x05, len=2, value=0x0000 (MLD)
# PadN: type=0x01, len=0 (2 bytes total)
hbh_options = bytes([
    0x05, 0x02, 0x00, 0x00,  # Router Alert (MLD=0)
    0x01, 0x00,               # PadN (2 bytes, 0 data bytes)
])

options = parse_tlv_options(hbh_options)
for opt in options:
    print(f"Option: {opt.option_name} | len={opt.data_len} | "
          f"action={opt.action_description} | may_change={opt.may_change}")
    if opt.data:
        print(f"  Data: {opt.data.hex()}")
```

## Alignment Requirements

Individual TLV options may have specific alignment requirements within the header:

```text
Option alignment: xn+y means the option starts at an offset
that satisfies (offset % x) == y from the start of the header

Example:
  Router Alert (0x05): alignment 2n+0 (must be at even offset)
  Home Address (0xC9): alignment 8n+6
  Jumbo Payload (0xC2): alignment 4n+2

Use Pad1 (one byte) and PadN (N bytes) to achieve alignment:
  Pad1: type=0x00 (single byte, no length field)
  PadN: type=0x01, len=N-2, data=N-2 zero bytes
```

## Conclusion

TLV option processing in IPv6 extension headers requires careful attention to the action bits in the Type byte - they tell you exactly what to do when you encounter an unknown option. The Pad1 and PadN options handle alignment requirements. Always check alignment constraints when implementing new options, and honor the action semantics when implementing an IPv6 stack to ensure correct behavior with unknown future options.
