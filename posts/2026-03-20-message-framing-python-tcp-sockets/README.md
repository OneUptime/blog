# How to Implement Message Framing for Python IPv4 TCP Sockets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, TCP, Message Framing, Socket, IPv4, Protocol Design

Description: Learn how to implement message framing techniques for Python TCP sockets to reliably delimit messages over IPv4 byte-stream connections.

## The TCP Stream Problem

TCP is a byte stream-it preserves order and reliability but has no concept of message boundaries. A single `send("hello")` might be received as `"hel"` and `"lo"` across two `recv()` calls, or two `send()` calls may arrive in one `recv()`. Message framing solves this.

## Approach 1: Length Prefix Framing

The most reliable approach: prefix each message with its byte length.

```python
import socket
import struct


def send_msg(sock: socket.socket, data: bytes) -> None:
    """Send data with a 4-byte length prefix."""
    # '>I' = big-endian unsigned 32-bit integer (max 4GB messages)
    header = struct.pack(">I", len(data))
    sock.sendall(header + data)


def recv_msg(sock: socket.socket) -> bytes:
    """Receive a length-prefixed message."""
    # First, read the 4-byte header
    raw_header = _recvn(sock, 4)
    msg_len = struct.unpack(">I", raw_header)[0]

    # Then read exactly msg_len bytes
    return _recvn(sock, msg_len)


def _recvn(sock: socket.socket, n: int) -> bytes:
    """Read exactly n bytes, raising if the connection closes early."""
    buf = bytearray()
    while len(buf) < n:
        chunk = sock.recv(n - len(buf))
        if not chunk:
            raise ConnectionError("Connection closed before message was complete")
        buf.extend(chunk)
    return bytes(buf)
```

## Approach 2: Delimiter Framing

Use a unique delimiter (e.g., newline `\n` or `\x00`) to separate messages. Works well for text protocols:

```python
def send_line(sock: socket.socket, message: str) -> None:
    """Send a newline-terminated message."""
    if "\n" in message:
        raise ValueError("message must not contain newlines")
    sock.sendall((message + "\n").encode("utf-8"))


class LineReader:
    """Reads newline-delimited messages from a socket, handling partial reads."""

    def __init__(self, sock: socket.socket):
        self.sock = sock
        self._buf = b""

    def readline(self) -> str | None:
        """Return the next complete line, or None if connection closed."""
        while b"\n" not in self._buf:
            chunk = self.sock.recv(4096)
            if not chunk:
                return None   # Connection closed
            self._buf += chunk

        line, self._buf = self._buf.split(b"\n", 1)
        return line.decode("utf-8")
```

## Approach 3: Fixed-Size Messages

When all messages are exactly the same size, no framing metadata is needed:

```python
MSG_SIZE = 128   # Every message is exactly 128 bytes

def send_fixed(sock: socket.socket, data: bytes) -> None:
    """Pad or truncate data to MSG_SIZE and send."""
    padded = data[:MSG_SIZE].ljust(MSG_SIZE, b"\x00")
    sock.sendall(padded)

def recv_fixed(sock: socket.socket) -> bytes:
    """Receive exactly MSG_SIZE bytes."""
    return _recvn(sock, MSG_SIZE)
```

## Choosing a Framing Method

| Method | Best For | Overhead |
|--------|---------|---------|
| Length prefix | Binary protocols, variable-size messages | 4 bytes per message |
| Delimiter | Text protocols (SMTP, IRC) | delimiter length per message |
| Fixed size | Status updates, telemetry, high-frequency data | 0 bytes |

## Example: Length-Prefixed Server and Client

```python
# Server

import socket, threading

def handle(conn, addr):
    with conn:
        while True:
            try:
                msg = recv_msg(conn)
                print(f"[{addr}] {msg}")
                send_msg(conn, b"ACK: " + msg)
            except ConnectionError:
                break

srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
srv.bind(("0.0.0.0", 9010))
srv.listen(5)
while True:
    conn, addr = srv.accept()
    threading.Thread(target=handle, args=(conn, addr), daemon=True).start()
```

```python
# Client
import socket

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as c:
    c.connect(("127.0.0.1", 9010))
    send_msg(c, b"Hello, framed world!")
    print(recv_msg(c).decode())
```

## Conclusion

Message framing is essential for any custom TCP protocol. Length prefix framing is the most robust choice for binary and mixed-content protocols. Delimiter framing works well for human-readable text protocols. Always buffer received bytes and check for complete messages-never assume `recv()` returns a complete message.
