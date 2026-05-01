# How to Configure EfficientIP for IPv6 IPAM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, EfficientIP, IPAM, SOLIDserver, DDI

Description: Configure EfficientIP SOLIDserver for IPv6 IPAM including space management, subnet creation, DHCPv6 configuration, and automation via the EfficientIP REST API.

## Introduction

EfficientIP SOLIDserver is an enterprise DDI platform with comprehensive IPv6 support including space-based organization, DHCPv6 server, DNS AAAA record management, and REST API automation. This guide covers IPv6 IPAM configuration using the SOLIDserver REST API.

## Step 1: Create IPv6 Space

EfficientIP organizes address plans under "Spaces" (logical address domains):

```bash
# Create IPv6 space via REST API

curl -u admin:password \
    -H "Content-Type: application/json" \
    -X POST \
    "https://efficientip.example.com/api/v2.0/ipam/space/add" \
    -d '{
        "space_name": "Corp-IPv6",
        "space_description": "Primary IPv6 address space"
    }'
```

## Step 2: Python REST API Integration

```python
#!/usr/bin/env python3
# efficientip_ipv6.py

import requests
import base64

EIP_URL = "https://efficientip.example.com/api/v2.0"
CREDS = base64.b64encode(b"admin:password").decode()
HEADERS = {
    "Authorization": f"Basic {CREDS}",
    "Content-Type": "application/json"
}

def eip_get(endpoint, params=None):
    resp = requests.get(f"{EIP_URL}/{endpoint}",
                         params=params, headers=HEADERS, verify=False)
    resp.raise_for_status()
    return resp.json()

def eip_post(endpoint, data):
    resp = requests.post(f"{EIP_URL}/{endpoint}",
                          json=data, headers=HEADERS, verify=False)
    resp.raise_for_status()
    return resp.json()

# Create /32 block in the space
eip_post("ipam/network6/add", {
    "space_name": "Corp-IPv6",
    "network6_addr": "2001:db8::",
    "network6_prefix": "32",
    "network6_name": "Org IPv6 Allocation",
    "network_level": 0,
    "network6_is_terminal": 0
})

# Create /48 site network
site_network = eip_post("ipam/network6/add", {
    "space_name": "Corp-IPv6",
    "network6_addr": "2001:db8:1::",
    "network6_prefix": "48",
    "network6_name": "HQ Site",
    "network_level": 1,
    "network6_is_terminal": 0
})
site_network_id = int(site_network["data"][0]["network6_id"])

# Create /64 child subnet
eip_post("ipam/network6/add", {
    "space_name": "Corp-IPv6",
    "parent_network6_id": site_network_id,
    "network6_addr": "2001:db8:1:1::",
    "network6_prefix": "64",
    "network6_name": "HQ Servers",
    "network_level": 2,
    "network6_is_terminal": 1
})
```

## Step 3: Configure DHCPv6 Server

```python
# Create a DHCPv6 scope for the /64 subnet
eip_post("dhcp/scope6/add", {
    "server6_name": "primary-dhcpv6",
    "scope6_name": "HQ-Servers-Scope",
    "scope6_start_addr": "2001:db8:1:1::",
    "scope6_prefix": "64",
    "scope6_space_name": "Corp-IPv6"
})

# Add a DHCPv6 range to that scope
eip_post("dhcp/range6/add", {
    "server6_name": "primary-dhcpv6",
    "scope6_name": "HQ-Servers-Scope",
    "range6_start_addr": "2001:db8:1:1::1000",
    "range6_end_addr": "2001:db8:1:1::9fff"
})
```

## Step 4: DNS AAAA Records

```python
# Create AAAA record
eip_post("dns/rr/add", {
    "server_name": "dns01.example.com",
    "zone_name": "example.com",
    "rr_name": "server-01.example.com",
    "rr_type": "AAAA",
    "rr_value1": "2001:db8:1:1::10",
    "rr_ttl": 300
})

# Batch-create AAAA records from allocation list
servers = [
    ("web-01", "2001:db8:1:1::10"),
    ("web-02", "2001:db8:1:1::11"),
    ("api-01", "2001:db8:1:1::20"),
    ("db-01",  "2001:db8:1:1::30"),
]

for name, addr in servers:
    eip_post("dns/rr/add", {
        "server_name": "dns01.example.com",
        "zone_name": "example.com",
        "rr_name": f"{name}.example.com",
        "rr_type": "AAAA",
        "rr_value1": addr,
        "rr_ttl": 300
    })
    print(f"Created AAAA: {name}.example.com -> {addr}")
```

## Step 5: Query IPv6 Utilization

```python
# Get IPv6 network utilization report
networks = eip_get("ipam/network6/list", {
    "where": "space_name='Corp-IPv6'",
    "orderby": "network6_start_hostaddr",
    "select": "space_name,network6_start_hostaddr,network6_prefix,network6_name,percent_used"
})["data"]

print(f"{'Network':<35} {'Name':<20} {'Used%':>6}")
print("-" * 65)
for network in networks:
    prefix = f"{network['network6_start_hostaddr']}/{network['network6_prefix']}"
    name = network.get("network6_name", "")
    used = network.get("percent_used") or "n/a"
    print(f"{prefix:<35} {name:<20} {used:>6}")
```

## Step 6: IP Address Assignment

```python
# Inspect the first free IPv6 range in the subnet
free_ranges = eip_get("ipam/address6/list", {
    "where": (
        "space_name='Corp-IPv6' AND "
        "network6_name='HQ Servers' AND "
        "address6_type='free'"
    ),
    "select": (
        "space_name,network6_name,address6_type,"
        "free_start_address6_addr,free_end_address6_addr"
    ),
    "orderby": "free_start_address6_addr",
    "limit": 1
})["data"]

print(
    "First free IPv6 range: "
    f"{free_ranges[0]['free_start_address6_addr']} - "
    f"{free_ranges[0]['free_end_address6_addr']}"
)

# Add a specific IPv6 address outside the DHCPv6 pool
eip_post("ipam/address6/add", {
    "space_name": "Corp-IPv6",
    "address6_hostaddr": "2001:db8:1:1::40",
    "address6_name": "app-server-05",
    "address6_mac_addr": "aa:bb:cc:dd:ee:ff"
})
```

## Conclusion

EfficientIP SOLIDserver provides comprehensive IPv6 DDI management through its `/ipam/network6/*`, `/dhcp/scope6/*`, `/dhcp/range6/*`, and `/dns/rr/add` REST API endpoints. Spaces and network hierarchy fields such as `space_name`, `network_level`, and `network6_is_terminal` are key to modeling IPv6 blocks and subnets accurately. The `/ipam/address6/list` endpoint can expose free IPv6 ranges, while `/ipam/address6/add` records assigned IPv6 addresses in IPAM. EfficientIP is particularly strong for organizations that require integrated DNS and DHCPv6 management alongside IPAM, as all three are managed through the same API and database.
