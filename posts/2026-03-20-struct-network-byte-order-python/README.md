# How to Use the struct Module for Network Byte Order in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Struct, Network Byte Order, IPv4, Binary, Networking, Socket

Description: Learn how to use Python's struct module to pack and unpack binary data in network byte order (big-endian) for IPv4 socket programming, including IP header parsing and custom protocol framing.

## struct Format Strings

```python
import struct

# Format prefixes for byte order:

#   '>' = big-endian - use for fields specified in network byte order
#   '<' = little-endian (host byte order on x86)
#   '!' = same as '>' (network byte order alias)
#   '=' = native byte order, standard size

# Common format characters:
#   B  = unsigned char  (1 byte)
#   H  = unsigned short (2 bytes)
#   I  = unsigned int   (4 bytes)
#   Q  = unsigned long long (8 bytes)
#   s  = char[] (bytes string, e.g. '4s' = 4 bytes)
```

## Packing and Unpacking Basics

```python
import struct

# Pack a 2-byte port and 4-byte IP integer into 6 bytes (network byte order)
port  = 9000
ip_int = 0xC0A80101   # 192.168.1.1 in hex

packed = struct.pack("!HI", port, ip_int)
print(f"Packed: {packed.hex()}")           # 2328c0a80101

# Unpack - returns a tuple
port_out, ip_out = struct.unpack("!HI", packed)
print(f"Port: {port_out}, IP: {ip_out:#010x}")

# Calculate size before packing
print(struct.calcsize("!HI"))   # 6 bytes
```

## Custom Protocol Header

```python
import struct

# Wire format: VERSION(1B) | TYPE(1B) | FLAGS(1B) | RESERVED(1B) | LENGTH(4B) | SEQ(4B)
HEADER_FMT = "!BBBBI I"   # 12 bytes total
HEADER_SIZE = struct.calcsize(HEADER_FMT)   # 12

def pack_header(msg_type: int, flags: int, payload: bytes, seq: int) -> bytes:
    """Build a 12-byte binary header followed by the payload."""
    header = struct.pack(HEADER_FMT, 1, msg_type, flags, 0, len(payload), seq)
    return header + payload

def unpack_header(data: bytes) -> tuple:
    """Parse the first 12 bytes into (version, type, flags, reserved, length, seq)."""
    if len(data) < HEADER_SIZE:
        raise ValueError("Too short for header")
    return struct.unpack(HEADER_FMT, data[:HEADER_SIZE])

# Example: build and parse a DATA message
payload = b"Hello, network!"
frame   = pack_header(msg_type=0x01, flags=0x00, payload=payload, seq=42)
ver, mtype, flags, _, length, seq = unpack_header(frame)
print(f"version={ver} type={mtype:#04x} length={length} seq={seq}")
print(f"payload={frame[HEADER_SIZE:].decode()}")
```

## Parsing an IPv4 Header

```python
import struct
import socket

# IPv4 header (first 20 bytes, no options):
# VER+IHL(1B) | TOS(1B) | TOTAL_LEN(2B) | ID(2B) | FLAGS+FRAG(2B)
# TTL(1B) | PROTO(1B) | CHECKSUM(2B) | SRC_IP(4B) | DST_IP(4B)
IPV4_HDR_FMT  = "!BBHHHBBH4s4s"
IPV4_HDR_SIZE = struct.calcsize(IPV4_HDR_FMT)   # 20 bytes

def parse_ipv4_header(raw: bytes) -> dict:
    if len(raw) < IPV4_HDR_SIZE:
        raise ValueError("Not enough bytes for IPv4 header")
    (ver_ihl, tos, total_len, pkt_id, flags_frag,
     ttl, proto, checksum, src, dst) = struct.unpack(IPV4_HDR_FMT, raw[:IPV4_HDR_SIZE])
    return {
        "version":   (ver_ihl >> 4),
        "ihl":       (ver_ihl & 0x0F) * 4,
        "tos":       tos,
        "total_len": total_len,
        "ttl":       ttl,
        "protocol":  proto,
        "src":       socket.inet_ntoa(src),
        "dst":       socket.inet_ntoa(dst),
    }

# Parse a raw packet captured with a raw socket
import socket as _sock
raw_sock = _sock.socket(_sock.AF_INET, _sock.SOCK_RAW, _sock.IPPROTO_ICMP)
packet, _ = raw_sock.recvfrom(65535)
hdr = parse_ipv4_header(packet)
print(f"{hdr['src']} → {hdr['dst']}  TTL={hdr['ttl']}  proto={hdr['protocol']}")
```

## Length-Prefix Framing with struct

```python
import struct
import socket

LENGTH_FMT  = "!I"   # 4-byte unsigned int, big-endian
LENGTH_SIZE = struct.calcsize(LENGTH_FMT)   # 4

def send_message(sock: socket.socket, payload: bytes) -> None:
    """Prefix the payload with its 4-byte length and send all bytes."""
    header = struct.pack(LENGTH_FMT, len(payload))
    sock.sendall(header + payload)

def recv_message(sock: socket.socket) -> bytes:
    """Read a length-prefixed message, blocking until fully received."""
    raw_len = _recvn(sock, LENGTH_SIZE)
    (msg_len,) = struct.unpack(LENGTH_FMT, raw_len)
    return _recvn(sock, msg_len)

def _recvn(sock: socket.socket, n: int) -> bytes:
    buf = b""
    while len(buf) < n:
        chunk = sock.recv(n - len(buf))
        if not chunk:
            raise ConnectionError("Connection closed")
        buf += chunk
    return buf
```

## struct Format Quick Reference

| Format | C type | Python type | Bytes |
|--------|--------|-------------|-------|
| `!B` | unsigned char | int | 1 |
| `!H` | unsigned short | int | 2 |
| `!I` | unsigned int | int | 4 |
| `!Q` | unsigned long long | int | 8 |
| `!4s` | char[4] | bytes | 4 |
| `!f` | float | float | 4 |
| `!d` | double | float | 8 |

## Conclusion

Python's `struct` module serializes and deserializes binary data using format strings. Prefix format strings with `!` (or `>`) when building or parsing protocol fields specified in network byte order (big-endian). `struct.pack()` returns bytes; `struct.unpack()` returns a tuple - index into it or use tuple unpacking. Use `struct.calcsize()` to compute header size at module load time rather than hardcoding it. Combine `struct` with `socket.inet_aton()`/`inet_ntoa()` or `socket.inet_pton()`/`inet_ntop()` for IP address serialization.
