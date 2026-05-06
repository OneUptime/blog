# How to Calculate Network Address from an IP and Subnet Mask

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Subnetting, Networking, Network Address, Subnet Mask

Description: The network address of a subnet is calculated by performing a bitwise AND between the host IP address and the subnet mask, setting all host bits to zero.

## The Bitwise AND Operation

```text
IP Address:   192.168.10.45   = 11000000.10101000.00001010.00101101
Subnet Mask:  255.255.255.0   = 11111111.11111111.11111111.00000000
AND result:   192.168.10.0    = 11000000.10101000.00001010.00000000
```

The AND operation preserves bits where the mask is 1 (network bits) and zeros out bits where the mask is 0 (host bits).

## Python: Computing the Network Address

```python
import socket
import struct

def network_address(ip: str, mask: str) -> str:
    """
    Calculate the network address by ANDing the IP with the subnet mask.
    Returns dotted-decimal string.
    """
    ip_int = struct.unpack("!I", socket.inet_aton(ip))[0]
    mask_int = struct.unpack("!I", socket.inet_aton(mask))[0]
    network_int = ip_int & mask_int
    return socket.inet_ntoa(struct.pack("!I", network_int))

# Examples

test_cases = [
    ("192.168.10.45",  "255.255.255.0"),    # /24
    ("172.16.50.200",  "255.255.240.0"),    # /20
    ("10.5.3.100",     "255.255.255.128"),  # /25
]

for ip, mask in test_cases:
    net = network_address(ip, mask)
    print(f"{ip}/{mask} -> Network: {net}")
```

Output:
```text
192.168.10.45/255.255.255.0 -> Network: 192.168.10.0
172.16.50.200/255.255.240.0 -> Network: 172.16.48.0
10.5.3.100/255.255.255.128 -> Network: 10.5.3.0
```

## Using ipaddress Module

```python
import ipaddress

def network_from_cidr(ip_cidr: str) -> str:
    """Return the network address for an IP/prefix string."""
    interface = ipaddress.IPv4Interface(ip_cidr)
    return str(interface.network.network_address)

print(network_from_cidr("192.168.10.45/24"))   # 192.168.10.0
print(network_from_cidr("172.16.50.200/20"))   # 172.16.48.0
print(network_from_cidr("10.5.3.100/25"))      # 10.5.3.0
```

## Manual Calculation Walkthrough

For `172.16.50.200 / 255.255.240.0`:

```yaml
172  = 10101100
16   = 00010000
50   = 00110010  ← interesting octet
200  = 11001000

Mask octet 3 = 240 = 11110000
50 AND 240:
  00110010
& 11110000
----------
  00110000  = 48
```

Network = 172.16.**48**.0

## Key Takeaways

- Network address = IP AND subnet mask (bitwise).
- All host bits become 0 in the network address.
- For standard contiguous subnet masks, the critical octet is the one where the mask is neither 255 nor 0.
- Python's `ipaddress.IPv4Interface` computes this automatically from CIDR notation.
