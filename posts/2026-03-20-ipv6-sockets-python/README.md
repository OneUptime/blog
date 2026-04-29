# How to Create IPv6 Sockets in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, IPv6, Socket, Networking, AF_INET6, Socket Programming

Description: Create IPv6 TCP and UDP sockets in Python using the socket module, build IPv6 servers and clients, and implement protocol-independent networking with getaddrinfo.

## Introduction

Python's `socket` module supports IPv6 through `socket.AF_INET6`. IPv6 socket addresses in Python typically use a 4-tuple `(host, port, flowinfo, scope_id)` instead of IPv4's 2-tuple `(host, port)`. This guide covers creating IPv6 servers and clients with both direct socket calls and higher-level abstractions.

## IPv6 TCP Server

```python
import socket
import threading

def handle_client(conn: socket.socket, addr: tuple) -> None:
    """Handle a single IPv6 client connection."""
    # IPv6 address tuple: (host, port, flowinfo, scope_id)
    host, port, flowinfo, scope_id = addr
    print(f"Connection from [{host}]:{port}")

    conn.sendall(b"Hello IPv6 client!\n")
    conn.close()

def start_ipv6_tcp_server(port: int = 8080) -> None:
    """Start a TCP server listening on IPv6 wildcard address."""
    # AF_INET6 for IPv6
    # SOCK_STREAM for TCP
    server = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)

    # Enable SO_REUSEADDR to avoid "Address already in use"
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

    # Optional: Enable dual-stack on platforms that support it
    # 0 = allow IPv4 connections too (via IPv4-mapped IPv6 addresses)
    if socket.has_dualstack_ipv6():
        server.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)

    # Bind to '::' (IPv6 wildcard) - listens on all IPv6 interfaces
    server.bind(('::', port, 0, 0))
    server.listen(5)
    print(f"IPv6 server listening on [::]:{ port}")

    while True:
        conn, addr = server.accept()
        t = threading.Thread(target=handle_client, args=(conn, addr))
        t.daemon = True
        t.start()

# Uncomment to run:

# start_ipv6_tcp_server(8080)
```

## IPv6 TCP Client

```python
import socket

def connect_ipv6(host: str, port: int) -> socket.socket:
    """Connect to an IPv6 server."""
    sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
    sock.settimeout(10)

    # IPv6 connect uses 4-tuple: (host, port, flowinfo, scope_id)
    # For global addresses, flowinfo=0 and scope_id=0
    sock.connect((host, port, 0, 0))
    return sock

# Connect to local IPv6 loopback
try:
    client = connect_ipv6('::1', 8080)
    data = client.recv(1024)
    print(f"Received: {data.decode()}")
    client.close()
except ConnectionRefusedError:
    print("Connection refused - is the server running?")
```

## IPv6 UDP Socket

```python
import socket

def ipv6_udp_server(port: int = 55000) -> None:
    """Simple UDP server listening on IPv6."""
    sock = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind(('::', port, 0, 0))
    print(f"UDP server on [::]:{ port}")

    while True:
        data, addr = sock.recvfrom(4096)
        host, port, _, _ = addr
        print(f"Received {len(data)} bytes from [{host}]:{port}: {data.decode()}")

        # Send reply
        sock.sendto(b"ACK", addr)

def ipv6_udp_client(server: str, port: int, message: str) -> None:
    """Send a UDP datagram to an IPv6 server."""
    sock = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
    sock.settimeout(5)

    sock.sendto(message.encode(), (server, port, 0, 0))
    reply, addr = sock.recvfrom(1024)
    print(f"Reply from [{addr[0]}]: {reply.decode()}")
    sock.close()
```

## Protocol-Independent with getaddrinfo

The recommended approach for portable code:

```python
import socket

def connect_to_host(host: str, port: int) -> socket.socket:
    """
    Connect to host:port using whatever protocol is available.
    Tries addresses in the order returned by getaddrinfo().
    """
    # AF_UNSPEC = accept both IPv4 and IPv6
    addr_infos = socket.getaddrinfo(
        host, port,
        family=socket.AF_UNSPEC,
        type=socket.SOCK_STREAM,
        flags=socket.AI_ADDRCONFIG  # Only return address families the system can use
    )

    last_exception = None
    for family, socktype, proto, canonname, sockaddr in addr_infos:
        sock = None
        try:
            sock = socket.socket(family, socktype, proto)
            sock.settimeout(10)
            sock.connect(sockaddr)
            print(f"Connected via {'IPv6' if family == socket.AF_INET6 else 'IPv4'}")
            return sock
        except OSError as e:
            if sock is not None:
                sock.close()
            last_exception = e
            continue

    raise ConnectionError(f"Could not connect to {host}:{port}") from last_exception

# Connect - may use IPv6 or IPv4 depending on system address ordering
conn = connect_to_host('example.com', 443)
conn.close()
```

## Context Manager for IPv6 Sockets

```python
import socket
from contextlib import contextmanager

@contextmanager
def ipv6_socket(type=socket.SOCK_STREAM):
    """Context manager for IPv6 sockets."""
    sock = socket.socket(socket.AF_INET6, type)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        yield sock
    finally:
        sock.close()

# Usage
with ipv6_socket() as server:
    server.bind(('::', 8080, 0, 0))
    server.listen(5)
    conn, addr = server.accept()
    conn.sendall(b"Hello!")
    conn.close()
```

## Handling Link-Local Addresses with Scope ID

Link-local addresses (fe80::/10) require a scope ID:

```python
import socket

# Connect to a link-local address on interface eth0
# The scope_id is the interface index
import socket

# Get the interface index for eth0
scope_id = socket.if_nametoindex('eth0')

sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
# Scope ID is the 4th element in the address tuple
sock.connect(('fe80::1', 8080, 0, scope_id))
```

## Conclusion

Python IPv6 sockets use `socket.AF_INET6` and typically work with 4-tuple addresses `(host, port, flowinfo, scope_id)`, often `(host, port, 0, 0)` when no scope is needed. Bind servers to `'::'` for all interfaces, and use `socket.getaddrinfo()` with `AF_UNSPEC` for protocol-independent code that tries addresses in the order the system returns them. For link-local addresses, include the interface index as the scope_id in the 4-tuple.
