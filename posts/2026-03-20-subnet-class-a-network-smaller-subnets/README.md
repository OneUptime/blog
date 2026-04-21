# How to Subnet a Class A Network into Smaller Subnets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Subnetting, Class A, Networking, CIDR, Enterprise

Description: Subnetting a Class A (/8) network leverages its 24 host bits to create thousands of subnets for large enterprises, ISPs, or cloud providers using a hierarchical addressing scheme.

## Class A Basics

A Class A network like `10.0.0.0/8` has:
- 24 host bits
- 16,777,214 usable addresses
- First octet fixed (10), last three octets available

## Subnetting Options

| New Prefix | Subnets | Hosts Each |
|-----------|---------|-----------|
| /16 | 256 | 65,534 |
| /20 | 4,096 | 4,094 |
| /24 | 65,536 | 254 |
| /26 | 262,144 | 62 |

## Three-Tier Hierarchy: /8 → /16 → /20 → /24

```python
import ipaddress

parent = ipaddress.IPv4Network("10.0.0.0/8")

# Tier 1: /16 blocks per region (256 regions)

regions = list(parent.subnets(new_prefix=16))
print(f"Total /16 regions: {len(regions)}")

# Tier 2: /20 per site within a region (16 per region)
region_us = regions[0]  # 10.0.0.0/16
sites = list(region_us.subnets(new_prefix=20))
print(f"\nRegion US ({region_us}): {len(sites)} /20 sites")

# Tier 3: /24 per VLAN within a site (16 per site)
site_hq = sites[0]  # 10.0.0.0/20
vlans = list(site_hq.subnets(new_prefix=24))
print(f"\nHQ Site ({site_hq}): {len(vlans)} /24 VLANs")
for v in vlans:
    print(f"  {v}  ({v.num_addresses - 2} hosts)")
```

## Realistic Enterprise Allocation

```python
import ipaddress

allocations = {
    "10.0.0.0/8": "Global address space",
    "10.0.0.0/16":   "Region: US-East",
    "10.0.0.0/20":     "Site: HQ-NY",
    "10.0.0.0/24":       "VLAN10: Servers",
    "10.0.1.0/24":       "VLAN20: Users",
    "10.0.2.0/24":       "VLAN30: VoIP",
    "10.1.0.0/16":   "Region: US-West",
    "10.100.0.0/16": "Region: Cloud-VPC",
}

for cidr, description in allocations.items():
    net = ipaddress.IPv4Network(cidr)
    hierarchy_depth = {8: 0, 16: 1, 20: 2, 24: 3}.get(net.prefixlen, 0)
    indent = "  " * hierarchy_depth
    print(f"{cidr:20s}  ({net.num_addresses - 2:>9,d} hosts)  {indent}{description}")
```

## Summarizing Routes from Subnets

Inside a private routing domain, all subnets of `10.0.0.0/8` can summarize back to a single /8 advertisement:

```bash
# Internal BGP: advertise the entire 10/8 summary instead of individual /16s
# Requires a matching 10.0.0.0/8 route in the local routing table
# This keeps the routing table small
network 10.0.0.0 mask 255.0.0.0
```

## Key Takeaways

- A /8 has 24 bits of subnetting flexibility - enough for massive hierarchical designs.
- Use the three-tier model: /8 (global) → /16 (region) → /20 (site) → /24 (VLAN).
- The entire /8 can summarize to a single internal BGP advertisement, keeping the routing table manageable.
- Document all allocations in an IPAM tool to avoid overlap as the network grows.
