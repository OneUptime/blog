# How to Check If Two IPv4 Addresses Are on the Same Subnet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, IPv4, Subnets, Networking, Ipaddress, CIDR

Description: Learn how to determine whether two IPv4 addresses belong to the same subnet in Python, using the ipaddress module and bitwise masking with a given prefix length or subnet mask.

## Using ipaddress Module

```python
import ipaddress

def same_subnet(ip1: str, ip2: str, prefix: int) -> bool:
    """Return True if both IPs are in the same /<prefix> subnet."""
    net1 = ipaddress.IPv4Interface(f"{ip1}/{prefix}").network
    net2 = ipaddress.IPv4Interface(f"{ip2}/{prefix}").network
    return net1 == net2

print(same_subnet("192.168.1.10", "192.168.1.200", 24))  # True
print(same_subnet("192.168.1.10", "192.168.2.10",  24))  # False
print(same_subnet("10.0.0.1",     "10.0.0.254",    24))  # True
print(same_subnet("10.0.0.1",     "10.0.1.1",      24))  # False
print(same_subnet("172.16.0.1",   "172.16.3.1",    14))  # True  (/14 = 172.16–19.x)
```

## Using Bitwise AND with Subnet Mask

```python
import ipaddress

def same_subnet_mask(ip1: str, ip2: str, mask: str) -> bool:
    """Check subnet membership using a dotted-decimal netmask."""
    mask_int = int(ipaddress.IPv4Network(f"0.0.0.0/{mask}").netmask)
    n1 = int(ipaddress.IPv4Address(ip1)) & mask_int
    n2 = int(ipaddress.IPv4Address(ip2)) & mask_int
    return n1 == n2

print(same_subnet_mask("192.168.1.10", "192.168.1.200", "255.255.255.0"))  # True
print(same_subnet_mask("192.168.1.10", "192.168.2.10",  "255.255.255.0"))  # False
```

## Without Third Parameter (Infer from CIDR Notation)

```python
import ipaddress

def same_network(cidr1: str, cidr2: str) -> bool:
    """Return True if two CIDR interface addresses share the same network."""
    n1 = ipaddress.IPv4Interface(cidr1).network
    n2 = ipaddress.IPv4Interface(cidr2).network
    return n1 == n2

print(same_network("192.168.1.10/24", "192.168.1.200/24"))  # True
print(same_network("192.168.1.10/24", "192.168.2.10/24"))   # False
```

## Checking Which Subnet an Address Belongs To

```python
import ipaddress
from typing import Optional

SUBNETS = {
    "office":  ipaddress.IPv4Network("192.168.1.0/24"),
    "vpn":     ipaddress.IPv4Network("10.8.0.0/16"),
    "servers": ipaddress.IPv4Network("10.0.1.0/24"),
    "dmz":     ipaddress.IPv4Network("172.16.0.0/24"),
}

def find_segment(ip: str) -> Optional[str]:
    try:
        addr = ipaddress.IPv4Address(ip)
        for name, net in SUBNETS.items():
            if addr in net:
                return name
        return None
    except ValueError:
        return None

print(find_segment("192.168.1.50"))  # office
print(find_segment("10.8.0.100"))    # vpn
print(find_segment("8.8.8.8"))       # None
```

## Routing Decision Helper

```python
import ipaddress

LOCAL_SUBNETS = [
    ipaddress.IPv4Network("192.168.1.0/24"),
    ipaddress.IPv4Network("10.0.1.0/24"),
    ipaddress.IPv4Network("172.16.0.0/24"),
]

def should_route_locally(src: str, dst: str) -> bool:
    """
    Return True if src and dst share one of your directly connected subnets,
    suggesting the traffic can stay on the local network.
    """
    try:
        src_addr = ipaddress.IPv4Address(src)
        dst_addr = ipaddress.IPv4Address(dst)
        for net in LOCAL_SUBNETS:
            if src_addr in net and dst_addr in net:
                return True
        return False
    except ValueError:
        return False

print(should_route_locally("192.168.1.10", "192.168.1.20"))  # True
print(should_route_locally("192.168.1.10", "10.0.0.5"))      # False
```

## Conclusion

The cleanest approach is to compute `IPv4Interface(f"{ip}/{prefix}").network` for both addresses and compare the resulting network objects. Bitwise AND with the mask integer is useful when working with raw packet data. For segment lookup, maintain a dict of named networks and iterate with `addr in net`. The `strict=False` flag (or using `IPv4Interface`) handles addresses where host bits are set, which is common with interface addresses from routing tables.
