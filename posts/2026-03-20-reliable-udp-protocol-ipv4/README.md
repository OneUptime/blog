# How to Build a Reliable Protocol on Top of IPv4 UDP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, IPv4, UDP, Reliable, Networking, ARQ

Description: Learn how to build a reliable data transfer protocol on top of IPv4 UDP in Python using stop-and-wait ARQ with acknowledgements, sequence numbers, retransmission, and duplicate detection.

## Stop-and-Wait ARQ Over UDP

Stop-and-wait ARQ (Automatic Repeat reQuest) sends one packet at a time, waits for an ACK, and retransmits on timeout. It's simple but has low throughput on high-latency links.

```text
Sender                    Receiver
  │─── DATA seq=1 ──────►│
  │◄── ACK  seq=1 ────────│
  │─── DATA seq=2 ──────►│
  │    (lost)             │
  │    (timeout)          │
  │─── DATA seq=2 ──────►│  ← retransmit
  │◄── ACK  seq=2 ────────│
```

## Implementation

```python
import socket
import struct

HEADER   = "!BHH"       # type(1) + seq(2) + ack(2) = 5 bytes
HDR_SIZE = struct.calcsize(HEADER)
DATA_MSG = 1
ACK_MSG  = 2
MAX_SEQ  = 65535
MAX_SIZE = 512    # payload bytes per packet

def pack(msg_type: int, seq: int, ack: int, payload: bytes = b"") -> bytes:
    return struct.pack(HEADER, msg_type, seq, ack) + payload

def unpack(data: bytes) -> tuple[int, int, int, bytes]:
    msg_type, seq, ack = struct.unpack_from(HEADER, data)
    return msg_type, seq, ack, data[HDR_SIZE:]


class ReliableUDPSender:
    def __init__(self, dest_ip: str, dest_port: int,
                 timeout: float = 1.0, max_retries: int = 5):
        self.dest    = (dest_ip, dest_port)
        self.timeout = timeout
        self.retries = max_retries
        self.seq     = 0
        self.sock    = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.sock.settimeout(timeout)

    def send(self, data: bytes) -> bool:
        """Send data reliably. Returns True on success, False on max retries."""
        self.seq = (self.seq + 1) % (MAX_SEQ + 1)

        for attempt in range(self.retries):
            self.sock.sendto(pack(DATA_MSG, self.seq, 0, data), self.dest)
            while True:
                try:
                    raw, addr = self.sock.recvfrom(65535)
                    mtype, seq, ack, _ = unpack(raw)
                    if addr == self.dest and mtype == ACK_MSG and ack == self.seq:
                        return True  # acknowledged
                except socket.timeout:
                    print(f"Timeout seq={self.seq}, retry {attempt+1}/{self.retries}")
                    break

        return False

    def close(self) -> None:
        self.sock.close()


class ReliableUDPReceiver:
    def __init__(self, host: str, port: int):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.sock.bind((host, port))
        self.expected_seq = 1
        print(f"Reliable UDP receiver on {host}:{port}")

    def recv(self) -> tuple[bytes, tuple]:
        """Block until a new in-order packet is received. Returns (data, sender_addr)."""
        while True:
            raw, addr = self.sock.recvfrom(65535)
            mtype, seq, ack, payload = unpack(raw)
            if mtype != DATA_MSG:
                continue

            # Send ACK regardless (handles lost ACKs - sender will retransmit)
            self.sock.sendto(pack(ACK_MSG, 0, seq), addr)

            if seq == self.expected_seq:
                self.expected_seq = (self.expected_seq + 1) % (MAX_SEQ + 1)
                return payload, addr
            # Duplicate or out-of-order - discard (ACK already sent)

    def close(self) -> None:
        self.sock.close()
```

## Demo: File Transfer

```python
import os

def reliable_send_file(filepath: str, dest_ip: str, dest_port: int) -> None:
    sender   = ReliableUDPSender(dest_ip, dest_port)
    filesize = os.path.getsize(filepath)
    sent     = 0

    try:
        with open(filepath, "rb") as f:
            while True:
                chunk = f.read(MAX_SIZE)
                if not chunk:
                    break
                if not sender.send(chunk):
                    print("Transfer failed - giving up")
                    return
                sent += len(chunk)
                print(f"\rProgress: {sent/filesize*100:.1f}%", end="", flush=True)

        # Send empty packet as EOF marker
        if not sender.send(b""):
            print("\nTransfer failed while sending EOF marker")
            return
        print(f"\nSent {filesize} bytes")
    finally:
        sender.close()
```

## Conclusion

Stop-and-wait ARQ over UDP provides reliable delivery with minimal implementation complexity. Sequence numbers detect duplicates (sender retransmitting after a lost ACK). Always send an ACK even for duplicates to prevent infinite retransmission loops. For higher throughput, implement a sliding window (send multiple packets before waiting for ACKs) or use an established UDP-based transport implementation (for example, KCP or a QUIC library). Stop-and-wait is appropriate for low-rate control messages; sliding window is needed for bulk data transfer.
