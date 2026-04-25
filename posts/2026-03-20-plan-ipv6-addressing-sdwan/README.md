# How to Plan IPv6 Addressing for SD-WAN

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, SD-WAN, Address Planning, Subnetting, Prefix Delegation, Network Design

Description: Plan a hierarchical IPv6 addressing scheme for SD-WAN deployments covering site prefixes, overlay tunnel addresses, management networks, and prefix delegation strategies.

---

IPv6 SD-WAN addressing requires a hierarchical plan that scales from a single ISP-assigned /48 to thousands of routed segments and site networks. A well-designed scheme enables summarization, policy-by-address, and easy troubleshooting by embedding region, site, and subnet identity in the IPv6 address structure.

## IPv6 Prefix Allocation Strategy

```text
IPv6 SD-WAN Addressing Hierarchy:

ISP Allocation: 2001:db8:1000::/48
  (65,536 /64 subnets available)

Breakdown:
  2001:db8:1000:1000::/52   → Region 1 (4096 /64s, 256 /60 site blocks)
  2001:db8:1000:2000::/52   → Region 2 (4096 /64s, 256 /60 site blocks)
  2001:db8:1000:3000::/52   → Region 3 (4096 /64s, 256 /60 site blocks)
  ...
  2001:db8:1000:f000::/52   → Infrastructure/Mgmt

Region 1 breakdown:
  2001:db8:1000:1010::/60  → Site 1 (16 /64s)
  2001:db8:1000:1020::/60  → Site 2 (16 /64s)
  2001:db8:1000:1030::/60  → Site 3 (16 /64s)
  ...

Site breakdown (/60 = 16 /64s):
  :RSS0::/64  → LAN - Corporate users
  :RSS1::/64  → LAN - VoIP
  :RSS2::/64  → LAN - IoT/OT
  :RSS3::/64  → LAN - Guest/DMZ
  :RSSE::/64  → WAN interfaces
  :RSSF::/64  → Management
```

## Address Encoding Scheme

```text
Structured IPv6 Address Encoding:

2001:db8:1000:RSSV::/64
              ||||
              |||+ = VLAN/subnet within site (hex 0-f)
              |++- = Site ID within region (hex 00-ff)
              +--- = Region ID (hex 0-f)

Example encoding:
2001:db8:1000:1010::/64
              ||||
              |||+ = VLAN 0 (Corporate)
              |++- = Site ID 01
              +--- = Region 1

Region 1, Site 1, VLAN 0 (Corp):   2001:db8:1000:1010::/64
Region 1, Site 1, VLAN 1 (VoIP):   2001:db8:1000:1011::/64
Region 2, Site 2, VLAN 0 (Corp):   2001:db8:1000:2020::/64
Region 2, Site 255, VLAN 3 (Guest): 2001:db8:1000:2ff3::/64
```

## Address Planning Spreadsheet Logic

```python
#!/usr/bin/env python3
# ipv6_sdwan_address_plan.py - Generate SD-WAN IPv6 address plan

import ipaddress

BASE_PREFIX = ipaddress.IPv6Network("2001:db8:1000::/48")
SITES = [
    {"id": 1, "name": "HQ-New-York", "region": 1},
    {"id": 2, "name": "Branch-London", "region": 2},
    {"id": 3, "name": "Branch-Tokyo", "region": 2},
    {"id": 100, "name": "DC-Primary", "region": 3},
]

VLANS = [
    {"id": 0, "name": "Corporate"},
    {"id": 1, "name": "VoIP"},
    {"id": 2, "name": "IoT"},
    {"id": 3, "name": "Guest"},
    {"id": 14, "name": "WAN"},
    {"id": 15, "name": "Management"},
]

def base_hextets(base):
    """Return the fixed /48 portion as text hextets."""
    if base.prefixlen != 48:
        raise ValueError("base prefix must be a /48")
    return base.network_address.exploded.split(":")[:3]

def generate_region_prefix(base, region_id):
    """Generate a /52 regional aggregate."""
    if not 0 <= region_id <= 15:
        raise ValueError("region_id must fit in 4 bits (0-15)")

    h1, h2, h3 = base_hextets(base)
    return ipaddress.IPv6Network(f"{h1}:{h2}:{h3}:{region_id:x}000::/52")

def generate_site_prefix(base, region_id, site_id):
    """Generate /60 prefix for a site within a region."""
    if not 1 <= site_id <= 255:
        raise ValueError("site_id must fit in 8 bits (1-255)")

    h1, h2, h3 = base_hextets(base)
    return ipaddress.IPv6Network(f"{h1}:{h2}:{h3}:{region_id:x}{site_id:02x}0::/60")

def generate_vlan_prefix(site_prefix, vlan_id):
    """Generate /64 for specific VLAN within a site."""
    if not 0 <= vlan_id <= 15:
        raise ValueError("vlan_id must fit in 4 bits (0-15)")

    return list(site_prefix.subnets(new_prefix=64))[vlan_id]

def nth_address(network, offset):
    """Return the address at offset from the subnet base."""
    return ipaddress.IPv6Address(int(network.network_address) + offset)

address_plan = {}
for site in SITES:
    region_prefix = generate_region_prefix(BASE_PREFIX, site["region"])
    site_prefix = generate_site_prefix(BASE_PREFIX, site["region"], site["id"])
    site_data = {
        "site_name": site["name"],
        "region": site["region"],
        "region_prefix_52": str(region_prefix),
        "site_prefix_60": str(site_prefix),
        "vlans": {}
    }

    for vlan in VLANS:
        vlan_prefix = generate_vlan_prefix(site_prefix, vlan["id"])
        site_data["vlans"][vlan["name"]] = {
            "prefix_64": str(vlan_prefix),
            "gateway": str(nth_address(vlan_prefix, 1)),
            "dhcpv6_start": str(nth_address(vlan_prefix, 0x100)),
            "dhcpv6_end": str(nth_address(vlan_prefix, 0x3ff))
        }

    address_plan[site["id"]] = site_data

# Print summary

for site_id, data in address_plan.items():
    print(f"\nSite {site_id}: {data['site_name']}")
    print(f"  Region summary (/52): {data['region_prefix_52']}")
    print(f"  Site prefix (/60): {data['site_prefix_60']}")
    for vlan_name, vlan_data in data["vlans"].items():
        print(f"  {vlan_name:15} /64: {vlan_data['prefix_64']}")
```

## SD-WAN Overlay Addressing

```text
SD-WAN Overlay Address Ranges:

Management/Overlay infrastructure:
  2001:db8:1000:f000::/52

Controller/Orchestrator:
  2001:db8:1000:f000::10/128  → vManage
  2001:db8:1000:f000::11/128  → vBond Orchestrator
  2001:db8:1000:f000::12/128  → vSmart Controller

Tunnel Endpoints (loopback /128s):
  2001:db8:1000:f001::1/128 → Site 1 SD-WAN edge loopback
  2001:db8:1000:f001::2/128 → Site 2 SD-WAN edge loopback
  ...
  (encoded: f001::SSSS where SSSS = site ID)

NTP, DNS, RADIUS for SD-WAN:
  2001:db8:1000:f002::/64
```

## Route Summarization by Region

```text
BGP Route Summarization:

Region 1 (Americas): Summarize as 2001:db8:1000:1000::/52
Region 2 (EMEA):     Summarize as 2001:db8:1000:2000::/52
Region 3 (APAC):     Summarize as 2001:db8:1000:3000::/52
Infrastructure:      Summarize as 2001:db8:1000:f000::/52

Regional hubs advertise summaries upstream,
branches advertise /60 site prefixes to regional hub.

BGP implementation:
  Advertise aligned /52 regional aggregates upstream and suppress more-specific /60 site routes where policy allows.
```

A successful IPv6 SD-WAN addressing plan encodes site identity, region, and VLAN type directly into the address structure, enabling meaningful route summarization at regional hub routers and simplifying firewall policies that can match `2001:db8:1000:1010::/60` to identify all traffic from a specific site.
