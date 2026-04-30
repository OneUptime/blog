# How to Understand ICMPv6 Message Processing Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ICMPv6, Message Processing, RFC 4443, IPv6, Protocol Rules

Description: Understand the rules governing when ICMPv6 messages must and must not be generated, how to validate incoming messages, and the anti-loop rules that prevent cascading errors.

## Introduction

RFC 4443 defines strict rules for when ICMPv6 error messages may and may not be generated. These rules prevent error storms (an ICMPv6 error triggering another ICMPv6 error, ad infinitum), reduce the risk of spoofing attacks, and ensure that ICMPv6 errors are only sent when they provide useful information. Every IPv6 implementation must follow these rules exactly.

## Rules for When NOT to Generate ICMPv6 Errors

```text
RFC 4443 Section 2.4: Do NOT send ICMPv6 errors in response to:

1. ICMPv6 error messages
   → Error in response to error = infinite loop
   → Easy check: Type < 128 (error) responding to another Type < 128

2. ICMPv6 Redirect messages
   → Redirects are explicitly excluded too

3. Packets sent to a multicast address
   → Exception: Packet Too Big (Type 2) may be sent for multicast
   → Exception: Parameter Problem (Type 4, Code 2) for unrecognized option
     when the option type's highest-order bits are 10

4. Packets sent as a link-layer multicast
   → Same exceptions as multicast destination

5. Packets sent as a link-layer broadcast
   → Same exceptions as multicast destination

6. Packets whose source address does not uniquely identify a single node:
   → Unspecified address (::) as source
   → Multicast source address
   → Source address known by the sender to be an anycast address
```

## Rules for When TO Generate ICMPv6 Errors

```text
RFC 4443: Generate ICMPv6 errors when:

1. A packet CANNOT BE DELIVERED for reasons other than congestion
   → Destination Unreachable (Type 1, Code 0-6, depending on reason)
   → Packet Too Big (Type 2) for MTU issues

2. A packet EXCEEDS HOP LIMIT
   → Time Exceeded (Type 3, Code 0)
   → Sent by the router that discards the packet

3. A packet CONTAINS AN INVALID HEADER FIELD
   → Parameter Problem (Type 4, Code 0)
   → Pointer must identify the problematic byte

4. Fragment reassembly timer expires with incomplete fragments
   → Time Exceeded (Type 3, Code 1)
   → Only if the fragment with offset 0 was received

5. An unrecognized Next Header type or IPv6 option is encountered
   → Parameter Problem (Type 4, Code 1 or 2)
   → Code 2 depends on the option type bits
```

## Validating Incoming ICMPv6 Messages

```python
import ipaddress
import socket
import struct

ICMPV6_NEXT_HEADER = 58
ICMPV6_REDIRECT = 137


def ones_complement_sum(data: bytes) -> int:
    if len(data) % 2:
        data += b"\x00"

    total = 0
    for i in range(0, len(data), 2):
        total += (data[i] << 8) + data[i + 1]
        total = (total & 0xFFFF) + (total >> 16)

    return total


def icmpv6_checksum(src_addr: str, dst_addr: str, icmpv6_data: bytes) -> int:
    pseudo_header = (
        socket.inet_pton(socket.AF_INET6, src_addr)
        + socket.inet_pton(socket.AF_INET6, dst_addr)
        + struct.pack("!I3xB", len(icmpv6_data), ICMPV6_NEXT_HEADER)
    )
    return (~ones_complement_sum(pseudo_header + icmpv6_data)) & 0xFFFF


def extract_invoking_upper_layer(invoking_packet: bytes):
    """
    Walk the invoking packet's extension-header chain and return:
    (upper-layer protocol number, byte offset of the upper-layer header)
    """
    if len(invoking_packet) < 40:
        return None, None

    next_header = invoking_packet[6]
    offset = 40

    while True:
        if next_header in (0, 43, 60):  # Hop-by-Hop, Routing, Destination Options
            if len(invoking_packet) < offset + 2:
                return None, None
            header_length = 8 * (invoking_packet[offset + 1] + 1)
            if len(invoking_packet) < offset + header_length:
                return None, None
            next_header = invoking_packet[offset]
            offset += header_length
        elif next_header == 44:  # Fragment
            if len(invoking_packet) < offset + 8:
                return None, None
            next_header = invoking_packet[offset]
            offset += 8
        elif next_header == 51:  # Authentication Header
            if len(invoking_packet) < offset + 2:
                return None, None
            header_length = 4 * (invoking_packet[offset + 1] + 2)
            if len(invoking_packet) < offset + header_length:
                return None, None
            next_header = invoking_packet[offset]
            offset += header_length
        else:
            return next_header, offset


def validate_icmpv6_error_message(
    src_addr: str,
    dst_addr: str,
    icmpv6_data: bytes,
) -> dict:
    """
    Perform basic RFC 4443 / RFC 8200 sanity checks for an ICMPv6 error message.
    """
    errors = []
    warnings = []

    if len(icmpv6_data) < 8:
        return {"valid": False, "errors": ["Too short (< 8 bytes)"], "warnings": []}

    icmp_type = icmpv6_data[0]
    icmp_code = icmpv6_data[1]
    is_error_message = icmp_type < 128

    if not is_error_message:
        warnings.append("This helper is intended for ICMPv6 error messages (type < 128).")

    try:
        src = ipaddress.ip_address(src_addr)
        dst = ipaddress.ip_address(dst_addr)
    except ValueError as exc:
        return {"valid": False, "errors": [f"Invalid IP address: {exc}"], "warnings": warnings}

    if src.version != 6 or dst.version != 6:
        return {"valid": False, "errors": ["Both addresses must be IPv6"], "warnings": warnings}

    if src.is_multicast:
        errors.append(f"Error source is multicast: {src_addr}")
    if src.is_unspecified:
        errors.append(f"Error source is unspecified (::): {src_addr}")

    if icmpv6_checksum(src_addr, dst_addr, icmpv6_data) != 0:
        errors.append("Invalid ICMPv6 checksum")

    if is_error_message:
        if len(icmpv6_data) < 48:
            errors.append("ICMPv6 error does not contain the full invoking IPv6 header")
        else:
            invoking_packet = icmpv6_data[8:]
            invoking_next_header, upper_layer_offset = extract_invoking_upper_layer(invoking_packet)

            if invoking_next_header is None:
                warnings.append("Could not fully parse the invoking packet's extension-header chain")
            elif invoking_next_header == ICMPV6_NEXT_HEADER and len(invoking_packet) > upper_layer_offset:
                invoking_icmpv6_type = invoking_packet[upper_layer_offset]
                if invoking_icmpv6_type < 128:
                    errors.append("Error message in response to an ICMPv6 error message (anti-loop violation)")
                if invoking_icmpv6_type == ICMPV6_REDIRECT:
                    errors.append("Error message in response to an ICMPv6 Redirect message (prohibited)")

    return {
        "valid": len(errors) == 0,
        "icmp_type": icmp_type,
        "icmp_code": icmp_code,
        "is_error": is_error_message,
        "errors": errors,
        "warnings": warnings,
    }


def build_invoking_ipv6_packet(next_header: int, upper_layer: bytes = b"") -> bytes:
    return (
        b"\x60\x00\x00\x00"
        + struct.pack("!HBB", len(upper_layer), next_header, 64)
        + socket.inet_pton(socket.AF_INET6, "2001:db8::10")
        + socket.inet_pton(socket.AF_INET6, "2001:db8::20")
        + upper_layer
    )


def build_icmpv6_error(
    src_addr: str,
    dst_addr: str,
    icmp_type: int,
    icmp_code: int,
    invoking_packet: bytes,
) -> bytes:
    message = bytes([icmp_type, icmp_code, 0, 0]) + b"\x00\x00\x00\x00" + invoking_packet
    checksum = icmpv6_checksum(src_addr, dst_addr, message)
    return message[:2] + struct.pack("!H", checksum) + message[4:]

# Test validation

tests = [
    (
        "2001:db8::1",
        "2001:db8::2",
        build_icmpv6_error(
            "2001:db8::1",
            "2001:db8::2",
            1,
            0,
            build_invoking_ipv6_packet(6),
        ),
    ),  # Valid
    (
        "::",
        "2001:db8::2",
        build_icmpv6_error(
            "::",
            "2001:db8::2",
            1,
            0,
            build_invoking_ipv6_packet(6),
        ),
    ),  # Invalid source
    (
        "2001:db8::1",
        "2001:db8::2",
        build_icmpv6_error(
            "2001:db8::1",
            "2001:db8::2",
            1,
            0,
            build_invoking_ipv6_packet(58, b"\x01\x00\x00\x00"),
        ),
    ),  # Error in response to an ICMPv6 error
]

for src, dst, data in tests:
    result = validate_icmpv6_error_message(src, dst, data)
    print(f"src={src[:15]}, dst={dst[:15]}: valid={result['valid']}")
    for err in result["errors"]:
        print(f"  ERROR: {err}")
```

## Rate Limiting Rules

```text
RFC 4443 Section 2.4: Rate limiting:

"An IPv6 node MUST limit the rate of ICMPv6 error messages it sends."
"RFC 4443 recommends a token-bucket mechanism and notes that a simple
 timer-based implementation is not reasonable."

Linux kernel documentation:
Check: /proc/sys/net/ipv6/icmp/ratelimit (in milliseconds)
Meaning: minimum spacing between rate-limited ICMPv6 messages to a peer
Kernel-doc default: 100
Runtime value may be distribution-tuned
Default ratemask: 0-1,3-127 (rate-limit ICMPv6 errors except Packet Too Big)
```

## Conclusion

ICMPv6 message processing rules exist to prevent error storms and ensure errors are only sent when useful. The anti-loop rule (no error in response to an ICMPv6 error or Redirect) and the multicast restriction (no errors for multicast destinations, except Packet Too Big and a narrow Parameter Problem Code 2 case) are the most critical constraints. Rate limiting prevents ICMPv6 from being used as a DoS amplifier. When implementing IPv6 protocol stacks or debugging unusual ICMPv6 behavior, verifying compliance with these rules explains most unexpected behaviors.
