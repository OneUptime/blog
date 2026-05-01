# How to Design an IPv4 Addressing Scheme for a Multi-Site Enterprise

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Addressing Design, Enterprise Network, Subnetting, IPAM

Description: Learn how to design a structured, hierarchical IPv4 addressing scheme for a multi-site enterprise that supports summarization, growth, and easy management.

## Principles of Enterprise IPv4 Addressing

A good enterprise IPv4 addressing scheme provides:
- **Summarizability** - each site's addresses should aggregate to a single prefix
- **Hierarchy** - addresses reflect network topology (region → site → building → floor)
- **Growth room** - each allocation has room to expand
- **Uniqueness** - no overlapping ranges, especially for sites that may be connected

## Step 1: Choose Your Address Space

Use RFC 1918 private addressing for internal networks:

```text
10.0.0.0/8    - largest, most flexible (16 million addresses)
172.16.0.0/12 - medium (1 million addresses)
192.168.0.0/16 - smallest (65K addresses)
```

For multi-site enterprise, use **10.0.0.0/8** and divide it hierarchically.

## Step 2: Regional Allocation

Divide the 10.0.0.0/8 space into regional blocks:

```text
10.0.0.0/8  - All Enterprise Networks

Regional Division (using second octet for region):
  10.1.0.0/16  - Region: Americas HQ
  10.2.0.0/16  - Region: EMEA
  10.3.0.0/16  - Region: APAC
  10.10.0.0/16 - Region: Azure (cloud)
  10.20.0.0/16 - Region: AWS (cloud)
  10.254.0.0/16 - Network Infrastructure (WAN links, loopbacks)
```

## Step 3: Site Allocation Within a Region

Divide each /16 into /24s, /22s, or /20s per site, based on site size:

```text
10.1.0.0/16  - Americas

Site Allocation (using /22-aligned third-octet blocks for site):
  10.1.0.0/22   - NYC HQ (4x /24s worth of address space, room to grow)
  10.1.4.0/22   - Chicago Office
  10.1.8.0/22   - Dallas Office
  10.1.12.0/22  - LA Office
  10.1.100.0/22 - Atlanta Datacenter
```

## Step 4: Floor/VLAN Allocation Within a Site

Divide each site block into functional VLANs:

```text
10.1.0.0/22 - NYC HQ (10.1.0.0 - 10.1.3.255)

VLAN Allocation:
  10.1.0.0/24   VLAN 10 - Corporate Users
  10.1.1.0/24   VLAN 20 - Servers
  10.1.2.0/24   VLAN 30 - WiFi Clients
  10.1.3.0/28   VLAN 40 - Network Management
  (10.1.3.16+)           - Reserved for growth
```

## Step 5: Infrastructure Addressing

Reserve a dedicated block for network infrastructure:

```text
10.254.0.0/16 - Infrastructure

10.254.1.0/24   - Loopback addresses (router IDs)
  10.254.1.1/32   Router01 loopback
  10.254.1.2/32   Router02 loopback

10.254.2.0/24   - WAN point-to-point links (use /30 or /31)
  10.254.2.0/30   NYC-Chicago WAN link
  10.254.2.4/30   Chicago-Dallas WAN link

10.254.3.0/24   - Out-of-band management
  10.254.3.0/24   OOB management network
```

## Step 6: Document the Addressing Plan

Create an IPAM spreadsheet or use tools like NetBox:

```python
# Example using Python ipaddress module to validate the plan

from ipaddress import ip_network

# Verify no overlap between regions
regions = [
    ip_network('10.1.0.0/16'),   # Americas
    ip_network('10.2.0.0/16'),   # EMEA
    ip_network('10.3.0.0/16'),   # APAC
]

# Check for overlaps
for i, net1 in enumerate(regions):
    for net2 in regions[i + 1:]:
        if net1.overlaps(net2):
            print(f"OVERLAP: {net1} overlaps {net2}")
        else:
            print(f"OK: {net1} and {net2} do not overlap")

# Verify sites fit within region
nyc = ip_network('10.1.0.0/22')
americas = ip_network('10.1.0.0/16')
print(f"NYC subnet fits in Americas: {nyc.subnet_of(americas)}")
```

## Step 7: IPv4 Summarization Benefit

The hierarchical design enables clean route summarization:

```text
From the Americas core to the enterprise WAN:
  Advertise: 10.1.0.0/16 (one route for all Americas)
  Instead of: 10.1.0.0/22, 10.1.4.0/22, 10.1.8.0/22... (individual sites)

This reduces:
- Routing table size on WAN/core routers
- Route update churn when internal site routes change
- OSPF summary LSA volume to remote areas
```

## Conclusion

A well-designed multi-site IPv4 addressing scheme uses 10.0.0.0/8 with a hierarchical allocation: region (second octet), site (third-octet block), and VLAN (subnets within the site block). Separate infrastructure addressing (loopbacks, WAN links) into a dedicated block (10.254.0.0/16). The result is a clean, summarizable address plan that scales to hundreds of sites while keeping routing tables small and troubleshooting intuitive.
