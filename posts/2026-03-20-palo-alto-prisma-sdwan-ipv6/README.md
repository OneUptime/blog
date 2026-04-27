# How to Configure Palo Alto Prisma SD-WAN with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Palo Alto, Prisma SD-WAN, CloudBlade, ION, WAN, SASE

Description: Configure IPv6 support in Palo Alto Prisma SD-WAN (formerly CloudGenix) including ION device IPv6 interface configuration, IPv6 policy rules, and path quality monitoring for IPv6 flows.

---

Palo Alto Networks Prisma SD-WAN uses ION (Instant-On Network) devices managed through the Prisma SD-WAN portal. IPv6 is supported on LAN interfaces for client connectivity and WAN interfaces for ISP transport.

## Prisma SD-WAN ION Device IPv6

```text
Prisma SD-WAN Portal Configuration:
Navigate to: Manage > Configuration > Elements > [ION Device]

Interface Configuration:
  Interface: 4
  Type: LAN
  IPv4: 192.168.1.1/24
  IPv6: 2001:db8:site-a::1/64
  DHCPv6 Server: Enabled
  RA: Enabled
  RA Interval: 30s
  RDNSS: 2001:4860:4860::8888

Interface: 1 (WAN)
  Type: WAN
  Circuit: ISP-Primary
  IPv4 DHCP: Enabled
  IPv6: 2001:db8:wan::isp-assigned/64 (from ISP DHCPv6)
```

## Prisma SD-WAN API - IPv6 Configuration

```python
#!/usr/bin/env python3
# prisma_sdwan_ipv6.py - Configure IPv6 via Prisma SD-WAN API

import requests
import json

BASE_URL = "https://api.sase.paloaltonetworks.com"
AUTH_URL = "https://auth.apps.paloaltonetworks.com/am/oauth2/access_token"
CLIENT_ID = "your-client-id"
CLIENT_SECRET = "your-client-secret"
TSG_ID = "your-tenant-service-group-id"

def get_token():
    """Get OAuth2 access token via client_credentials grant."""
    resp = requests.post(
        AUTH_URL,
        auth=(CLIENT_ID, CLIENT_SECRET),
        data={"grant_type": "client_credentials", "scope": f"tsg_id:{TSG_ID}"}
    )
    return resp.json()["access_token"]

def configure_interface_ipv6(site_id, element_id, interface_id, ipv6_prefix, token):
    """Configure IPv6 on ION interface."""
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    payload = {
        "name": f"interface-{interface_id}",
        "ipv6_config": {
            "type": "STATIC",
            "static_config": {
                "address": ipv6_prefix
            }
        },
        "dhcpv6_config": {
            "enabled": True,
            "mode": "SERVER",
            "ipv6_prefix": ipv6_prefix,
            "dns_v6": ["2001:4860:4860::8888", "2606:4700:4700::1111"]
        },
        "ipv6_ra_config": {
            "enabled": True,
            "interval": 30,
            "prefixes": [{
                "prefix": ipv6_prefix,
                "autonomous": True,
                "on_link": True,
                "valid_lifetime": 2592000,
                "preferred_lifetime": 604800
            }]
        }
    }

    resp = requests.put(
        f"{BASE_URL}/sdwan/v2.1/api/sites/{site_id}/elements/{element_id}/interfaces/{interface_id}",
        headers=headers,
        json=payload
    )
    return resp.json()

def create_ipv6_policy_rule(site_id, token):
    """Create SD-WAN policy for IPv6 traffic."""
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    payload = {
        "name": "IPv6-VoIP-Steering",
        "enabled": True,
        "ip_protocol_type": "IPv6",
        "source_prefixes_id": "ipv6-lan-prefix-id",
        "destination_prefixes_id": "ipv6-internet-id",
        "app_def_ids": ["voip-sip", "voip-rtp"],
        "paths_allowed": {
            "active_paths": [{"path_type": "MPLS"}],
            "backup_paths": [{"path_type": "BROADBAND"}]
        },
        "network_policysetstack_id": "policy-stack-id"
    }

    resp = requests.post(
        f"{BASE_URL}/sdwan/v2.1/api/sites/{site_id}/networkpolicyrules",
        headers=headers,
        json=payload
    )
    return resp.json()

if __name__ == '__main__':
    token = get_token()
    result = configure_interface_ipv6(
        site_id="site-id",
        element_id="element-id",
        interface_id="interface-4-id",
        ipv6_prefix="2001:db8:a::1/64",
        token=token
    )
    print(json.dumps(result, indent=2))
```

## ION Device IPv6 Routing

```bash
# SSH into ION device (if local access enabled)

ssh admin@ion-device-ip

# Show IPv6 interfaces
show interface ipv6

# Show IPv6 routing table
show route ipv6

# Show SD-WAN paths including IPv6 transport
show paths

# Test IPv6 connectivity
ping6 2001:4860:4860::8888
traceroute6 2001:4860:4860::8888

# Check DHCPv6 leases
show dhcpv6 bindings
```

## Prisma Access with IPv6 SASE

```text
Prisma SASE (SD-WAN + ZTNA + SWG):

IPv6 client → Prisma Access Tunnel → Security Inspection → Internet

Configuration in Prisma Access:
- Mobile Users: Configure IPv6 GlobalProtect tunnel
- Remote Networks: Site-to-site with IPv6 transport
- Service Connections: HQ connectivity with IPv6

GlobalProtect Portal:
- IPv6 Split Tunneling: Configure IPv6 include/exclude routes
- IPv6 DNS: Assign IPv6 DNS server to GP clients
```

## Monitor IPv6 in Prisma SD-WAN

```bash
# Prisma SD-WAN portal monitoring

# Flow Monitor:
# Monitor > Flows > Filter: IP Version = IPv6
# Shows real-time IPv6 flows across SD-WAN

# Path Quality (IPv6):
# Monitor > Paths > [Select Site] > IPv6 Paths
# Shows latency, jitter, loss for IPv6 WAN paths

# Application Analytics:
# Monitor > Applications > Filter IPv6 traffic

# Alert for IPv6 path degradation:
# Manage > Alerts > Create Alert
#   Metric: IPv6 Path Loss %
#   Threshold: > 1%
#   Notification: Email/Webhook
```

Palo Alto Prisma SD-WAN IPv6 deployment involves configuring ION LAN interfaces with static IPv6 prefixes and DHCPv6 server for client addressing, creating SD-WAN policy rules with IPv6 IP protocol type for traffic steering, and leveraging the Prisma portal or REST API for centralized IPv6 policy management across all sites.
