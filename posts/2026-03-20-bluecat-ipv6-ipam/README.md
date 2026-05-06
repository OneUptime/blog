# How to Configure BlueCat for IPv6 IPAM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, BlueCat, IPAM, DDI, Enterprise Networking

Description: Configure BlueCat Address Manager for IPv6 address management including block and network creation, DHCPv6 ranges, and automation via the BlueCat REST API v2.

## Introduction

BlueCat Address Manager (BAM) is an enterprise DDI platform with strong IPv6 support. Its hierarchical object model maps well to IPv6 address hierarchies: IPv6 blocks can contain child blocks, and IPv6 networks contain address objects. This guide covers IPv6 configuration via the BlueCat REST API v2.

## Step 1: Create IPv6 IP Block

In BlueCat, IPv6 space is organized as IPv6 Blocks (aggregates) → child IPv6 Blocks → IPv6 Networks (subnets) → IPv6 Addresses:

```python
#!/usr/bin/env python3
# bluecat_ipv6.py

import requests

BAM_URL = "https://bluecat.example.com/api/v2"
USERNAME = "admin"
PASSWORD = "password"

# Create a v2 API session and use the returned Basic auth token
session = requests.Session()
session.verify = False

login_resp = session.post(
    f"{BAM_URL}/sessions",
    json={"username": USERNAME, "password": PASSWORD}
)
login_resp.raise_for_status()
basic_auth = login_resp.json()["basicAuthenticationCredentials"]
session.headers.update({
    "Authorization": f"Basic {basic_auth}",
    "Accept": "application/hal+json",
    "Content-Type": "application/hal+json",
})

def bam_post(path, data):
    resp = session.post(f"{BAM_URL}/{path}", json=data)
    resp.raise_for_status()
    return resp.json()

def bam_get(path, params=None):
    resp = session.get(f"{BAM_URL}/{path}", params=params)
    resp.raise_for_status()
    return resp.json()

# Get the root configuration (container for all objects)
configs = bam_get("configurations")
config_id = configs["data"][0]["id"]

# Create IPv6 Block
block = bam_post(f"configurations/{config_id}/blocks", {
    "name": "Org IPv6 Allocation",
    "type": "IPv6Block",
    "range": "2001:db8::/32"
})
block_id = block["id"]
print(f"Created block: {block['range']}")
```

## Step 2: Create IPv6 Networks

```python
# Create /48 site block under the /32 block
site_block = bam_post(f"blocks/{block_id}/blocks", {
    "name": "HQ Site",
    "type": "IPv6Block",
    "range": "2001:db8:0001::/48"
})
site_block_id = site_block["id"]

# Create /64 VLAN subnet inside the site block
vlan_net = bam_post(f"blocks/{site_block_id}/networks", {
    "name": "HQ Servers",
    "range": "2001:db8:0001:0001::/64",
    "type": "IPv6Network",
})
```

## Step 3: Configure DHCPv6 Range

```python
# Create DHCPv6 range in the /64
dhcp_range = bam_post(f"networks/{vlan_net['id']}/ranges", {
    "name": "HQ Servers DHCPv6",
    "type": "DHCP6Range",
    "range": "2001:db8:0001:0001::1000-2001:db8:0001:0001::9fff"
})
```

## Step 4: Assign IPv6 Addresses

```python
# Assign a specific IPv6 address
ip_addr = bam_post(f"networks/{vlan_net['id']}/addresses", {
    "address": "2001:db8:0001:0001::10",
    "type": "IPv6Address",
    "name": "web-server-01",
    "state": "STATIC"
})

# Get the next available IPv6 address in a network
next_ip = bam_get(
    f"networks/{vlan_net['id']}/addresses",
    {"filter": "state:'UNASSIGNED'", "limit": 1}
)
print(f"Next available: {next_ip['data'][0]['address']}")
```

## Step 5: Create AAAA Records

```python
# BlueCat models A/AAAA records as HostRecord resources linked to IP addresses
# First look up the DNS zone
zone = bam_get("zones", {"filter": "name:'example.com'"})
zone_id = zone["data"][0]["id"]

# Create a HostRecord with an IPv6 address
host_record = bam_post(f"zones/{zone_id}/resourceRecords", {
    "type": "HostRecord",
    "name": "web-server-01",
    "addresses": [
        {
            "address": "2001:db8:0001:0001::10",
            "type": "IPv6Address"
        }
    ],
    # Creates the PTR record when reverse zones and deployment roles are configured
    "reverseRecord": True,
    "ttl": 300
})
```

## Step 6: Bulk Import IPv6 Networks

```python
# Import IPv6 networks from a CSV
import csv

with open("ipv6_networks.csv", newline="") as f:
    reader = csv.DictReader(f)
    for row in reader:
        # columns: address, cidr, name
        bam_post(f"blocks/{block_id}/networks", {
            "range": f"{row['address']}/{row['cidr']}",
            "name": row["name"],
            "type": "IPv6Network",
        })
        print(f"Imported: {row['address']}/{row['cidr']} - {row['name']}")
```

## Conclusion

BlueCat Address Manager provides enterprise IPv6 IPAM through its hierarchical object model (Block → Block → Network → Address) and REST API v2. The API can automate allocation by querying unassigned addresses in a network, and HostRecord resources can create both forward and reverse DNS entries when reverse DNS is configured. BlueCat's workflow and approval system makes it suitable for organizations that need change control around IPv6 address allocations. DHCPv6 and router advertisements are configured through deployment roles and deployment options rather than ad hoc `properties` strings on network creation requests.
