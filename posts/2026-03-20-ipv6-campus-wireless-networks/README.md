# How to Configure IPv6 for Campus Wireless Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Campus Network, Wireless LAN, Eduroam, DHCPv6, Prefix Delegation, Enterprise Wi-Fi

Description: Deploy IPv6 across campus wireless networks with hierarchical prefix delegation, per-building or per-SSID /64 allocations, eduroam IPv6 support, and centralized monitoring.

---

Campus wireless networks serve thousands of clients across multiple buildings and SSIDs. IPv6 deployment requires hierarchical prefix delegation from the campus ISP, per-building /56 sub-prefixes (or /48s if the campus has a larger parent allocation), and proper integration with eduroam federation for guest research networking.

## Campus IPv6 Addressing Plan

```text
Campus IPv6 Addressing Hierarchy:

ISP allocates: 2001:db8:1000::/48

Building A:    2001:db8:1000:a00::/56  → /64 per SSID/VLAN
  Corp SSID:   2001:db8:1000:a00::/64
  Student SSID: 2001:db8:1000:a01::/64
  IoT SSID:    2001:db8:1000:a02::/64
  Guest SSID:  2001:db8:1000:a03::/64

Building B:    2001:db8:1000:b00::/56
  Corp SSID:   2001:db8:1000:b00::/64
  Student SSID: 2001:db8:1000:b01::/64
  ...

Core Infrastructure: 2001:db8:1000:ff00::/56
  Routers:     2001:db8:1000:ff00::/64
  Switches:    2001:db8:1000:ff01::/64
  APs:         2001:db8:1000:ff02::/64
```

## Campus Router Prefix Delegation (Cisco IOS)

```text
! Campus distribution router - prefix delegation to downstream building routers

ipv6 unicast-routing
ipv6 dhcp pool BUILDING-A
 prefix-delegation pool BLDGA-POOL
 dns-server 2001:db8:1000:ff00::53
 domain-name example.edu

ipv6 local pool BLDGA-POOL 2001:db8:1000:a00::/56 56

interface GigabitEthernet0/0.10
 description Building-A router uplink
 encapsulation dot1Q 10
 ipv6 address 2001:db8:1000:ff10::1/64
 ipv6 dhcp server BUILDING-A

! The downstream building router requests the delegated /56 with
! "ipv6 dhcp client pd" on its uplink interface.
```

## eduroam IPv6 Support

```text
eduroam IPv6 Architecture:
[Wi-Fi Client with eduroam credentials]
    → [Local AP/Controller]
        → [Local RADIUS server]
            → [eduroam RADIUS federation]
                → [Home institution RADIUS]

IPv6 RADIUS attributes for eduroam:
- Framed-IPv6-Address (attribute 168): Assigned IPv6 address
- Framed-IPv6-Prefix (attribute 97): Assigned prefix
- Framed-Interface-Id (attribute 96): Interface identifier

FreeRADIUS eduroam IPv6 configuration:
```

```bash
# /etc/freeradius/3.0/sites-enabled/eduroam

server eduroam {
    listen {
        type = auth
        ipv6addr = 2001:db8:1000:ff00::20
        port = 1812
    }

    authorize {
        # Check realm for federation
        suffix
        eap
    }

    authenticate {
        eap
    }

    post-auth {
        # Example IPv6 reply attribute for an eduroam WLAN
        update reply {
            Framed-IPv6-Prefix := 2001:db8:1000:ed00::/64
        }
    }
}
```

## hostapd with IPv6 for Campus APs

```bash
# /etc/hostapd/corp-ssid.conf

interface=wlan0
driver=nl80211
ssid=UniversityCorp
country_code=US
hw_mode=a
channel=36
ieee80211n=1
ieee80211ac=1
own_ip_addr=2001:db8:1000:ff02::10

# WPA2-Enterprise for campus
wpa=2
wpa_key_mgmt=WPA-EAP
ieee8021x=1
auth_server_addr=2001:db8:1000:ff00::20   # IPv6 RADIUS server
auth_server_port=1812
auth_server_shared_secret=radiussecret

# IPv6 is handled by the bridge interface, not hostapd directly
bridge=br-corp
```

## Hierarchical DHCPv6 for Campus

```bash
# /etc/dhcp/dhcpd6.conf - Campus DHCPv6

# DNS options for campus
option dhcp6.name-servers 2001:db8:1000:ff00::53;
option dhcp6.domain-search "example.edu" "student.example.edu";

# Corporate SSID
subnet6 2001:db8:1000:a00::/64 {
    range6 2001:db8:1000:a00::100 2001:db8:1000:a00::ffff;
    option dhcp6.name-servers 2001:db8:1000:ff00::53;
    default-lease-time 86400;
}

# Student SSID
subnet6 2001:db8:1000:a01::/64 {
    range6 2001:db8:1000:a01::100 2001:db8:1000:a01::ffff;
    option dhcp6.name-servers 2001:db8:1000:ff00::53;
    # Students get shorter leases
    default-lease-time 43200;
    max-lease-time 86400;
}

# Guest SSID with public DNS
subnet6 2001:db8:1000:a03::/64 {
    range6 2001:db8:1000:a03::100 2001:db8:1000:a03::ffff;
    option dhcp6.name-servers 2606:4700:4700::1111;
    default-lease-time 3600;
}
```

## Monitor Campus IPv6 Clients

```python
#!/usr/bin/env python3
# campus_ipv6_monitor.py - Monitor IPv6 adoption per building

import ipaddress
import re
from collections import defaultdict

LEASE_FILES = (
    '/var/lib/dhcp/dhcpd6.leases',
    '/var/lib/dhcpd/dhcpd6.leases',
)

def get_dhcp6_leases():
    """Parse current active DHCPv6 leases."""
    content = None

    for lease_file in LEASE_FILES:
        try:
            with open(lease_file, encoding='utf-8') as f:
                content = f.read()
            break
        except FileNotFoundError:
            continue

    if content is None:
        return []

    active_leases = {}
    current_duid = None
    ia_depth = 0
    current_addr = None
    addr_depth = 0
    current_state = None

    for raw_line in content.splitlines():
        line = raw_line.strip()

        if current_duid is None:
            ia_na_match = re.match(
                r'ia-na\s+("?[^"\s]+"?|[0-9A-Fa-f:]+)\s*\{',
                line,
            )
            if ia_na_match:
                current_duid = ia_na_match.group(1).strip('"')
                ia_depth = 1
            continue

        opens = line.count('{')
        closes = line.count('}')

        if current_addr is None:
            addr_match = re.match(r'iaaddr\s+([0-9A-Fa-f:]+)\s*\{', line)
            if addr_match:
                current_addr = addr_match.group(1)
                addr_depth = 1
                current_state = None
        else:
            state_match = re.match(r'binding state (\w+);', line)
            if state_match:
                current_state = state_match.group(1)

            addr_depth += opens - closes
            if addr_depth == 0:
                key = (current_duid, current_addr)
                if current_state == 'active':
                    active_leases[key] = {
                        'duid': current_duid,
                        'address': current_addr,
                    }
                else:
                    active_leases.pop(key, None)

                current_addr = None
                current_state = None

        ia_depth += opens - closes
        if ia_depth == 0:
            current_duid = None

    return list(active_leases.values())

def categorize_by_prefix(leases):
    """Categorize leases by building /56 prefix."""
    buildings = defaultdict(list)

    for lease in leases:
        building = ipaddress.ip_network(f"{lease['address']}/56", strict=False)
        buildings[str(building)].append(lease['address'])

    return buildings

if __name__ == '__main__':
    leases = get_dhcp6_leases()
    print(f"Total DHCPv6 leases: {len(leases)}")
    buildings = categorize_by_prefix(leases)
    for bldg, addrs in sorted(buildings.items()):
        print(f"  {bldg} → {len(addrs)} clients")
```

Campus IPv6 wireless deployment benefits from hierarchical prefix delegation that mirrors the physical topology (campus → building → floor → SSID), enabling meaningful IPv6 address assignments that simplify network management, troubleshooting, and policy enforcement across large multi-building wireless deployments.
