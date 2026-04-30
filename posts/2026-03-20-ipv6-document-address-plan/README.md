# How to Document an IPv6 Address Plan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPAM, Documentation, Networking, Best Practice

Description: Learn how to create and maintain comprehensive IPv6 address plan documentation using IPAM tools, spreadsheets, and structured formats that keep your network organized.

## Introduction

An undocumented IPv6 address plan is as dangerous as no plan at all. With 65,536 subnets available from a single /48, it is easy for allocations to become chaotic without proper tracking. Good documentation serves as the single source of truth for network configuration, aids troubleshooting, and enables safe changes without conflicts.

## What to Document

A complete IPv6 address plan document should include:

1. **Top-level allocation**: The /32 or /48 received and from whom
2. **Hierarchical breakdown**: How the space is divided (regions, sites, functions)
3. **Per-subnet records**: Each /64 with description, purpose, and VLAN
4. **Infrastructure addresses**: Loopbacks, point-to-point links
5. **Reverse DNS zones**: Mapping prefixes to DNS zones
6. **Change log**: When prefixes were assigned/reclaimed

## YAML Address Plan Format

```yaml
# ipv6-address-plan.yaml

organization: "Example Corp"
last_updated: "2026-03-20"
maintainer: "network-team@example.com"

top_level:
  prefix: "2001:db8:100::/48"
  source: "ISP Example ISP"
  assigned: "2024-01-01"
  rir_allocation: "2001:db8::/32 (ISP)"

subnets:
  - id: "0001"
    prefix: "2001:db8:100:1::/64"
    site: "HQ"
    function: "management"
    vlan: 1
    gateway: "2001:db8:100:1::1"
    dhcp_mode: "stateless (SLAAC + stateless DHCPv6)"
    description: "HQ Management VLAN - network infrastructure"
    status: "active"
    assigned: "2024-01-15"

  - id: "0010"
    prefix: "2001:db8:100:10::/64"
    site: "HQ"
    function: "users"
    vlan: 10
    gateway: "2001:db8:100:10::1"
    dhcp_mode: "SLAAC"
    description: "HQ User LAN - employee workstations"
    status: "active"
    assigned: "2024-01-15"

  - id: "0020"
    prefix: "2001:db8:100:20::/64"
    site: "HQ"
    function: "servers"
    vlan: 20
    gateway: "2001:db8:100:20::1"
    dhcp_mode: "stateful DHCPv6"
    description: "HQ Server VLAN - application servers"
    status: "active"
    assigned: "2024-01-15"

infrastructure:
  loopbacks:
    - device: "core-router-1"
      address: "2001:db8:100:ff01::1/128"
      description: "Core Router 1 loopback"

  point_to_point:
    - link: "core-router-1 to edge-router-1"
      prefix: "2001:db8:100:f001::2/127"
      side_a: "2001:db8:100:f001::2"
      side_b: "2001:db8:100:f001::3"

reserved:
  - prefix: "2001:db8:100:ff00::/56"
    purpose: "Infrastructure loopbacks"
  - prefix: "2001:db8:100:f000::/56"
    purpose: "Point-to-point links"
```

## Python: IPAM Validator and Reporter

```python
import yaml
import ipaddress
from pathlib import Path

def validate_address_plan(plan_file: str):
    """Validate an IPv6 address plan YAML file."""
    with open(plan_file) as f:
        plan = yaml.safe_load(f)

    top_prefix = ipaddress.IPv6Network(plan["top_level"]["prefix"])
    errors = []
    seen_prefixes = set()

    for subnet in plan.get("subnets", []):
        prefix = ipaddress.IPv6Network(subnet["prefix"])

        # Check prefix is within top-level block
        if not prefix.subnet_of(top_prefix):
            errors.append(f"{prefix} is outside {top_prefix}")

        # Check for duplicates
        if str(prefix) in seen_prefixes:
            errors.append(f"Duplicate prefix: {prefix}")
        seen_prefixes.add(str(prefix))

        # Validate all subnets are /64
        if prefix.prefixlen != 64:
            errors.append(f"{prefix} should be /64 for a subnet")

    if errors:
        print("VALIDATION ERRORS:")
        for e in errors:
            print(f"  ✗ {e}")
    else:
        print(f"✓ Address plan valid: {len(plan['subnets'])} subnets documented")

    return len(errors) == 0
```

## IPAM Tool Integration

Popular IPAM tools with IPv6 support:

```bash
# NetBox: REST API for IPv6 prefix management
curl -X POST https://netbox.example.com/api/ipam/prefixes/ \
  -H "Authorization: Bearer $NETBOX_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prefix": "2001:db8:100:10::/64",
    "scope_type": "dcim.site",
    "scope_id": 1,
    "vlan": 10,
    "description": "HQ User LAN",
    "status": "active"
  }'

# List all IPv6 prefixes in a parent
curl -H "Authorization: Bearer $NETBOX_TOKEN" \
  "https://netbox.example.com/api/ipam/prefixes/?within=2001:db8:100::%2F48&family=6"
```

## Naming Convention for Reverse DNS

```text
IPv6 reverse DNS uses ip6.arpa zones.
Each nibble of the reverse address is a zone level.

For 2001:db8:100:1::/64:
  Zone: 1.0.0.0.0.0.1.0.8.b.d.0.1.0.0.2.ip6.arpa

# BIND zone delegation
# $ORIGIN 0.0.1.0.8.b.d.0.1.0.0.2.ip6.arpa.
# 1.0.0.0  NS  ns1.example.com.
```

## Conclusion

Documenting your IPv6 address plan in a structured format (YAML, IPAM database, or spreadsheet) is not optional - it is as essential as the plan itself. At minimum, record each /64's prefix, site, VLAN, purpose, gateway address, and assignment method. Use an IPAM tool like NetBox for production environments where manual tracking becomes error-prone as the network grows.
