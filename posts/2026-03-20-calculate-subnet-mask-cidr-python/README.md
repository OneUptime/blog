# How to Calculate Subnet Masks from IPv4 CIDR Prefix Length in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, IPv4, CIDR, Subnets, Ipaddress, Networking

Description: Learn how to calculate IPv4 subnet masks from CIDR prefix lengths in Python, convert between dotted-decimal and prefix notation, and derive network details programmatically.

## Prefix Length to Dotted-Decimal Mask

```python
import ipaddress

def prefix_to_mask(prefix_len: int) -> str:
    """Convert a CIDR prefix length (0-32) to dotted-decimal subnet mask."""
    net = ipaddress.IPv4Network(f"0.0.0.0/{prefix_len}")
    return str(net.netmask)

for prefix in [8, 16, 24, 25, 26, 27, 28, 29, 30, 32]:
    print(f"/{prefix:2d}  ->  {prefix_to_mask(prefix)}")

# / 8  ->  255.0.0.0

# /16  ->  255.255.0.0
# /24  ->  255.255.255.0
# /25  ->  255.255.255.128
# /26  ->  255.255.255.192
# /30  ->  255.255.255.252
# /32  ->  255.255.255.255
```

## Dotted-Decimal Mask to Prefix Length

```python
import ipaddress

def mask_to_prefix(mask: str) -> int:
    """Convert dotted-decimal subnet mask to CIDR prefix length."""
    return ipaddress.IPv4Network(f"0.0.0.0/{mask}").prefixlen

print(mask_to_prefix("255.0.0.0"))       # 8
print(mask_to_prefix("255.255.0.0"))     # 16
print(mask_to_prefix("255.255.255.0"))   # 24
print(mask_to_prefix("255.255.255.128")) # 25
```

## Full Network Details from IP and Prefix

```python
import ipaddress

def network_info(ip: str, prefix: int) -> dict:
    """Return full subnet details for an IP address and prefix length."""
    iface = ipaddress.IPv4Interface(f"{ip}/{prefix}")
    net   = iface.network

    if net.prefixlen == 32:
        usable_hosts = 1
        first_host = last_host = str(net.network_address)
    elif net.prefixlen == 31:
        usable_hosts = 2
        first_host = str(net.network_address)
        last_host = str(net.broadcast_address)
    else:
        usable_hosts = net.num_addresses - 2
        first_host = str(net.network_address + 1)
        last_host = str(net.broadcast_address - 1)

    return {
        "host_address":    str(iface.ip),
        "network_address": str(net.network_address),
        "broadcast":       str(net.broadcast_address),
        "netmask":         str(net.netmask),
        "wildcard":        str(net.hostmask),
        "prefix_length":   net.prefixlen,
        "num_addresses":   net.num_addresses,
        "usable_hosts":    usable_hosts,
        "first_host":      first_host,
        "last_host":       last_host,
    }

info = network_info("192.168.1.50", 24)
for k, v in info.items():
    print(f"  {k:<18}: {v}")
```

## Wildcard Mask (Inverse Mask)

```python
import ipaddress

def wildcard_mask(prefix: int) -> str:
    """Return the wildcard (inverse) mask for a given prefix length."""
    net = ipaddress.IPv4Network(f"0.0.0.0/{prefix}")
    return str(net.hostmask)

# Wildcard masks are used in ACL configurations
print(wildcard_mask(24))  # 0.0.0.255
print(wildcard_mask(16))  # 0.0.255.255
print(wildcard_mask(32))  # 0.0.0.0
```

## Lookup Table for Common Prefixes

```python
import ipaddress

print(f"{'Prefix':<8} {'Mask':<18} {'Wildcard':<18} {'Hosts'}")
print("-" * 60)
for p in range(8, 33):
    net = ipaddress.IPv4Network(f"0.0.0.0/{p}")
    hosts = net.num_addresses - 2 if p < 31 else (1 if p == 32 else 2)
    print(f"/{p:<6} {str(net.netmask):<18} {str(net.hostmask):<18} {hosts}")
```

## Conclusion

Python's `ipaddress.IPv4Network` encapsulates all subnet math. Use `net.netmask` for the dotted-decimal mask, `net.hostmask` for the wildcard mask, and `net.prefixlen` to go back to CIDR notation. Constructing with `f"0.0.0.0/{mask}"` is the standard trick to convert a dotted mask to a prefix length. For per-host context (IP + its network simultaneously), use `IPv4Interface` instead of `IPv4Network`.
