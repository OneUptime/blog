# How to Calculate Subnets and Host Ranges for Any IPv4 CIDR Block

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Subnetting, CIDR, Host Ranges, Network Design

Description: Learn how to calculate subnet addresses, broadcast addresses, host ranges, and usable hosts for any IPv4 CIDR block using both manual math and Python tools.

## CIDR Notation Basics

CIDR (Classless Inter-Domain Routing) notation expresses a network as `IP/prefix_length`:
- `192.168.1.0/24` - 256 addresses, 254 usable hosts
- `10.0.0.0/8` - 16,777,216 addresses
- `192.168.1.0/30` - 4 addresses, 2 usable (for point-to-point links)

## Step 1: Key Subnet Calculations

For a network `A.B.C.D/N`:

```text
Subnet mask = N consecutive 1-bits followed by (32-N) 0-bits
Hosts per subnet = 2^(32-N) - 2 for /30 and shorter prefixes
Number of /N subnets in a /M = 2^(N-M)

Examples:
/24 = 256 addresses, 254 usable hosts
/25 = 128 addresses, 126 usable hosts
/26 = 64 addresses, 62 usable hosts
/27 = 32 addresses, 30 usable hosts
/28 = 16 addresses, 14 usable hosts
/29 = 8 addresses, 6 usable hosts
/30 = 4 addresses, 2 usable hosts (WAN links)
/31 = 2 addresses, 2 usable on point-to-point links (RFC 3021)
/32 = 1 address (host route, loopback)
```

## Step 2: Calculate Subnet Components

```text
Network: 192.168.10.50/26

Step 1: Subnet mask
  /26 = 11111111.11111111.11111111.11000000 = 255.255.255.192

Step 2: Network address (AND the IP with the mask)
  192.168.10.50  = 11000000.10101000.00001010.00110010
  255.255.255.192 = 11111111.11111111.11111111.11000000
  AND =            11000000.10101000.00001010.00000000 = 192.168.10.0

Step 3: Broadcast address (OR the network with inverted mask)
  192.168.10.0 = 11000000.10101000.00001010.00000000
  0.0.0.63     = 00000000.00000000.00000000.00111111
  OR =           11000000.10101000.00001010.00111111 = 192.168.10.63

Step 4: Host range
  First host: 192.168.10.1
  Last host:  192.168.10.62
  Usable hosts: 62
```

## Step 3: Use Python for Subnet Calculations

```python
from ipaddress import ip_network, ip_interface

# Calculate subnet info from CIDR notation

def subnet_info(cidr):
    net = ip_network(cidr, strict=False)

    if net.prefixlen == 32:
        first_host = last_host = net.network_address
        usable_hosts = 1
    elif net.prefixlen == 31:
        first_host = net.network_address
        last_host = net.broadcast_address
        usable_hosts = 2
    else:
        first_host = net.network_address + 1
        last_host = net.broadcast_address - 1
        usable_hosts = net.num_addresses - 2

    return {
        'network_address': str(net.network_address),
        'broadcast_address': str(net.broadcast_address),
        'subnet_mask': str(net.netmask),
        'first_host': str(first_host),
        'last_host': str(last_host),
        'usable_hosts': usable_hosts,
        'total_addresses': net.num_addresses,
        'prefix_length': net.prefixlen,
    }

# Examples
for cidr in ['192.168.1.0/24', '10.0.0.0/8', '172.16.5.64/26', '203.0.113.0/30']:
    info = subnet_info(cidr)
    print(f"\n{cidr}:")
    print(f"  Network:    {info['network_address']}")
    print(f"  Broadcast:  {info['broadcast_address']}")
    print(f"  Mask:       {info['subnet_mask']}")
    print(f"  Host range: {info['first_host']} - {info['last_host']}")
    print(f"  Usable:     {info['usable_hosts']} hosts")
```

## Step 4: Divide a Network Into Equal Subnets

```python
from ipaddress import ip_network

def divide_network(parent_cidr, new_prefix):
    """Divide a parent network into equal subnets of given prefix length."""
    parent = ip_network(parent_cidr)
    subnets = list(parent.subnets(new_prefix=new_prefix))

    if subnets[0].prefixlen == 32:
        hosts_per_subnet = 1
    elif subnets[0].prefixlen == 31:
        hosts_per_subnet = 2
    else:
        hosts_per_subnet = subnets[0].num_addresses - 2

    print(f"Dividing {parent_cidr} into /{new_prefix} subnets:")
    print(f"Number of subnets: {len(subnets)}")
    print(f"Hosts per subnet: {hosts_per_subnet}")
    print()

    for i, subnet in enumerate(subnets[:10]):  # Show first 10
        if subnet.prefixlen == 32:
            first = last = subnet.network_address
        elif subnet.prefixlen == 31:
            first = subnet.network_address
            last = subnet.broadcast_address
        else:
            first = subnet.network_address + 1
            last = subnet.broadcast_address - 1
        print(f"  Subnet {i+1}: {subnet}  ({first} - {last})")

    if len(subnets) > 10:
        print(f"  ... and {len(subnets) - 10} more")

    return subnets

# Divide 10.1.0.0/16 into /24 subnets
divide_network('10.1.0.0/16', 24)

# Divide 192.168.1.0/24 into /26 subnets
divide_network('192.168.1.0/24', 26)
```

## Step 5: Quick Reference Table

| Prefix | Hosts | Mask | Common Use |
|---|---|---|---|
| /8 | 16,777,214 | 255.0.0.0 | Large enterprise |
| /16 | 65,534 | 255.255.0.0 | Site/campus |
| /20 | 4,094 | 255.255.240.0 | Large building |
| /22 | 1,022 | 255.255.252.0 | Medium site |
| /23 | 510 | 255.255.254.0 | Department |
| /24 | 254 | 255.255.255.0 | Small department |
| /25 | 126 | 255.255.255.128 | Half subnet |
| /26 | 62 | 255.255.255.192 | Quarter subnet |
| /27 | 30 | 255.255.255.224 | Small segment |
| /28 | 14 | 255.255.255.240 | Server VLAN |
| /29 | 6 | 255.255.255.248 | Small group |
| /30 | 2 | 255.255.255.252 | WAN point-to-point |

## Conclusion

Subnet calculations follow a simple formula: usable hosts = 2^(32-prefix) - 2 for /30 and shorter prefixes, network address = IP ANDed with mask, broadcast = network OR inverted mask. Use Python's `ipaddress.ip_network()` for instant calculations in scripts, and `parent.subnets(new_prefix=N)` to divide a network into equal subnets. A /30 with 2 usable hosts is the standard for WAN point-to-point links; /31 (RFC 3021) lets both addresses be used as host addresses on point-to-point links, while /32 represents a single-host route.
