# How to Create IPv6 UDP Sockets in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, IPv6, UDP, Socket, Multicast, Programming

Description: Create IPv6 UDP sockets in Python for unicast and multicast communication, including NDP multicast group membership.

## Basic IPv6 UDP Server

```python
import socket

def ipv6_udp_server(port: int = 5005):
    """IPv6 UDP server that receives and echoes datagrams."""
    # AF_INET6 = IPv6, SOCK_DGRAM = UDP
    sock = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)

    # Optional: some platforms let one IPv6 socket receive IPv4-mapped traffic too
    try:
        sock.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
    except OSError:
        pass

    # Bind to all interfaces on the specified port
    sock.bind(('::', port))
    print(f"UDP server listening on [::]:{port}")

    while True:
        # recvfrom returns (data, (address, port, flowinfo, scope_id))
        data, addr = sock.recvfrom(4096)
        print(f"Received {len(data)} bytes from {addr[0]}:{addr[1]}")

        # Echo back
        sock.sendto(b"ACK: " + data, addr)
```

## Basic IPv6 UDP Client

```python
import socket

def ipv6_udp_client(server_addr: str, port: int, message: bytes) -> bytes:
    """Send a UDP datagram to an IPv6 server and receive response."""
    sock = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
    sock.settimeout(5)

    try:
        # For IPv6, address tuple is (host, port, flowinfo, scope_id)
        server = (server_addr, port, 0, 0)
        sock.sendto(message, server)

        response, addr = sock.recvfrom(4096)
        return response
    finally:
        sock.close()

# Send a message to localhost IPv6

# response = ipv6_udp_client("::1", 5005, b"Hello IPv6 UDP!")
# print(response)
```

## IPv6 Multicast UDP

IPv6 uses multicast extensively. Send to and receive from IPv6 multicast groups:

```python
import socket
import struct

# IPv6 all-nodes multicast address
ALL_NODES_MULTICAST = "ff02::1"
# IPv6 all-routers multicast
ALL_ROUTERS_MULTICAST = "ff02::2"

def send_ipv6_multicast(
    interface: str,
    message: bytes,
    group: str = ALL_NODES_MULTICAST,
    port: int = 5006,
):
    """Send a UDP datagram to an IPv6 multicast group."""
    sock = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)

    # Set multicast hop limit (TTL equivalent for IPv6)
    sock.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_MULTICAST_HOPS, 2)

    # Get interface index for multicast
    if_index = socket.if_nametoindex(interface)
    # Set outgoing interface for multicast
    sock.setsockopt(
        socket.IPPROTO_IPV6,
        socket.IPV6_MULTICAST_IF,
        if_index
    )

    # Send to multicast group
    dest = (group, port, 0, if_index)
    sock.sendto(message, dest)
    sock.close()
    print(f"Sent to [{group}]:{port}")


def join_ipv6_multicast_group(group: str, interface: str, port: int):
    """
    Join an IPv6 multicast group and receive datagrams.
    """
    sock = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

    # Bind to the port on all interfaces
    sock.bind(('::', port))

    # Join the multicast group
    if_index = socket.if_nametoindex(interface)
    # Group membership request: (group_addr_packed, interface_index)
    group_bytes = socket.inet_pton(socket.AF_INET6, group)
    mreq = group_bytes + struct.pack("I", if_index)

    sock.setsockopt(
        socket.IPPROTO_IPV6,
        socket.IPV6_JOIN_GROUP,
        mreq
    )

    print(f"Joined multicast group {group} on {interface}")

    while True:
        data, addr = sock.recvfrom(4096)
        print(f"Multicast message from {addr[0]}: {data.decode()}")
```

## UDP with getaddrinfo for Portability

Use `getaddrinfo` to handle both IPv4 and IPv6 transparently:

```python
import socket

def udp_send_auto(host: str, port: int, data: bytes):
    """
    Send UDP data to host, automatically using IPv6 if available.
    Falls back to IPv4 if no IPv6 address found.
    """
    # Try IPv6 first
    results = socket.getaddrinfo(
        host, port,
        type=socket.SOCK_DGRAM
    )

    # Prefer IPv6 (AF_INET6 = 30 on macOS, 10 on Linux)
    ipv6_results = [r for r in results if r[0] == socket.AF_INET6]
    chosen = ipv6_results[0] if ipv6_results else results[0]

    af, socktype, proto, canonname, sockaddr = chosen
    sock = socket.socket(af, socktype, proto)
    sock.settimeout(5)

    try:
        sock.sendto(data, sockaddr)
        print(f"Sent to {sockaddr[0]} (IPv{'6' if af == socket.AF_INET6 else '4'})")
    finally:
        sock.close()
```

## Custom IPv6 Service Discovery (Simple mDNS-like)

Send a discovery query via multicast and collect responses:

```python
import socket
import struct
import threading

DISCOVERY_GROUP = "ff12::1234"  # Example application-specific link-local multicast group
DISCOVERY_PORT = 9999

def discover_ipv6_services(interface: str, timeout: int = 3) -> list[str]:
    """Simple IPv6 service discovery via multicast."""
    discovered = []

    # Receiver thread
    def receive_responses(sock):
        sock.settimeout(timeout)
        try:
            while True:
                data, addr = sock.recvfrom(4096)
                discovered.append(f"{addr[0]}: {data.decode()}")
        except socket.timeout:
            pass

    sock = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    if_index = socket.if_nametoindex(interface)
    sock.bind(('::', DISCOVERY_PORT))

    group_bytes = socket.inet_pton(socket.AF_INET6, DISCOVERY_GROUP)
    mreq = group_bytes + struct.pack("I", if_index)
    sock.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_JOIN_GROUP, mreq)

    recv_thread = threading.Thread(target=receive_responses, args=(sock,))
    recv_thread.start()

    # Send discovery query
    send_ipv6_multicast(
        interface,
        b"DISCOVER_v1",
        group=DISCOVERY_GROUP,
        port=DISCOVERY_PORT,
    )
    recv_thread.join()
    sock.close()

    return discovered
```

## Conclusion

IPv6 UDP sockets in Python use `socket.AF_INET6` and typically use 4-element address tuples `(host, port, flowinfo, scope_id)`. For `socket` module methods, `flowinfo` and `scope_id` can be omitted, but `scope_id` matters for scoped addresses such as link-local and multicast. To receive multicast, join the appropriate group with `IPV6_JOIN_GROUP` and bind the UDP port; set `IPV6_MULTICAST_IF` when you need to choose the outgoing interface. Using `getaddrinfo` handles IPv4/IPv6 selection transparently for portable code.
