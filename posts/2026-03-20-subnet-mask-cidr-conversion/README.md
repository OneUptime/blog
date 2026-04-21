# How to Convert Subnet Mask to CIDR Notation and Back

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, IPv4, CIDR, Subnets, Networking, Ipaddress

Description: Learn how to convert between dotted-decimal subnet masks and CIDR prefix lengths in Python, with validation, lookup tables, and edge case handling.

## Mask to CIDR Prefix Length

```python
import ipaddress

def mask_to_cidr(mask: str) -> int:
    """Convert dotted-decimal subnet mask to CIDR prefix length."""
    # IPv4Network accepts a host address / mask to derive prefix length.
    # It also accepts host masks, so compare against .netmask for subnet masks.
    net = ipaddress.IPv4Network(f"0.0.0.0/{mask}")
    if mask != str(net.netmask):
        raise ValueError(f"{mask!r} is a host mask, not a subnet mask")
    return net.prefixlen

print(mask_to_cidr("255.0.0.0"))       # 8
print(mask_to_cidr("255.255.0.0"))     # 16
print(mask_to_cidr("255.255.255.0"))   # 24
print(mask_to_cidr("255.255.255.128")) # 25
print(mask_to_cidr("255.255.255.252")) # 30
print(mask_to_cidr("255.255.255.255")) # 32
```

## CIDR Prefix Length to Dotted-Decimal Mask

```python
import ipaddress

def cidr_to_mask(prefix: int) -> str:
    """Convert CIDR prefix length to dotted-decimal subnet mask."""
    return str(ipaddress.IPv4Network(f"0.0.0.0/{prefix}").netmask)

print(cidr_to_mask(8))   # 255.0.0.0
print(cidr_to_mask(16))  # 255.255.0.0
print(cidr_to_mask(24))  # 255.255.255.0
print(cidr_to_mask(25))  # 255.255.255.128
print(cidr_to_mask(30))  # 255.255.255.252
```

## Validating a Subnet Mask

```python
import ipaddress

def is_valid_mask(mask: str) -> bool:
    """
    A valid subnet mask is a contiguous block of 1-bits followed by 0-bits.
    ipaddress.IPv4Network raises ValueError for non-contiguous masks, but
    accepts host masks too, so compare the input against .netmask.
    """
    try:
        net = ipaddress.IPv4Network(f"0.0.0.0/{mask}")
        return mask == str(net.netmask)
    except ValueError:
        return False

print(is_valid_mask("255.255.255.0"))   # True
print(is_valid_mask("255.255.255.128")) # True
print(is_valid_mask("255.0.255.0"))     # False - non-contiguous
print(is_valid_mask("255.255.256.0"))   # False - octet > 255
print(is_valid_mask("0.0.0.255"))       # False - host mask, not subnet mask
```

## Lookup Table for All Common Masks

```python
import ipaddress

print(f"{'Prefix':<8} {'Subnet Mask':<20} {'Wildcard':<20} {'Hosts'}")
print("-" * 65)
for prefix in range(0, 33):
    net      = ipaddress.IPv4Network(f"0.0.0.0/{prefix}")
    mask     = str(net.netmask)
    wildcard = str(net.hostmask)
    if prefix == 31:
        hosts = 2    # RFC 3021 point-to-point
    elif prefix == 32:
        hosts = 1    # host route
    else:
        hosts = net.num_addresses - 2
    print(f"/{prefix:<6} {mask:<20} {wildcard:<20} {hosts}")
```

## Converting an Entire Network String

```python
import ipaddress

def normalize_network(s: str) -> dict:
    """
    Accept 'ip/mask' or 'ip/prefix' and return canonical CIDR fields.
    E.g., '192.168.1.0/255.255.255.0' → prefix=24
    """
    net = ipaddress.IPv4Network(s, strict=False)
    return {
        "network":  str(net.network_address),
        "prefix":   net.prefixlen,
        "mask":     str(net.netmask),
        "wildcard": str(net.hostmask),
        "cidr":     str(net),
    }

print(normalize_network("192.168.1.0/255.255.255.0"))
# {'network': '192.168.1.0', 'prefix': 24, 'mask': '255.255.255.0', ...}

print(normalize_network("10.0.0.5/8"))
# {'network': '10.0.0.0', 'prefix': 8, 'mask': '255.0.0.0', ...}

```

## Conclusion

Python's `ipaddress.IPv4Network(f"0.0.0.0/{mask}")` is the standard trick for converting a dotted-decimal mask to a prefix length via `.prefixlen`, and the reverse via `.netmask`. The library validates contiguous net masks and host masks, so compare the input to `.netmask` when you need to reject host-mask patterns like `0.0.0.255`. It raises `ValueError` for non-contiguous patterns like `255.0.255.0`. Always use `strict=False` when constructing a network from an interface address to avoid errors from host bits being set.
