# How to Implement Hierarchical IPv4 Addressing by Region, Campus, and Floor

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Hierarchical Addressing, Network Design, Campus, Subnetting

Description: Learn how to implement a three-level hierarchical IPv4 addressing model organized by region, campus, and floor to enable route summarization and simplify network management.

## The Three-Level Hierarchy

A hierarchical IPv4 design maps portions of the private 10.0.0.0/8 address space to network topology levels:

```text
10.[region].[campus block + floor/vlan].[host]

Level 1: Region      (allocate 10.X.0.0/16 from 10.0.0.0/8)
Level 2: Campus      (subdivide each region /16 into /21 or /22 campus blocks)
Level 3: Floor/VLAN  (allocate /24s inside each campus block)
```

This enables route summarization at each level:
- Each floor/VLAN advertises its /24
- Each campus summarizes to its /21 or /22
- Each region summarizes to its /16

## Step 1: Region Allocation

```text
Region Code → Second Octet:

10.1.0.0/16 = Americas (Region 1)
10.2.0.0/16 = EMEA     (Region 2)
10.3.0.0/16 = APAC     (Region 3)
```

Upstream of the regional summary point, routers only need to know one route per region.

## Step 2: Campus Allocation Within a Region

Divide each /16 into blocks for each campus/building:

```text
10.1.0.0/16 - Americas

Campus allocations (using bits 17-21 = /21 blocks):
  10.1.0.0/21   Campus: NYC-HQ       (10.1.0.0 - 10.1.7.255 = 8 /24s)
  10.1.8.0/21   Campus: NYC-Annex    (8 /24s for expansion)
  10.1.16.0/21  Campus: Boston       (8 /24s)
  10.1.24.0/21  Campus: Philadelphia (8 /24s)
  10.1.32.0/21  Campus: Chicago      (8 /24s)
```

Each /21 provides 8 /24 subnets - perfect for a campus with up to 8 floors or VLANs.

## Step 3: Floor/VLAN Allocation Within a Campus

Divide each /21 into /24s for floors or VLANs:

```text
10.1.0.0/21 - NYC-HQ Campus

Floor/VLAN allocations (/24 per floor or VLAN):
  10.1.0.0/24  Floor 1 - Reception, Lobby  (VLAN 100)
  10.1.1.0/24  Floor 2 - Sales             (VLAN 110)
  10.1.2.0/24  Floor 3 - Engineering       (VLAN 120)
  10.1.3.0/24  Floor 4 - Finance           (VLAN 130)
  10.1.4.0/24  Floor 5 - Executive         (VLAN 140)
  10.1.5.0/24  Servers (data room)         (VLAN 200)
  10.1.6.0/24  WiFi guests                 (VLAN 210)
  10.1.7.0/24  Printers/IoT                (VLAN 220)
```

## Step 4: Route Summarization at Each Level

```text
NYC-HQ campus router advertises:
  10.1.0.0/21  (summarizes all 8 /24 floor/VLAN subnets)

Americas region router receives:
  10.1.0.0/21 from NYC-HQ
  10.1.8.0/21 from NYC-Annex
  10.1.16.0/21 from Boston
  ...
  And advertises 10.1.0.0/16 to WAN/core

Core/WAN router sees:
  10.1.0.0/16 = Americas (one route!)
  10.2.0.0/16 = EMEA
  10.3.0.0/16 = APAC
```

## Step 5: Configure Summarization in OSPF (Cisco IOS)

```text
! At Area Border Router (campus to core):
router ospf 1
  area 1 range 10.1.0.0 255.255.248.0   ! Summarize NYC-HQ /21

! At regional router (after more-specific campus routes are in BGP):
router bgp 65001
  aggregate-address 10.1.0.0 255.255.0.0 summary-only   ! Advertise /16 only
```

## Step 6: Design Spreadsheet Template

```python
from ipaddress import ip_network

# Define the hierarchy

design = {
    'Americas': {
        'cidr': '10.1.0.0/16',
        'campuses': {
            'NYC-HQ': {
                'cidr': '10.1.0.0/21',
                'floors': {
                    'F1-Reception': '10.1.0.0/24',
                    'F2-Sales': '10.1.1.0/24',
                    'F3-Engineering': '10.1.2.0/24',
                    'F4-Finance': '10.1.3.0/24',
                    'Servers': '10.1.5.0/24',
                }
            },
            'Boston': {
                'cidr': '10.1.16.0/21',
                'floors': {
                    'F1': '10.1.16.0/24',
                    'F2': '10.1.17.0/24',
                }
            }
        }
    }
}

# Validate hierarchy
for region, rdata in design.items():
    region_net = ip_network(rdata['cidr'])
    for campus, cdata in rdata['campuses'].items():
        campus_net = ip_network(cdata['cidr'])
        assert campus_net.subnet_of(region_net), f"{campus} not within {region}"
        for floor, floor_cidr in cdata['floors'].items():
            floor_net = ip_network(floor_cidr)
            assert floor_net.subnet_of(campus_net), f"{floor} not within {campus}"
            print(f"OK: {region} > {campus} > {floor}: {floor_cidr}")
```

## Conclusion

Hierarchical IPv4 addressing maps network topology to IP address structure: region (second octet), campus (the /21 campus block inside the regional /16), and floor/VLAN (individual /24s within that block). This enables clean route summarization at each level: /24 floor/VLAN subnets aggregate to /21 campus blocks, which aggregate to /16 regional routes. The result is dramatically smaller routing tables at the core and a self-documenting address plan where an IP address immediately reveals its location in the network.
