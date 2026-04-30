# How to Understand ICMPv6 Parameter Problem Messages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ICMPv6, Parameter Problem, IPv6, Error Messages, Header Validation

Description: Understand ICMPv6 Parameter Problem messages (Type 4), when they are generated for malformed IPv6 headers, and how to use the Pointer field to identify the exact location of the error.

## Introduction

ICMPv6 Parameter Problem (Type 4) is generated when a node encounters a problem processing an IPv6 header field that prevents it from completing the packet processing. The critical feature of this message is the 32-bit Pointer field, which specifies the exact byte offset within the invoking packet where the error was detected. This makes Parameter Problem one of the most precise error reporting mechanisms in IPv6.

## Parameter Problem Message Format

```text
ICMPv6 Parameter Problem (Type 4):

 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|     Type = 4  |     Code      |          Checksum             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                            Pointer                            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|    As much of invoking packet as possible                     |
.                                                               .

Pointer: Byte offset within the invoking packet where the error was found
  → Identifies which field caused the problem
  → Allows automated diagnosis of protocol implementation bugs
```

## Parameter Problem Codes

```text
Code 0: Erroneous header field encountered
  → A field in the IPv6 header or extension header has an invalid value
  → Pointer points to the byte that is problematic
  → Example: unrecognized Routing Type with Segments Left non-zero

Code 1: Unrecognized Next Header type encountered
  → While processing a chain of extension headers,
    a Next Header value was encountered that is not recognized
  → Pointer points to the unrecognized Next Header field byte

Code 2: Unrecognized IPv6 option encountered
  → A TLV option in Hop-by-Hop or Destination Options header
    has an option type that forces the node to report an error
    (option type bits 7-6 = 10: send ICMPv6 regardless of multicast dest)
    (option type bits 7-6 = 11: send ICMPv6 only for non-multicast dest)
  → Pointer points to the unrecognized option type byte
  → Code 2 is NOT generated for option types with bits 7-6 = 00 or 01
```

## Pointer Field Values for Common Fields

```text
IPv6 header field positions for Pointer field:

Byte 0:   Version (bits 7-4) / Traffic Class (bits 3-0 of byte 0)
Byte 1:   Traffic Class (bits 7-4) / Flow Label (bits 3-0 of byte 1)
Bytes 4-5: Payload Length
Byte 6:   Next Header (of IPv6 base header)
Byte 7:   Hop Limit
Bytes 8-23:  Source Address
Bytes 24-39: Destination Address
Byte 40:  Next Header field of first extension header
...etc.

Example:
  If Pointer = 6: the Next Header field in the base IPv6 header is invalid
  If Pointer = 40: the first extension header's Next Header is unrecognized
  If Pointer = 42: an option type within the Hop-by-Hop header is invalid
```

## Parsing Parameter Problem

```python
import struct
import socket

def parse_parameter_problem(icmpv6_data: bytes) -> dict:
    """
    Parse ICMPv6 Parameter Problem message and identify the problem field.
    """
    if len(icmpv6_data) < 8:
        raise ValueError("Minimum 8 bytes required")

    icmp_type, code, checksum, pointer = struct.unpack("!BBHI", icmpv6_data[:8])

    if icmp_type != 4:
        raise ValueError(f"Expected Type=4, got {icmp_type}")

    CODES = {
        0: "Erroneous header field",
        1: "Unrecognized Next Header type",
        2: "Unrecognized IPv6 option",
    }

    # Map pointer to field name in IPv6 header
    IPV6_FIELDS = {
        range(0, 1):   "Version/Traffic Class",
        range(1, 2):   "Traffic Class/Flow Label",
        range(2, 4):   "Flow Label",
        range(4, 6):   "Payload Length",
        range(6, 7):   "Next Header (base header)",
        range(7, 8):   "Hop Limit",
        range(8, 24):  "Source Address",
        range(24, 40): "Destination Address",
    }

    field_name = "Extension header or payload"
    for byte_range, name in IPV6_FIELDS.items():
        if pointer in byte_range:
            field_name = name
            break

    return {
        "type": 4,
        "code": code,
        "code_description": CODES.get(code, f"Unknown code {code}"),
        "pointer": pointer,
        "problem_field": field_name,
        "invoking_packet": icmpv6_data[8:],
    }

# Example: Pointer=6 (Next Header field invalid)

msg = struct.pack("!BBHI", 4, 0, 0, 6) + b'\x00' * 40
result = parse_parameter_problem(msg)
print(f"Error at byte {result['pointer']}: {result['problem_field']}")
print(f"Code: {result['code_description']}")
```

## Common Causes and Diagnosis

```bash
# Capture ICMPv6 traffic and filter for Parameter Problem messages
sudo tcpdump -i eth0 -vv "ip6 protochain 58" 2>&1 | grep -i "parameter problem"

# Example: Code 1 (Unrecognized Next Header)
# Would occur if a new extension header type is sent to an old router
# The pointer tells you WHICH Next Header byte was unrecognized

# Example: Code 0 (Erroneous header field)
# Could be caused by:
# - Unrecognized Routing Type with Segments Left > 0
# - Fragment with M=1 whose Payload Length is not a multiple of 8
# - Invalid extension header length

# Check for malformed packets generating Parameter Problem
sudo tcpdump -i eth0 -vv "ip6 protochain 58" 2>&1 | \
    grep -E "pointer|parameter"
```

## Conclusion

ICMPv6 Parameter Problem is the IPv6 protocol's way of reporting malformed packets and unknown header types. The Pointer field is the key feature - it pinpoints the exact byte offset of the problem, enabling automated diagnosis of implementation bugs and configuration errors. Code 0 indicates an invalid field value, Code 1 indicates an unrecognized Next Header type, and Code 2 indicates an unrecognized option type that the option type encoding requires be reported. These messages are invaluable during IPv6 feature development and debugging.
