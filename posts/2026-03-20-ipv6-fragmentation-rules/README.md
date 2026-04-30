# How to Understand IPv6 Fragmentation Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Fragmentation, MTU, Path MTU Discovery, RFC 8200

Description: Understand the rules governing IPv6 packet fragmentation, how it differs fundamentally from IPv4, and what the source must do when packets exceed the path MTU.

## Introduction

IPv6 fragmentation follows fundamentally different rules than IPv4. In IPv4, any router can fragment a packet; in IPv6, only the source can fragment. This architectural change improves router performance but places more responsibility on the source. Understanding these rules is essential for implementing IPv6 applications and troubleshooting connectivity issues.

## Core IPv6 Fragmentation Rules (RFC 8200)

```text
Rule 1: Only the source can fragment
  → No intermediate router may fragment an IPv6 packet
  → A router that receives a packet too large for the next link:
    MUST drop the packet
    MUST send ICMPv6 "Packet Too Big" to the source

Rule 2: The source must respect the Path MTU
  → For efficiency, source performs Path MTU Discovery
  → Initial assumption: Path MTU = MTU of the first hop
  → Nodes that do not implement PMTUD must keep packets at or below 1280 bytes
  → When ICMPv6 Packet Too Big received: reduce packet size

Rule 3: Minimum MTU = 1280 bytes
  → Every IPv6 link must support at least 1280 bytes
  → Source may send packets no larger than 1280 bytes without PMTUD

Rule 4: Fragmentation uses the Fragment Extension Header
  → Fragment header (NH=44) inserted after the per-fragment headers
  → Each fragment contains: IPv6 base + per-fragment headers + Fragment header + payload chunk
  → All extension headers through the Upper-Layer header must be in the first fragment
  → Fragment header carries: offset, more-flag, identification

Rule 5: Fragment offset must be multiple of 8
  → Fragment Offset field is in units of 8 bytes
  → All fragments except the last must be a multiple of 8 bytes

Rule 6: Atomic fragments
  → Atomic fragment = Fragment Header present with offset=0 and M=0
  → Receivers must process atomic fragments independently of other fragments
  → Generating atomic fragments is discouraged in current IPv6 guidance
```

## IPv6 vs IPv4 Fragmentation Comparison

```text
IPv4:
  Routers may fragment packets  → unless the DF bit is set
  DF bit controls fragmentability → sources can prevent router fragmentation
  Fragmentation can occur in transit → routers may split oversized packets
  Min link MTU: 68 bytes        → much lower minimum than IPv6

IPv6:
  Only source can fragment      → eliminates router fragmentation overhead
  Source fragments only when needed → routers never fragment in transit
  PMTUD strongly recommended    → Packet Too Big messages drive PMTU reduction
  Min link MTU: 1280 bytes      → higher minimum than IPv4
```

## The Source Fragmentation Process

```python
from secrets import randbits

class IPv6Fragmenter:
    """Implements IPv6 source fragmentation per RFC 8200."""

    def __init__(self, path_mtu: int = 1500):
        self.path_mtu = path_mtu
        self._identification = {}

    def _next_id(self, src: str, dst: str) -> int:
        """Generate a per-(source, destination) fragment identification."""
        key = (src, dst)
        if key not in self._identification:
            self._identification[key] = randbits(32)
        else:
            self._identification[key] = (self._identification[key] + 1) & 0xFFFFFFFF
        return self._identification[key]

    def needs_fragmentation(self, payload_bytes: int,
                             per_fragment_headers_bytes: int = 0) -> bool:
        """Return True if the payload needs fragmentation."""
        ipv6_total = 40 + per_fragment_headers_bytes + payload_bytes
        return ipv6_total > self.path_mtu

    def fragment_payload(self, payload: bytes,
                          src: str, dst: str,
                          next_header: int,
                          per_fragment_headers_bytes: int = 0) -> list[dict]:
        """
        Fragment a payload into IPv6 packets.

        Args:
            payload:     The fragmentable part of the original packet
            src:         Source IPv6 address
            dst:         Destination IPv6 address
            next_header: The Next Header value for the original payload
            per_fragment_headers_bytes:
                         Bytes of headers that appear before the Fragment header

        Returns:
            List of fragment descriptors
        """
        IPV6_HEADER = 40
        FRAG_HEADER = 8

        # Maximum data per fragment (must be multiple of 8)
        per_fragment_overhead = IPV6_HEADER + per_fragment_headers_bytes + FRAG_HEADER
        max_data = (self.path_mtu - per_fragment_overhead) // 8 * 8
        if max_data <= 0:
            raise ValueError("path_mtu is too small for the IPv6 and Fragment headers")

        identification = self._next_id(src, dst)
        fragments = []
        offset = 0

        while offset < len(payload):
            chunk = payload[offset:offset + max_data]
            more = 1 if (offset + len(chunk)) < len(payload) else 0
            fragments.append({
                "offset": offset,
                "offset_field": offset // 8,  # In 8-byte units
                "data": chunk,
                "more_flag": more,
                "identification": identification,
                "next_header": next_header,
            })
            offset += len(chunk)

        return fragments

# Example: fragment a 3000-byte TCP segment

fragmenter = IPv6Fragmenter(path_mtu=1500)
tcp_plus_data = bytes(3000)  # Simulate TCP header + data

if fragmenter.needs_fragmentation(len(tcp_plus_data)):
    frags = fragmenter.fragment_payload(tcp_plus_data, "2001:db8::1", "2001:db8::2", 6)
    print(f"Fragmented into {len(frags)} pieces:")
    for f in frags:
        print(f"  Offset {f['offset']}: {len(f['data'])} bytes, More={f['more_flag']}")
```

## Fragment Identification

The 32-bit Identification field links all fragments of the same original packet:

```text
Identification rules:
  - Must be unique for fragmented packets with the same source/destination pair
    for as long as earlier fragments could still be in flight
  - RFC 7739 recommends avoiding predictable global counters
  - Per-destination counters initialized to random values are one suggested approach
  - Not required to be sequential
  - Reassembly timeout is 60 seconds, so IDs must not be reused too quickly
```

## Atomic Fragments

RFC 6946 addressed a security issue with "atomic fragments" - single packets that have a Fragment Header but are not actually fragmented (offset=0, M=0):

```text
Atomic fragment notes:
  - Earlier IPv6 specifications could trigger atomic fragments after an ICMPv6
    "Packet Too Big" advertising an MTU below 1280 bytes
  - RFC 6946 requires receivers to process atomic fragments in isolation from
    any other queued fragments with the same identification
  - RFC 8200 removed the old requirement to generate atomic fragments for
    Packet Too Big messages below 1280
  - RFC 8021 further discourages generating atomic fragments
```

## Conclusion

IPv6 fragmentation places the entire responsibility on the source. Routers that receive oversized packets send ICMPv6 Packet Too Big and drop the packet - they never fragment. This requires sources to track path MTU correctly and to create proper Fragment Headers when fragmentation is needed. Fragment offset must be in multiples of 8 bytes, the identification must be unique within a reasonable timeframe, and all fragments except the last must be a multiple of 8 bytes. Understanding these rules is prerequisite to implementing any IPv6 application that sends large data.
