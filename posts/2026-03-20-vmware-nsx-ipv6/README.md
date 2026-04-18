# How to Configure IPv6 in VMware NSX

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, VMware NSX, SDN, Network Virtualization, Overlay Network

Description: Configure IPv6 support in VMware NSX for overlay networks, distributed routing, and security policies, enabling IPv6 workloads within NSX-managed virtual infrastructure.

## Introduction

VMware NSX provides software-defined networking for vSphere environments and supports IPv6 within overlay segments, distributed logical routers (DLR/Tier-1), and edge gateways (Tier-0). NSX-T (NSX 3.x+) has full dual-stack support, enabling IPv6-addressed VMs to communicate through NSX overlay networks, NAT64, and external BGP peering.

## NSX-T: Enable IPv6 on Segments

```text
# NSX Manager UI steps:

1. Go to Networking → Segments
2. Create or edit a Segment
3. Set "IP Address Management" type:
   - DHCP Server → enable DHCPv6 under "DHCP Config"
   - or SLAAC → set "RA Mode" to "DHCP Address and SLAAC"
4. Add Subnets:
   - IPv4 subnet: 10.0.0.1/24
   - IPv6 subnet: 2001:db8:segment1::1/64
5. Save
```

## NSX-T: Tier-1 Gateway with IPv6

```text
# Configure Tier-1 Gateway for IPv6

1. Go to Networking → Tier-1 Gateways
2. Create/Edit Tier-1 Gateway
3. Under "Interfaces":
   - Add Service Interface
   - Set IPv4 and IPv6 addresses for each connected segment

4. Enable IPv6 forwarding:
   Tier-1 Gateway → Advanced → Enable IPv6 = Yes

5. Configure Route Advertisement:
   - Advertise "All Connected Segments" including IPv6 prefixes
   - Connected Subnets: IPv6 connected
```

## NSX-T: Tier-0 Gateway BGP with IPv6

```nginx
# NSX-T Tier-0 BGP for IPv6 peering

1. Go to Networking → Tier-0 Gateways
2. Select Tier-0 → Routing → BGP
3. Enable BGP, set AS Number
4. Add BGP Neighbor:
   - Neighbor IP: 2001:db8:external::1 (upstream router)
   - Remote AS: 65001
   - Address Families: enable "IPv6"
   - Source Address: 2001:db8:edge::10

5. Configure route filters for IPv6 prefixes
```

## NSX-T: DHCPv6 for VM Address Assignment

```text
# Configure NSX DHCPv6 server on a segment

1. Go to Networking → DHCP
2. Create DHCP Server Profile
3. Assign to Segment:
   - Segment → DHCP Config
   - Server Mode: DHCP Server
   - IPv6 DHCP: enabled
   - IPv6 Range: 2001:db8:segment1::100-2001:db8:segment1::200
   - IPv6 DNS: 2001:db8::53
   - IPv6 Gateway: 2001:db8:segment1::1

VMs on the segment will get IPv6 addresses from NSX DHCPv6.
```

## NSX-T: IPv6 Security Policies

```text
# NSX Distributed Firewall with IPv6

1. Go to Security → Distributed Firewall
2. Create Gateway Policy or Distributed Policy
3. Add Rules:

Example: Allow ICMPv6 (required for IPv6 operation)
- Name: Allow ICMPv6
- Source: Any
- Destination: Any
- Service: ICMPv6
- Action: Allow

Example: Allow IPv6 web traffic
- Name: Allow-IPv6-HTTP
- Source: IPv6-Group (Group of IPv6 VMs or CIDRs)
- Destination: Web-Tier-IPv6
- Services: HTTP, HTTPS
- Action: Allow

4. Apply to Segment or Group
```

## NSX-T: NAT64 for IPv6-Only VMs

```text
# Configure NAT64 on Tier-1 Gateway for IPv6-only VMs to reach IPv4

1. Go to Networking → Tier-1 Gateways → NAT
2. Add NAT rule:
   - Action: NAT64
   - Source IPv6: 2001:db8:ipv6only::/64 (IPv6 VMs)
   - Translated IPv4: 10.0.64.0/24 (pool for NAT64)
   - Service: Any

IPv6-only VMs use the well-known NAT64 prefix 64:ff9b::/96 to reach IPv4 destinations.
```

## NSX-T API: Configure IPv6 via REST

```python
#!/usr/bin/env python3
# nsx_ipv6_segment.py

import requests
import json

NSX_MANAGER = "https://[2001:db8::nsxmgr]"
AUTH = ("admin", "password")

def create_ipv6_segment(name: str, ipv6_subnet: str, gateway: str) -> dict:
    """Create an NSX segment with IPv6 subnet."""
    payload = {
        "display_name": name,
        "subnets": [
            {
                "gateway_address": f"{gateway}/64",
                "network": ipv6_subnet,
            }
        ],
        "transport_zone_path": "/infra/sites/default/enforcement-points/default/transport-zones/tz1",
    }
    response = requests.put(
        f"{NSX_MANAGER}/policy/api/v1/infra/segments/{name}",
        auth=AUTH,
        json=payload,
        verify=False,
    )
    response.raise_for_status()
    return response.json()

# Create segment with IPv6

segment = create_ipv6_segment(
    name="ipv6-web-segment",
    ipv6_subnet="2001:db8:web::/64",
    gateway="2001:db8:web::1",
)
print(f"Created segment: {segment['id']}")
```

## Verify NSX IPv6 Operation

```bash
# From NSX Edge (SSH)
# Check routing table for IPv6 routes
get logical-router <tier0-uuid> route ipv6

# Check BGP IPv6 neighbors
get logical-router <tier0-uuid> bgp neighbor

# From a VM: verify IPv6 connectivity through NSX overlay
ping6 -c4 2001:db8::1     # Ping gateway
ping6 -c4 2001:4860:4860::8888  # Ping external IPv6
```

## Conclusion

VMware NSX-T supports IPv6 throughout its stack - overlay segments, DHCPv6, Tier-1/Tier-0 gateways with IPv6 routing, BGP IPv6 peering, distributed firewall policies for IPv6 traffic, and NAT64 for IPv6-to-IPv4 translation. Configuration is done through the NSX Manager UI or REST API. Enabling IPv6 forwarding on Tier-1 gateways is required for inter-segment IPv6 routing. ICMPv6 must be explicitly permitted in distributed firewall policies as NSX does not allow it by default in deny-all configurations.
