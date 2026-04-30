# How to Understand ICMPv6 Destination Unreachable

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ICMPv6, Destination Unreachable, IPv6, Error Messages, RFC 4443

Description: Understand ICMPv6 Destination Unreachable messages (Type 1), when they are generated, their structure, and how applications and systems should handle them.

## Introduction

ICMPv6 Destination Unreachable (Type 1) is an error message generated when a packet cannot be delivered to its destination. Unlike IPv4 where many error conditions were handled differently, IPv6 consolidates routing failures, policy rejections, and unreachable ports all under Type 1 with different Code values. Understanding when each Code is generated helps in diagnosing connectivity failures.

## Destination Unreachable Message Format

```text
ICMPv6 Destination Unreachable (Type 1):

 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|     Type = 1  |     Code      |          Checksum             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                             Unused                            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|    As much of the invoking packet as possible                 |
.                                                               .
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

For the base RFC 4443 Destination Unreachable format, the "Unused"
4 bytes are set to zero by the sender and ignored by the receiver
(reserved for future use).
```

## Common Destination Unreachable Codes

```text
Code 0: No route to destination
  → Forwarding node has no matching routing table entry for the destination
  → This can occur only on nodes that do not have a default route
  → Roughly equivalent to IPv4 "net unreachable"

Code 1: Communication with destination administratively prohibited
  → Firewall or policy rule dropped the packet
  → Source is informed that forwarding was policy-denied
  → Network-layer error; not the same thing as a TCP RST

Code 2: Beyond scope of source address
  → Source address scope doesn't allow reaching the destination
  → Example: trying to reach a global address from a link-local source
    outside the local link

Code 3: Address unreachable
  → Delivery failed for reasons not covered by the other codes
  → Example: Neighbor Discovery failed to resolve the IPv6 address to a link-layer address
  → Roughly equivalent to IPv4 "host unreachable"

Code 4: Port unreachable
  → Destination host received the packet but the transport protocol had no listener
  → Commonly generated for UDP by the destination, not by a router
  → TCP usually uses a TCP RST instead of ICMPv6 Code 4

Code 5: Source address failed ingress/egress policy
  → Packet rejected due to ingress or egress filtering
  → Used with BCP 38 / uRPF filtering

Code 6: Reject route to destination
  → Router has a "reject" route entry for the destination
  → Explicitly configured to reject traffic to this prefix

Code 7: Error in Source Routing Header
  → RPL Source Routing Header caused a forwarding error
  → Used when a router cannot satisfy the strict source-route requirement
```

## Parsing Destination Unreachable

```python
import struct

DEST_UNREACHABLE_CODES = {
    0: "No route to destination",
    1: "Communication with destination administratively prohibited",
    2: "Beyond scope of source address",
    3: "Address unreachable",
    4: "Port unreachable",
    5: "Source address failed ingress/egress policy",
    6: "Reject route to destination",
    7: "Error in Source Routing Header",
}

def parse_destination_unreachable(icmpv6_data: bytes) -> dict:
    """
    Parse ICMPv6 Destination Unreachable message.
    icmpv6_data: complete ICMPv6 message starting with Type byte
    """
    if len(icmpv6_data) < 8:
        raise ValueError("Minimum 8 bytes required")

    icmp_type, code, checksum, unused = struct.unpack("!BBHI", icmpv6_data[:8])

    if icmp_type != 1:
        raise ValueError(f"Expected Type=1 (Dest Unreachable), got {icmp_type}")

    code_description = DEST_UNREACHABLE_CODES.get(code, f"Unknown code {code}")

    # Extract the invoking packet (starts at byte 8)
    invoking_packet = icmpv6_data[8:]

    # Try to extract destination from invoking packet's IPv6 header
    offending_dst = None
    offending_src = None
    if len(invoking_packet) >= 40:
        import socket
        try:
            offending_src = socket.inet_ntop(socket.AF_INET6, invoking_packet[8:24])
            offending_dst = socket.inet_ntop(socket.AF_INET6, invoking_packet[24:40])
        except Exception:
            pass

    return {
        "type": 1,
        "code": code,
        "code_description": code_description,
        "offending_src": offending_src,
        "offending_dst": offending_dst,
        "invoking_packet_bytes": len(invoking_packet),
    }
```

## Diagnosing with tcpdump

```bash
# Capture ICMPv6 Destination Unreachable messages

sudo tcpdump -i eth0 -v "icmp6[icmp6type] == icmp6-destinationunreach"

# Filter specific codes (e.g., Code 4: Port unreachable)
# icmp6[icmp6type] = Type, icmp6[icmp6code] = Code
sudo tcpdump -i eth0 -v "icmp6[icmp6type] == icmp6-destinationunreach and icmp6[icmp6code] == 4"

# Filter Code 1 (administratively prohibited - may indicate firewall drops)
sudo tcpdump -i eth0 -v "icmp6[icmp6type] == icmp6-destinationunreach and icmp6[icmp6code] == 1"

# Test: send UDP to a closed port (should trigger Code 4)
echo test | nc -6u -w1 2001:db8::1 12345
# In another terminal, watch for the Port Unreachable message
sudo tcpdump -i eth0 -v "icmp6[icmp6type] == icmp6-destinationunreach and icmp6[icmp6code] == 4"
```

## Conclusion

ICMPv6 Destination Unreachable covers a range of failure scenarios through its Code field. Code 0 indicates routing failure, Code 1 indicates policy block (firewall), Code 3 often indicates NDP/link-specific delivery failure, and Code 4 indicates no UDP listener on the destination port. When troubleshooting IPv6 connectivity, the specific Code value immediately identifies the failure category: routing (Code 0), security policy (Code 1), NDP/link-specific delivery failure (Code 3), or no destination-side UDP listener (Code 4).
