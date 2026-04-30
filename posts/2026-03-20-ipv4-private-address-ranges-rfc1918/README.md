# How to Understand IPv4 Private Address Ranges (RFC 1918)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Networking, RFC 1918, Private Addresses, NAT, IP Addressing

Description: RFC 1918 defines three blocks of IPv4 address space reserved for private networks that are not routed on the public internet, enabling organizations to use these addresses internally with NAT for...

## The Three RFC 1918 Blocks

| Block | Range | CIDR | Mask | Size |
|-------|-------|------|-------------|------|
| Class A private | 10.0.0.0 – 10.255.255.255 | 10.0.0.0/8 | 255.0.0.0 | 16,777,216 addresses |
| Class B private | 172.16.0.0 – 172.31.255.255 | 172.16.0.0/12 | 255.240.0.0 | 1,048,576 addresses |
| Class C private | 192.168.0.0 – 192.168.255.255 | 192.168.0.0/16 | 255.255.0.0 | 65,536 addresses |

## Why Private Addresses Exist

Before NAT and private addressing, every connected device required a unique public IP. RFC 1918 (1996) created private ranges to allow organizations to use the same address space internally without coordination. NAT at the network boundary translates private addresses to public ones for internet communication.

## Checking if an Address Is Private

```python
import ipaddress

RFC1918_NETWORKS = (
    ipaddress.IPv4Network("10.0.0.0/8"),
    ipaddress.IPv4Network("172.16.0.0/12"),
    ipaddress.IPv4Network("192.168.0.0/16"),
)

def is_private(ip: str) -> bool:
    """Return True if the IPv4 address is in an RFC 1918 private range."""
    address = ipaddress.IPv4Address(ip)
    return any(address in network for network in RFC1918_NETWORKS)

# Test cases

addresses = [
    "10.0.0.1",
    "172.16.5.10",
    "172.32.0.1",     # NOT private (172.32 is outside 172.16-31)
    "192.168.100.1",
    "8.8.8.8",
    "203.0.113.5",    # Documentation range, not RFC 1918 private
]

for addr in addresses:
    print(f"{addr:18s} private={is_private(addr)}")
```

## Checking the 172.16/12 Block Boundary

```python
import ipaddress

# The 172.16.0.0/12 block covers 172.16.0.0 to 172.31.255.255
block = ipaddress.IPv4Network("172.16.0.0/12")
for addr in ["172.15.255.255", "172.16.0.0", "172.31.255.255", "172.32.0.0"]:
    print(f"{addr} in 172.16/12: {ipaddress.IPv4Address(addr) in block}")
```

Output:
```text
172.15.255.255 in 172.16/12: False
172.16.0.0 in 172.16/12: True
172.31.255.255 in 172.16/12: True
172.32.0.0 in 172.16/12: False
```

## Routing Considerations

- Private addresses **must not** be advertised to the public internet.
- ISPs should filter incoming packets with private source addresses.
- BGP filtering: add RFC 1918 prefixes to inbound prefix-lists to prevent leaking.

```bash
# iptables: drop packets with private source IPs arriving on the WAN interface
iptables -A INPUT -i eth0 -s 10.0.0.0/8 -j DROP
iptables -A INPUT -i eth0 -s 172.16.0.0/12 -j DROP
iptables -A INPUT -i eth0 -s 192.168.0.0/16 -j DROP
```

## Key Takeaways

- RFC 1918 defines 10/8, 172.16/12, and 192.168/16 as private (non-routable on internet).
- The 172.16/12 block covers 172.16.0.0 through 172.31.255.255, not 172.x.x.x generally.
- NAT translates private addresses to public IPs for internet access.
- Always filter private source addresses on public-facing interfaces.
