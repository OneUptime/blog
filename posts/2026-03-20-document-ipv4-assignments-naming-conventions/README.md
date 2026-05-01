# How to Document IPv4 Address Assignments with Proper Naming Conventions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPAM, IPv4, Documentation, Naming Convention, Network Management, Best Practice

Description: Establish consistent naming conventions and documentation standards for IPv4 address assignments to make networks maintainable and troubleshootable at scale.

## Introduction

Good IPv4 documentation goes beyond recording which IP is assigned to which device. It includes a consistent naming scheme, purpose labels, ownership information, and a change history. This documentation makes onboarding new team members faster, troubleshooting quicker, and audits straightforward.

## Hostname Naming Convention

A consistent hostname format encodes meaning into the name itself:

```text
{function}-{site}-{number}.{domain}
```

Examples:
```text
web-nyc-01.prod.example.com    - Web server, New York, production, instance 1
db-lhr-02.prod.example.com     - Database, London Heathrow, production, instance 2
fw-sfo-01.mgmt.example.com     - Firewall, San Francisco, management
sw-nyc-core-01.mgmt.example.com - Core switch, New York
vpn-aws-use1-01.prod.example.com - VPN, AWS US-East-1, production
```

## IP Address Documentation Fields

Each IP record should capture:

| Field | Description | Example |
|-------|-------------|---------|
| IP Address | The assigned address | 10.1.1.50 |
| Subnet | The containing CIDR | 10.1.1.0/24 |
| Hostname | FQDN of the device | web-nyc-01.prod.example.com |
| Role/Function | What this device does | Production Web Server |
| Owner | Team/person responsible | Platform Team |
| Site | Physical or logical location | New York DC |
| VLAN | Layer-2 segment | VLAN 10 (Servers) |
| MAC Address | Hardware address | 00:1A:2B:3C:4D:5E |
| Status | Is it active? | Active |
| Provisioned Date | When it was allocated | 2026-01-15 |
| Notes | Free-form notes | Replaced web-nyc-00 |

## Subnet Documentation

Document subnets with the same rigor as individual IPs:

```text
Subnet: 10.1.1.0/24
Purpose: NYC Production Servers
VLAN: 10
Gateway: 10.1.1.1
DHCP: No (static only)
DNS: 10.1.0.10, 10.1.0.11
Usable range: 10.1.1.2 – 10.1.1.253
Reserved: 10.1.1.1 (gateway), 10.1.1.254 (reserved)
Owner: Infrastructure Team
Date Allocated: 2024-06-01
```

## Using DNS as Living Documentation

Well-maintained forward and reverse DNS zones serve as authoritative documentation:

```bind
; Forward zone: prod.example.com
web-nyc-01    IN  A    10.1.1.50
db-nyc-01     IN  A    10.1.1.60

; Reverse zone: 1.1.10.in-addr.arpa
50            IN  PTR  web-nyc-01.prod.example.com.
60            IN  PTR  db-nyc-01.prod.example.com.
```

When DNS records match IPAM records, you have two independent validation points for the same assignment.

## Documenting Reserved Ranges

Always document reserved IP ranges to prevent accidental use:

```text
10.1.1.0      - Network address (do not use)
10.1.1.1      - Default gateway (router)
10.1.1.2-9    - Reserved for future infrastructure
10.1.1.10-20  - Network management devices (switches, APs)
10.1.1.100-199 - Static server assignments
10.1.1.200-250 - DHCP pool for temporary use
10.1.1.251-253 - Reserved for VIPs/HSRP
10.1.1.254    - Reserved
10.1.1.255    - Broadcast (do not use)
```

## Automating Documentation Updates

Use pre/post provisioning hooks to keep documentation current:

```bash
#!/bin/bash
# Called after server provisioning to update IPAM documentation

update_ipam() {
  local ip="$1" hostname="$2" owner="$3" function="$4"
  
  # Update NetBox via API
  curl -s -X POST "http://netbox.example.com/api/ipam/ip-addresses/" \
    -H "Authorization: Token ${NETBOX_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"address\": \"${ip}/24\",
      \"dns_name\": \"${hostname}\",
      \"description\": \"${function}\",
      \"tags\": [{\"name\": \"${owner}\"}],
      \"status\": \"active\"
    }"
}
```

## Conclusion

Consistent naming conventions and thorough documentation transform an IP address database from a lookup table into operational knowledge. When every IP record tells you what the device does, who owns it, and when it was provisioned, troubleshooting and capacity planning become significantly easier.
