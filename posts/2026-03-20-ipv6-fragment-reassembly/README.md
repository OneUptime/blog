# How to Handle IPv6 Fragment Reassembly

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Fragmentation, Reassembly, RFC 8200, Networking

Description: Understand how IPv6 fragment reassembly works at the destination, the reassembly timer, handling out-of-order fragments, and common reassembly failure scenarios.

## Introduction

IPv6 fragment reassembly is performed exclusively at the destination. When a source fragments a packet, it assigns all fragments the same Identification value. The destination collects all fragments with the same (source address, destination address, Identification) key and reconstructs the original packet. RFC 8200 defines the reassembly process and its constraints.

## Reassembly Algorithm

```text
IPv6 Reassembly Steps (RFC 8200):

1. Receive fragment with Fragment Header (NH=44)
2. Extract reassembly key: (Source IP, Dest IP, Identification)
3. Create or find reassembly buffer for this key
4. Place fragment data at its Fragment Offset position
5. Mark the range [offset, offset + length) as received
6. Check completion conditions:
   a. Fragment with M=0 received (last fragment known)
   b. All byte ranges from 0 to last-fragment-end are filled
7. If complete: reconstruct original packet, deliver to upper layer
8. If not complete within timeout: discard buffer; if fragment offset 0 was received, send ICMPv6 Time Exceeded
```

## Reassembly Timer and Timeout

```bash
# Linux reassembly timeout: check kernel parameters

cat /proc/sys/net/ipv6/ip6frag_time
# Default: 60 seconds

# Netfilter conntrack has a separate IPv6 fragment timeout
cat /proc/sys/net/netfilter/nf_conntrack_frag6_timeout
# Default: 60 seconds

# Check reassembly memory limits
cat /proc/sys/net/ipv6/ip6frag_high_thresh
# Maximum memory used for reassembly (bytes)

cat /proc/sys/net/ipv6/ip6frag_low_thresh
# Memory target after fragment queues are shed back below the high threshold

# Monitor reassembly failures
cat /proc/net/snmp6 | grep -i reasm
# Ip6ReasmReqds   - total reassembly requests
# Ip6ReasmOKs     - successful reassemblies
# Ip6ReasmFails   - failed reassemblies (timeout or error)
```

## Reassembly Failure: ICMPv6 Time Exceeded

When the reassembly timer expires, the destination sends an ICMPv6 Time Exceeded message (Type 3, Code 1) to the source of the fragment with Fragment Offset 0, if that fragment has been received:

```bash
# Capture ICMPv6 reassembly timeout messages
sudo tcpdump -i eth0 -n "icmp6 and ip6[40] == 3 and ip6[41] == 1"
# Type 3 = Time Exceeded, Code 1 = Fragment Reassembly Time Exceeded

# If you see these, check:
# 1. Are all fragments arriving? (network drops)
# 2. Is the reassembly buffer large enough?
# 3. Is the source sending within the timeout window?
```

## Implementing Fragment Reassembly in Python

```python
import time

class IPv6Reassembler:
    """Illustrative reassembler for the Fragmentable Part of an IPv6 packet."""

    TIMEOUT = 60  # seconds
    MAX_REASSEMBLED_SIZE = 65_535

    def __init__(self):
        # Key: (src, dst, identification) -> reassembly state
        self._buffers = {}

    def _key(self, src: str, dst: str, identification: int) -> tuple:
        return (src, dst, identification)

    def add_fragment(self, src: str, dst: str, identification: int,
                     offset_bytes: int, more_fragments: bool, data: bytes) -> bytes | None:
        """
        Add a fragment to the reassembly buffer.
        Returns the reassembled fragment payload bytes if complete, else None.
        """
        if offset_bytes % 8 != 0:
            raise ValueError("Fragment offsets must be multiples of 8 bytes")

        if more_fragments and len(data) % 8 != 0:
            raise ValueError("All non-final fragments must have a data length that is a multiple of 8 bytes")

        if offset_bytes + len(data) > self.MAX_REASSEMBLED_SIZE:
            raise ValueError("Reassembled packet would exceed 65,535 bytes")

        # Atomic fragments are processed independently of any queued fragments.
        if offset_bytes == 0 and not more_fragments:
            return data

        key = self._key(src, dst, identification)

        if key not in self._buffers:
            self._buffers[key] = {
                "received": {},   # offset -> data
                "total_length": None,
                "created": time.time(),
            }

        buf = self._buffers[key]

        # Check timeout
        if time.time() - buf["created"] > self.TIMEOUT:
            # Discard the expired queue and treat this fragment as a new start.
            del self._buffers[key]
            self._buffers[key] = {
                "received": {},
                "total_length": None,
                "created": time.time(),
            }
            buf = self._buffers[key]

        new_end = offset_bytes + len(data)
        for frag_offset, frag_data in buf["received"].items():
            frag_end = frag_offset + len(frag_data)

            if frag_offset == offset_bytes and frag_data == data:
                return None  # Exact duplicate fragment

            if not (new_end <= frag_offset or offset_bytes >= frag_end):
                del self._buffers[key]
                return None  # RFC 8200 requires abandoning reassembly on overlap

        # Store this fragment
        buf["received"][offset_bytes] = data

        # If this is the last fragment, we know the total length
        if not more_fragments:
            buf["total_length"] = offset_bytes + len(data)

        # Check if reassembly is complete
        if buf["total_length"] is not None:
            # Verify contiguous coverage from offset 0 to total_length
            expected_offset = 0
            for frag_offset in sorted(buf["received"]):
                frag_data = buf["received"][frag_offset]
                if frag_offset != expected_offset:
                    return None
                expected_offset += len(frag_data)

            if expected_offset == buf["total_length"]:
                result = bytearray()
                for frag_offset in sorted(buf["received"]):
                    result.extend(buf["received"][frag_offset])
                del self._buffers[key]
                return bytes(result)

        return None  # Not complete yet

# Example reassembly
reassembler = IPv6Reassembler()
src, dst, ident = "2001:db8::1", "2001:db8::2", 0xABCD1234

# Receive fragments out of order
result = reassembler.add_fragment(src, dst, ident, 1448, False, b"B" * 552)
print(f"After fragment 2: {result}")  # None - incomplete

result = reassembler.add_fragment(src, dst, ident, 0, True, b"A" * 1448)
print(f"After fragment 1: {len(result)} bytes reassembled" if result else "None")
```

## Reassembly Security Considerations

Fragment reassembly has historically been an attack vector:

```text
Known fragment reassembly attacks:

1. Fragment flooding: Sending many incomplete fragment sets
   → Exhausts reassembly buffer memory
   → Mitigated by ip6frag_high_thresh limit

2. Overlapping fragments (Teardrop attack):
   → RFC 8200: Destination MUST silently discard on overlap
   → No overlapping fragments are permitted in IPv6

3. Atomic fragment attacks (RFC 6946):
   → Spoofed ICMPv6 PTB with a reported MTU below 1280 can trigger atomic fragments
   → If a stack mishandles them, an attacker can exploit Identification collisions
   → RFC 6946-compliant atomic-fragment processing removes this reassembly vector; unpredictable Identification values also reduce collision-based attacks (RFC 7739)
```

## Conclusion

IPv6 fragment reassembly is simpler than IPv4 in some respects (no overlapping fragments allowed) but places the full burden on the destination. The 60-second reassembly timer means all fragments of a packet must arrive within one minute of the first-arriving fragment. Reassembly buffers are memory-limited, so high fragment rates can exhaust them. In practice, IPv6 fragmentation should be avoided through proper PMTUD implementation - fragmentation is a fallback mechanism, not a primary design pattern.
