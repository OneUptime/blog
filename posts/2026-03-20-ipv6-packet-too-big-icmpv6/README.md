# How to Understand ICMPv6 Packet Too Big Messages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, ICMPv6, Packet Too Big, Path MTU Discovery, RFC 4443

Description: Understand the structure and purpose of ICMPv6 Packet Too Big messages, how routers generate them, and how sources use them to implement Path MTU Discovery.

## Introduction

ICMPv6 Packet Too Big (Type 2) is the mechanism that replaces IPv4 router fragmentation. When an IPv6 router receives a packet that is too large to forward on the next link, it cannot fragment the packet - instead, it drops the packet and sends a Packet Too Big message back to the source. The source uses this information to reduce its packet size and retransmit.

## Packet Too Big Message Format

```text
ICMPv6 Packet Too Big Message (RFC 4443):

 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|     Type = 2  |     Code = 0  |           Checksum            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                             MTU                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|    As much of invoking packet as possible without the ICMPv6  |
+   packet exceeding the minimum IPv6 MTU (1280 bytes)          |
```

```text
Field definitions:
  Type:  2 (Packet Too Big)
  Code:  0 (always zero for this message type)
  MTU:   The MTU of the next-hop link that could not forward the packet
         The source uses this as a tentative PMTU value
         (discarding values below 1280 bytes per RFC 8201)
  Body:  As much of the original (too-large) packet as possible,
         up to a total ICMPv6 message size of 1280 bytes
         (allows the source to identify which packet caused the error)
```

## How Routers Generate Packet Too Big

```text
Router PTB generation process:

1. Router receives IPv6 packet from ingress interface
2. Looks up destination in routing table
3. Selects egress interface with MTU < packet size
4. Action:
   a. Drop the original packet (cannot forward)
   b. Construct ICMPv6 Packet Too Big:
      - Src: Router's unicast address chosen for sending the reply
             back to the original source
      - Dst: Original packet's source address
      - MTU: Egress interface MTU
      - Body: Copy as much of the original packet as fits,
        up to (1280 - 48) = 1232 bytes
        (1280 total - 40 IPv6 - 8 ICMPv6 header)
5. Send PTB back to original source
```

## Parsing a Packet Too Big Message

```python
import struct

def parse_packet_too_big(icmpv6_data: bytes) -> dict:
    """
    Parse an ICMPv6 Packet Too Big message.
    icmpv6_data: bytes starting from the ICMPv6 header (Type byte)
    """
    if len(icmpv6_data) < 8:
        raise ValueError("ICMPv6 PTB requires at least 8 bytes")

    icmp_type, icmp_code, checksum, mtu = struct.unpack("!BBHI", icmpv6_data[:8])

    if icmp_type != 2:
        raise ValueError(f"Expected Type=2 (PTB), got Type={icmp_type}")
    if icmp_code != 0:
        raise ValueError(f"Expected Code=0 for PTB, got Code={icmp_code}")

    # The body contains the original invoking packet
    invoking_packet = icmpv6_data[8:]

    # Parse the first 40 bytes as the IPv6 header of the original packet
    original_header = None
    if len(invoking_packet) >= 40:
        version_tc_fl = struct.unpack("!I", invoking_packet[0:4])[0]
        original_header = {
            "version": (version_tc_fl >> 28) & 0xF,
            "payload_length": struct.unpack("!H", invoking_packet[4:6])[0],
            "next_header": invoking_packet[6],
            "hop_limit": invoking_packet[7],
        }

    return {
        "type": icmp_type,
        "code": icmp_code,
        "reported_mtu": mtu,
        "effective_mtu": mtu if mtu >= 1280 else None,
        "must_discard": mtu < 1280,  # RFC 8201: discard PTB reporting MTU < 1280
        "original_packet_preview": invoking_packet[:20].hex(),
        "original_ipv6_header": original_header,
    }
```

## The Special Case: MTU < 1280

RFC 8201 says a Packet Too Big message reporting an MTU below 1280 bytes
must be discarded for PMTUD. RFC 8200 separately requires links that cannot
carry a 1280-byte IPv6 packet in one piece to provide fragmentation and
reassembly below IPv6:

```python
def handle_packet_too_big(reported_mtu: int, destination: str,
                           pmtu_cache: dict) -> dict:
    """
    Process a received ICMPv6 Packet Too Big message.
    Updates the PMTU cache for the destination when the reported MTU is valid.
    """
    if reported_mtu < 1280:
        note = ("Discard PTB: reported MTU is below the IPv6 minimum "
                "link MTU (1280)")
        return {
            "destination": destination,
            "reported_mtu": reported_mtu,
            "effective_mtu": None,
            "accepted": False,
            "note": note,
        }

    pmtu_cache[destination] = {
        "mtu": reported_mtu,
    }

    return {
        "destination": destination,
        "reported_mtu": reported_mtu,
        "effective_mtu": reported_mtu,
        "accepted": True,
        "note": f"Update PMTU cache to {reported_mtu}",
    }

cache = {}
print(handle_packet_too_big(1200, "2001:db8::1", cache))  # Invalid PTB for PMTUD
print(handle_packet_too_big(1400, "2001:db8::2", cache))  # Normal case
```

## Monitoring PTB Messages

```bash
# Capture all incoming PTB messages

sudo tcpdump -i eth0 -n -v "icmp6[icmp6type] == icmp6-packettoobig"

# Show PTB messages with the decoded MTU value from tcpdump output
sudo tcpdump -i eth0 -n -v "icmp6[icmp6type] == icmp6-packettoobig" 2>&1 | \
    grep -E "packet-too-big|mtu"

# Count PTB messages received per minute
sudo tcpdump -i eth0 -l -n -q "icmp6[icmp6type] == icmp6-packettoobig" 2>/dev/null | \
    awk '{ minute = substr($1, 1, 5); if (last != "" && minute != last) { print count " PTBs in minute " last; count = 0 } count++; last = minute } END { if (last != "") print count " PTBs in minute " last; }'
```

## Conclusion

ICMPv6 Packet Too Big is the cornerstone of IPv6 Path MTU Discovery. Routers generate it whenever a packet exceeds the next-link MTU, allowing sources to learn and cache the path MTU. Packet Too Big messages reporting MTUs below 1280 are invalid for PMTUD and must be discarded; links that cannot carry 1280-byte IPv6 packets must handle fragmentation below IPv6. The most critical operational requirement: Packet Too Big messages must not be indiscriminately blocked by firewalls, as filtering them can break standard PMTUD and black-hole traffic.
