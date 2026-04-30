# How to Understand Option Type Semantics in IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Extension Headers, Option Types, TLV, Protocol

Description: Understand the semantic meaning encoded in IPv6 option type bytes, including the action bits for unknown options and the change flag for IPsec authentication.

## Introduction

The 8-bit Option Type byte in IPv6 TLV options is not just an identifier - it encodes behavioral semantics in its upper 3 bits. These bits tell processing nodes exactly how to handle unknown options and whether the option data might change during transit. Understanding these semantics is essential for implementing IPv6 protocol stacks and designing new extensions.

## Option Type Byte Structure

```yaml
  Bit 7 | Bit 6 | Bit 5 | Bits 4-0
 -------+-------+-------+---------
    Action bits   |  C  | Option ID
 (2 bits for      |flag | (5 bits,
 unrecognized     |     |  0-31)
 handling)        |     |

Action bits [7:6]:
  00 = Skip this option, continue processing the header
  01 = Discard packet, send nothing
  10 = Discard packet + send ICMPv6 "Parameter Problem" to source, even if dst is multicast
  11 = Discard packet + send ICMPv6 "Parameter Problem" only if dst is not multicast

Change flag [5]:
  0 = Option data is immutable in transit (OK for AH to cover)
  1 = Option data may change en route (AH treats as zeros when computing ICV)

Low-order bits [4:0]:
  5-bit low-order subfield, giving 32 values per action×change combination
  The full 8-bit Option Type still identifies the option
  Total possible types: 4 (actions) × 2 (change) × 32 (IDs) = 256 types
```

## Decoding Any Option Type

```python
def decode_option_type(option_type_byte: int) -> dict:
    """
    Decode the semantic meaning of an IPv6 option type byte.

    Args:
        option_type_byte: The option type byte value (0-255)
    """
    action_bits = (option_type_byte >> 6) & 0x3
    change_flag = (option_type_byte >> 5) & 0x1
    option_id   = option_type_byte & 0x1F

    actions = {
        0b00: "skip option and continue processing",
        0b01: "discard the packet silently",
        0b10: "discard + send ICMPv6 Parameter Problem (code 2) to source, even if dst is multicast",
        0b11: "discard + send ICMPv6 Parameter Problem (code 2) only if dst is not multicast",
    }

    return {
        "type_byte": option_type_byte,
        "type_hex": f"0x{option_type_byte:02X}",
        "action_bits": format(action_bits, '02b'),
        "action": actions[action_bits],
        "change_flag": change_flag,
        "mutable_in_transit": bool(change_flag),
        "option_id": option_id,
        "option_id_hex": f"0x{option_id:02X}",
    }

def analyze_options_table():
    """Analyze a subset of well-known IPv6 option types."""
    known_options = {
        0x00: "Pad1",
        0x01: "PadN",
        0x04: "Tunnel Encap Limit",
        0x05: "Router Alert",
        0x07: "CALIPSO",
        0x26: "Quick-Start",
        0xC2: "Jumbo Payload",
        0xC9: "Home Address Option",
    }

    print(f"{'Option':30s} {'Type':5s} {'Action bits':11s} {'Action':45s} {'Mutable'}")
    print("-" * 105)

    for opt_type, name in sorted(known_options.items()):
        decoded = decode_option_type(opt_type)
        print(f"{name:30s} {decoded['type_hex']:5s} "
              f"{decoded['action_bits']:11s} "
              f"{decoded['action']:45s} "
              f"{'Yes' if decoded['mutable_in_transit'] else 'No'}")

analyze_options_table()
```

## The Change Flag and IPsec AH

The change flag (bit 5) is critically important for IPsec Authentication Header (AH):

```text
When computing AH's Integrity Check Value (ICV):

For options with change_flag = 0 (immutable):
  → Use the actual option data in the hash computation
  → The data will not change, so the hash will be valid at the destination

For options with change_flag = 1 (mutable):
  → Substitute ZEROS for the option data in the hash computation
  → The data might change in transit, so we cannot hash the actual value
  → The destination also zeroes these out before verifying the ICV

Example with Hop-by-Hop options:
  Router Alert (0x05): change_flag=0 → included in AH hash as-is
  Hypothetical mutable option (0x??): change_flag=1 → zeroed in AH hash
```

## Practical Implications for Custom Options

When designing a new IPv6 option, choose the type byte carefully:

```python
def design_custom_option(
    description: str,
    option_id: int,
    is_mutable: bool,
    unknown_action: str
) -> int:
    """
    Design a custom IPv6 option type byte.

    Args:
        option_id:     Your option's ID (0-31)
        is_mutable:    True if the value might change in transit
        unknown_action: "skip", "discard", "icmp-always", "icmp-unless-multicast"
    """
    action_map = {
        "skip":                  0b00,
        "discard":               0b01,
        "icmp-always":           0b10,
        "icmp-unless-multicast": 0b11,
    }

    action_bits = action_map[unknown_action]
    change_flag = 1 if is_mutable else 0

    option_type = (action_bits << 6) | (change_flag << 5) | (option_id & 0x1F)
    print(f"Custom option '{description}':")
    print(f"  Option type byte: 0x{option_type:02X} ({option_type})")
    print(f"  If unrecognized: {unknown_action}")
    print(f"  Mutable: {is_mutable}")
    return option_type

# Example: Design a new telemetry option

type_byte = design_custom_option(
    description="Network Telemetry Timestamp",
    option_id=15,
    is_mutable=True,  # Timestamp may be updated at each hop
    unknown_action="skip"  # Old nodes just skip this option
)
```

## Conclusion

IPv6 option type bytes encode three semantic properties: what to do when the option is not recognized (action bits), whether the data can change in transit (change flag), and the low-order value bits that help form the full 8-bit Option Type. These properties enable the IPv6 extension header framework to be forward-compatible - new options can be added with a clearly specified behavior for systems that don't yet understand them. When implementing or designing IPv6 options, always choose these bits carefully to ensure correct behavior across the diverse set of nodes a packet may traverse.
