# How to Understand the IPv6 Routing Header

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Routing Header, Source Routing, Extension Headers, Security

Description: Understand the IPv6 Routing Header extension header, routing header types, why Type 0 was deprecated for security reasons, and the currently used Type 2 for Mobile IPv6.

## Introduction

The IPv6 Routing Header (Next Header = 43) specifies one or more intermediate nodes that a packet must visit on its way to the destination. This is source routing - the packet originator can specify the sequence of intermediate nodes to be visited. Due to serious security vulnerabilities in the original Type 0 Routing Header (RH0), its use has been deprecated. Active routing header types include Type 2 for Mobile IPv6, Type 3 for RPL, and Type 4 for Segment Routing.

## Routing Header General Format

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Next Header  |  Hdr Ext Len  |  Routing Type | Segments Left |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                   Type-specific data...                       |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

Routing Type: examples include 0 = Type 0 (deprecated), 2 = Type 2 (Mobile IPv6),
              3 = RPL Source Routing Header, 4 = Segment Routing (SRH)
Segments Left: Number of explicitly listed nodes still to visit
```

## Common Routing Header Types

| Type | Name | Status | RFC |
|---|---|---|---|
| 0 | Type 0 (RH0) | Deprecated / drop required | RFC 5095 |
| 1 | Nimrod | Deprecated | - |
| 2 | Mobile IPv6 | Active use | RFC 6275 |
| 3 | RPL Source Routing | IoT/low-power networks | RFC 6554 |
| 4 | Segment Routing (SRH) | Active deployment | RFC 8754 |

## Type 0 (RH0) - Why It Was Deprecated

Type 0 Routing Header allowed a source to list up to 127 IPv6 addresses for the packet to visit in sequence. This created a devastating amplification attack:

```text
Attack scenario with RH0 (RFC 5095 explains this):

Attacker → Victim1 (via Victim2) → Victim1 (via Victim2) → Victim1 ...

How it works:
1. Attacker creates packet: src=attacker, dst=Victim2, RH0=[Victim1, Victim2, Victim1, ...]
2. Victim2 receives it, sees Victim1 is next → forwards to Victim1
3. Victim1 receives it, sees Victim2 is next → forwards to Victim2
4. Packet bounces between Victim1 and Victim2 until Hop Limit = 0

Result: Single packet from attacker generates O(127) packets
         between the two victims = massive DDoS amplifier
```

RFC 5095 (2007) deprecated RH0. IPv6 nodes MUST NOT process RH0 as source routing; if `Segments Left` is non-zero, they discard the packet and send an ICMPv6 Parameter Problem message. On Linux, `accept_source_route` separately controls acceptance of Routing Header Type 2:

```bash
# Linux: inspect routing-header acceptance policy
cat /proc/sys/net/ipv6/conf/all/accept_source_route
# 0 = accept only routing header type 2 (default)
# -1 = do not accept routing headers

# Disable routing-header acceptance entirely
sudo sysctl -w net.ipv6.conf.all.accept_source_route=-1
sudo sysctl -w net.ipv6.conf.default.accept_source_route=-1
```

## Type 2 - Mobile IPv6 Routing Header

Type 2 carries exactly one address - the mobile node's home address. It is used by a correspondent node to send directly to the mobile node's care-of address; once the packet arrives, the mobile node uses the home address from the Routing Header as the final destination address:

```python
import struct
import socket

def build_type2_routing_header(home_address: str) -> bytes:
    """
    Build a Type 2 IPv6 Routing Header for Mobile IPv6.

    When a correspondent node sends directly to a mobile node's
    care-of address, it sets the IPv6 Destination Address to the
    care-of address and adds a Type 2 Routing Header with the
    mobile node's home address as the one entry.

    Args:
        home_address: The mobile node's home IPv6 address
    """
    home_bytes = socket.inet_pton(socket.AF_INET6, home_address)

    next_header_placeholder = 0  # To be set by caller
    hdr_ext_len = 2              # (2+1)*8 = 24 bytes total
    routing_type = 2             # Type 2
    segments_left = 1            # Type 2 requires Segments Left = 1 on the wire
    reserved = 0                 # 4 zero bytes

    header = struct.pack("!BBBB",
        next_header_placeholder,
        hdr_ext_len,
        routing_type,
        segments_left
    )
    header += struct.pack("!I", reserved)  # 4 reserved bytes
    header += home_bytes                    # 16-byte home address
    # Total: 4 + 4 + 16 = 24 bytes ✓

    return header

rh2 = build_type2_routing_header("2001:db8:100::1")
print(f"Type 2 Routing Header ({len(rh2)} bytes): {rh2.hex()}")
```

## Segment Routing Header (SRH, Type 4)

RFC 8754 defines the Segment Routing Header for traffic engineering in modern networks:

```text
SRH enables:
- Explicit path through specific network nodes
- Traffic engineering in SP networks
- Service function chaining
- Network slicing

SRH contains:
- Segment list: list of IPv6 addresses (one per segment)
- Last Entry: zero-based index of the last element in the Segment List
- Segments Left: remaining segments to visit
- Tag, flags: metadata
```

```bash
# Linux: view SRH processing support
sysctl net.ipv6.conf.all.seg6_enabled
# net.ipv6.conf.all.seg6_enabled = 0

# Enable Segment Routing
sudo sysctl -w net.ipv6.conf.all.seg6_enabled=1
```

## Conclusion

The IPv6 Routing Header's history is a lesson in security-conscious protocol design. Type 0's source routing was a powerful but exploitable feature - deprecated after its amplification attack potential was recognized. Modern deployments use specialized routing headers such as Type 2 (Mobile IPv6), Type 3 (RPL), and Type 4 (Segment Routing) for legitimate source routing applications. RH0 itself is deprecated by RFC 5095; on Linux, confirm whether your policy should allow Type 2 or disable routing-header acceptance entirely.
