# How to Convert IPv4 Addresses to Integer Format and Back in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, IPv4, Integer, Conversion, Ipaddress, Networking

Description: Learn how to convert IPv4 addresses to 32-bit integers and back in Python using the ipaddress module and struct, useful for arithmetic operations, sorting, and range checks.

## Using ipaddress Module (Recommended)

```python
import ipaddress

# String → integer

ip = ipaddress.IPv4Address("192.168.1.1")
n = int(ip)
print(n)           # 3232235777

# Integer → string
restored = str(ipaddress.IPv4Address(n))
print(restored)    # 192.168.1.1
```

## Using struct for Network Byte Order

```python
import struct
import socket

def ip_to_int(ip: str) -> int:
    """Convert dotted-decimal IPv4 to 32-bit big-endian integer."""
    packed = socket.inet_aton(ip)          # 4-byte big-endian bytes
    return struct.unpack("!I", packed)[0]  # unsigned int, network order

def int_to_ip(n: int) -> str:
    """Convert 32-bit integer to dotted-decimal IPv4."""
    packed = struct.pack("!I", n)
    return socket.inet_ntoa(packed)

print(ip_to_int("192.168.1.1"))  # 3232235777
print(int_to_ip(3232235777))     # 192.168.1.1
```

## Manual Bit Arithmetic

```python
def ip_to_int_manual(ip: str) -> int:
    """Compute integer from octets without library helpers."""
    octets = [int(o) for o in ip.split(".")]
    return (octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]

def int_to_ip_manual(n: int) -> str:
    return ".".join(str((n >> shift) & 0xFF) for shift in (24, 16, 8, 0))

print(ip_to_int_manual("10.0.0.1"))  # 167772161
print(int_to_ip_manual(167772161))   # 10.0.0.1
```

## Sorting IP Addresses

```python
import ipaddress

ips = ["10.0.0.200", "10.0.0.1", "192.168.1.1", "10.0.0.50", "172.16.0.1"]

# Sort by converting to IPv4Address objects (which compare by integer value)
sorted_ips = sorted(ips, key=ipaddress.IPv4Address)
print(sorted_ips)
# ['10.0.0.1', '10.0.0.50', '10.0.0.200', '172.16.0.1', '192.168.1.1']
```

## Range Checks with Integers

```python
import ipaddress

def is_in_range(ip: str, start: str, end: str) -> bool:
    """Check if ip falls within the inclusive range [start, end]."""
    n     = int(ipaddress.IPv4Address(ip))
    n_min = int(ipaddress.IPv4Address(start))
    n_max = int(ipaddress.IPv4Address(end))
    return n_min <= n <= n_max

print(is_in_range("192.168.1.50", "192.168.1.1", "192.168.1.100"))  # True
print(is_in_range("10.0.0.1",     "192.168.1.1", "192.168.1.100"))  # False
```

## Incrementing and Decrementing Addresses

```python
import ipaddress

def next_ip(ip: str, step: int = 1) -> str:
    """Return the IP address `step` addresses after `ip`."""
    return str(ipaddress.IPv4Address(int(ipaddress.IPv4Address(ip)) + step))

print(next_ip("192.168.1.254"))  # 192.168.1.255
print(next_ip("192.168.1.255"))  # 192.168.2.0  (wraps subnet boundary)
```

## Conclusion

The `ipaddress.IPv4Address` class makes integer conversion idiomatic: `int(addr)` converts to a 32-bit unsigned integer and `IPv4Address(n)` reverses it. Integer representations are useful for sorting (avoids lexicographic ordering), range membership checks, arithmetic on addresses, and storing IPs efficiently in databases as integer values when the column type supports the full 32-bit range. The `struct` + `socket.inet_aton` approach is useful when working with raw bytes in network packets.
