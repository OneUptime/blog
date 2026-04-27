# How to Build a Peer-to-Peer File Sharing Application over IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, IPv4, P2P, File Sharing, TCP, Networking

Description: Learn how to build a simple peer-to-peer file sharing application over IPv4 in Python, with chunked transfer, progress tracking, and checksum verification.

## File Server: Send a File

```python
import socket
import struct
import hashlib
import os

CHUNK_SIZE = 65536  # 64 KB

def send_file(conn: socket.socket, filepath: str) -> None:
    filename = os.path.basename(filepath)
    filesize = os.path.getsize(filepath)

    # Compute MD5 checksum for integrity verification
    md5 = hashlib.md5()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(CHUNK_SIZE), b""):
            md5.update(chunk)
    checksum = md5.hexdigest()

    # Send header: [4B name_len][name][8B size][32B md5]
    name_bytes = filename.encode()
    header = struct.pack(">I", len(name_bytes)) + name_bytes + \
             struct.pack(">Q", filesize) + checksum.encode()
    conn.sendall(header)

    # Send file data
    sent = 0
    with open(filepath, "rb") as f:
        while True:
            chunk = f.read(CHUNK_SIZE)
            if not chunk:
                break
            conn.sendall(chunk)
            sent += len(chunk)
            pct = sent / filesize * 100
            print(f"\rSending {filename}: {pct:.1f}%", end="", flush=True)
    print(f"\nSent {filename} ({filesize} bytes)")

def file_server(port: int = 8888, filepath: str = "shared.zip") -> None:
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(("0.0.0.0", port))
    server.listen(1)
    print(f"File server on 0.0.0.0:{port}")

    conn, addr = server.accept()
    print(f"Peer connected: {addr}")
    with conn:
        send_file(conn, filepath)
    server.close()
```

## File Client: Receive a File

```python
import socket
import struct
import hashlib

CHUNK_SIZE = 65536

def recv_exact(sock: socket.socket, n: int) -> bytes:
    buf = b""
    while len(buf) < n:
        chunk = sock.recv(n - len(buf))
        if not chunk:
            raise ConnectionError("Connection closed")
        buf += chunk
    return buf

def recv_file(host: str, port: int, output_dir: str = ".") -> None:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.connect((host, port))
        print(f"Connected to {host}:{port}")

        # Read header
        name_len   = struct.unpack(">I", recv_exact(s, 4))[0]
        filename   = recv_exact(s, name_len).decode()
        filesize   = struct.unpack(">Q", recv_exact(s, 8))[0]
        checksum   = recv_exact(s, 32).decode()

        print(f"Receiving: {filename} ({filesize} bytes)")

        # Receive and write file
        md5      = hashlib.md5()
        received = 0
        outpath  = f"{output_dir}/{filename}"

        with open(outpath, "wb") as f:
            while received < filesize:
                to_read = min(CHUNK_SIZE, filesize - received)
                chunk   = recv_exact(s, to_read)
                f.write(chunk)
                md5.update(chunk)
                received += len(chunk)
                pct = received / filesize * 100
                print(f"\rReceiving {filename}: {pct:.1f}%", end="", flush=True)

    print()
    actual = md5.hexdigest()
    if actual == checksum:
        print(f"Checksum OK: {checksum}")
    else:
        print(f"CHECKSUM MISMATCH! expected={checksum} actual={actual}")
```

## Multi-File Server

```python
import socket
import struct
import threading
import os

def handle(conn: socket.socket, directory: str) -> None:
    # Send a manifest of available files, then serve requested file
    files = os.listdir(directory)
    manifest = "\n".join(files).encode()
    conn.sendall(struct.pack(">I", len(manifest)) + manifest)

    # Wait for filename request
    req_len  = struct.unpack(">I", recv_exact(conn, 4))[0]
    req_name = recv_exact(conn, req_len).decode()

    if req_name in files:
        send_file(conn, os.path.join(directory, req_name))
    else:
        conn.sendall(b"\x00" * 4)  # zero-length = not found
    conn.close()
```

## Conclusion

P2P file transfer over TCP uses a simple header protocol: send metadata (filename, size, checksum) before the data stream. `sendall` and `recv_exact` (implemented with a read loop) ensure all bytes are delivered reliably. MD5 checksums verify integrity after transfer. For large files, report progress by tracking bytes sent/received against the total. For production applications, use a proper protocol with acknowledgements, resumable transfers, and encryption (TLS).
