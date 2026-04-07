# How to Handle IPv6 Addresses in Python Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, IPv6, Networking, Ipaddress, Socket Programming, Development

Description: Handle, validate, parse, and compare IPv6 addresses in Python applications using the built-in ipaddress module and socket library.

## Introduction

Python's standard library provides excellent IPv6 support through the `ipaddress` module (Python 3.3+) and the `socket` module. These tools let you validate, parse, compare, and manipulate IPv6 addresses without third-party dependencies.

## Using the ipaddress Module

The `ipaddress` module is the primary tool for IPv6 address handling:

```python
import ipaddress

# Create an IPv6 address object

addr = ipaddress.ip_address('2001:db8::1')
print(addr)            # 2001:db8::1
print(type(addr))      # <class 'ipaddress.IPv6Address'>

# Check if it's IPv6
print(isinstance(addr, ipaddress.IPv6Address))  # True

# Get the compressed and expanded forms
full = ipaddress.ip_address('2001:0db8:0000:0000:0000:0000:0000:0001')
print(full)            # 2001:db8::1  (compressed)
print(full.exploded)   # 2001:0db8:0000:0000:0000:0000:0000:0001

# Check address type
print(addr.is_global)         # False (2001:db8::/32 is documentation range)
print(addr.is_loopback)       # False
print(addr.is_link_local)     # False
print(addr.is_private)        # False (Python 3.11+; True in older versions)
```

## Validating IPv6 User Input

Always validate user-supplied addresses before using them:

```python
import ipaddress

def validate_ipv6(address: str) -> bool:
    """Return True if address is a valid IPv6 address."""
    try:
        ipaddress.IPv6Address(address)
        return True
    except ipaddress.AddressValueError:
        return False

# Test cases
test_addresses = [
    '2001:db8::1',           # Valid global
    '::1',                   # Valid loopback
    'fe80::1%eth0',          # Link-local with zone ID (needs stripping)
    '192.168.1.1',           # IPv4 (returns False)
    'not-an-address',        # Invalid
    '2001:db8::1/64',        # CIDR notation (use ip_network instead)
]

for addr in test_addresses:
    # Strip zone ID if present before validating
    clean = addr.split('%')[0]
    print(f"{addr}: {validate_ipv6(clean)}")
```

## Working with IPv6 Networks

```python
import ipaddress

# Create a network
network = ipaddress.IPv6Network('2001:db8::/32')
print(network.network_address)  # 2001:db8::
print(network.prefixlen)        # 32
print(network.num_addresses)    # 79228162514264337593543950336

# Check if an address is in a network
addr = ipaddress.ip_address('2001:db8::100')
print(addr in network)  # True

# Iterate over subnets
for subnet in network.subnets(new_prefix=48):
    print(subnet)
    break  # Only print first subnet for brevity
# Output: 2001:db8::/48
```

## Connecting Over IPv6 with Sockets

```python
import socket

def connect_ipv6(host: str, port: int) -> socket.socket:
    """Create an IPv6 TCP connection to host:port."""
    # getaddrinfo resolves hostnames to IPv6 addresses
    addr_info = socket.getaddrinfo(
        host, port,
        family=socket.AF_INET6,
        type=socket.SOCK_STREAM
    )

    # Use the first result
    family, socktype, proto, canonname, sockaddr = addr_info[0]

    sock = socket.socket(family, socktype, proto)
    sock.connect(sockaddr)
    return sock

# Example: Connect to an IPv6-only HTTP server
try:
    sock = connect_ipv6('ipv6.google.com', 80)
    sock.send(b'GET / HTTP/1.0\r\nHost: ipv6.google.com\r\n\r\n')
    response = sock.recv(1024)
    print(response[:100])
    sock.close()
except Exception as e:
    print(f"Connection failed: {e}")
```

## Building an IPv6 TCP Server

```python
import socket
import threading

def handle_client(conn, addr):
    """Handle a client connection."""
    # addr is a 4-tuple for IPv6: (host, port, flowinfo, scope_id)
    host, port, flowinfo, scope_id = addr
    print(f"Connection from [{host}]:{port}")
    conn.send(b"Hello from IPv6 server\n")
    conn.close()

def start_ipv6_server(port: int = 8080):
    """Start a TCP server listening on all IPv6 interfaces."""
    # AF_INET6 with '::' binds to all IPv6 interfaces
    server = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)

    # Allow both IPv4 and IPv6 connections (dual-stack)
    server.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

    server.bind(('::', port))
    server.listen(5)
    print(f"Listening on [::]:{port}")

    while True:
        conn, addr = server.accept()
        thread = threading.Thread(target=handle_client, args=(conn, addr))
        thread.daemon = True
        thread.start()

# Start the server
# start_ipv6_server(8080)
```

## Formatting IPv6 for URLs and Logs

```python
import ipaddress

def format_ipv6_for_url(addr_str: str) -> str:
    """Wrap IPv6 address in brackets for URL use."""
    addr = ipaddress.ip_address(addr_str)
    if isinstance(addr, ipaddress.IPv6Address):
        return f"[{addr}]"
    return addr_str

# Usage
ipv6 = "2001:db8::1"
url = f"http://{format_ipv6_for_url(ipv6)}:8080/api/v1"
print(url)  # http://[2001:db8::1]:8080/api/v1
```

## Conclusion

Python's `ipaddress` module provides comprehensive IPv6 handling with clean APIs for validation, network membership testing, and address manipulation. The `socket` module's `AF_INET6` family and `getaddrinfo()` function handle protocol-transparent connections. Use these standard library tools rather than parsing IPv6 strings manually.
