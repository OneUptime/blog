# How to Find the Valid Host Range in a Subnet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Subnetting, Networking, Host Ranges, CIDR

Description: The valid host range in an IPv4 subnet spans from the first address after the network address to the last address before the broadcast address, and can be calculated directly from the network...

## Host Range Formula

For most IPv4 subnets (/0 through /30):

```text
First host = Network Address + 1
Last host  = Broadcast Address - 1
```

For `/31`, both addresses are usable on point-to-point links, and `/32` identifies a single host address.

For `192.168.1.0/24`:
- Network: `192.168.1.0`
- Broadcast: `192.168.1.255`
- First host: `192.168.1.1`
- Last host: `192.168.1.254`
- Usable count: 254

## Python: Computing the Host Range

```python
import ipaddress

def host_range(cidr: str) -> dict:
    """
    Return the first host, last host, and count for a subnet.
    """
    net = ipaddress.IPv4Network(cidr, strict=False)

    if net.prefixlen == 32:
        first = last = net.network_address
        count = 1
    elif net.prefixlen == 31:
        first = net.network_address
        last = net.broadcast_address
        count = 2
    else:
        first = net.network_address + 1
        last = net.broadcast_address - 1
        count = net.num_addresses - 2

    return {
        "network":   str(net.network_address),
        "first":     str(first),
        "last":      str(last),
        "broadcast": str(net.broadcast_address),
        "count":     count,
    }

# Test various subnets

for cidr in ["192.168.1.0/24", "10.0.0.0/30",
             "172.16.48.0/20", "10.5.3.0/25"]:
    info = host_range(cidr)
    print(f"{cidr:20s}  first={info['first']:15s}  "
          f"last={info['last']:15s}  count={info['count']}")
```

## Quick Range Table

| Subnet | First Host | Last Host | Count |
|--------|-----------|-----------|-------|
| 192.168.1.0/24 | .1 | .254 | 254 |
| 192.168.1.0/25 | .1 | .126 | 126 |
| 192.168.1.128/25 | .129 | .254 | 126 |
| 10.0.0.0/30 | .1 | .2 | 2 |
| 10.0.0.4/30 | .5 | .6 | 2 |

## Checking if an IP is in the Usable Range

```python
import ipaddress

def is_valid_host(ip: str, network_cidr: str) -> bool:
    """Return True if ip is a usable host address in the subnet."""
    net = ipaddress.IPv4Network(network_cidr, strict=False)
    addr = ipaddress.IPv4Address(ip)
    if addr not in net:
        return False
    if net.prefixlen >= 31:
        return True
    return addr != net.network_address and addr != net.broadcast_address

print(is_valid_host("192.168.1.1",   "192.168.1.0/24"))  # True
print(is_valid_host("192.168.1.0",   "192.168.1.0/24"))  # False (network)
print(is_valid_host("192.168.1.255", "192.168.1.0/24"))  # False (broadcast)
print(is_valid_host("192.168.2.1",   "192.168.1.0/24"))  # False (wrong subnet)
```

## Key Takeaways

- First host = network address + 1 and last host = broadcast address − 1 for /0 through /30.
- `/31` has 2 usable addresses, and `/32` has 1 usable address.
- Usable count = 2^host_bits − 2 for /0 through /30.
- Python's `network.hosts()` returns an iterator of usable host addresses; for `/31` it includes both addresses, and `/32` returns the single host address.
