# How to Determine the Network and Host Portions of an IPv4 Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Subnetting, Networking, IP Addressing, Subnet Mask, CIDR

Description: The subnet mask separates an IPv4 address into a network portion (fixed for all hosts on the subnet) and a host portion (unique per device), determined by a bitwise AND operation.

## Network vs Host Bits

A subnet mask is a 32-bit value where:
- **1 bits** identify the network portion (same for all hosts on the subnet)
- **0 bits** identify the host portion (unique per device)

Example: `192.168.10.45 / 255.255.255.0` (/24)

```text
IP Address:   192.168.10.45   = 11000000.10101000.00001010.00101101
Subnet Mask:  255.255.255.0   = 11111111.11111111.11111111.00000000
              AND operation
Network:      192.168.10.0    = 11000000.10101000.00001010.00000000
Host part:                    =                                .00101101 (= 45)
```

## Python: Extracting Network and Host

```python
import ipaddress

def analyze_address(cidr: str):
    """
    Given an IP/prefix in CIDR notation, show:
    - Network address
    - Host part
    - Broadcast address
    - First/last usable host
    """
    interface = ipaddress.IPv4Interface(cidr)
    network = interface.network
    host_int = int(interface.ip) & int(network.hostmask)

    print(f"IP Address    : {interface.ip}")
    print(f"Subnet Mask   : {interface.netmask}")
    print(f"CIDR Prefix   : /{network.prefixlen}")
    print(f"Network Addr  : {network.network_address}")
    print(f"Host Part     : {host_int} (decimal)")
    print(f"Broadcast Addr: {network.broadcast_address}")
    hosts = list(network.hosts())
    if hosts:
        print(f"First Host    : {hosts[0]}")
        print(f"Last Host     : {hosts[-1]}")
    print(f"Total Hosts   : {network.num_addresses - 2}")

analyze_address("192.168.10.45/24")
```

Output:
```text
IP Address    : 192.168.10.45
Subnet Mask   : 255.255.255.0
CIDR Prefix   : /24
Network Addr  : 192.168.10.0
Host Part     : 45 (decimal)
Broadcast Addr: 192.168.10.255
First Host    : 192.168.10.1
Last Host     : 192.168.10.254
Total Hosts   : 254
```

## Bitwise AND by Hand

For `172.16.50.200 / 255.255.240.0` (/20):

```text
IP:   172.16.50.200  = ...00110010.11001000
Mask: 255.255.240.0  = ...11110000.00000000
AND:  172.16.48.0    = ...00110000.00000000
```

The network address is `172.16.48.0/20`.

## Calculating Host Count

With a /N prefix:
- Number of host bits = 32 − N
- Total addresses = 2^(32-N)
- Usable hosts = 2^(32-N) − 2 (subtract network and broadcast)

| Prefix | Host Bits | Usable Hosts |
|--------|-----------|-------------|
| /24 | 8 | 254 |
| /23 | 9 | 510 |
| /22 | 10 | 1022 |
| /16 | 16 | 65534 |

## Key Takeaways

- Network portion: bits where the mask is 1 (IP AND mask).
- Host portion: bits where the mask is 0 (IP AND NOT mask).
- Use Python's `ipaddress.IPv4Interface()` for quick, accurate decomposition.
- Usable hosts = 2^host_bits − 2 (network address and broadcast are reserved).
