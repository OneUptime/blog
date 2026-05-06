# How to Check If an IPv4 Address Is Private or Public in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, IPv4, Private, Public, Ipaddress, Networking

Description: Learn how to determine whether an IPv4 address is private (RFC 1918), public (globally routable), loopback, link-local, or reserved using Python's ipaddress standard library.

## Using ipaddress Properties

```python
import ipaddress

def classify_ipv4(s: str) -> dict:
    try:
        addr = ipaddress.IPv4Address(s)
    except ValueError:
        return {"valid": False}

    return {
        "valid":          True,
        "address":        str(addr),
        "is_private":     addr.is_private,    # broader than RFC 1918; includes many non-global ranges
        "is_global":      addr.is_global,     # globally reachable according to ipaddress
        "is_loopback":    addr.is_loopback,   # 127.0.0.0/8
        "is_link_local":  addr.is_link_local, # 169.254.0.0/16
        "is_multicast":   addr.is_multicast,  # 224.0.0.0/4
        "is_reserved":    addr.is_reserved,   # 240.0.0.0/4 for IPv4
        "is_unspecified": addr.is_unspecified, # 0.0.0.0
    }

for ip in ["192.168.1.1", "8.8.8.8", "127.0.0.1", "169.254.1.1", "224.0.0.1", "0.0.0.0"]:
    info = classify_ipv4(ip)
    print(f"{ip:<18} private={info['is_private']}  global={info['is_global']}")
```

## Checking Private Ranges Explicitly (RFC 1918)

```python
import ipaddress

# RFC 1918 private address ranges

PRIVATE_RANGES = [
    ipaddress.IPv4Network("10.0.0.0/8"),
    ipaddress.IPv4Network("172.16.0.0/12"),
    ipaddress.IPv4Network("192.168.0.0/16"),
]

def is_rfc1918_private(ip: str) -> bool:
    """Returns True only for the three RFC 1918 private ranges."""
    try:
        addr = ipaddress.IPv4Address(ip)
        return any(addr in net for net in PRIVATE_RANGES)
    except ValueError:
        return False

print(is_rfc1918_private("10.1.2.3"))       # True
print(is_rfc1918_private("172.16.0.1"))     # True
print(is_rfc1918_private("172.32.0.1"))     # False (outside 172.16-31)
print(is_rfc1918_private("192.168.100.1"))  # True
print(is_rfc1918_private("8.8.8.8"))        # False
print(is_rfc1918_private("127.0.0.1"))      # False (loopback, not RFC 1918)
```

## Filtering Lists of IPs

```python
import ipaddress

PRIVATE_RANGES = (
    ipaddress.IPv4Network("10.0.0.0/8"),
    ipaddress.IPv4Network("172.16.0.0/12"),
    ipaddress.IPv4Network("192.168.0.0/16"),
)

def split_private_public(ips: list[str]) -> tuple[list[str], list[str]]:
    private, public = [], []
    for s in ips:
        try:
            addr = ipaddress.IPv4Address(s)
            if any(addr in net for net in PRIVATE_RANGES):
                private.append(s)
            elif addr.is_global and not addr.is_multicast:
                public.append(s)
        except ValueError:
            pass
    return private, public

ips = ["192.168.1.1", "8.8.8.8", "10.0.0.1", "1.1.1.1", "127.0.0.1"]
priv, pub = split_private_public(ips)
print("Private:", priv)  # ['192.168.1.1', '10.0.0.1']
print("Public: ", pub)   # ['8.8.8.8', '1.1.1.1']
```

## Special Ranges Reference

```python
import ipaddress

DOCUMENTATION_RANGES = (
    ipaddress.IPv4Network("192.0.2.0/24"),
    ipaddress.IPv4Network("198.51.100.0/24"),
    ipaddress.IPv4Network("203.0.113.0/24"),
)

SPECIAL = {
    "unspecified": ipaddress.IPv4Network("0.0.0.0/32"),
    "loopback":    ipaddress.IPv4Network("127.0.0.0/8"),
    "link_local":  ipaddress.IPv4Network("169.254.0.0/16"),
    "multicast":   ipaddress.IPv4Network("224.0.0.0/4"),
    "broadcast":   ipaddress.IPv4Network("255.255.255.255/32"),
    "carrier_nat": ipaddress.IPv4Network("100.64.0.0/10"),  # RFC 6598
    "reserved":    ipaddress.IPv4Network("240.0.0.0/4"),
}

def categorize(ip: str) -> str:
    try:
        addr = ipaddress.IPv4Address(ip)
    except ValueError:
        return "invalid"
    for name, net in SPECIAL.items():
        if addr in net:
            return name
    if any(addr in net for net in DOCUMENTATION_RANGES):
        return "documentation"
    for r in [ipaddress.IPv4Network("10.0.0.0/8"),
              ipaddress.IPv4Network("172.16.0.0/12"),
              ipaddress.IPv4Network("192.168.0.0/16")]:
        if addr in r:
            return "rfc1918_private"
    return "public" if addr.is_global and not addr.is_multicast else "special"

print(categorize("192.168.1.1"))   # rfc1918_private
print(categorize("8.8.8.8"))       # public
print(categorize("169.254.1.1"))   # link_local
print(categorize("100.64.0.1"))    # carrier_nat
```

## Conclusion

Python's `ipaddress.IPv4Address.is_private` is the simplest check but includes loopback, link-local, and other special-purpose ranges beyond RFC 1918. Use `is_global` for addresses Python considers globally reachable, and combine it with `not addr.is_multicast` if you specifically want public unicast addresses. For strict RFC 1918 enforcement, explicitly check the three private networks: `10.0.0.0/8`, `172.16.0.0/12`, and `192.168.0.0/16`. The `is_loopback`, `is_link_local`, and `is_multicast` properties cover the other special ranges defined in various RFCs.
