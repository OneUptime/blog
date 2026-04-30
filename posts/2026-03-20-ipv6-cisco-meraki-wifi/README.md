# How to Configure IPv6 on Cisco Meraki Wi-Fi

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Cisco Meraki, Wi-Fi, Cloud Managed, SLAAC, DHCPv6, Wireless

Description: Enable and configure IPv6 on Cisco Meraki cloud-managed Wi-Fi networks including SLAAC, DHCPv6, prefix configuration, and client IPv6 address assignment through the Meraki Dashboard.

---

Cisco Meraki is a cloud-managed networking platform. IPv6 is configured through the Meraki Dashboard for MX security appliances and MR access points. On MX appliances, IPv6 on LAN VLANs is delivered with router advertisements and SLAAC, while MR access points in bridge mode pass IPv6 traffic such as RA and DHCPv6 for wireless clients when Wireless IPv6 Bridging is enabled.

## Meraki Dashboard IPv6 Configuration

```text
Meraki Dashboard: Security & SD-WAN > Configure > Addressing & VLANs

For each MX VLAN/subnet:
1. Enable IPv6 on the VLAN
2. Select Auto on WAN1/WAN2 to use DHCPv6-PD from upstream, or Manual to use a static/independent prefix

MX LAN behavior:
  - Router Advertisements are generated automatically
  - Clients receive IPv6 addresses via SLAAC
  - IPv6 DNS servers can be advertised with RDNSS when configured

MR bridge-mode SSIDs:
Path: Network-wide > Configure > General > Wireless IPv6 Bridging

Toggle options:
  - Enabled: bridge-mode SSIDs pass IPv6 traffic
  - Disabled: bridge-mode SSIDs do not pass IPv6 traffic
```

## Meraki MX IPv6 Addressing

```text
Meraki Dashboard > Security & SD-WAN > Monitor > Appliance status

WAN IPv6:
- Configure IPv6 on the MX uplink settings in Dashboard
- MX WAN uplinks support Auto (DHCPv6-NA), Auto (Stateless/SLAAC), PPPoE, or Manual (Static) IPv6 addressing
- DHCPv6-PD is used to obtain LAN prefixes for IPv6-enabled VLANs; it is not used to assign the WAN interface address itself

LAN IPv6:
Dashboard > Security & SD-WAN > Configure > Addressing & VLANs

VLAN 1 (Default):
  IPv6 Config: Enabled
  Prefix source: Auto (DHCPv6-PD) or Manual
  RA: Automatic
  Client addressing: SLAAC
```

## Verify Meraki IPv6 via Dashboard

```nginx
Dashboard > Network-wide > Monitor > Clients

Add the IPv4/IPv6 column or open a client details page
Shows wireless clients with their IPv4/IPv6 addresses, SSID, and VLAN

Dashboard > Network-wide > Monitor > Event log

For MX networks, filter Event type: DHCPv6
Shows DHCPv6 NA and prefix delegation events

Dashboard > Security & SD-WAN > Monitor > Appliance status > Tools

Use the Ping live tool with an IPv6 target to verify upstream IPv6 connectivity
```

## Meraki API - Check IPv6 Client Addressing

```python
#!/usr/bin/env python3
# meraki_ipv6_clients.py - Query IPv6 clients via Meraki Dashboard API

import os
import requests

API_KEY = os.environ["MERAKI_DASHBOARD_API_KEY"]
NETWORK_ID = "your-network-id"

BASE_URL = "https://api.meraki.com/api/v1"

class NoRebuildAuthSession(requests.Session):
    def rebuild_auth(self, prepared_request, response):
        """Preserve Authorization headers across Meraki API redirects."""
        return

session = NoRebuildAuthSession()
session.headers.update({
    "Authorization": f"Bearer {API_KEY}",
    "Accept": "application/json",
})

def get_all_clients(network_id, timespan=3600):
    """Return all client records seen in the requested timespan."""
    url = f"{BASE_URL}/networks/{network_id}/clients"
    params = {"timespan": timespan, "perPage": 200}
    clients = []

    while url:
        response = session.get(url, params=params, timeout=30)
        response.raise_for_status()
        clients.extend(response.json())

        url = response.links.get("next", {}).get("url")
        params = None

    return clients

def get_clients_with_ipv6(network_id):
    """Get recent clients with IPv6 addresses."""
    ipv6_clients = []
    for client in get_all_clients(network_id):
        if client.get("ip6") or client.get("ip6Local"):
            ipv6_clients.append({
                "mac": client["mac"],
                "description": client.get("description") or "Unknown",
                "ipv6_global": client.get("ip6", "N/A"),
                "ipv6_local": client.get("ip6Local", "N/A"),
                "ssid": client.get("ssid") or "Wired",
                "vlan": client.get("vlan", "N/A"),
            })

    return ipv6_clients

def check_ipv6_coverage(network_id):
    """Report IPv6 adoption rate for clients seen in the last hour."""
    all_clients = get_all_clients(network_id)
    total = len(all_clients)
    ipv6_count = sum(1 for c in all_clients if c.get("ip6") or c.get("ip6Local"))

    print(f"Total clients: {total}")
    print(f"IPv6 clients: {ipv6_count} ({100*ipv6_count//total if total else 0}%)")

if __name__ == "__main__":
    clients = get_clients_with_ipv6(NETWORK_ID)
    for client in clients:
        print(
            f"{client['description']:30} | IPv6: {client['ipv6_global']:40} | "
            f"SSID: {client['ssid']}"
        )
    print(f"\nTotal IPv6 clients: {len(clients)}")
    check_ipv6_coverage(NETWORK_ID)
```

## Meraki MR Access Point IPv6 Features

```text
MR Access Points (Cloud Managed):
- Wireless IPv6 Bridging must be enabled for bridge mode SSIDs:
  Network-wide > Configure > General > Wireless IPv6 Bridging
- MR 28.1+ adds IPv6 management/uplink support, IPv6 L3 firewall rules, and RA/DHCPv6 guard
- IPv6 management of the AP itself can use SLAAC or a static IPv6 address

IPv6 SSID considerations:
- Bridge mode SSIDs pass IPv6 traffic when Wireless IPv6 Bridging is enabled
- Mandatory DHCP under Wireless > Configure > Access Control must be disabled for dual-stack or IPv6-only bridge mode clients
- Use Wireless > Configure > Firewall & traffic shaping to enable RA guard and DHCP guard
- Use L2 isolation to prevent same-SSID client-to-client traffic
```

## Firewall Policy for IPv6 on Meraki

```text
Dashboard > Security & SD-WAN > Configure > Firewall

IPv6 policy on MX:
- Outbound IPv6 from the LAN is allowed by default
- Return traffic for established flows is handled statefully
- Inbound IPv6 from the Internet is denied unless you add an allow rule
- In orgs using the current firewall UI, L3 firewall rules can be used to allow or block IPv6 traffic in the Inbound, Outbound, and site-to-site VPN sections
```

## Troubleshoot Meraki IPv6

```bash
# Use MX live tools in Dashboard
# Security & SD-WAN > Monitor > Appliance status > Tools

# Ping an IPv6 target such as 2606:4700:4700::1111

# Check IPv6 routes on MX
# Security & SD-WAN > Monitor > Route table

# Packet capture for IPv6 debugging
# Network-wide > Monitor > Packet Capture
# Filter: ip6
# Interface: WAN or LAN

# Check event log for IPv6 issues
# Network-wide > Monitor > Event log
# Event type: DHCPv6
```

Meraki IPv6 deployment is largely automated through the Dashboard: enabling IPv6 on MX VLAN interfaces triggers automatic router advertisements and SLAAC-based client addressing. On MR access points, bridge-mode IPv6 traffic is passed when Wireless IPv6 Bridging is enabled, while MR 28.1+ adds IPv6 firewall, guard, and management-interface features.
