# How to Build a Simple UDP Echo Server in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: UDP, Python, Socket, Echo Server, Networking, Programming

Description: Build a UDP echo server in Python using the socket module, with examples for both blocking and non-blocking modes and multi-client handling.

## Introduction

A UDP echo server is the simplest possible UDP server: receive a datagram, send the same data back to the sender. It is an essential building block for testing network connectivity, measuring round-trip latency, and understanding how UDP sockets work. Unlike TCP, there is no connection to accept - each datagram arrives independently with the sender's address.

## Basic UDP Echo Server

```python
#!/usr/bin/env python3
# udp_echo_server.py - Basic UDP echo server

import socket
import sys

HOST = '0.0.0.0'   # Listen on all interfaces
PORT = 5000         # UDP port

def main():
    # Create UDP socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

    # Allow address reuse (useful during development)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

    sock.bind((HOST, PORT))
    print(f"UDP echo server listening on {HOST}:{PORT}")

    while True:
        try:
            # recvfrom returns (data, (address, port))
            data, addr = sock.recvfrom(65535)  # Buffer large enough for any IPv4 UDP datagram
            print(f"Received {len(data)} bytes from {addr[0]}:{addr[1]}")

            # Echo the data back to the sender
            sent = sock.sendto(data, addr)
            print(f"Echoed {sent} bytes back to {addr[0]}:{addr[1]}")

        except KeyboardInterrupt:
            print("\nShutting down")
            break

    sock.close()

if __name__ == '__main__':
    main()
```

## UDP Echo Client

```python
#!/usr/bin/env python3
# udp_echo_client.py - Test client for echo server

import socket
import time
import sys

SERVER = sys.argv[1] if len(sys.argv) > 1 else '127.0.0.1'
PORT = 5000

def measure_rtt(sock, message, server, port):
    """Send a message and measure round-trip time."""
    start = time.perf_counter()
    sock.sendto(message.encode(), (server, port))

    sock.settimeout(2.0)
    try:
        data, _ = sock.recvfrom(65535)
        rtt_ms = (time.perf_counter() - start) * 1000
        return rtt_ms, data.decode()
    except socket.timeout:
        return None, None

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

for i in range(5):
    rtt, response = measure_rtt(sock, f"ping {i}", SERVER, PORT)
    if rtt is not None:
        print(f"seq={i} rtt={rtt:.2f}ms response='{response}'")
    else:
        print(f"seq={i} timeout")
    time.sleep(0.5)

sock.close()
```

## Non-Blocking Echo Server

```python
#!/usr/bin/env python3
# Non-blocking UDP server using select

import socket
import select

HOST = '0.0.0.0'
PORT = 5000

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
sock.bind((HOST, PORT))
sock.setblocking(False)

print(f"Non-blocking UDP echo server on {HOST}:{PORT}")

sockets = [sock]
while True:
    readable, _, _ = select.select(sockets, [], [], 1.0)  # 1 second timeout
    for s in readable:
        data, addr = s.recvfrom(65535)
        s.sendto(data, addr)
        print(f"{addr}: {len(data)} bytes")
```

## Async Echo Server (asyncio)

```python
#!/usr/bin/env python3
# Async UDP echo server using asyncio

import asyncio

class UDPEchoProtocol:
    def connection_made(self, transport):
        self.transport = transport
        print("UDP server started")

    def datagram_received(self, data, addr):
        print(f"Received {len(data)} bytes from {addr}")
        self.transport.sendto(data, addr)  # Echo back

    def error_received(self, exc):
        print(f"Error: {exc}")

async def main():
    loop = asyncio.get_running_loop()
    transport, protocol = await loop.create_datagram_endpoint(
        UDPEchoProtocol,
        local_addr=('0.0.0.0', 5000)
    )
    print("Server listening on :5000, press Ctrl+C to stop")
    try:
        await asyncio.sleep(float('inf'))
    finally:
        transport.close()

asyncio.run(main())
```

## Running and Testing

```bash
# Start the echo server

python3 udp_echo_server.py &

# Test with netcat
printf "hello\n" | nc -u -w 1 127.0.0.1 5000

# Test with the echo client
python3 udp_echo_client.py 127.0.0.1

# Test with nping (measures RTT for UDP):
nping --udp -p 5000 127.0.0.1 --data-string "test"

# Capture the echo traffic:
tcpdump -i lo -n 'udp port 5000' -A
```

## Conclusion

A UDP echo server in Python requires just `socket.socket(AF_INET, SOCK_DGRAM)`, `bind()`, and a `recvfrom()/sendto()` loop. The sender's address comes back with every `recvfrom()` call, making it trivial to respond to any client. For workloads that need to integrate UDP handling with other asynchronous I/O, the async version avoids blocking on `recvfrom()`. The echo server pattern is also the foundation for building latency measurement tools - record the time before `sendto()` and after `recvfrom()` to measure UDP round-trip time precisely.
