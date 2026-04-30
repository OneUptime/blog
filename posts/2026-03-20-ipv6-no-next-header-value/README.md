# How to Understand the No Next Header Value in IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Next Header, Extension Headers, Protocol, RFC 8200

Description: Understand the IPv6 No Next Header value (59), when it appears, what it means for packet processing, and its legitimate use cases.

## Introduction

The No Next Header value (59, 0x3B) in the IPv6 Next Header field signals that there is no following header - the IPv6 payload may therefore be empty, and if octets are present past that point, IPv6 processing ignores them. This is a valid and intentional value defined in RFC 8200 with specific processing rules that nodes must follow.

## Where No Next Header Appears

Value 59 can appear in:
1. The IPv6 base header's Next Header field (directly after the 40-byte header)
2. Any extension header's Next Header field

```text
Scenario 1: No extension headers, no upper-layer data
[IPv6 Header, Next Header = 59] (no payload follows)

Scenario 2: Extension header chain ending in no data
[IPv6 Header] → [Dest Options Header, Next Header = 59] (no upper-layer data)

Scenario 3: Possible in fragmented packets with no upper-layer header
[IPv6 Header, Next Header = 44] → [Fragment Header, Next Header = 59]
(original packet's header chain ends after the Fragment Header)
```

## Processing Rules

RFC 8200 states:
- If a node encounters Next Header = 59, it **MUST** stop processing the header chain
- Any data after the header with Next Header = 59 is **NOT processed** by IPv6
- If such data is present, forwarding nodes pass it on unchanged; application delivery is implementation-specific

```python
def process_ipv6_headers(packet: bytes) -> dict:
    """Process IPv6 headers until No Next Header (59) or a non-extension header."""
    if len(packet) < 40:
        raise ValueError("Packet too short for IPv6 header")

    result = {
        "next_header": None,
        "headers_processed": [],
        "payload_offset": None,
        "has_payload": False,
    }

    next_header = packet[6]  # From IPv6 base header
    offset = 40              # After IPv6 base header

    while offset <= len(packet):
        result["next_header"] = next_header

        if next_header == 59:  # No Next Header
            result["headers_processed"].append("No Next Header (59)")
            result["has_payload"] = False
            result["payload_offset"] = offset
            # Per RFC 8200: stop processing, ignore any remaining bytes
            break

        elif next_header in (6, 17, 50, 58):  # TCP, UDP, ESP, ICMPv6
            result["headers_processed"].append(f"Upper Layer ({next_header})")
            result["has_payload"] = True
            result["payload_offset"] = offset
            break

        elif next_header in (0, 43, 44, 60):
            # Core RFC 8200 extension headers in this example
            if offset + 2 > len(packet):
                break

            if next_header == 44:  # Fragment: fixed 8 bytes
                if offset + 8 > len(packet):
                    break
                result["headers_processed"].append(f"Fragment Header (44)")
                next_header = packet[offset]
                offset += 8
            else:
                ext_len = (packet[offset + 1] + 1) * 8
                if offset + ext_len > len(packet):
                    break
                result["headers_processed"].append(f"Extension Header ({next_header})")
                next_header = packet[offset]
                offset += ext_len

        elif next_header == 51:  # Authentication Header: length is in 32-bit words
            if offset + 2 > len(packet):
                break

            ext_len = (packet[offset + 1] + 2) * 4
            if offset + ext_len > len(packet):
                break

            result["headers_processed"].append("Authentication Header (51)")
            next_header = packet[offset]
            offset += ext_len
        else:
            break

    return result
```

## Legitimate Use Cases for Next Header = 59

### 1. IPv6 Empty Packets for Testing

An IPv6 packet can legitimately have no upper-layer header, which is most useful for testing or diagnostics:

```python
import struct
import socket

def build_empty_ipv6_packet(src: str, dst: str, hop_limit: int = 64) -> bytes:
    """
    Build an IPv6 packet with no payload (Next Header = 59).
    Useful for testing purposes.
    """
    src_bytes = socket.inet_pton(socket.AF_INET6, src)
    dst_bytes = socket.inet_pton(socket.AF_INET6, dst)

    first_word = (6 << 28)  # Version = 6

    # Payload Length = 0 (no payload)
    # Next Header = 59 (no next header)
    header = struct.pack("!I", first_word)
    header += struct.pack("!H", 0)       # Payload Length = 0
    header += struct.pack("!B", 59)      # Next Header = No Next Header
    header += struct.pack("!B", hop_limit)
    header += src_bytes + dst_bytes

    return header

# Build an empty IPv6 packet

empty = build_empty_ipv6_packet("2001:db8::1", "2001:db8::2")
print(f"Empty IPv6 packet ({len(empty)} bytes): {empty.hex()}")
```

### 2. Fragmentation of Packets with No Upper-Layer Header

RFC 8200 explicitly allows the Fragmentable Part to begin after a header whose Next Header value is 59:

```python
# RFC 8200 allows the Fragmentable Part to begin after a header
# whose Next Header value is No Next Header.
# If octets appear after that header, IPv6 processing ignores them.
# Forwarding nodes pass those octets unchanged.

# Note: This is valid at the IPv6 layer, but such packets are unusual
# and may be filtered by firewalls or other middleboxes.
```

### 3. Testing and Protocol Research

```bash
# Send a packet with Next Header = 59 using scapy
python3 -c "
from scapy.all import *
# IPv6 packet with no payload
pkt = IPv6(src='2001:db8::1', dst='2001:db8::2', nh=59)
send(pkt, verbose=False)
print('Sent empty IPv6 packet (NH=59)')
"

# Capture packets whose IPv6 header chain contains No Next Header
sudo tcpdump -i eth0 "ip6 protochain 59"
```

## Firewall Considerations

```bash
# Decide whether to allow or block NH=59 packets
# In most production networks, unexpected inbound NH=59 is worth inspecting

# Log inbound NH=59 on the external interface before dropping it
sudo ip6tables -A INPUT -i eth0 -m ipv6header --header none --soft -j LOG --log-prefix "NH59: "

# Block inbound NH=59 on the external interface
sudo ip6tables -A INPUT -i eth0 -m ipv6header --header none --soft -j DROP
```

## Conclusion

The No Next Header value (59) is a well-defined IPv6 signaling mechanism that tells processing nodes to stop parsing headers. Legitimate uses include empty packets for testing and packets whose header chain intentionally ends without an upper-layer protocol. When encountered in production traffic, it warrants inspection since it may indicate testing or unusual applications. Most firewalls should log and potentially block unexpected Next Header = 59 packets from external sources, as there are few common reasons for internet traffic to carry this value.
