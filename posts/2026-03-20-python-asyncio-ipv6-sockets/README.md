# How to Use Python asyncio with IPv6 Sockets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Asyncio, IPv6, Socket, Async, Networking

Description: Use Python's asyncio library to create async IPv6 TCP and UDP servers and clients with proper address handling.

## Async IPv6 TCP Server

```python
import asyncio
import socket

async def handle_client(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
    """Handle a single async client connection."""
    addr = writer.get_extra_info("peername")
    print(f"Connection from [{addr[0]}]:{addr[1]}")

    try:
        while True:
            data = await reader.readline()
            if not data:
                break

            message = data.decode().strip()
            print(f"Received: {message}")

            # Echo back with prefix
            response = f"Echo: {message}\n"
            writer.write(response.encode())
            await writer.drain()
    except asyncio.CancelledError:
        pass
    finally:
        writer.close()
        await writer.wait_closed()
        print(f"Connection from [{addr[0]}] closed")

async def main():
    """Start IPv6 TCP server on all interfaces."""
    server = await asyncio.start_server(
        handle_client,
        host="::",       # Listen on all IPv6 interfaces
        port=8080,
        family=socket.AF_INET6,
        flags=socket.AI_PASSIVE
    )

    addrs = [sock.getsockname() for sock in server.sockets]
    print(f"Serving on {addrs}")

    async with server:
        await server.serve_forever()

asyncio.run(main())
```

## Async IPv6 TCP Client

```python
import asyncio
import socket

async def ipv6_client(host: str, port: int, messages: list[str]) -> list[str]:
    """Async IPv6 TCP client that sends messages and collects responses."""
    reader, writer = await asyncio.open_connection(
        host=host,
        port=port,
        family=socket.AF_INET6
    )

    responses = []
    try:
        for msg in messages:
            writer.write(f"{msg}\n".encode())
            await writer.drain()

            response = await asyncio.wait_for(reader.readline(), timeout=5.0)
            responses.append(response.decode().strip())
    finally:
        writer.close()
        await writer.wait_closed()

    return responses

# Usage

async def run_client():
    responses = await ipv6_client("::1", 8080, ["Hello", "World", "IPv6"])
    for r in responses:
        print(f"Response: {r}")

asyncio.run(run_client())
```

## Concurrent IPv6 Connections

Handle many concurrent IPv6 connections with asyncio:

```python
import asyncio
import socket
from typing import Tuple

async def probe_ipv6_host(
    host: str,
    port: int,
    timeout: float = 2.0
) -> Tuple[str, int, bool, str]:
    """Check if an IPv6 host is listening on a port."""
    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(host, port, family=socket.AF_INET6),
            timeout=timeout
        )
        # Try to get a banner/greeting
        try:
            banner = await asyncio.wait_for(reader.read(256), timeout=1.0)
            banner_str = banner.decode(errors="replace").strip()[:50]
        except asyncio.TimeoutError:
            banner_str = ""

        writer.close()
        await writer.wait_closed()
        return (host, port, True, banner_str)
    except (asyncio.TimeoutError, ConnectionRefusedError, OSError):
        return (host, port, False, "")

async def scan_ipv6_hosts(hosts: list[str], ports: list[int]):
    """Concurrently probe multiple IPv6 hosts and ports."""
    tasks = [
        probe_ipv6_host(host, port)
        for host in hosts
        for port in ports
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    for result in results:
        if isinstance(result, Exception):
            continue
        host, port, is_open, banner = result
        if is_open:
            print(f"  [{host}]:{port} OPEN {f'({banner})' if banner else ''}")

# Run concurrent IPv6 scan
hosts = ["2001:db8::1", "2001:db8::2", "::1"]
ports = [22, 80, 443]

asyncio.run(scan_ipv6_hosts(hosts, ports))
```

## Async IPv6 UDP with asyncio Protocol

```python
import asyncio
import socket

class IPv6UDPServer(asyncio.DatagramProtocol):
    """Async IPv6 UDP server using protocol API."""

    def connection_made(self, transport):
        self.transport = transport
        print("UDP IPv6 server started")

    def datagram_received(self, data: bytes, addr: tuple):
        host, port = addr[0], addr[1]
        print(f"Received {len(data)} bytes from [{host}]:{port}")

        # Echo with timestamp prefix
        import time
        response = f"[{time.time():.2f}] {data.decode()}".encode()
        self.transport.sendto(response, addr)

    def error_received(self, exc):
        print(f"Error: {exc}")

async def main():
    loop = asyncio.get_running_loop()

    # Create IPv6 UDP server
    transport, protocol = await loop.create_datagram_endpoint(
        IPv6UDPServer,
        local_addr=("::", 9090),
        family=socket.AF_INET6
    )

    print("UDP IPv6 server on [::]:9090")
    try:
        await asyncio.sleep(3600)  # Run for 1 hour
    finally:
        transport.close()

asyncio.run(main())
```

## Handling IPv4-Mapped IPv6 Addresses

When `IPV6_V6ONLY=0`, IPv4 clients appear as IPv4-mapped IPv6 addresses:

```python
import socket
import ipaddress

def normalize_client_addr(addr_tuple: tuple) -> str:
    """
    Normalize a client address from asyncio's peername.
    Handles IPv4-mapped IPv6 addresses (::ffff:x.x.x.x).
    """
    host = addr_tuple[0]
    try:
        ip = ipaddress.IPv6Address(host)
        if ip.ipv4_mapped:
            return str(ip.ipv4_mapped)   # Return plain IPv4
        return str(ip)
    except ValueError:
        return host  # Already IPv4 string
```

## Conclusion

Python's asyncio handles IPv6 seamlessly with `asyncio.start_server()` and `asyncio.open_connection()` when `family=socket.AF_INET6` is specified. The protocol-based API works well for UDP. For maximum compatibility, handle IPv4-mapped addresses that appear when running dual-stack servers.
