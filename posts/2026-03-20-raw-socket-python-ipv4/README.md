# How to Build a Raw Socket Application for IPv4 in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, IPv4, Raw Sockets, ICMP, Networking, Linux

Description: Learn how to work with raw IPv4 sockets in Python to craft and send custom packets, implement ICMP ping, and receive raw IP traffic for network analysis purposes.

## What Are Raw Sockets?

Raw sockets (`SOCK_RAW`) bypass the transport layer and give direct access to IP packets. They require elevated privileges; on Linux, that typically means root or `CAP_NET_RAW`.

```text
Normal Socket:    App ↔ TCP/UDP ↔ IP ↔ Ethernet
Raw Socket:       App           ↔ IP ↔ Ethernet
```

## ICMP Ping with Raw Sockets

```python
import socket
import struct
import time
import os

def checksum(data: bytes) -> int:
    """Internet checksum (RFC 1071)."""
    if len(data) % 2:
        data += b"\x00"
    total = 0
    for i in range(0, len(data), 2):
        total += (data[i] << 8) + data[i+1]
    total  = (total >> 16) + (total & 0xFFFF)
    total += (total >> 16)
    return ~total & 0xFFFF

def build_icmp_echo(seq: int = 1) -> bytes:
    """Build an ICMP Echo Request packet."""
    pid     = os.getpid() & 0xFFFF
    header  = struct.pack("!BBHHH", 8, 0, 0, pid, seq)  # type, code, cksum, id, seq
    payload = struct.pack("!d", time.monotonic())         # 8-byte timestamp
    cksum   = checksum(header + payload)
    header  = struct.pack("!BBHHH", 8, 0, cksum, pid, seq)
    return header + payload

def ping(dest_ip: str, count: int = 4, timeout: float = 2.0) -> None:
    # Creating a raw ICMP socket requires elevated privileges on Linux.
    with socket.socket(socket.AF_INET, socket.SOCK_RAW, socket.IPPROTO_ICMP) as s:
        s.settimeout(timeout)
        pid = os.getpid() & 0xFFFF

        for seq in range(1, count + 1):
            packet = build_icmp_echo(seq)
            send_time = time.monotonic()
            s.sendto(packet, (dest_ip, 0))

            try:
                while True:
                    data, addr = s.recvfrom(1024)
                    recv_time = time.monotonic()
                    # IPv4 headers are variable length; IHL is in 32-bit words.
                    ip_header_len = (data[0] & 0x0F) * 4
                    icmp_header = data[ip_header_len:ip_header_len + 8]
                    icmp_type, _, _, recv_pid, recv_seq = struct.unpack("!BBHHH", icmp_header)
                    if icmp_type == 0 and recv_pid == pid and recv_seq == seq:
                        rtt = (recv_time - send_time) * 1000
                        print(f"Reply from {addr[0]}: seq={seq} time={rtt:.2f} ms")
                        break
            except socket.timeout:
                print(f"Request timeout for seq={seq}")

# Must run with elevated privileges (for example, as root on Linux)

# ping("8.8.8.8")
```

## Receive Raw ICMP Packets (Sniffer)

```python
import socket
import struct

def parse_ip_header(data: bytes) -> dict:
    """Parse the fixed 20-byte portion of an IPv4 header."""
    fields = struct.unpack("!BBHHHBBH4s4s", data[:20])
    return {
        "version":  (fields[0] >> 4),
        "ihl":      (fields[0] & 0x0F) * 4,
        "tos":      fields[1],
        "length":   fields[2],
        "id":       fields[3],
        "flags":    (fields[4] >> 13),
        "fragment": (fields[4] & 0x1FFF),
        "ttl":      fields[5],
        "protocol": fields[6],
        "checksum": fields[7],
        "src":      socket.inet_ntoa(fields[8]),
        "dst":      socket.inet_ntoa(fields[9]),
    }

PROTO_NAMES = {1: "ICMP", 6: "TCP", 17: "UDP"}

# Root or CAP_NET_RAW required; on Linux raw IPv4 sockets receive one protocol at a time
with socket.socket(socket.AF_INET, socket.SOCK_RAW, socket.IPPROTO_ICMP) as s:
    # Bind to all local IPv4 addresses
    s.bind(("0.0.0.0", 0))

    print("Sniffing ICMP packets (Ctrl+C to stop)")
    for _ in range(20):
        data, addr = s.recvfrom(65535)
        hdr = parse_ip_header(data)
        proto = PROTO_NAMES.get(hdr["protocol"], str(hdr["protocol"]))
        print(f"{hdr['src']:>16} → {hdr['dst']:>16}  {proto}  TTL={hdr['ttl']}")
```

## Conclusion

Raw sockets give direct access to IP-layer packets but require elevated privileges. Use them for diagnostic tools (ping, traceroute), network monitors, and custom protocol implementations. On Linux, a raw IPv4 socket receives packets for the protocol it was created with, and the IP header is already included in received data. For production network analysis, prefer libraries like Scapy or PyShark which handle platform differences and provide higher-level packet parsing. Never use raw sockets to forge source IPs for malicious purposes - many networks implement ingress filtering (BCP38) that can drop spoofed packets.
