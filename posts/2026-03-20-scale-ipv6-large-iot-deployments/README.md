# How to Scale IPv6 for Large IoT Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IoT, Scalability, DHCPv6, IPAM, Architecture

Description: Scale IPv6 infrastructure for large IoT deployments with thousands to millions of devices, covering prefix allocation, DHCPv6 high availability, and automated address management.

## Introduction

Scaling IPv6 for large IoT deployments - think 10,000+ sensors, multiple sites, and 24/7 uptime requirements - requires careful planning of prefix hierarchies, high-availability DHCPv6, automated IPAM, and monitoring at scale. This guide covers the architectural patterns for large-scale IPv6 IoT.

## Scaling Challenges

- **Prefix management**: Allocating and tracking /64s for thousands of subnets
- **DHCPv6 capacity**: Handling thousands of concurrent lease requests
- **NDP neighbor cache**: Border routers must cache entries for all active devices
- **Monitoring**: Health checks for millions of IPv6 endpoints
- **DNS**: Millions of AAAA records with frequent changes

## Prefix Hierarchy for 10,000+ Devices

```text
ISP delegated: /32
└── Organization /40
    └── Region-1 /48
        ├── Site-A /56 (256 /64 subnets)
        │   ├── HVAC /64 (64-bit interface ID space)
        │   ├── Lighting /64
        │   ├── Sensors-Floor-1 /64
        │   └── ...
        └── Site-B /56
    └── Region-2 /48
```

## High-Availability DHCPv6 with Kea

Kea HA also requires the Control Agent (or HA+MT dedicated listener) to be reachable at each peer URL. The DHCPv6 hook configuration looks like this:

```json
// /etc/kea/kea-dhcp6.conf - HA pair configuration

{
    "Dhcp6": {
        "interfaces-config": {
            "interfaces": ["eth1"]
        },
        "lease-database": {
            "type": "mysql",
            "host": "mysql-cluster.example.com",
            "port": 3306,
            "name": "kea6",
            "user": "kea",
            "password": "secure_password"
        },
        "hooks-libraries": [{
            "library": "/usr/lib/x86_64-linux-gnu/kea/hooks/libdhcp_mysql.so"
        }, {
            "library": "/usr/lib/x86_64-linux-gnu/kea/hooks/libdhcp_lease_cmds.so",
            "parameters": {}
        }, {
            "library": "/usr/lib/x86_64-linux-gnu/kea/hooks/libdhcp_ha.so",
            "parameters": {
                "high-availability": [{
                    "this-server-name": "dhcpv6-1",
                    "mode": "hot-standby",
                    "heartbeat-delay": 10000,
                    "max-response-delay": 60000,
                    "max-ack-delay": 5000,
                    "max-unacked-clients": 5,
                    "peers": [
                        {
                            "name": "dhcpv6-1",
                            "url": "http://10.0.0.1:8000/",
                            "role": "primary",
                            "auto-failover": true
                        },
                        {
                            "name": "dhcpv6-2",
                            "url": "http://10.0.0.2:8000/",
                            "role": "standby",
                            "auto-failover": true
                        }
                    ]
                }]
            }
        }],
        "subnet6": [{
            "subnet": "2001:db8:a:1::/64",
            "pools": [{"pool": "2001:db8:a:1::1000 - 2001:db8:a:1::efff"}]
        }]
    }
}
```

## Automated IPAM with NetBox

```python
#!/usr/bin/env python3
# provision_iot_subnet.py

# Automated IPv6 subnet provisioning via NetBox API

import requests

NETBOX_URL = "https://netbox.example.com/api"
NETBOX_TOKEN = "nbt_key.token"
SITE_PREFIX_ID = 1234
TENANT = {"id": 42}
VLAN_NETBOX_IDS = {
    "hvac": 101,
    "lighting": 102,
    "access": 103,
    "sensors": 104,
}

headers = {
    "Authorization": f"Bearer {NETBOX_TOKEN}",
    "Content-Type": "application/json"
}

def create_iot_subnet(site_name: str, system: str, vlan_netbox_id: int) -> dict:
    """Provision a /64 IPv6 subnet for an IoT system at a site."""

    # Get the next available /64 from the site's /56 prefix
    response = requests.post(
        f"{NETBOX_URL}/ipam/prefixes/{SITE_PREFIX_ID}/available-prefixes/",
        headers=headers,
        json={
            "prefix_length": 64,
            "description": f"{site_name} - {system}",
            "tags": ["iot"],
            "tenant": TENANT,
            "vlan": {"id": vlan_netbox_id}
        },
        timeout=30
    )
    response.raise_for_status()
    return response.json()

# Provision subnets for a new site
for system, vlan_netbox_id in VLAN_NETBOX_IDS.items():
    result = create_iot_subnet('building-c', system, vlan_netbox_id)
    print(f"Provisioned {system}: {result.get('prefix')}")
```

## NDP Proxy for Large Segments

In very large deployments, a single /64 can have too many active neighbors for the border router's neighbor cache. The preferred fix is to route smaller L2 segments, each with its own /64, and tune neighbor cache limits where needed. Use NDP Proxy only when you must bridge reachability for specific addresses or a prefix across interfaces:

```bash
# Enable NDP proxy on the border router
sudo sysctl -w net.ipv6.conf.eth0.proxy_ndp=1

# Add specific device addresses to the proxy (for frequently accessed devices)
sudo ip -6 neigh add proxy 2001:db8:a:1::1001 dev eth0

# For large deployments, use ndppd (NDP Proxy Daemon)
sudo apt-get install ndppd

# /etc/ndppd.conf
# proxy eth0 {
#   router yes
#   timeout 500
#   ttl 30000
#   rule 2001:db8:a:1::/64 {
#     iface lowpan0
#   }
# }
sudo systemctl enable --now ndppd
```

## Bulk Monitoring with Prometheus

```yaml
# prometheus.yml snippet for large IoT fleet monitoring

scrape_configs:
  - job_name: 'iot_devices'
    scrape_interval: 60s
    scrape_timeout: 30s
    static_configs:
      - targets:
          # Generated from IPAM database
          - '[2001:db8:a:1::1001]:9100'
          - '[2001:db8:a:1::1002]:9100'
    # For very large fleets, use file-based service discovery
  - job_name: 'iot_devices_dynamic'
    file_sd_configs:
      - files:
          - '/etc/prometheus/iot_devices.json'
        refresh_interval: 5m
```

Generate the device list from IPAM, following NetBox pagination:

```bash
#!/bin/bash
# generate_prometheus_targets.sh
# Generate Prometheus targets from NetBox IPAM

python3 - <<'PY' > /etc/prometheus/iot_devices.json
import json
import os
import urllib.request

netbox_url = os.environ.get("NETBOX_URL", "https://netbox.example.com/api")
token = os.environ["NETBOX_TOKEN"]
url = f"{netbox_url}/ipam/ip-addresses/?tag=iot&limit=1000"
targets = []

while url:
    request = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(request) as response:
        data = json.load(response)
    targets.extend({
        "targets": [f"[{ip['address'].split('/')[0]}]:9100"],
        "labels": {"location": ip.get("description", "")}
    } for ip in data["results"])
    url = data.get("next")

print(json.dumps(targets))
PY
```

## Conclusion

Scaling IPv6 for large IoT deployments requires a hierarchical prefix allocation strategy, high-availability DHCPv6 with clustered backends, automated IPAM provisioning via API, NDP proxy for large segments, and dynamic monitoring target generation. The key architectural principle is treating IPv6 address management as infrastructure code - provision, track, and audit all addresses programmatically to avoid manual errors and maintain consistent documentation as the fleet grows.
