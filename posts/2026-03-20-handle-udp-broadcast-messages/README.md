# How to Handle UDP Broadcast Messages on a Network

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: UDP, Broadcast, Networking, Linux, Socket, LAN

Description: Send and receive UDP broadcast messages on a local network using the SO_BROADCAST socket option, with practical examples for service discovery and local network communication.

## Introduction

UDP broadcast allows a single packet to be delivered to all hosts on a local network segment without knowing individual addresses. This is useful for service discovery (finding servers without prior configuration), DHCP (clients broadcast to discover servers), Wake-on-LAN, and legacy protocols. Broadcast is limited to the local network - routers do not forward broadcast packets by default.

## Broadcast Addresses

```text
Broadcast types:
- Limited broadcast:  255.255.255.255 (never forwarded by any router)
- Directed broadcast: 192.168.1.255   (broadcast address of 192.168.1.0/24)
                      10.0.0.255       (broadcast address of 10.0.0.0/24)

For sending to all hosts on the local segment:
- Use 255.255.255.255 (avoids calculating a subnet-specific broadcast address)
- Or calculate the directed broadcast for your subnet

Calculate directed broadcast:
python3 -c "
import ipaddress
net = ipaddress.IPv4Network('192.168.1.0/24')
print('Broadcast:', net.broadcast_address)
"
```

## Sending UDP Broadcast

```python
#!/usr/bin/env python3
# udp_broadcast_sender.py

import socket
import time

BROADCAST_PORT = 5000
MESSAGE = b"Hello LAN! This is a broadcast message"

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

# REQUIRED: enable broadcast permission on this socket

sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)

# Send to limited broadcast address
for i in range(5):
    sock.sendto(MESSAGE + f" #{i}".encode(), ('255.255.255.255', BROADCAST_PORT))
    print(f"Sent broadcast #{i}")
    time.sleep(1)

sock.close()
```

## Receiving UDP Broadcast

```python
#!/usr/bin/env python3
# udp_broadcast_receiver.py

import socket

BROADCAST_PORT = 5000

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

# Optional: allow rapid restart without "address already in use"
sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

# Bind to all interfaces on the broadcast port
sock.bind(('', BROADCAST_PORT))

print(f"Listening for broadcasts on port {BROADCAST_PORT}")

while True:
    data, addr = sock.recvfrom(65535)
    print(f"Received from {addr[0]}:{addr[1]}: {data.decode()}")
```

## Service Discovery Pattern

```python
#!/usr/bin/env python3
# Simple service discovery using UDP broadcast

import socket
import threading
import json
import time

DISCOVERY_PORT = 5555
SERVICE_INFO = {
    "service": "myservice",
    "version": "1.0",
    "tcp_port": 8080
}

def discovery_server():
    """Respond to discovery broadcast with service info."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind(('', DISCOVERY_PORT))

    while True:
        data, addr = sock.recvfrom(1024)
        if data == b'DISCOVER':
            response = json.dumps(SERVICE_INFO).encode()
            sock.sendto(response, addr)
            print(f"Responded to discovery from {addr[0]}")

def discover_services(timeout=2.0):
    """Find all services on LAN."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
    sock.settimeout(timeout)
    sock.bind(('', 0))  # Bind to random port for response

    sock.sendto(b'DISCOVER', ('255.255.255.255', DISCOVERY_PORT))

    services = []
    while True:
        try:
            data, addr = sock.recvfrom(1024)
            service = json.loads(data.decode())
            service['host'] = addr[0]
            services.append(service)
            print(f"Found service at {addr[0]}: {service}")
        except socket.timeout:
            break

    sock.close()
    return services
```

## Testing UDP Broadcast

```bash
# Listen for broadcasts on port 5000:
nc -ul 5000

# Send a broadcast from another terminal:
echo "hello" | nc -ub 255.255.255.255 5000

# Capture broadcast traffic:
tcpdump -i eth0 -n 'udp and broadcast'
# Or:
tcpdump -i eth0 -n 'dst 255.255.255.255'

# Verify broadcast is received by all hosts:
# Run nc -ul 5000 on multiple hosts on the same LAN
# One sendto 255.255.255.255 should appear on all listeners
```

## Broadcast Limitations

```text
Limitations of UDP broadcast:
- Limited to single network segment (routers block broadcasts)
- All hosts receive the packet, even if they don't need it (CPU overhead)
- No guarantee of delivery (just like all UDP)
- IPv6 does not support broadcast (uses multicast instead)
- Some clouds block broadcast (use multicast or service discovery like mDNS instead)

For multi-subnet discovery: use routed multicast if the network supports it, or use unicast with a known rendezvous server
For internet-facing discovery: use unicast with a known rendezvous server
```

## Conclusion

UDP broadcast requires the `SO_BROADCAST` socket option on the sender. On Linux, the receiver can simply bind to the port and receive broadcasts. It is ideal for LAN-local service discovery and protocols like DHCP where the destination host is not yet known. Use `255.255.255.255` for a limited local broadcast, or calculate the directed broadcast address for your specific subnet. For anything beyond the local segment, use a design meant for routing, such as unicast to a known rendezvous server or routed multicast if the network supports it.
