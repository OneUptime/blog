# How to Use an IPv6 Subnet Calculator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Subnetting, Tool, Networking, Address Planning

Description: Learn how to use IPv6 subnet calculators - both online tools and Python scripts - to compute subnet ranges, host counts, and prefix relationships.

## Introduction

IPv6 subnetting involves 128-bit arithmetic that is tedious to do by hand. Subnet calculators automate the computation of prefix ranges, subnet counts, and address boundaries. This guide covers both command-line tools and building your own Python subnet calculator.

## Online and CLI Tools

```bash
# Install sipcalc (powerful IPv6 subnet calculator)

sudo apt install sipcalc      # Debian/Ubuntu
brew install sipcalc           # macOS

# Basic IPv6 subnet calculation
sipcalc 2001:db8:1::/48

# Example output:
# -[ipv6 : 2001:db8:1::/48] - 0
# [IPV6 INFO]
# Expanded Address        - 2001:0db8:0001:0000:0000:0000:0000:0000
# Compressed address      - 2001:db8:1::
# Subnet prefix           - 2001:0db8:0001:0000:0000:0000:0000:0000
# Address ID              - 0000:0000:0000:0000:0000:0000:0000:0000
# Prefix address          - ffff:ffff:ffff:0000:0000:0000:0000:0000
# Prefix length           - 48

# Python ipaddress module (built-in)
python3 -c "
import ipaddress
net = ipaddress.IPv6Network('2001:db8:1::/48')
print('Network:', net)
print('First address:', net.network_address)
print('Last address:', net.broadcast_address)
print('Num /64 subnets:', sum(1 for _ in net.subnets(new_prefix=64)))
"
```

## Python Subnet Calculator

```python
import ipaddress
from math import log2

class IPv6Calculator:
    """Complete IPv6 subnet calculator."""

    def __init__(self, prefix: str):
        self.network = ipaddress.IPv6Network(prefix, strict=False)

    def info(self):
        """Display comprehensive subnet information."""
        net = self.network
        prefix_len = net.prefixlen
        host_bits = 128 - prefix_len

        print(f"{'='*55}")
        print(f"IPv6 Subnet Calculator: {net}")
        print(f"{'='*55}")
        print(f"Compressed:        {net.compressed}")
        print(f"Expanded:          {net.exploded}")
        print(f"Prefix length:     /{prefix_len}")
        print(f"Network mask:      {net.netmask}")
        print(f"Network address:   {net.network_address}")
        print(f"Last address:      {net.broadcast_address}")
        print(f"Host bits:         {host_bits}")
        print(f"Total addresses:   2^{host_bits} = {2**host_bits:,}")
        print()

        # Show possible subnet splits
        for new_prefix in [48, 52, 56, 60, 64, 128]:
            if new_prefix > prefix_len:
                count = 2 ** (new_prefix - prefix_len)
                print(f"  Split into /{new_prefix}: {count:>12,} subnets")

    def subnets(self, new_prefix: int, count: int = 5):
        """List the first N subnets at a given prefix length."""
        print(f"\nFirst {count} /{new_prefix} subnets of {self.network}:")
        for i, subnet in enumerate(self.network.subnets(new_prefix=new_prefix)):
            if i >= count:
                break
            print(f"  [{i:4d}] {subnet}")

    def contains(self, address: str) -> bool:
        """Check if an address is in this network."""
        return ipaddress.IPv6Address(address) in self.network

    def supernet(self, new_prefix: int):
        """Get the supernet (larger containing network)."""
        return self.network.supernet(new_prefix=new_prefix)

# Example usage
calc = IPv6Calculator("2001:db8:abcd::/48")
calc.info()
calc.subnets(64, count=8)

# Check containment
print(calc.contains("2001:db8:abcd:1::1"))  # True
print(calc.contains("2001:db8:beef::1"))     # False

# Find the /32 supernet
print(calc.supernet(32))  # 2001:db8::/32
```

## Key Operations

```python
import ipaddress

prefix = "2001:db8:1:2::/64"
net = ipaddress.IPv6Network(prefix)

# Get the nth subnet from a block
parent = ipaddress.IPv6Network("2001:db8::/48")
subnets = list(parent.subnets(new_prefix=64))
print(f"Subnet 100: {subnets[100]}")    # 2001:db8:0:64::/64

# Check if two networks overlap
net1 = ipaddress.IPv6Network("2001:db8:1::/48")
net2 = ipaddress.IPv6Network("2001:db8:1:1::/64")
print(net1.overlaps(net2))  # True
print(net2.subnet_of(net1))  # True

# Collapse a list of prefixes into summaries
prefixes = [
    "2001:db8:1::/64",
    "2001:db8:1:1::/64",
    "2001:db8:1:2::/64",
    "2001:db8:1:3::/64",
]
nets = [ipaddress.IPv6Network(p) for p in prefixes]
collapsed = list(ipaddress.collapse_addresses(nets))
print("Collapsed:", [str(n) for n in collapsed])
# Returns 2001:db8:1::/62
```

## Recommended Free Tools

| Tool | Type | Best For |
|---|---|---|
| `sipcalc` | CLI | Quick terminal calculations |
| `ipv6calc` | CLI | Advanced conversions |
| `Python ipaddress` | Library | Scripting and automation |
| subnettingpractice.com | Web | Learning and practice |
| network-calculator.com | Web | Visual subnetting |
| Hurricane Electric BGP Toolkit | Web | Real prefix lookups |

## Conclusion

IPv6 subnet calculators, whether online tools, CLI programs, or Python scripts, make it practical to work with 128-bit addresses. The Python `ipaddress` module is particularly powerful for automation, IPAM scripting, and validation. Building familiarity with these tools accelerates IPv6 address planning and reduces errors in network configuration.
