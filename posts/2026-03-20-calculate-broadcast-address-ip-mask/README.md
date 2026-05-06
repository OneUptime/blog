# How to Calculate Broadcast Address from an IP and Subnet Mask

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Subnetting, Networking, Broadcast Address, Subnet Mask

Description: The broadcast address of a subnet is calculated by taking the network address and setting all host bits to 1, which is equivalent to ORing the network address with the inverted (wildcard) mask.

## The Calculation

```text
Broadcast = Network Address OR Wildcard Mask
Wildcard Mask = NOT Subnet Mask (bitwise inversion)
```

Example: `192.168.10.0/24`
```text
Network:     192.168.10.0  = 11000000.10101000.00001010.00000000
Wildcard:    0.0.0.255     = 00000000.00000000.00000000.11111111
OR result:   192.168.10.255 = 11000000.10101000.00001010.11111111
```

## Python Implementation

```python
import socket
import struct

def broadcast_address(ip: str, mask: str) -> str:
    """
    Calculate the broadcast address for a given IP and subnet mask.
    """
    ip_int = struct.unpack("!I", socket.inet_aton(ip))[0]
    mask_int = struct.unpack("!I", socket.inet_aton(mask))[0]
    wildcard_int = ~mask_int & 0xFFFFFFFF    # Bitwise NOT, masked to 32 bits
    network_int = ip_int & mask_int
    broadcast_int = network_int | wildcard_int
    return socket.inet_ntoa(struct.pack("!I", broadcast_int))

# Test cases

cases = [
    ("192.168.10.45", "255.255.255.0"),    # /24
    ("172.16.50.200", "255.255.240.0"),    # /20
    ("10.5.3.100",    "255.255.255.128"),  # /25
]

for ip, mask in cases:
    bcast = broadcast_address(ip, mask)
    print(f"{ip} / {mask} -> Broadcast: {bcast}")
```

Output:
```text
192.168.10.45 / 255.255.255.0 -> Broadcast: 192.168.10.255
172.16.50.200 / 255.255.240.0 -> Broadcast: 172.16.63.255
10.5.3.100 / 255.255.255.128 -> Broadcast: 10.5.3.127
```

## Using ipaddress Module

```python
import ipaddress

def broadcast_from_cidr(ip_cidr: str) -> str:
    """Return broadcast address for IP/prefix notation."""
    interface = ipaddress.IPv4Interface(ip_cidr)
    return str(interface.network.broadcast_address)

print(broadcast_from_cidr("192.168.10.45/24"))   # 192.168.10.255
print(broadcast_from_cidr("172.16.50.200/20"))   # 172.16.63.255
print(broadcast_from_cidr("10.5.3.100/25"))      # 10.5.3.127
```

## Manual Calculation for /20

For `172.16.50.200 / 255.255.240.0`:
```text
Network: 172.16.48.0
Wildcard (NOT mask): 0.0.15.255

Broadcast:
  172 | 0   = 172
  16  | 0   = 16
  48  | 15  = 63  (00110000 | 00001111 = 00111111 = 63)
  0   | 255 = 255

= 172.16.63.255
```

## Key Takeaways

- Broadcast = network address OR wildcard mask (inverted subnet mask).
- All host bits are set to 1 in the broadcast address.
- For conventional IPv4 subnets, the last address is the broadcast.
- For conventional IPv4 subnets, the broadcast address cannot be assigned to a host.
