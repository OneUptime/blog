# How to Create IPv6 TCP Sockets in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, IPv6, TCP, Socket, Networking, Programming

Description: Create IPv6 TCP client and server sockets in Python using the socket module, handle dual-stack connections, and manage IPv6 address formatting.

## Creating an IPv6 TCP Server

Use `socket.AF_INET6` for IPv6 sockets. Bind to `::` to listen on all IPv6 interfaces:

```python
import socket

def create_ipv6_tcp_server(port: int = 8080):
    """Create a simple IPv6 TCP echo server."""
    # AF_INET6 = IPv6, SOCK_STREAM = TCP
    server_sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)

    # Allow reuse of address after server restart
    server_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

    # Request dual-stack on platforms that support dual-stack IPv6 sockets
    # Set IPV6_V6ONLY=1 for an IPv6-only listener
    server_sock.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)

    # Bind to :: (all IPv6 interfaces), port 8080
    # IPv6 bind tuple: (host, port, flowinfo, scope_id)
    server_sock.bind(('::', port, 0, 0))
    server_sock.listen(10)

    print(f"Server listening on [::]:{port}")

    while True:
        conn, addr = server_sock.accept()
        # addr is a 4-tuple for IPv6: (host, port, flowinfo, scope_id)
        print(f"Connection from: {addr[0]}:{addr[1]}")

        try:
            data = conn.recv(1024)
            conn.sendall(data)  # Echo the data back
        finally:
            conn.close()

# Run: create_ipv6_tcp_server(8080)

```

## Creating an IPv6 TCP Client

Connect to an IPv6 server using an IPv6 literal or a hostname resolved via `getaddrinfo`:

```python
import socket

def ipv6_tcp_connect(host: str, port: int) -> bytes:
    """
    Connect to an IPv6 server and receive a response.
    host can be an IPv6 address or a hostname.
    """
    # Use getaddrinfo to resolve an IPv6 literal or a hostname
    # and get the correct socket parameters
    addr_info = socket.getaddrinfo(
        host, port,
        family=socket.AF_INET6,     # Force IPv6
        type=socket.SOCK_STREAM,    # TCP
        proto=socket.IPPROTO_TCP
    )

    if not addr_info:
        raise ConnectionError(f"Could not resolve {host}")

    # Use the first result
    af, socktype, proto, canonname, sockaddr = addr_info[0]

    sock = socket.socket(af, socktype, proto)
    sock.settimeout(10)

    try:
        sock.connect(sockaddr)
        sock.sendall(b"Hello over IPv6!")
        response = sock.recv(1024)
        return response
    finally:
        sock.close()

# Connect to localhost IPv6
# response = ipv6_tcp_connect("::1", 8080)
# print(response)

# Connect to a hostname (AAAA record)
# response = ipv6_tcp_connect("ipv6.google.com", 80)
```

## Dual-Stack Server (IPv4 and IPv6)

Handle both IPv4 and IPv6 clients on the same server when the platform supports dual-stack IPv6 sockets:

```python
import socket
import threading

def handle_client(conn, addr):
    """Handle a single client connection."""
    print(f"Client: {addr}")
    try:
        data = conn.recv(1024)
        if data:
            conn.sendall(b"ACK: " + data)
    finally:
        conn.close()

def dual_stack_server(port: int = 9000):
    """
    Dual-stack TCP server: accepts both IPv4 and IPv6 connections
    on platforms that support dual-stack IPv6 sockets.
    """
    if not socket.has_dualstack_ipv6():
        raise OSError("Dual-stack IPv6 sockets are not supported on this platform")

    sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

    # Dual-stack: IPv4 mapped to IPv6 (e.g., ::ffff:192.0.2.1)
    sock.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)

    sock.bind(('::', port))
    sock.listen(100)
    print(f"Dual-stack server on port {port}")

    while True:
        conn, addr = sock.accept()
        client_thread = threading.Thread(target=handle_client, args=(conn, addr))
        client_thread.daemon = True
        client_thread.start()
```

## Connecting to Link-Local Addresses

Link-local addresses require a scope ID (interface name or index):

```python
import socket

def connect_link_local(address: str, interface: str, port: int):
    """
    Connect to an IPv6 link-local address.
    interface: the network interface name (e.g., 'eth0')
    """
    # Get scope ID from interface name
    scope_id = socket.if_nametoindex(interface)

    sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
    try:
        # Link-local connect tuple: (address, port, flowinfo, scope_id)
        sock.connect((address, port, 0, scope_id))
        sock.sendall(b"Hello via link-local!")
        response = sock.recv(1024)
        print(f"Response: {response}")
    finally:
        sock.close()

# Example: connect to fe80::1 on eth0
# connect_link_local("fe80::1", "eth0", 8080)
```

## Async IPv6 TCP with asyncio

```python
import asyncio
import socket

async def ipv6_echo_client(host: str, port: int):
    """Async IPv6 TCP client."""
    reader, writer = await asyncio.open_connection(
        host, port,
        family=socket.AF_INET6  # Force IPv6
    )

    writer.write(b"Hello async IPv6!")
    await writer.drain()

    data = await reader.read(1024)
    print(f"Received: {data.decode()}")

    writer.close()
    await writer.wait_closed()

# asyncio.run(ipv6_echo_client("::1", 8080))
```

## Conclusion

Creating IPv6 TCP sockets in Python uses `socket.AF_INET6` instead of `socket.AF_INET`. The key differences are: IPv6 socket addresses use the tuple form `(host, port, flowinfo, scope_id)` (with `flowinfo` and `scope_id` often omitted unless needed), use `getaddrinfo` for hostname resolution, and set `IPV6_V6ONLY=0` for dual-stack support on platforms that provide dual-stack IPv6 sockets. Link-local addresses require the interface scope ID via `socket.if_nametoindex()`.
