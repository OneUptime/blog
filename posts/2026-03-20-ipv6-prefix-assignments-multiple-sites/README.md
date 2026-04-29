# How to Manage IPv6 Prefix Assignments for Multiple Sites

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPAM, Multi-Site, Prefix Management, Enterprise Networking

Description: Manage IPv6 prefix assignments across multiple geographic sites with consistent addressing conventions, summarization for routing, and IPAM tracking.

## Introduction

Multi-site IPv6 management requires a hierarchical prefix plan that enables route summarization at regional boundaries, consistent VLAN-to-prefix mapping across sites, and clear ownership boundaries. This guide covers the planning principles and IPAM implementation for a multi-site organization.

## Multi-Site Addressing Strategy

```python
#!/usr/bin/env python3
# multi_site_addressing.py

import ipaddress

# Organization: 2001:db8::/32

# Regional blocks: Use bits 33-36 for region
REGIONS = {
    "amer": "2001:db8:0000::/36",   # 0000-0fff = AMER
    "emea": "2001:db8:1000::/36",   # 1000-1fff = EMEA
    "apac": "2001:db8:2000::/36",   # 2000-2fff = APAC
    "reserved": "2001:db8:f000::/36", # f000-ffff = Reserved
}

# Site allocation: /48 per site
SITES = {
    # AMER
    "hq-new-york":      "2001:db8:0001::/48",
    "dc-ashburn":       "2001:db8:0002::/48",
    "dc-chicago":       "2001:db8:0003::/48",
    "branch-toronto":   "2001:db8:0010::/48",
    "branch-mexico":    "2001:db8:0011::/48",
    # EMEA
    "office-london":    "2001:db8:1001::/48",
    "office-frankfurt": "2001:db8:1002::/48",
    "dc-amsterdam":     "2001:db8:1010::/48",
    # APAC
    "office-tokyo":     "2001:db8:2001::/48",
    "office-singapore": "2001:db8:2002::/48",
}

# Standard VLAN assignments within each /48
VLAN_TEMPLATE = {
    "servers":      0x0001,
    "management":   0x0002,
    "dmz":          0x0003,
    "workstations": 0x0010,
    "iot":          0x0020,
    "voip":         0x0030,
    "guest":        0x0040,
}

def get_vlan_prefix(site: str, vlan: str) -> str:
    """Get the /64 prefix for a VLAN at a site."""
    if site not in SITES:
        raise ValueError(f"Unknown site: {site}")
    if vlan not in VLAN_TEMPLATE:
        raise ValueError(f"Unknown VLAN: {vlan}")

    site_prefix = ipaddress.ip_network(SITES[site])
    # Set the 16-bit subnet ID (bits 49-64) within the site's /48
    vlan_offset = VLAN_TEMPLATE[vlan]
    subnet_addr = int(site_prefix.network_address) + (vlan_offset << 64)
    subnet = ipaddress.IPv6Network((subnet_addr, 64))
    return str(subnet)

# Example usage
print("Sample VLAN Prefixes:")
for site in ["hq-new-york", "office-london", "office-tokyo"]:
    for vlan in ["servers", "management", "workstations"]:
        prefix = get_vlan_prefix(site, vlan)
        print(f"  {site:<20} {vlan:<15} {prefix}")
```

## NetBox Multi-Site Setup

```python
#!/usr/bin/env python3
# setup_multi_site_netbox.py

import pynetbox
import ipaddress

nb = pynetbox.api("http://netbox.internal", token="your-token")

SITES_CONFIG = {
    "hq-new-york": {
        "name": "HQ New York",
        "prefix": "2001:db8:0001::/48",
        "region": "amer"
    },
    "dc-ashburn": {
        "name": "Data Center Ashburn",
        "prefix": "2001:db8:0002::/48",
        "region": "amer"
    },
    "office-london": {
        "name": "Office London",
        "prefix": "2001:db8:1001::/48",
        "region": "emea"
    }
}

VLANS_CONFIG = [
    {"name": "servers",    "hex": "0001"},
    {"name": "management", "hex": "0002"},
    {"name": "dmz",        "hex": "0003"},
    {"name": "workstations", "hex": "0010"},
]

def provision_site(slug: str, config: dict):
    """Create IPAM prefixes for a site."""
    # Get site object
    site = nb.dcim.sites.get(slug=slug)
    if not site:
        print(f"Site not found: {slug}")
        return

    site_prefix_str = config["prefix"]
    site_prefix = ipaddress.ip_network(site_prefix_str)

    # Create site /48 prefix
    nb.ipam.prefixes.create(
        prefix=site_prefix_str,
        scope_type="dcim.site",
        scope_id=site.id,
        description=f"{config['name']} site prefix",
        status="active"
    )

    # Create VLAN /64 prefixes
    for vlan in VLANS_CONFIG:
        subnet = ipaddress.IPv6Network(
            (int(site_prefix.network_address) + (int(vlan["hex"], 16) << 64), 64)
        )

        nb.ipam.prefixes.create(
            prefix=str(subnet),
            scope_type="dcim.site",
            scope_id=site.id,
            description=f"{config['name']} {vlan['name']} VLAN",
            status="active"
        )
        print(f"  Created: {subnet}")

for slug, config in SITES_CONFIG.items():
    print(f"Provisioning {config['name']}...")
    provision_site(slug, config)
```

## BGP Summarization for Multi-Site

With the regional hierarchy, each region's block can be summarized at the regional router:

```bash
# Cisco IOS/IOS-XE: advertise AMER regional summary to Internet
# Only advertise the /36, not individual /48s
router bgp 65001
  address-family ipv6 unicast
    aggregate-address 2001:db8::/36 summary-only  ! AMER region
    aggregate-address 2001:db8:1000::/36 summary-only  ! EMEA region
    aggregate-address 2001:db8:2000::/36 summary-only  ! APAC region
```

## Conclusion

Multi-site IPv6 management requires three levels of structure: regional blocks (/36) for BGP summarization, site prefixes (/48) for per-location allocation, and consistent VLAN-to-/64 mapping templates replicated across all sites. The VLAN template approach ensures that the "servers" prefix at any site always uses the same 16-bit subnet ID - administrators can predict any site's server subnet from the site prefix alone. NetBox multi-site setup enforces the plan by assigning prefixes to the appropriate site scope, providing clear ownership and filtering capabilities in the IPAM UI.
