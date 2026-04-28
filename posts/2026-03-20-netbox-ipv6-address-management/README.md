# How to Configure NetBox for IPv6 Address Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, NetBox, IPAM, Network Documentation, REST API

Description: Configure NetBox to manage IPv6 prefixes, create IPv6 address allocations, track prefix hierarchies, and automate IPv6 address assignment using the NetBox REST API.

## Introduction

NetBox is the leading open source IPAM and network documentation tool. Its data model supports IPv6 natively with hierarchical prefix management, prefix/aggregate tracking, and full REST and GraphQL APIs. This guide covers setting up NetBox for IPv6, creating address hierarchies, and automating assignments.

## Step 1: Create IPv6 RIR and Aggregate

```bash
# Using NetBox CLI (Django manage.py shell)

cd /opt/netbox
python3 netbox/manage.py shell
```

```python
# In the Django shell, or via REST API:
from ipam.models import RIR, Aggregate
import ipaddress

# Create RIR
arin = RIR.objects.create(name="ARIN", slug="arin", is_private=False)

# Create IPv6 aggregate (your RIR allocation)
agg = Aggregate.objects.create(
    prefix="2001:db8::/32",
    rir=arin,
    description="Organization IPv6 allocation from ARIN"
)
```

## Step 2: Create IPv6 Prefixes via REST API

```python
#!/usr/bin/env python3
# netbox_create_ipv6_prefixes.py

import pynetbox

nb = pynetbox.api(
    "http://netbox.internal:8000",
    token="your-api-token"
)

# Create site-level /48 prefixes
sites = [
    ("2001:db8:0001::/48", "headquarters", "HQ main prefix"),
    ("2001:db8:0002::/48", "dc-east", "East datacenter"),
    ("2001:db8:0003::/48", "dc-west", "West datacenter"),
]

for prefix, site_slug, description in sites:
    site = nb.dcim.sites.get(slug=site_slug)
    nb.ipam.prefixes.create({
        "prefix": prefix,
        "site": site.id if site else None,
        "description": description,
        "status": "active",
        "is_pool": False,
        "tags": [{"slug": "ipv6"}]
    })
    print(f"Created: {prefix} ({description})")

# Create VLAN-level /64 prefixes under HQ /48
vlans_hq = [
    ("2001:db8:0001:0001::/64", "servers", "HQ Servers"),
    ("2001:db8:0001:0002::/64", "management", "HQ Management"),
    ("2001:db8:0001:0003::/64", "dmz", "HQ DMZ"),
    ("2001:db8:0001:0010::/64", "workstations", "HQ Workstations"),
]

for prefix, vlan_name, description in vlans_hq:
    vlan = nb.ipam.vlans.get(name=vlan_name, site="headquarters")
    nb.ipam.prefixes.create({
        "prefix": prefix,
        "site": nb.dcim.sites.get(slug="headquarters").id,
        "vlan": vlan.id if vlan else None,
        "description": description,
        "status": "active",
    })
    print(f"Created: {prefix} ({description})")
```

## Step 3: Assign IPv6 Addresses to Devices

```python
# Assign an IPv6 address to a device interface
import pynetbox

nb = pynetbox.api("http://netbox.internal:8000", token="your-token")

# Get the device and interface
device = nb.dcim.devices.get(name="router-hq-01")
interface = nb.dcim.interfaces.get(device_id=device.id, name="Loopback0")

# Assign IPv6 address
ip = nb.ipam.ip_addresses.create({
    "address": "2001:db8:0001::1/128",
    "assigned_object_type": "dcim.interface",
    "assigned_object_id": interface.id,
    "description": "Router HQ-01 Loopback",
    "dns_name": "router-hq-01.example.com",
    "status": "active",
    "tags": [{"slug": "ipv6"}]
})
print(f"Assigned: {ip.address} to {device.name}/{interface.name}")
```

## Step 4: Find Available Prefixes

```python
# Query NetBox for available /64 subnets within a /48
def get_available_64s(parent_prefix: str, count: int = 5) -> list:
    parent = nb.ipam.prefixes.get(prefix=parent_prefix)
    if not parent:
        raise ValueError(f"Prefix {parent_prefix} not found in NetBox")

    # NetBox API: get available child prefixes
    available = parent.available_prefixes.list()
    results = []
    for avail in available:
        # Request a /64 from the available block
        new_prefix = parent.available_prefixes.create(
            {"prefix_length": 64, "description": "Auto-allocated"}
        )
        results.append(new_prefix.prefix)
        if len(results) >= count:
            break
    return results
```

## Step 5: Query IPv6 Address Data

```python
# Various useful NetBox IPv6 queries

# Find all prefixes in a /32
all_prefixes = nb.ipam.prefixes.filter(within="2001:db8::/32", family=6)
for p in all_prefixes:
    print(f"  {p.prefix} ({p.description}) - Site: {p.site}")

# Find all IPv6 addresses assigned to a site
site_ips = nb.ipam.ip_addresses.filter(
    parent="2001:db8:0001::/48",
    family=6
)

# Find unallocated /64s in a /48
parent = nb.ipam.prefixes.get(prefix="2001:db8:0001::/48")
available = parent.available_prefixes.list()
for block in available:
    print(f"Available block: {block.prefix}")
```

## Step 6: Custom Fields for IPv6 Metadata

Add custom fields in NetBox UI or API for IPv6-specific tracking:

```python
# Create custom field for delegation source
nb.extras.custom_fields.create({
    "object_types": ["ipam.prefix"],
    "name": "delegation_source",
    "label": "Delegation Source",
    "type": "text",
    "description": "Where this IPv6 prefix was delegated from (ISP, RIR, etc.)"
})

nb.extras.custom_fields.create({
    "object_types": ["ipam.prefix"],
    "name": "slaac_enabled",
    "label": "SLAAC Enabled",
    "type": "boolean",
    "description": "Whether SLAAC is enabled for this /64"
})
```

## Conclusion

NetBox provides excellent IPv6 IPAM capabilities through its hierarchical prefix model (aggregate → parent prefix → child prefix), full REST API, and integration with device and site data. Use pynetbox for Python automation to create prefixes at scale, assign addresses to device interfaces, and query available blocks. The key advantage of NetBox for IPv6 is its `available_prefixes` API endpoint, which automatically calculates gaps in the address space and enables automated allocation without conflict checking.
