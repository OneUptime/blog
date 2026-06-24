# How to Define New IPv6 Extension Headers and Options

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Extension Headers, Protocol Design, IANA, RFC 8200

Description: Learn the process and considerations for defining new IPv6 extension headers and options through the IANA registration process and IETF standards track.

## Introduction

Defining new IPv6 extension headers requires an understanding of RFC 8200 requirements, IANA registration procedures, and the operational deployment realities documented in RFC 9098. Given that extension headers face high drop rates in production networks, new protocol designs must carefully consider whether an extension header is truly necessary.

## When to Use Extension Headers

Before designing a new extension header, consider alternatives:

```text
Extension Header Considerations:
  + Clean IPv6 integration at network layer
  + No UDP overhead
  + Works with both TCP and UDP payloads

  - High drop rates on internet paths (RFC 9098)
  - HbH headers can trigger slow-path/control-plane processing in routers
  - Requires IANA registration and IETF process
  - Cannot be added without changes to packet structure

Better alternatives for many use cases:
  → UDP-based protocols with custom headers (e.g., QUIC, DTLS)
  → IPv6 Destination Options with new option types (easier to register)
  → Application-layer metadata
  → IPv6 address bits (e.g., encoding info in IID)
```

## IANA Registration Requirements

To register a new extension header:

```text
For a new Extension Header type:
  1. Write a specification defining the header format and semantics, and explain why existing headers/options cannot be used
  2. The allocation policy is Standards Action or IESG Approval
  3. Register it in the IANA IPv6 Extension Header Types registry
  4. IANA assigns the Next Header value

For a new Hop-by-Hop or Destination Option:
  1. Write a specification suitable for IETF Review, Standards Action, or IESG Approval
  2. Specify the 8-bit option type including action bits and change flag
  3. Register it in the IANA IPv6 Parameters registry:
     - "Destination Options and Hop-by-Hop Options"

IANA allocates option types as:
  0x00-0x3F: Skip-and-continue group (action bits = 00)
  0x40-0x7F: Discard-silently group (action bits = 01)
  0x80-0xBF: Discard-and-ICMP-always group (action bits = 10)
  0xC0-0xFF: Discard-and-ICMP-if-not-multicast group (action bits = 11)
```

## Designing a New Destination Option

The easiest path to extending IPv6 behavior is registering a new option type for the Destination Options header:

```python
def design_new_option(
    option_name: str,
    option_value_format: str,
    option_length: int,
    action_on_unknown: str = "skip",
    is_mutable: bool = False,
    alignment: tuple = (4, 0)  # (x, y) means align to xn+y
) -> dict:
    """
    Design a new IPv6 TLV option.

    Returns a specification dict for the new option.
    """
    action_codes = {
        "skip":        0b00,
        "discard":     0b01,
        "icmp-always": 0b10,
        "icmp-if-not-multicast": 0b11,
    }

    action_bits = action_codes[action_on_unknown]
    change_flag = 1 if is_mutable else 0

    # The full 8-bit Option Type identifies the option.
    # For local experiments, RFC 4727 reserves rest=0x1E (11110).
    option_rest_value = 0x1E

    option_type = (action_bits << 6) | (change_flag << 5) | option_rest_value

    return {
        "name": option_name,
        "type_byte": option_type,
        "type_hex": f"0x{option_type:02X}",
        "value_format": option_value_format,
        "data_length": option_length,
        "action_on_unknown": action_on_unknown,
        "mutable_in_transit": is_mutable,
        "alignment": f"{alignment[0]}n+{alignment[1]}",
        "total_option_bytes": 2 + option_length,  # type + length + data
    }

# Example: design a network telemetry timestamp option

telemetry_opt = design_new_option(
    option_name="Network Telemetry Timestamp",
    option_value_format="!HI",  # 2-byte ID + 4-byte epoch seconds
    option_length=6,
    action_on_unknown="skip",   # Old nodes skip it gracefully
    is_mutable=True,            # Timestamp can be updated in transit
    alignment=(4, 2)            # 4n+2 alignment
)

for key, value in telemetry_opt.items():
    print(f"  {key}: {value}")
```

## Experimental Extension Headers

For testing and experimentation without IANA registration:

```python
import struct

# RFC 4727 / RFC 3692-style: use Next Header values 253 and 254
# in the preceding header for experimental extension headers.
EXPERIMENTAL_NEXT_HEADER_TYPES = [253, 254]

def build_experimental_extension_header(
    data: bytes,
    next_header: int = 59
) -> bytes:
    """Build a simple RFC 8200/RFC 6564-style extension header body."""
    # Pad data to 8-byte boundary (minus 2 bytes for Next Header + Hdr Ext Len)
    padded_len = ((len(data) + 2 + 7) // 8) * 8
    padding = bytes(padded_len - 2 - len(data))

    hdr_ext_len = (padded_len // 8) - 1

    header = struct.pack("BB", next_header, hdr_ext_len)
    header += data + padding

    return header

# When embedding this header in a packet, set the previous header's
# Next Header field to one of EXPERIMENTAL_NEXT_HEADER_TYPES.
# RFC 4727 reserves experimental option types 0x1E, 0x3E, 0x5E, 0x7E,
# 0x9E, 0xBE, 0xDE, and 0xFE for Destination Options and HbH options.
```

## Alignment Requirements

New options must specify alignment requirements:

```text
Alignment format: xn+y (x=alignment granularity, y=offset)

Examples:
  1n+0 = No alignment constraint (any byte offset)
  2n+0 = Must be at an even-numbered offset
  4n+0 = Must be at a multiple of 4 offset
  4n+2 = Must be at offset 4n+2 (2, 6, 10, 14, ...)
  8n+0 = Must be at a multiple of 8 offset
  8n+4 = Must be at offset 8n+4 (4, 12, 20, 28, ...)

Use Pad1 (type=0) and PadN (type=1) options to achieve alignment:
  Pad1 = add 1 byte of padding
  PadN with len=0: 2 bytes total padding
  PadN with len=N: N+2 bytes total padding
```

## Conclusion

Defining new IPv6 extension headers requires IANA registration for standardized use, with allocations governed by Standards Action or IESG Approval. For experimental work, use Next Header types 253 and 254. Given the operational challenges documented in RFC 9098 (high drop rates and Hop-by-Hop slow-path/control-plane processing risks), protocol designers should carefully consider whether a new extension header is the best approach or whether alternative designs (UDP encapsulation, destination options, application-layer metadata) would be more practical for real-world deployment.
