# How to Plan Subnets for a Multi-Site Network

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Networking, Network Design, Multi-Site, Subnetting, Enterprise

Description: Planning subnets for a multi-site network requires hierarchical address allocation, per-site blocks for route summarization, dedicated ranges for different segment types, and P2P links for...

## Design Principles

1. **One /16 per site** (or /20 for smaller sites if the VLAN numbering plan fits within that block) - enables route summarization.
2. **Consistent VLAN-to-subnet mapping** - VLAN 10 = third octet .10, etc.
3. **Dedicated P2P block** for WAN links.
4. **Management block** - out-of-band management IPs.
5. **DMZ block** - separated from internal VLANs.

## Example: 4-Site Enterprise on 10.0.0.0/8

```python
import ipaddress

SITES = {
    "HQ-London":    "10.0.0.0/16",
    "Branch-NY":    "10.1.0.0/16",
    "Branch-Tokyo": "10.2.0.0/16",
    "Cloud-VPC":    "10.100.0.0/16",
    "P2P-Links":    "10.254.0.0/16",
    "Management":   "10.255.0.0/16",
}

VLAN_LAYOUT = {
    10: ("Servers",    24),
    20: ("Users",      23),
    30: ("VoIP",       24),
    40: ("WiFi",       23),
    50: ("IoT",        24),
    60: ("Management", 24),
    99: ("Unused",     24),
}

print("Multi-Site Network Plan")
print("=" * 70)
for site, site_cidr in SITES.items():
    site_net = ipaddress.IPv4Network(site_cidr)
    site_prefix = str(site_net.network_address).split('.')
    print(f"\n{site} ({site_cidr})")
    if site in ["P2P-Links", "Management"]:
        continue
    for vlan_id, (name, pfx) in VLAN_LAYOUT.items():
        # Third octet = VLAN ID
        vlan_subnet = ipaddress.IPv4Network(
            f"{site_prefix[0]}.{site_prefix[1]}.{vlan_id}.0/{pfx}")
        print(f"  VLAN{vlan_id:3d} ({name:12s}): {vlan_subnet}  "
              f"({vlan_subnet.num_addresses-2} hosts)")
```

## Inter-Site WAN Link Allocation

```python
p2p_block = ipaddress.IPv4Network("10.254.0.0/24")
wan_links = list(p2p_block.subnets(new_prefix=30))

WAN_CONNECTIONS = [
    ("HQ-London", "Branch-NY"),
    ("HQ-London", "Branch-Tokyo"),
    ("HQ-London", "Cloud-VPC"),
]

for i, (a, b) in enumerate(WAN_CONNECTIONS):
    link = wan_links[i]
    hosts = list(link.hosts())
    print(f"{a:15s} <-> {b:15s}: {link} ({hosts[0]} - {hosts[1]})")
```

## Route Summarization Per Site

With this design, each site can advertise a single /16 once its more-specific routes are present in the BGP table:
```bash
# Site router: advertise only the summary

# FRRouting/BGP
router bgp 65001
  address-family ipv4 unicast
    aggregate-address 10.0.0.0/16 summary-only  # HQ only
```

## Key Takeaways

- Allocate one /16 per site from the same /8 to enable summarization.
- Align VLAN IDs with subnet third octets for intuitive addressing and simpler ACLs.
- Use a dedicated /24 or /16 block for P2P WAN links, allocated as /30 or /31 pairs.
- Document the entire plan in an IPAM tool before assigning any addresses.
