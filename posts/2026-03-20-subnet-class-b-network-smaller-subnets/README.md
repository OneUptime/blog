# How to Subnet a Class B Network into Smaller Subnets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Subnetting, Class B, Networking, CIDR

Description: Subnetting a Class B (/16) network into /24 subnets creates 256 networks of 254 hosts each, while other prefix lengths offer flexibility for different segment sizes across large enterprise...

## Class B Basics

A Class B network like `172.16.0.0/16` has:
- 16 host bits
- 65,534 usable addresses in the flat /16

Borrowing bits from the third and fourth octets creates subnets.

## Common /16 Subnetting Scenarios

| New Prefix | Borrowed Bits | Subnets | Hosts Each |
|-----------|--------------|---------|-----------|
| /17 | 1 | 2 | 32,766 |
| /18 | 2 | 4 | 16,382 |
| /20 | 4 | 16 | 4,094 |
| /22 | 6 | 64 | 1,022 |
| /24 | 8 | 256 | 254 |
| /28 | 12 | 4,096 | 14 |

## Dividing into /24 Subnets

```python
import ipaddress

parent = ipaddress.IPv4Network("172.16.0.0/16")
subnets_24 = list(parent.subnets(new_prefix=24))

print(f"Total /24 subnets: {len(subnets_24)}")
print("\nFirst 5 subnets:")
for s in subnets_24[:5]:
    print(f"  {s}  ({s.num_addresses - 2} hosts)")
```

Output:
```text
Total /24 subnets: 256
First 5 subnets:
  172.16.0.0/24  (254 hosts)
  172.16.1.0/24  (254 hosts)
  172.16.2.0/24  (254 hosts)
  172.16.3.0/24  (254 hosts)
  172.16.4.0/24  (254 hosts)
```

## Hierarchical Design: /16 → /20 → /24

```python
parent = ipaddress.IPv4Network("172.16.0.0/16")

# Allocate /20 blocks per site (4094 hosts each, 16 sites)

site_blocks = list(parent.subnets(new_prefix=20))
print(f"Site blocks (/20): {len(site_blocks)}")

# Each site further divided into /24 VLANs (16 VLANs per site)
site_a = site_blocks[0]  # 172.16.0.0/20
vlans = list(site_a.subnets(new_prefix=24))
print(f"\nSite A ({site_a}) VLANs:")
for vlan in vlans:
    print(f"  {vlan}")
```

## Enterprise Allocation Example

```python
site_allocations = {
    "HQ":        "172.16.0.0/20",
    "Branch-NY": "172.16.16.0/20",
    "Branch-LA": "172.16.32.0/20",
    "DMZ":       "172.16.48.0/22",
    "Management": "172.16.52.0/24",
}

for site, cidr in site_allocations.items():
    net = ipaddress.IPv4Network(cidr)
    print(f"{site:12s}: {cidr:20s} ({net.num_addresses - 2} usable addresses)")
```

## Key Takeaways

- A /16 provides 16 bits of host space; every borrowed bit doubles subnet count.
- Dividing /16 into /24s gives 256 subnets of 254 hosts each - suitable for floor/VLAN-per-subnet designs.
- Use hierarchical allocation: /20 per site, /24 per VLAN within a site.
- The entire /16 can be summarized in routing as a single internal route when the subnets share the same routing policy.
