# How to Plan IPv6 Address Allocation Hierarchies in IPAM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPAM, Address Planning, Network Design, Prefix Hierarchy

Description: Design and implement hierarchical IPv6 address allocation structures in IPAM tools covering RIR allocations down to individual /64 subnet assignments.

## Introduction

IPv6 address hierarchies in IPAM represent the delegation chain from RIR allocation to individual subnet assignment. A well-designed hierarchy enables summarization for routing, clear ownership boundaries, and efficient space management. This guide covers planning principles and NetBox implementation.

## Hierarchy Design Principles

| Level | Prefix Length | Purpose | Count per Parent |
|-------|--------------|---------|-----------------|
| RIR Allocation | /32 | Organization total | 1 |
| Region block | /36 | Geographic region | 16 |
| Site/Campus | /48 | One site | 4096 |
| Building/Zone | /52 | Zone within site | 16 |
| VLAN/Segment | /64 | Individual subnet | 4096 |
| Host address | /128 | Single device | 2^64 per /64 |

## Standard Addressing Scheme

```python
#!/usr/bin/env python3
# design_ipv6_hierarchy.py

import ipaddress

ORG_PREFIX = "2001:db8::/32"

def describe_hierarchy(prefix: str, level: int = 0):
    """Describe an IPv6 prefix hierarchy."""
    net = ipaddress.ip_network(prefix)
    indent = "  " * level

    level_names = {
        32: "RIR Allocation",
        36: "Region",
        40: "Country",
        48: "Site/Campus",
        52: "Building/Zone",
        56: "Department",
        64: "VLAN/Subnet",
        128: "Host"
    }

    name = level_names.get(net.prefixlen, f"/{net.prefixlen}")

    if net.prefixlen <= 32:
        child_pl = 36
    elif net.prefixlen <= 36:
        child_pl = 48
    elif net.prefixlen <= 48:
        child_pl = 64
    else:
        return

    child_count = 2 ** (child_pl - net.prefixlen)
    print(f"{indent}{name}: {prefix}")
    print(f"{indent}  → Can allocate {child_count:,} /{child_pl} prefixes")

describe_hierarchy(ORG_PREFIX)
# RIR Allocation: 2001:db8::/32
#   → Can allocate 16 /36 prefixes
```

## Example Hierarchy: Multi-Site Organization

```text
2001:db8::/32                          # RIR Allocation

  2001:db8:0000::/36                   # North America Region
    2001:db8:0001::/48                 # HQ - New York
      2001:db8:0001:0001::/64          # Servers
      2001:db8:0001:0002::/64          # Management
      2001:db8:0001:0003::/64          # DMZ
      2001:db8:0001:0010::/64          # Workstations
      2001:db8:0001:0020::/64          # IoT
    2001:db8:0002::/48                 # Data Center - Ashburn
      2001:db8:0002:0001::/64          # Web Tier
      2001:db8:0002:0002::/64          # App Tier
      2001:db8:0002:0003::/64          # Database Tier

  2001:db8:1000::/36                   # Europe Region
    2001:db8:1001::/48                 # Office - London
    2001:db8:1002::/48                 # Office - Berlin

  2001:db8:ff00::/40                   # Special Purpose
    2001:db8:ff01::/48                 # Management infrastructure
    2001:db8:ff02::/48                 # Lab/Test
    2001:db8:ff03::/48                 # Reserved
```

## Encoding Metadata in Addresses

A common practice is to encode site/region/VLAN information directly in the address bits:

```yaml
2001:db8:RRSS:VVVV::/64
         ||||
         ||++-- Site ID (hex): 0001=HQ, 0002=DC-East, 0003=DC-West
         ++---- Region ID (hex): 00=AMER, 10=EMEA, 20=APAC
```

```python
import ipaddress

def decode_address(ipv6: str) -> dict:
    """Decode metadata from an IPv6 address using the RRSS:VVVV scheme."""
    try:
        parts = ipaddress.IPv6Address(ipv6).exploded.split(":")
    except ipaddress.AddressValueError:
        return {}

    region_site = parts[2]             # "RRSS"
    vlan = parts[3]                    # "VVVV"

    region_map = {"00": "AMER", "10": "EMEA", "20": "APAC"}
    region_code = region_site[:2]
    site_id = region_site[2:]

    return {
        "region": region_map.get(region_code, "unknown"),
        "site_id": int(site_id, 16),
        "vlan_id": int(vlan, 16)
    }

print(decode_address("2001:db8:0002:000a::1"))
# {'region': 'AMER', 'site_id': 2, 'vlan_id': 10}
```

## NetBox Hierarchy Creation Script

```python
#!/usr/bin/env python3
import pynetbox

nb = pynetbox.api("http://netbox.internal", token="your-token")

HIERARCHY = {
    "2001:db8::/32": {
        "description": "Organization /32",
        "children": {
            "2001:db8:0000::/36": {
                "description": "AMER Region",
                "children": {
                    "2001:db8:0001::/48": {"description": "HQ New York"},
                    "2001:db8:0002::/48": {"description": "DC Ashburn"},
                }
            },
            "2001:db8:1000::/36": {
                "description": "EMEA Region",
                "children": {
                    "2001:db8:1001::/48": {"description": "London Office"},
                }
            }
        }
    }
}

def create_hierarchy(prefixes: dict):
    for prefix, data in prefixes.items():
        nb.ipam.prefixes.create({
            "prefix": prefix,
            "description": data["description"],
            "status": "active"
        })
        if "children" in data:
            create_hierarchy(data["children"])

create_hierarchy(HIERARCHY)
```

## Conclusion

IPv6 address hierarchies should reflect your organizational structure: allocate /48 per site, divide into /64 per VLAN, and use the middle bits to encode location or type metadata. In IPAM tools, create parent-child prefix relationships to visualize the hierarchy and identify allocation gaps. The most important design decision is choosing the /36 or /40 boundary for regional blocks - align these with your BGP routing hierarchy so regional aggregates can be announced from regional PoPs. Encode business metadata (region, site, VLAN) in the address bits to make addresses self-documenting.
