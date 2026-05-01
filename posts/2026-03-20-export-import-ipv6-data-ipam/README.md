# How to Export and Import IPv6 Address Data in IPAM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPAM, Data Migration, NetBox, CSV, JSON

Description: Export IPv6 address and prefix data from IPAM tools to CSV/JSON, transform between IPAM formats, and import IPv6 data for migrations or bulk provisioning.

## Introduction

IPAM data export and import is needed for tool migrations, bulk provisioning of new address plans, and backup/restore operations. IPv6 data requires careful handling of address normalization - the same address can appear in different formats across IPAM tools, and inconsistent formatting causes import errors.

## Export from NetBox

```python
#!/usr/bin/env python3
# export_netbox_ipv6.py

import pynetbox
import csv
import json
from datetime import datetime

nb = pynetbox.api("http://netbox.internal", token="your-token")

# Export all IPv6 prefixes

def export_prefixes_csv(output_file: str):
    with open(output_file, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "prefix", "prefix_length", "status", "vrf_rd",
            "scope_type", "scope_slug", "vlan_vid", "vlan_group",
            "description", "tags", "custom_field_delegation_source"
        ])

        for prefix in nb.ipam.prefixes.filter(family=6):
            writer.writerow([
                str(prefix.prefix),
                int(str(prefix.prefix).split("/", 1)[1]),
                prefix.status.value,
                prefix.vrf.rd if prefix.vrf else "",
                prefix.scope_type if prefix.scope_type else "",
                prefix.scope.slug if prefix.scope else "",
                str(prefix.vlan.vid) if prefix.vlan else "",
                prefix.vlan.group.slug if prefix.vlan and prefix.vlan.group else "",
                prefix.description or "",
                ",".join(t.slug for t in (prefix.tags or [])),
                prefix.custom_fields.get("delegation_source", "") if prefix.custom_fields else ""
            ])

    print(f"Exported prefixes to: {output_file}")

# Export all IPv6 addresses
def export_addresses_json(output_file: str):
    addresses = []
    for ip in nb.ipam.ip_addresses.filter(family=6):
        addresses.append({
            "address": str(ip.address),
            "vrf_rd": ip.vrf.rd if ip.vrf else "",
            "status": ip.status.value,
            "dns_name": str(ip.dns_name) if ip.dns_name else "",
            "description": ip.description or "",
            "tags": [t.slug for t in (ip.tags or [])],
        })

    with open(output_file, "w") as f:
        json.dump({"ipv6_addresses": addresses}, f, indent=2)

    print(f"Exported {len(addresses)} addresses to: {output_file}")

export_prefixes_csv(f"ipv6_prefixes_{datetime.now().strftime('%Y%m%d')}.csv")
export_addresses_json(f"ipv6_addresses_{datetime.now().strftime('%Y%m%d')}.json")
```

## Import into NetBox from CSV

```python
#!/usr/bin/env python3
# import_ipv6_prefixes.py

import csv
import ipaddress
import pynetbox

nb = pynetbox.api("http://netbox.internal", token="your-token")

def normalize_prefix(prefix_str: str) -> str:
    """Normalize IPv6 prefix to canonical form."""
    network = ipaddress.ip_network(prefix_str, strict=False)
    return str(network)

def resolve_scope(scope_type: str, scope_slug: str):
    """Look up a NetBox scope object from exported scope metadata."""
    endpoint_map = {
        "dcim.region": nb.dcim.regions,
        "dcim.sitegroup": nb.dcim.site_groups,
        "dcim.site": nb.dcim.sites,
        "dcim.location": nb.dcim.locations,
    }
    endpoint = endpoint_map.get(scope_type)
    if not endpoint or not scope_slug:
        return None
    return endpoint.get(slug=scope_slug)

def import_prefixes_from_csv(csv_file: str):
    """Import IPv6 prefixes from CSV into NetBox."""
    created = 0
    skipped = 0
    errors = 0

    with open(csv_file) as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                prefix = normalize_prefix(row["prefix"])
                vrf_rd = row.get("vrf_rd", "")

                # Skip if already exists
                existing = [
                    p for p in nb.ipam.prefixes.filter(prefix=prefix)
                    if (p.vrf.rd if p.vrf else "") == vrf_rd
                ]
                if existing:
                    skipped += 1
                    continue

                # Build data dict
                data = {
                    "prefix": prefix,
                    "status": row.get("status") or "active",
                    "description": row.get("description", ""),
                }

                # Add VRF if specified
                if vrf_rd:
                    vrf = nb.ipam.vrfs.get(rd=vrf_rd)
                    if vrf:
                        data["vrf"] = vrf.id

                # Add scope if specified
                if row.get("scope_type") and row.get("scope_slug"):
                    scope = resolve_scope(row["scope_type"], row["scope_slug"])
                    if scope:
                        data["scope_type"] = row["scope_type"]
                        data["scope_id"] = scope.id

                # Add VLAN if specified
                if row.get("vlan_vid"):
                    vlan_filter = {"vid": int(row["vlan_vid"])}
                    if row.get("vlan_group"):
                        vlan_filter["group"] = row["vlan_group"]

                    vlans = list(nb.ipam.vlans.filter(**vlan_filter))
                    if len(vlans) == 1:
                        data["vlan"] = vlans[0].id
                    elif len(vlans) > 1:
                        raise ValueError(
                            f"Multiple VLANs match vid={row['vlan_vid']}; include vlan_group to disambiguate"
                        )

                # Add tags
                if row.get("tags"):
                    data["tags"] = [{"slug": t.strip()} for t in row["tags"].split(",") if t.strip()]

                nb.ipam.prefixes.create(data)
                created += 1
                print(f"  Imported: {prefix}")

            except Exception as e:
                print(f"  ERROR importing {row.get('prefix', '?')}: {e}")
                errors += 1

    print(f"\nImport complete: {created} created, {skipped} skipped, {errors} errors")

import_prefixes_from_csv("ipv6_prefixes_20260320.csv")
```

## Migrate from phpIPAM to NetBox

```python
#!/usr/bin/env python3
# phpipam_to_netbox.py

import requests
import pynetbox
import ipaddress

# phpIPAM API
PHPIPAM_URL = "https://phpipam.internal"
PHPIPAM_TOKEN = "your-phpipam-token"
PHPIPAM_HEADERS = {"phpipam-token": PHPIPAM_TOKEN}

# NetBox
nb = pynetbox.api("http://netbox.internal", token="your-netbox-token")

def get_phpipam_ipv6_subnets() -> list:
    """Get all IPv6 subnets from phpIPAM."""
    resp = requests.get(
        f"{PHPIPAM_URL}/api/myapp/subnets/",
        headers=PHPIPAM_HEADERS,
        timeout=30,
    )
    resp.raise_for_status()
    subnets = resp.json().get("data", [])
    # Filter IPv6 only
    return [s for s in subnets if ":" in s.get("subnet", "")]

def migrate_subnet(phpipam_subnet: dict):
    """Migrate a single phpIPAM subnet to NetBox."""
    raw_subnet = phpipam_subnet.get("subnet", "")
    mask = phpipam_subnet.get("mask", "64")

    try:
        network = ipaddress.ip_network(f"{raw_subnet}/{mask}", strict=False)
        prefix_str = str(network)
    except ValueError as e:
        print(f"  Invalid prefix: {raw_subnet}/{mask}: {e}")
        return

    description = phpipam_subnet.get("description", "") or phpipam_subnet.get("sectionId", "")

    # Check if already in NetBox
    if list(nb.ipam.prefixes.filter(prefix=prefix_str)):
        print(f"  Skip (exists): {prefix_str}")
        return

    nb.ipam.prefixes.create({
        "prefix": prefix_str,
        "description": description,
        "status": "active",
        "tags": [{"slug": "migrated-from-phpipam"}]
    })
    print(f"  Migrated: {prefix_str}")

subnets = get_phpipam_ipv6_subnets()
print(f"Migrating {len(subnets)} IPv6 subnets from phpIPAM to NetBox...")
for subnet in subnets:
    migrate_subnet(subnet)
```

## Validation After Import

```bash
#!/bin/bash
# validate_import.sh

echo "Validating imported IPv6 data..."

# Count imported prefixes
IMPORTED=$(curl -s \
    -H "Authorization: Token $NETBOX_TOKEN" \
    "http://netbox.internal/api/ipam/prefixes/?family=6&limit=1" | \
    python3 -c "import json,sys; print(json.load(sys.stdin)['count'])")

echo "Total IPv6 prefixes in NetBox: $IMPORTED"

# Verify a sample page of prefixes are valid
python3 << 'EOF'
import ipaddress
import os

import requests

resp = requests.get(
    "http://netbox.internal/api/ipam/prefixes/",
    params={"family": 6, "limit": 100},
    headers={"Authorization": f"Token {os.environ['NETBOX_TOKEN']}"},
    timeout=30,
)
resp.raise_for_status()
invalid = 0
for prefix in resp.json().get("results", []):
    try:
        ipaddress.ip_network(prefix["prefix"], strict=True)
    except ValueError:
        print(f"Invalid prefix: {prefix['prefix']}")
        invalid += 1
print(f"Validation: {invalid} invalid prefixes found")
EOF
```

## Conclusion

IPAM data export and import requires address normalization - convert IPv6 prefixes to their canonical form using `ipaddress.ip_network()`, and normalize host addresses with `ipaddress.ip_interface()` when you need to preserve the host bits and prefix length. This avoids duplicates caused by different text representations of the same data. For tool migrations, export from the source as CSV/JSON, transform with Python normalization, and import to the target. Validate the import by counting records, checking for invalid formats, and spot-checking a sample of imported entries. Tag imported records with a migration tag for easy identification and cleanup if issues are discovered.
