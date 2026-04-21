# How to Understand the TEREDO Address Space (2001::/32)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Teredo, 2001::/32, RFC 4380, Tunneling, Transition

Description: Understand the Teredo address space 2001::/32 (RFC 4380), how Teredo addresses encode server and client information, and why Teredo tunneling should be blocked in most environments.

## Introduction

Teredo (RFC 4380) is an IPv6 tunneling mechanism that encapsulates IPv6 packets in UDP/IPv4, allowing IPv6 connectivity through NAT devices. The `2001::/32` prefix is allocated for Teredo addresses. Each Teredo address encodes the Teredo server's IPv4 address, flags, and the client's mapped UDP port and IPv4 address.

## Teredo Address Format

```yaml
 |  32 bits  |  32 bits   | 16 bits | 16 bits |  32 bits |
 +-----------+------------+---------+---------+----------+
 | 2001::/32 | Server IPv4|  Flags  |~UDP Port|~Client IP|
 +-----------+------------+---------+---------+----------+

 ~ = bitwise complement (XOR with 0xFFFF or 0xFFFFFFFF)

 Example:
   Teredo server: 65.54.227.120 (0x4136E378)
   Flags: 0x0000
   Client mapped IP: 192.0.2.100 (0xC0000264) → complement = 0x3FFFFD9B
   Client UDP port: 40000 (0x9C40) → complement = 0x63BF

   Teredo address: 2001:0:4136:e378:0:63bf:3fff:fd9b
```

## Python: Parsing Teredo Addresses

```python
import ipaddress
import socket
import struct

TEREDO_PREFIX = ipaddress.IPv6Network("2001::/32")

def parse_teredo_address(ipv6_str: str) -> dict:
    """Parse a Teredo address to extract server IP, client IP, and port."""
    addr = ipaddress.IPv6Address(ipv6_str)
    if addr not in TEREDO_PREFIX:
        return {"error": "Not a Teredo address"}

    addr_bytes = addr.packed  # 16 bytes

    # Bytes 4-7: Teredo server IPv4
    server_ip = socket.inet_ntop(socket.AF_INET, addr_bytes[4:8])

    # Bytes 8-9: Flags
    flags = struct.unpack("!H", addr_bytes[8:10])[0]

    # Bytes 10-11: ~UDP port (bitwise complement)
    port_complement = struct.unpack("!H", addr_bytes[10:12])[0]
    client_port = port_complement ^ 0xFFFF

    # Bytes 12-15: ~client IPv4
    ip_complement = struct.unpack("!I", addr_bytes[12:16])[0]
    client_ip_int = ip_complement ^ 0xFFFFFFFF
    client_ip = socket.inet_ntop(socket.AF_INET, struct.pack("!I", client_ip_int))

    return {
        "teredo_address": ipv6_str,
        "server_ipv4": server_ip,
        "client_ipv4": client_ip,
        "client_port": client_port,
        "flags": hex(flags),
    }

# Example

result = parse_teredo_address("2001:0:4136:e378:0:63bf:3fff:fd9b")
for k, v in result.items():
    print(f"  {k}: {v}")
```

## Security Concerns with Teredo

```bash
# Teredo tunnels can bypass firewall rules
# Attackers use Teredo to reach IPv6-capable hosts behind IPv4 NAT
# Best practice: BLOCK Teredo in most enterprise environments

# Block Teredo on Linux
# Teredo uses UDP port 3544
ip6tables -A INPUT -s 2001::/32 -j DROP
ip6tables -A OUTPUT -d 2001::/32 -j DROP
iptables -A INPUT -p udp --dport 3544 -j DROP
iptables -A OUTPUT -p udp --dport 3544 -j DROP

# Disable Teredo on Windows (PowerShell)
netsh interface teredo set state disabled

# Disable on Linux (check if miredo is running)
systemctl stop miredo
systemctl disable miredo
```

## Detecting Teredo in Your Network

```python
import ipaddress

def contains_teredo(addresses: list) -> list:
    """Filter a list of IPv6 addresses that are Teredo."""
    teredo = ipaddress.IPv6Network("2001::/32")
    return [
        addr for addr in addresses
        if ipaddress.IPv6Address(addr) in teredo
    ]

# Check access logs for Teredo addresses
suspicious = contains_teredo([
    "2001:0:4136:e378:0:63bf:3fff:fd9b",
    "2001:db8::1",  # Not Teredo (Documentation)
    "2001:4860:4860::8888",  # Not Teredo (Google)
])
print("Teredo addresses:", suspicious)
```

## Conclusion

The `2001::/32` Teredo space enables IPv6-in-UDP-over-IPv4 tunneling but introduces security risks in enterprise environments. Block Teredo traffic at firewall boundaries and disable the Teredo client on managed systems. Detect Teredo addresses in access logs using the Python classifier above. Monitor for unexpected Teredo traffic with OneUptime network monitoring.
