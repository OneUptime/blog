# How to Plan an IPv4 Addressing Scheme for Multi-Site Enterprise Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Network Design, Subnetting, Enterprise Networking, IPAM, Planning

Description: Design a structured, scalable IPv4 addressing scheme for a multi-site enterprise network using hierarchical summarization and consistent site allocation principles.

## Introduction

A well-planned IPv4 addressing scheme is the foundation of a maintainable, scalable enterprise network. Poor planning leads to overlapping subnets, routing complexity, and inability to add sites or VLANs without renumbering. This guide walks through a systematic approach to designing an enterprise-wide IPv4 plan.

## Guiding Principles

1. **Use private address space**: RFC 1918 - 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
2. **Summarize at boundaries**: Each site, building, or zone should be a summarizable block
3. **Leave room to grow**: Allocate 2–4x more space than needed today
4. **Consistent structure**: Same subnet sizes for same-purpose segments across all sites
5. **Avoid overlap with partners/VPN peers**: Choose ranges that do not conflict with the networks and service ranges you need to interconnect

## Choosing the Right RFC 1918 Block

| Block | Size | Best For |
|-------|------|---------|
| 10.0.0.0/8 | 16.7M addresses | Large enterprises, multi-site |
| 172.16.0.0/12 | 1M addresses | Medium businesses |
| 192.168.0.0/16 | 65K addresses | Small offices, home labs |

For a multi-site enterprise, use `10.0.0.0/8` to give maximum flexibility.

## Hierarchical Design Example

Divide the 10.0.0.0/8 space into three levels:

```text
10.0.0.0/8 - Global enterprise
  └── 10.SITE.0.0/16 - Per-site allocation (256 sites possible)
        └── 10.SITE.VLAN.0/24 - Per-VLAN/function subnet
```

### Site Allocation

```text
10.1.0.0/16   - Site: New York HQ
10.2.0.0/16   - Site: London Office
10.3.0.0/16   - Site: Singapore Office
10.10.0.0/16  - Data Center 1
10.11.0.0/16  - Data Center 2
10.20.0.0/16  - AWS VPC (us-east-1)
10.21.0.0/16  - AWS VPC (eu-west-1)
10.100.0.0/16 - Management/OOB
```

### Per-Site Subnet Allocation (consistent across all sites)

```text
10.SITE.0.0/24     - Site infrastructure (routers, switches)
10.SITE.1.0/24     - Server VLAN
10.SITE.2.0/24     - Workstation VLAN
10.SITE.3.0/24     - VoIP VLAN
10.SITE.4.0/24     - Wireless VLAN
10.SITE.5.0/24     - IoT / OT devices
10.SITE.6.0/24     - DMZ
10.SITE.10.0/23    - Guest WiFi (larger /23 for more devices)
10.SITE.20.0/24    - Point-to-point links (/30 or /31 within this)
```

## Example: New York HQ (Site 1)

```text
10.1.0.0/24    - Network infrastructure
10.1.1.0/24    - Servers (254 hosts)
10.1.2.0/24    - Workstations
10.1.3.0/24    - VoIP phones
10.1.4.0/24    - Corporate WiFi
10.1.10.0/23   - Guest WiFi (510 usable hosts, DHCP range)
10.1.20.0/24   - WAN/P2P links (subdivide into /30s)
```

## Documenting the Scheme

Maintain documentation in a structured format:

```text
Site: New York HQ (Site 1)
Aggregate: 10.1.0.0/16
Date Allocated: 2026-01-15
Contact: network-team@example.com

VLAN 10 (Servers)    : 10.1.1.0/24   GW: 10.1.1.1   DHCP: N (static)
VLAN 20 (Clients)    : 10.1.2.0/24   GW: 10.1.2.1   DHCP: Y  (10.1.2.100-250)
VLAN 30 (VoIP)       : 10.1.3.0/24   GW: 10.1.3.1   DHCP: Y  (10.1.3.10-200)
```

## Summary Routes in Routing Tables

With this hierarchical scheme, you can summarize per-site:

```bash
# Example on a Linux-based router:

# Route all New York traffic to the NY router
ip route add 10.1.0.0/16 via 10.0.0.2
```

This keeps routing tables small and manageable.

## Conclusion

A hierarchical, site-based IPv4 addressing scheme enables clean summarization, consistent documentation, and painless expansion. Invest time in planning before deployment - renumbering a live network is expensive and error-prone.
