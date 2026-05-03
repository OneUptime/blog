# How to Implement a Custom Protocol over IPv4 UDP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, IPv4, UDP, Custom Protocol, Networking, Framing

Description: Learn how to design and implement a custom application protocol over IPv4 UDP in Python, with message types, sequence numbers, acknowledgement tracking, and basic reliability.

## UDP Protocol Characteristics

UDP is connectionless and unreliable - packets may arrive out of order, be duplicated, or be lost. A custom UDP protocol must handle:

- **Message typing** - distinguish different message kinds
- **Sequence numbers** - detect reordering and duplicates
- **Max size** - UDP payload should stay under 1400 bytes to avoid fragmentation

## Wire Format (12-byte header)

```text
+------+------+--------+--------+--------+----------+
| VER  | TYPE | FLAGS  |  SEQ   |   ACK  |  PAYLOAD |
| 1B   | 1B   | 2B     |  4B    |  4B    |   N B    |
+------+------+--------+--------+--------+----------+
  Total header = 12 bytes
```

## Protocol Implementation

```python
import struct
import socket
import enum
import time

HEADER_FMT  = "!BBHII"
HEADER_SIZE = struct.calcsize(HEADER_FMT)  # 12 bytes
VERSION     = 0x01
MAX_PAYLOAD = 1400

class MsgType(enum.IntEnum):
    DATA  = 1
    ACK   = 2
    PING  = 3
    PONG  = 4
    ERROR = 255

class UDPMessage:
    def __init__(self, msg_type: MsgType, payload: bytes = b"",
                 seq: int = 0, ack: int = 0, flags: int = 0):
        self.msg_type = msg_type
        self.payload  = payload[:MAX_PAYLOAD]
        self.seq      = seq
        self.ack      = ack
        self.flags    = flags

    def pack(self) -> bytes:
        header = struct.pack(HEADER_FMT,
            VERSION, int(self.msg_type), self.flags,
            self.seq, self.ack)
        return header + self.payload

    @classmethod
    def unpack(cls, data: bytes) -> "UDPMessage":
        if len(data) < HEADER_SIZE:
            raise ValueError("Datagram too short")
        ver, mtype, flags, seq, ack = struct.unpack_from(HEADER_FMT, data)
        if ver != VERSION:
            raise ValueError(f"Unknown version: {ver}")
        payload = data[HEADER_SIZE:]
        return cls(MsgType(mtype), payload, seq, ack, flags)
```

## UDP Server

```python
import socket

def serve_udp(host: str = "0.0.0.0", port: int = 9001) -> None:
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind((host, port))
    print(f"UDP protocol server on {host}:{port}")

    while True:
        data, addr = sock.recvfrom(65535)
        try:
            msg = UDPMessage.unpack(data)
        except (ValueError, struct.error) as e:
            print(f"Bad packet from {addr}: {e}")
            continue

        if msg.msg_type == MsgType.PING:
            reply = UDPMessage(MsgType.PONG, seq=msg.seq, ack=msg.seq)
            sock.sendto(reply.pack(), addr)

        elif msg.msg_type == MsgType.DATA:
            print(f"Data from {addr} seq={msg.seq}: {msg.payload.decode(errors='replace')}")
            ack = UDPMessage(MsgType.ACK, seq=0, ack=msg.seq)
            sock.sendto(ack.pack(), addr)

        else:
            err = UDPMessage(MsgType.ERROR, b"Unknown type", ack=msg.seq)
            sock.sendto(err.pack(), addr)
```

## UDP Client with Simple Retry

```python
import socket
import time

def udp_send_with_retry(sock: socket.socket, msg: UDPMessage,
                        addr: tuple, retries: int = 3,
                        timeout: float = 1.0) -> UDPMessage | None:
    sock.settimeout(timeout)
    for attempt in range(retries):
        sock.sendto(msg.pack(), addr)
        try:
            data, _ = sock.recvfrom(65535)
            return UDPMessage.unpack(data)
        except socket.timeout:
            print(f"Timeout on attempt {attempt + 1}/{retries}")
    return None

# Usage

with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
    ping = UDPMessage(MsgType.PING, seq=1)
    reply = udp_send_with_retry(s, ping, ("192.168.1.10", 9001))
    if reply:
        print(f"Got {reply.msg_type.name} (ack={reply.ack})")
    else:
        print("Server unreachable")
```

## Conclusion

UDP protocol design requires explicit message typing and sequence numbers since there are no connection semantics. Keep payloads under 1400 bytes to avoid IP fragmentation. Implement retry-with-timeout on the client side for critical messages. Track sequence numbers to detect duplicate or out-of-order delivery. For truly reliable delivery over UDP, consider QUIC or KCP (a reliable UDP library) rather than implementing your own retransmission logic - these are production-tested reliable UDP implementations.
