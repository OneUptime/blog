# How to Design a Hierarchical IPv4 Addressing Plan for Campus Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Campus Network, Hierarchical Design, Subnetting, Network Planning

Description: Design a three-tier hierarchical IPv4 addressing scheme for campus networks covering core, distribution, and access layers with building-based addressing and summarization.

## Introduction

Campus networks follow a three-tier hierarchy: core (fast routing between buildings), distribution (policy enforcement, inter-VLAN routing), and access (end-device connectivity). IPv4 addressing should mirror this hierarchy to enable efficient summarization.

## Hierarchical Addressing Model

```text
10.0.0.0/8          - Enterprise total allocation
  10.SITE.0.0/16    - One /16 per campus site
    10.1.0.0/16     - Main Campus
      10.1.X.0/24     - One /24 per VLAN or floor, allocated from a building summary block
        10.1.12.0/24  - Building A, Floor 0
        10.1.13.0/24  - Building A, Floor 1
        10.1.20.0/24  - Building B, Floor 0
      10.1.200.0/21  - Wired infrastructure (switches, routers)
      10.1.210.0/24  - Wireless controllers / APs
      10.1.220.0/24  - VoIP phones
      10.1.230.0/24  - Printers / IoT
      10.1.240.0/24  - Security cameras
```

## Sample Campus Plan

```text
Site: Main Campus (10.1.0.0/16)

Building A - 10.1.12.0/22 (allocates 4 × /24)
  VLAN 110  Students      10.1.12.0/24   GW: 10.1.12.1
  VLAN 111  Staff         10.1.13.0/24   GW: 10.1.13.1
  VLAN 112  APs           10.1.14.0/24   GW: 10.1.14.1
  VLAN 113  Phones        10.1.15.0/24   GW: 10.1.15.1

Building B - 10.1.20.0/22
  VLAN 120  Students      10.1.20.0/24
  VLAN 121  Staff         10.1.21.0/24

Core / Infrastructure
  Transit pool            10.1.200.0/29  (split into /30s for routed P2P links)
  VLAN 201  Mgmt          10.1.201.0/24
```

## Python Planning Script

```python
import ipaddress

BUILDINGS = {
    "BuildingA": "10.1.12.0/22",
    "BuildingB": "10.1.20.0/22",
    "BuildingC": "10.1.28.0/22",
}

ROLES = ["Students", "Staff", "APs", "Phones"]

for building, cidr in BUILDINGS.items():
    print(f"\n{building} ({cidr})")
    net = ipaddress.IPv4Network(cidr)
    subnets = list(net.subnets(new_prefix=24))
    for role, sn in zip(ROLES, subnets):
        print(f"  {role:<12} {sn}  GW: {list(sn.hosts())[0]}")
```

## Distribution Layer Configuration (Cisco IOS)

```cisco
! Distribution switch for Building A
interface Vlan110
 description Students-BldgA
 ip address 10.1.12.1 255.255.255.0
 ip helper-address 10.1.201.10    ! DHCP server
!
interface Vlan111
 description Staff-BldgA
 ip address 10.1.13.1 255.255.255.0
 ip helper-address 10.1.201.10
!
! Summarize Building A to core on the uplink
interface GigabitEthernet1/1
 description Uplink-to-Core
 ip summary-address eigrp 1 10.1.12.0 255.255.252.0
!
router eigrp 1
 network 10.0.0.0
 no auto-summary
```

## Summarization Benefits

```text
Without summarization: core routing table has 50+ /24 entries
With summarization:    core sees one /22 per building cluster
                       one /16 per site
                       one /8 for the enterprise
```

## Conclusion

Align IPv4 addressing with the physical hierarchy: one block per site, subdivided by building, then by function. Summarize at each tier boundary to keep routing tables small. Reserve at least 50% of each building block for growth, and document allocations in an IPAM system before deploying.
