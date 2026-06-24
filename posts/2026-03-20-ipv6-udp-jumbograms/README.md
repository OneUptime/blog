# How to Use UDP with IPv6 Jumbograms

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, UDP, Jumbograms, Jumbo Payload, RFC 2675

Description: Understand how UDP operates with IPv6 jumbograms, the special handling required for the UDP length field, and how to send large UDP datagrams over jumbogram-capable paths.

## Introduction

UDP over IPv6 normally has a maximum payload of 65527 bytes (65535 payload minus 8 bytes UDP header). With IPv6 jumbograms, the IPv6 payload can exceed 65535 bytes and UDP can exceed the normal 65527-byte limit. However, the standard UDP header's 16-bit Length field cannot represent values above 65535, requiring special handling defined in RFC 2675: when a UDP datagram is carried in a jumbogram, the UDP Length field is set to zero.

## UDP Length Field in Jumbograms

```text
Standard UDP header (RFC 768):
  Source Port  [16 bits]
  Dest Port    [16 bits]
  Length       [16 bits] = UDP header (8) + data length
  Checksum     [16 bits]

Problem with jumbograms:
  Length field is 16 bits → max value 65535
  A 100,000-byte UDP payload would need Length = 100008
  → Cannot fit in 16-bit field

RFC 2675 solution for UDP in jumbograms:
  Set UDP Length field = 0 (indicates jumbogram)
  The actual length is taken from the Jumbo Payload option
  in the IPv6 Hop-by-Hop Options header
```

## UDP Checksum in Jumbograms

The UDP checksum pseudo-header must reflect the correct jumbo length:

```python
import struct
import socket

def calculate_udp_jumbogram_checksum(
    src_ipv6: str,
    dst_ipv6: str,
    udp_payload: bytes,
) -> int:
    """
    Calculate UDP checksum for a jumbogram UDP datagram.
    Uses the actual payload length (not 0) in the pseudo-header.
    """
    udp_header_length = 8
    # UDP length field in pseudo-header uses actual full UDP length
    # (even though the UDP header itself has length=0 for jumbograms)
    actual_udp_length = udp_header_length + len(udp_payload)

    src_bytes = socket.inet_pton(socket.AF_INET6, src_ipv6)
    dst_bytes = socket.inet_pton(socket.AF_INET6, dst_ipv6)

    # IPv6 pseudo-header for checksum calculation
    pseudo_header = (
        src_bytes +
        dst_bytes +
        struct.pack("!I", actual_udp_length) +  # 32-bit length
        struct.pack("!I", 17)                    # Next Header = UDP
    )

    # UDP header with Length=0 (jumbogram indicator)
    udp_header = struct.pack("!HHHH",
        12345,  # source port
        54321,  # dest port
        0,      # Length = 0 for jumbogram
        0       # checksum placeholder
    )

    # Compute checksum over pseudo-header + UDP header + payload
    data = pseudo_header + udp_header + udp_payload

    # Pad to even length
    if len(data) % 2 != 0:
        data += b'\x00'

    checksum = 0
    for i in range(0, len(data), 2):
        word = (data[i] << 8) + data[i + 1]
        checksum += word
        checksum = (checksum & 0xFFFF) + (checksum >> 16)

    checksum = ~checksum & 0xFFFF
    # IPv6 UDP may not carry a zero checksum; use 0xFFFF instead.
    return checksum or 0xFFFF

# Example: Calculate checksum for a 100,000-byte UDP jumbogram payload

payload = b'X' * 100000
checksum = calculate_udp_jumbogram_checksum("2001:db8::1", "2001:db8::2", payload)
print(f"UDP jumbogram checksum: 0x{checksum:04X}")
```

## Sending Large UDP Datagrams on Linux

```bash
# Standard UDP socket can send up to 65507 bytes
# (65535 - 20 IPv4 header - 8 UDP header for IPv4)
# For IPv6: 65527 bytes (65535 - 8 UDP header)

# This example sends a large standard IPv6 UDP datagram, not a jumbogram.
# A true jumbogram additionally needs the IPv6 Jumbo Payload hop-by-hop
# option and a path with MTUs above 65575 octets.
# On Linux, a normal AF_INET6/SOCK_DGRAM socket still obeys the standard
# 65527-byte UDP payload limit.

# Python: send large UDP datagram
python3 << 'EOF'
import socket

s = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
s.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 10 * 1024 * 1024)

# Sending a 65000-byte UDP payload (large, but still within the standard limit)
data = b'X' * 65000
try:
    s.sendto(data, ("::1", 12345))
    print(f"Sent {len(data)} bytes successfully")
except OSError as e:
    print(f"Error: {e}")
s.close()
EOF
```

## Socket Buffer Requirements for Jumbogram UDP

```bash
# Large UDP datagrams, including jumbogram experiments, require large socket buffers
# Check current limits
cat /proc/sys/net/core/rmem_max
cat /proc/sys/net/core/wmem_max

# For large datagrams: set socket buffers to handle the full datagram
sudo sysctl -w net.core.rmem_max=134217728   # 128 MB
sudo sysctl -w net.core.wmem_max=134217728   # 128 MB

# Application must also request large buffers
# In Python:
# s.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 10 * 1024 * 1024)
# s.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 10 * 1024 * 1024)
```

## Practical Considerations

```text
When to use large UDP over IPv6:

1. Custom applications on private HPC or lab networks:
   → Can reduce per-packet overhead when every hop supports jumbograms

2. DNS with EDNS0: Can advertise larger UDP payload sizes
   → Still uses ordinary UDP in practice; jumbograms are not used

3. Video streaming (RTP/SRTP): Multiple small packets preferred
   → Better jitter control; jumbograms not recommended

4. Experimental transports built directly on UDP:
   → Only practical when the path supports jumbograms end-to-end

5. General internet applications:
   → Usually avoid jumbograms because path support is uncommon

Key limitation: UDP jumbograms require a path where every hop and
link supports jumbograms. One standard-MTU hop breaks the path.
```

## Conclusion

UDP with IPv6 jumbograms requires setting the UDP Length field to zero, with the actual length taken from the Hop-by-Hop Jumbo Payload option. The checksum pseudo-header still uses the actual (32-bit) UDP length for correctness. In practice, UDP jumbograms are relevant primarily on tightly controlled high-performance or datacenter networks where every hop and link supports them. For most applications, standard 65527-byte UDP payloads or smaller (keeping within PMTU) are the correct choice.
