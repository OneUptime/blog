# How to Use ICMPv6 Echo Request and Reply (ping6)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ICMPv6, Echo Request, Ping6, IPv6, Network Testing

Description: Use ICMPv6 Echo Request and Reply for IPv6 connectivity testing, understand the message format, and use advanced ping6 options for troubleshooting.

## Introduction

ICMPv6 Echo Request (Type 128) and Echo Reply (Type 129) are the IPv6 equivalents of ICMP ping. The `ping6` command sends Echo Requests and measures Round Trip Time using the replies. RFC 4443 requires every IPv6 node to implement an ICMPv6 Echo responder, and recommends an application-layer interface for originating Echo Requests and receiving Echo Replies for diagnostics. Echo Request/Reply have a simple format with an Identifier, Sequence Number, and optional data payload.

## ICMPv6 Echo Message Format

```text
ICMPv6 Echo Request (Type 128) / Echo Reply (Type 129):

 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
| Type (128/129)|   Code = 0    |          Checksum             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|           Identifier          |        Sequence Number        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|   Data (timestamp and/or arbitrary bytes for payload)        |
.                                                               .

Identifier:     16-bit value to match requests and replies
                (typically the process ID of the ping process)
Sequence Number: 16-bit, incremented for each Echo Request sent
Data:           Arbitrary (typically a timestamp for RTT calculation)
```

## Using ping6

```bash
# Basic ping6 to an IPv6 address

ping6 2001:db8::1

# On modern Linux, 'ping' handles both IPv4 and IPv6:
ping -6 2001:db8::1

# Ping a hostname that has an AAAA record
ping6 ipv6.google.com

# Specify number of pings
ping6 -c 4 2001:db8::1

# Set packet size (data bytes; total = 8 ICMPv6 + 40 IPv6 + data_size)
ping6 -s 1452 2001:db8::1  # 1500-byte total packet

# Test path MTU (PMTU checks with various sizes)
ping6 -M do -s 1452 2001:db8::1  # PMTU check: fail if too big
ping6 -M do -s 1192 2001:db8::1  # 1240-byte total (fits 1280 min MTU)

# Flood ping (typically requires elevated privileges, tests packet rate)
sudo ping6 -f 2001:db8::1

# Set interval between pings (default 1 second)
ping6 -i 0.2 2001:db8::1  # 200ms interval

# Ping link-local address (specify the interface to avoid ambiguity)
ping6 fe80::1%eth0

# Ping multicast (all nodes on link)
ping6 -I eth0 ff02::1
```

## Building ICMPv6 Echo Request in Python

```python
import socket
import struct
import time
import os

def build_echo_request(identifier: int, sequence: int,
                        data: bytes = b'') -> bytes:
    """Build an ICMPv6 Echo Request message (without checksum)."""
    # Type=128, Code=0, Checksum=0 (placeholder), ID, Seq
    header = struct.pack("!BBHHH", 128, 0, 0, identifier, sequence)
    return header + data

def calculate_icmpv6_checksum(src: str, dst: str,
                               icmpv6_data: bytes) -> int:
    """Calculate ICMPv6 checksum with IPv6 pseudo-header."""
    src_bytes = socket.inet_pton(socket.AF_INET6, src)
    dst_bytes = socket.inet_pton(socket.AF_INET6, dst)

    # IPv6 pseudo-header
    pseudo = (src_bytes + dst_bytes +
              struct.pack("!I", len(icmpv6_data)) +
              struct.pack("!I", 58))  # Next Header = ICMPv6

    data = pseudo + icmpv6_data
    if len(data) % 2:
        data += b'\x00'

    checksum = 0
    for i in range(0, len(data), 2):
        checksum += (data[i] << 8) + data[i + 1]
        checksum = (checksum & 0xFFFF) + (checksum >> 16)

    return ~checksum & 0xFFFF

def ping6(destination: str, count: int = 3) -> list:
    """Send ICMPv6 Echo Requests and collect replies."""
    results = []
    identifier = os.getpid() & 0xFFFF

    try:
        sockaddr = socket.getaddrinfo(
            destination, None, socket.AF_INET6, socket.SOCK_RAW, socket.IPPROTO_ICMPV6
        )[0][4]

        with socket.socket(socket.AF_INET6, socket.SOCK_RAW, socket.IPPROTO_ICMPV6) as s:
            s.settimeout(2.0)

            for seq in range(count):
                timestamp = struct.pack("!d", time.time())
                payload = build_echo_request(identifier, seq, timestamp)

                # For raw ICMPv6 sockets, the kernel computes the checksum.
                send_time = time.time()
                s.sendto(payload, sockaddr)

                deadline = send_time + 2.0
                while True:
                    remaining = deadline - time.time()
                    if remaining <= 0:
                        results.append({"seq": seq, "rtt_ms": None, "from": None})
                        break

                    s.settimeout(remaining)

                    try:
                        reply, addr = s.recvfrom(1024)
                    except socket.timeout:
                        results.append({"seq": seq, "rtt_ms": None, "from": None})
                        break

                    if len(reply) < 8:
                        continue

                    icmp_type, code, _checksum, reply_id, reply_seq = struct.unpack(
                        "!BBHHH", reply[:8]
                    )

                    if icmp_type != 129 or code != 0:
                        continue

                    if reply_id != identifier or reply_seq != seq:
                        continue

                    rtt = (time.time() - send_time) * 1000
                    results.append({"seq": seq, "rtt_ms": round(rtt, 3), "from": addr[0]})
                    break
    except PermissionError:
        print("Root or CAP_NET_RAW is required for raw ICMPv6 sockets")

    return results

# Show results
# results = ping6("2001:db8::1", 3)
# for r in results:
#     if r["rtt_ms"] is not None:
#         print(f"Reply from {r['from']}: seq={r['seq']} time={r['rtt_ms']}ms")
#     else:
#         print(f"Request timeout for seq {r['seq']}")
```

## Conclusion

ICMPv6 Echo Request/Reply (ping6) is the fundamental IPv6 connectivity test tool. The Identifier and Sequence Number fields allow multiplexing many simultaneous pings and ordering replies. The `-M do` option is especially useful for testing path MTU at different sizes. When testing link-local addresses, specifying the interface with the `%interface` syntax (e.g., `fe80::1%eth0`) is a good way to avoid ambiguity. Firewall policy is deployment-specific, but RFC 4890 recommends allowing IPv6 connectivity checks by default.
