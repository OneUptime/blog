# How to Configure Infoblox for IPv6 IPAM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Infoblox, IPAM, DDI, Enterprise Networking

Description: Configure Infoblox DDI for IPv6 address management including network views, IPv6 networks, DHCPv6 ranges, DNS AAAA records, and automation via the Infoblox REST API (WAPI).

## Introduction

Infoblox provides integrated DDI (DNS, DHCP, IPAM) with comprehensive IPv6 support including DHCPv6 server, DNS64, AAAA record management, and automated address discovery. This guide covers Infoblox IPv6 configuration via the WAPI REST API.

## Step 1: Configure IPv6 Network View

```bash
# Create a network view for IPv6 (via WAPI)

curl -u admin:password \
    -H "Content-Type: application/json" \
    -X POST \
    "https://infoblox.example.com/wapi/v2.12/networkview" \
    -d '{
        "name": "ipv6-production",
        "comment": "Production IPv6 address space"
    }'
```

## Step 2: Create IPv6 Networks

```python
#!/usr/bin/env python3
# infoblox_ipv6.py

import requests

WAPI = "https://infoblox.example.com/wapi/v2.12"
AUTH = ("admin", "password")
VERIFY_SSL = False

def wapi_post(endpoint, data, params=None):
    resp = requests.post(
        f"{WAPI}/{endpoint}",
        params=params, json=data, auth=AUTH, verify=VERIFY_SSL
    )
    resp.raise_for_status()
    return resp.json() if resp.content else None

def wapi_put(endpoint, data, params=None):
    resp = requests.put(
        f"{WAPI}/{endpoint}",
        params=params, json=data, auth=AUTH, verify=VERIFY_SSL
    )
    resp.raise_for_status()
    return resp.json() if resp.content else None

def wapi_get(endpoint, params=None):
    resp = requests.get(
        f"{WAPI}/{endpoint}",
        params=params, auth=AUTH, verify=VERIFY_SSL
    )
    resp.raise_for_status()
    return resp.json()

# Create IPv6 network (parent /48)
wapi_post("ipv6network", {
    "network": "2001:db8:0001::/48",
    "network_view": "ipv6-production",
    "comment": "HQ Site IPv6",
    "extattrs": {
        "Location": {"value": "Headquarters"},
        "Environment": {"value": "Production"}
    }
})

# Create /64 subnet within the /48
wapi_post("ipv6network", {
    "network": "2001:db8:0001:0001::/64",
    "network_view": "ipv6-production",
    "comment": "HQ Servers VLAN",
    "extattrs": {
        "VLAN": {"value": "10"},
        "Purpose": {"value": "Servers"}
    }
})
```

## Step 3: Configure DHCPv6 Range

```python
# Create a DHCPv6 range within the /64
wapi_post("ipv6range", {
    "network": "2001:db8:0001:0001::/64",
    "network_view": "ipv6-production",
    "start_addr": "2001:db8:0001:0001::1000",
    "end_addr": "2001:db8:0001:0001::ffff",
    "comment": "HQ Servers DHCPv6 pool"
})
```

## Step 4: Create AAAA Records via WAPI

```python
# Create AAAA record in an existing authoritative DNS zone
wapi_post("record:aaaa", {
    "name": "server-01.example.com",
    "ipv6addr": "2001:db8:0001:0001::10",
    "view": "external",
    "comment": "Web server IPv6"
})

# Create AAAA and matching PTR records
wapi_post("record:aaaa", {
    "name": "api.example.com",
    "ipv6addr": "2001:db8:0001:0001::20",
    "view": "external",
    "comment": "API service IPv6"
})

wapi_post("record:ptr", {
    "ipv6addr": "2001:db8:0001:0001::20",
    "ptrdname": "api.example.com",
    "view": "external",
    "comment": "Reverse record for api.example.com"
})

# Search for AAAA records
aaaa_records = wapi_get("record:aaaa", {
    "zone": "example.com",
    "view": "external",
    "_return_fields": "name,ipv6addr"
})
for record in aaaa_records:
    print(f"  {record['name']}: {record['ipv6addr']}")
```

## Step 5: IPv6 Address Allocation via WAPI

```python
# Allocate next available IPv6 address in a network
def allocate_next_ipv6(network: str) -> str:
    result = wapi_post(
        "ipv6network",
        {"num": 1},
        params={
            "network": network,
            "network_view": "ipv6-production",
            "_function": "next_available_ip"
        }
    )
    return result["ips"][0]

# Allocate address and create an AAAA record
new_ip = allocate_next_ipv6("2001:db8:0001:0001::/64")
wapi_post("record:aaaa", {
    "name": "db-server-05.example.com",
    "ipv6addr": new_ip,
    "view": "external",
    "comment": "Auto-allocated IPv6 for db-server-05"
})
print(f"Allocated {new_ip} for db-server-05")
```

## Step 6: IPv6 Network Discovery

```python
# Reconfigure the current discovery task for the IPv6 network view
discovery_task = wapi_get("discoverytask", {
    "discovery_task_oid": "current",
    "_return_fields": "_ref"
})[0]

wapi_put(discovery_task["_ref"], {
    "network_view": "ipv6-production",
    "mode": "ICMP",
    "ping_retries": 2,
    "ping_timeout": 1000
})

# Start discovery
wapi_post(
    discovery_task["_ref"],
    {"action": "START"},
    params={"_function": "network_discovery_control"}
)
```

## Step 7: Create a DNS64 Synthesis Group

```python
# Create a DNS64 synthesis group for IPv6-only clients
wapi_post("dns64group", {
    "name": "dns64-main",
    "prefix": "64:ff9b::/96",
    "comment": "DNS64 for IPv6-only clients reaching IPv4 services",
    "mapped": [{"address": "0.0.0.0/0", "permission": "ALLOW"}]
})
```

## Conclusion

Infoblox provides enterprise-grade IPv6 IPAM through its WAPI REST API with automated DDI operations such as allocating the next available IPv6 address and then creating related DNS records. The `next_available_ip` function for IPv6 networks automates address allocation while skipping addresses that are already in use or otherwise unavailable. Use Infoblox's DNS64 feature with NAT64 when deploying IPv6-only environments that still need to reach IPv4-only services, and remember that creating a DNS64 synthesis group is only one part of the full DNS64 configuration. The extattrs (extensible attributes) system enables custom metadata like VLAN ID, environment, and owner tracking on IPv6 prefixes.
