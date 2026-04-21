# How to Transfer Files over IPv4 Using Python TCP Sockets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, TCP, File Transfer, Socket, IPv4, Networking

Description: Learn how to transfer files reliably over IPv4 using Python TCP sockets, including sending file size metadata and chunked reading.

## File Transfer Protocol Design

TCP is a byte stream: it has no built-in concept of message boundaries. This example sends a newline-terminated filename request, then the server replies with a one-byte status and an 8-byte file size so the receiver knows how many bytes to read.

## File Server

```python
import socket
import struct
import os

HOST = "0.0.0.0"
PORT = 9005
CHUNK_SIZE = 65536  # 64KB chunks for efficient transfer

def send_file(conn: socket.socket, filepath: str) -> None:
    """Send a file over an established TCP connection."""
    file_size = os.path.getsize(filepath)

    # Send a success status before the size header
    conn.sendall(b"\x01")

    # Pack file size as an 8-byte big-endian unsigned integer
    # The receiver reads exactly 8 bytes to determine how much data follows
    conn.sendall(struct.pack(">Q", file_size))

    bytes_sent = 0
    with open(filepath, "rb") as f:
        while True:
            chunk = f.read(CHUNK_SIZE)
            if not chunk:
                break
            conn.sendall(chunk)
            bytes_sent += len(chunk)

    print(f"Sent {bytes_sent}/{file_size} bytes")


def recv_filename(conn: socket.socket, max_bytes: int = 255) -> str:
    """Receive a newline-terminated filename from the client."""
    data = bytearray()
    while len(data) <= max_bytes:
        chunk = conn.recv(1)
        if not chunk:
            break
        if chunk == b"\n":
            return data.decode("utf-8")
        data.extend(chunk)
    raise ConnectionError("Filename was not terminated or was too long")


with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as srv:
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind((HOST, PORT))
    srv.listen(5)
    print(f"File server on port {PORT}")

    conn, addr = srv.accept()
    print(f"Connection from {addr}")

    with conn:
        # Receive newline-terminated requested filename from client
        filename = os.path.basename(recv_filename(conn))
        filepath = os.path.join("/srv/files", filename)

        if os.path.isfile(filepath):
            send_file(conn, filepath)
        else:
            # Send a not-found status
            conn.sendall(b"\x00")
```

## File Client

```python
import socket
import struct

SERVER_HOST = "127.0.0.1"
SERVER_PORT = 9005
CHUNK_SIZE = 65536

def receive_file(sock: socket.socket, save_path: str) -> bool:
    """Receive a file from the server and save it."""
    status = recvn(sock, 1)
    if not status:
        return False
    if status == b"\x00":
        print("File not found on server")
        return False
    if status != b"\x01":
        raise ValueError("Unknown response status")

    # Read exactly 8 bytes for the file size header
    raw_size = recvn(sock, 8)
    if not raw_size:
        return False

    file_size = struct.unpack(">Q", raw_size)[0]
    print(f"Receiving {file_size} bytes -> {save_path}")
    bytes_received = 0

    with open(save_path, "wb") as f:
        while bytes_received < file_size:
            remaining = file_size - bytes_received
            chunk = sock.recv(min(CHUNK_SIZE, remaining))
            if not chunk:
                raise ConnectionError("Connection lost mid-transfer")
            f.write(chunk)
            bytes_received += len(chunk)

    print(f"Transfer complete: {bytes_received} bytes")
    return True


def recvn(sock: socket.socket, n: int) -> bytes:
    """Receive exactly n bytes from a socket."""
    data = b""
    while len(data) < n:
        packet = sock.recv(n - len(data))
        if not packet:
            return b""
        data += packet
    return data


with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as client:
    client.connect((SERVER_HOST, SERVER_PORT))

    # Request a specific file
    filename = "report.pdf"
    client.sendall(f"{filename}\n".encode("utf-8"))

    receive_file(client, f"/tmp/{filename}")
```

## Progress Tracking

Add a simple progress indicator during transfer:

```python
def receive_with_progress(sock: socket.socket, file_size: int, save_path: str) -> None:
    bytes_received = 0
    with open(save_path, "wb") as f:
        while bytes_received < file_size:
            chunk = sock.recv(min(65536, file_size - bytes_received))
            if not chunk:
                raise ConnectionError("Connection lost mid-transfer")
            f.write(chunk)
            bytes_received += len(chunk)
            pct = (bytes_received / file_size) * 100
            print(f"\rProgress: {pct:.1f}% ({bytes_received}/{file_size} bytes)", end="")
    print()  # Newline after progress
```

## Conclusion

Reliable file transfer over TCP needs application-level framing. This protocol uses a status byte and a length-prefix header (we used an 8-byte struct) so the receiver knows how much data to expect. The `recvn()` helper ensures exact byte counts are read regardless of TCP's chunking behavior. For production use, add checksum verification (e.g., SHA-256) to detect corruption.
