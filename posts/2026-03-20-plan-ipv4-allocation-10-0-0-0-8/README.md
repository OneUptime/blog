# How to Plan IPv4 Address Allocation Using the 10.0.0.0/8 Private Range

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Addressing, 10.0.0.0/8, Private, Network Design, IPAM

Description: Learn how to allocate and organize the 10.0.0.0/8 private address space for a growing organization with multiple sites, VLANs, and cloud environments.

## Why Use 10.0.0.0/8?

The 10.0.0.0/8 space contains 16,777,216 total addresses - enough for thousands of sites and hundreds of thousands of hosts. It's a common choice for large enterprises because:
- Room for hierarchical allocation without running out
- Supports clean route summarization
- Commonly supported by network equipment

## Step 1: Top-Level Organization Strategy

Choose an organizational hierarchy. Common approaches:

**Geographic (by region/country):**
```text
10.[region].[site].[vlan] / prefix
10.1.x.x = Americas
10.2.x.x = EMEA
10.3.x.x = APAC
```

**Functional (by purpose):**
```text
10.[function].[site].[vlan] / prefix
10.0.x.x  = Corporate users
10.1.x.x  = DMZ / internet-facing
10.2.x.x  = Servers / datacenter
10.3.x.x  = Cloud (AWS, Azure)
10.10.x.x = Network infrastructure
```

## Step 2: Allocate Blocks for Major Functions

```text
10.0.0.0/8 - All Enterprise Networks

/12 blocks (1,048,576 addresses each):
  10.0.0.0/12   = Production (10.0.0.0 - 10.15.255.255)
  10.16.0.0/12  = Development / Lab
  10.32.0.0/12  = DMZ / Internet-facing
  10.48.0.0/12  = Cloud (AWS VPCs)
  10.64.0.0/12  = Cloud (Azure VNets)
  10.80.0.0/12  = Remote access / VPN clients
  10.240.0.0/12 = Network infrastructure
```

## Step 3: Site Allocation Within Production Block

```text
10.0.0.0/12 - Production Networks

/16 blocks per site (65,536 addresses each):
  10.0.0.0/16  = Headquarters
  10.1.0.0/16  = NYC Office
  10.2.0.0/16  = London Office
  10.3.0.0/16  = Tokyo Office
  10.4.0.0/16  = Sydney Office

Within each /16, allocate /22 or /24 blocks per VLAN:
  10.1.0.0/22  = NYC Corp Users  (10.1.0.0 - 10.1.3.255 = 1022 hosts)
  10.1.4.0/22  = NYC Servers
  10.1.8.0/22  = NYC WiFi
  10.1.12.0/24 = NYC Printers
  10.1.13.0/27 = NYC DMZ servers
```

## Step 4: Infrastructure Addressing

```text
10.240.0.0/12 - Infrastructure

10.240.0.0/16  = Loopback addresses
  10.240.0.1/32   = Router01 loopback (OSPF router ID)
  10.240.0.2/32   = Router02 loopback
  10.240.0.3/32   = Router03 loopback

10.241.0.0/16  = WAN point-to-point links (use /30 or /31)
  10.241.0.0/30   = HQ-NYC link
  10.241.0.4/30   = HQ-London link
  10.241.0.8/30   = HQ-Tokyo link

10.242.0.0/16  = Out-of-band / IPMI management
  10.242.0.0/24   = HQ management
  10.242.1.0/24   = NYC management
```

## Step 5: VPN and Remote Access Allocation

```text
10.80.0.0/12 - Remote Access

10.80.0.0/16  = Corporate VPN clients (SSL VPN)
  DHCP pool: 10.80.0.100 - 10.80.255.254 (65K VPN users)

10.81.0.0/16  = Site-to-Site VPN (remote offices without MPLS)
10.82.0.0/16  = Third-party / contractor VPN
```

## Step 6: Document with Python

```python
from ipaddress import ip_network
import json

# Define the allocation plan

allocation_plan = {
    'name': 'Enterprise IPv4 Plan',
    'root': '10.0.0.0/8',
    'blocks': [
        {'cidr': '10.0.0.0/12', 'purpose': 'Production', 'sites': [
            {'cidr': '10.0.0.0/16', 'name': 'HQ', 'vlans': [
                {'cidr': '10.0.0.0/24', 'vlan': 10, 'purpose': 'Corp Users'},
                {'cidr': '10.0.1.0/24', 'vlan': 20, 'purpose': 'Servers'},
            ]},
        ]},
        {'cidr': '10.240.0.0/12', 'purpose': 'Infrastructure'},
    ]
}

# Validate sibling overlaps and parent-child containment
def validate_allocations(items, parent_cidr=None):
    parent_network = ip_network(parent_cidr) if parent_cidr else None
    child_networks = []

    for item in items:
        network = ip_network(item['cidr'])
        child_networks.append(network)

        if parent_network and not (
            network.network_address in parent_network
            and network.broadcast_address in parent_network
        ):
            print(f"OUTSIDE: {network} is not contained in {parent_network}")

        for child_key in ('blocks', 'sites', 'vlans'):
            if child_key in item:
                validate_allocations(item[child_key], item['cidr'])

    for i, n1 in enumerate(child_networks):
        for n2 in child_networks[i + 1:]:
            if n1.overlaps(n2):
                print(f"OVERLAP: {n1} overlaps {n2}")


validate_allocations(allocation_plan['blocks'], allocation_plan['root'])

print("Validation complete")
print(json.dumps(allocation_plan, indent=2))
```

## Conclusion

Planning 10.0.0.0/8 allocation starts with carving out /12 or /16 blocks for major functions (production, dev, DMZ, cloud, infrastructure), then subdividing each block into /16s per site and /24s or /22s per VLAN. Reserve 10.240.0.0/12 (or similar) for network infrastructure loopbacks and WAN links. Document the plan in IPAM tools like NetBox or phpIPAM, validate for overlaps with Python's `ipaddress` module, and enforce allocations through the IPAM tool to prevent ad-hoc assignments.
