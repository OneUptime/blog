# How to Understand IPv4-Mapped IPv6 Addresses (::ffff:0:0/96)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPv4, Dual-Stack, Networking, Transition Mechanisms

Description: Understand IPv4-mapped IPv6 addresses in the ::ffff:0:0/96 range, how they enable dual-stack socket programming, and their practical impact on applications and firewalls.

## Introduction

IPv4-mapped IPv6 addresses (prefix `::ffff:0:0/96`) allow IPv6-only APIs to represent and handle IPv4 addresses. When a dual-stack socket server receives a connection from an IPv4 client, the OS automatically maps the client's IPv4 address into this format. Understanding this mechanism is essential for dual-stack application development and firewall configuration.

## Address Format

The structure of an IPv4-mapped IPv6 address:

```yaml
|<-------- 80 bits (all zeros) -------->|<-- 16 bits -->|<-- 32 bits -->|
|        0000....0000                    |   0xFFFF      |  IPv4 address |

Example:
IPv4:  192.168.1.100
Mapped: ::ffff:192.168.1.100
      = ::ffff:c0a8:0164   (hex notation)
      = 0000:0000:0000:0000:0000:ffff:c0a8:0164
```

## Common Examples

```text
IPv4          → IPv4-Mapped IPv6
127.0.0.1     → ::ffff:127.0.0.1    (loopback)
192.168.1.1   → ::ffff:192.168.1.1
10.0.0.1      → ::ffff:10.0.0.1
8.8.8.8       → ::ffff:8.8.8.8
```

## Python: Converting Between IPv4 and IPv4-Mapped

```python
import ipaddress

# Convert IPv4 to IPv4-mapped IPv6

def ipv4_to_mapped(ipv4_str):
    ipv4 = ipaddress.IPv4Address(ipv4_str)
    # IPv4-mapped IPv6 = ::ffff: + IPv4
    mapped = ipaddress.IPv6Address(f"::ffff:{ipv4_str}")
    return mapped

# Check if an IPv6 address is IPv4-mapped
def is_ipv4_mapped(addr_str):
    try:
        addr = ipaddress.IPv6Address(addr_str)
        return addr.ipv4_mapped is not None
    except ValueError:
        return False

# Extract the IPv4 address from a mapped address
def extract_ipv4(mapped_str):
    addr = ipaddress.IPv6Address(mapped_str)
    return addr.ipv4_mapped

# Examples
print(ipv4_to_mapped("192.168.1.100"))    # ::ffff:c0a8:164
print(is_ipv4_mapped("::ffff:192.168.1.1"))  # True
print(is_ipv4_mapped("2001:db8::1"))          # False
print(extract_ipv4("::ffff:10.0.0.1"))        # 10.0.0.1
```

## Dual-Stack Sockets in Practice

When a server binds to `::` (all IPv6 addresses) with `IPV6_V6ONLY=0`, the OS maps incoming IPv4 connections automatically:

```python
# Python: dual-stack server that accepts both IPv4 and IPv6
import socket

# Create an IPv6 socket
server = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)

# Allow IPv4 connections via IPv4-mapped addresses (default on Linux)
server.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)

server.bind(('::', 8080))  # Binds to all IPv4 and IPv6 addresses
server.listen(5)

print("Server listening on [::]:8080")
while True:
    conn, addr = server.accept()
    client_addr = addr[0]
    if client_addr.startswith("::ffff:"):
        # IPv4 client connected via IPv4-mapped address
        ipv4_addr = client_addr.replace("::ffff:", "")
        print(f"IPv4 client from {ipv4_addr}")
    else:
        print(f"IPv6 client from {client_addr}")
    conn.close()
```

## IPV6_V6ONLY Socket Option

This option controls whether an IPv6 socket also accepts IPv4 connections:

```c
/* C: set IPV6_V6ONLY to refuse IPv4-mapped addresses */
int opt = 1;
setsockopt(fd, IPPROTO_IPV6, IPV6_V6ONLY, &opt, sizeof(opt));

/* 0 = accept IPv4 via mapped addresses (default on Linux) */
/* 1 = IPv6 only, refuse IPv4-mapped connections          */
```

```bash
# Check the system default for IPV6_V6ONLY on Linux
cat /proc/sys/net/ipv6/bindv6only
# 0 = dual-stack by default (accepts IPv4 via mapped addresses)
# 1 = IPv6-only by default

# Change the default
sudo sysctl -w net.ipv6.bindv6only=1
```

## Firewall Implications

When applying firewall rules to traffic accepted by a dual-stack socket:

```bash
# iptables (IPv4) and ip6tables (IPv6) are separate rule sets
# IPv4-mapped IPv6 addresses are returned by the socket API, but the
# on-the-wire packet from 192.168.1.1 is still IPv4 and is filtered by
# iptables, not ip6tables, when IPV6_V6ONLY=0

# Block an IPv4 address on a dual-stack server using iptables
sudo iptables -A INPUT -s 192.168.1.100 -j DROP

# Or block an IPv4 subnet on a dual-stack server
sudo iptables -A INPUT -s 192.168.1.0/24 -j DROP
```

## When to Use IPV6_V6ONLY

| Scenario | Recommendation |
|---|---|
| Simple app needing both IPv4 and IPv6 on one socket | `IPV6_V6ONLY=0` (default) |
| Explicit separate IPv4 and IPv6 sockets | `IPV6_V6ONLY=1` |
| Firewall applies different rules to IPv4 vs IPv6 | `IPV6_V6ONLY=1` (cleaner) |
| Load balancer that rewrites addresses | `IPV6_V6ONLY=1` |

## Conclusion

IPv4-mapped IPv6 addresses are a practical mechanism for dual-stack sockets, allowing IPv6-only APIs to transparently handle IPv4 clients. When building network applications, understand whether your server uses `IPV6_V6ONLY=0` (dual-stack) or `1` (IPv6-only) to ensure your firewall rules and access control lists work correctly for both address families.
