# How to Plan IPv4 Addressing for a Data Center Network

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Data Center, Subnetting, Network Design, IPAM, Infrastructure

Description: Design a scalable IPv4 addressing plan for a data center covering management, server, storage, DMZ, and out-of-band networks with proper summarization and growth capacity.

## Introduction

A well-designed data center IPv4 addressing plan enables route summarization, simplifies ACLs, and accommodates growth. Carving a large private block into functional zones at the start avoids painful renumbering later.

## Recommended Private Address Blocks

| Block | Size | Best For |
|-------|------|----------|
| 10.0.0.0/8 | 16,777,216 addresses | Large enterprise / multi-DC |
| 172.16.0.0/12 | 1,048,576 addresses | Medium DC or single site |
| 192.168.0.0/16 | 65,536 addresses | Small DC / lab |

## Sample Data Center Addressing Plan (10.x.x.x)

```text
10.0.0.0/8       - Entire DC allocation
  10.10.0.0/16   - Data Center 1
    10.10.1.0/24   - Management network (IPMI/iDRAC/iLO)
    10.10.2.0/24   - Out-of-Band (OOB) switches
    10.10.10.0/22  - Compute servers (10.10.10.0 – 10.10.13.255)
    10.10.20.0/23  - Storage network (iSCSI / NFS)
    10.10.30.0/24  - Kubernetes pod network (internal)
    10.10.40.0/24  - DMZ / public-facing services
    10.10.50.0/24  - Load balancers / VIPs
    10.10.60.0/24  - Backup network
    10.10.254.0/24 - Network infrastructure (routers, switches)
  10.20.0.0/16   - Data Center 2 (same structure)
  10.30.0.0/16   - Disaster Recovery site
```

## Subnet Sizing Guidelines

```text
/30  (4 addresses, 2 usable)     - Point-to-point links
/29  (8 addresses, 6 usable)     - Small management segments
/28  (16 addresses, 14 usable)   - Server clusters
/27  (32 addresses, 30 usable)   - Rack groups
/26  (64 addresses, 62 usable)   - Pod or row
/24  (256 addresses, 254 usable) - Standard VLAN
/23  (512 addresses, 510 usable) - Large VLAN
/22  (1024 addresses, 1022 usable) - Compute zone
```

## Python Subnet Calculator

```python
import ipaddress

def usable_hosts(network: ipaddress.IPv4Network) -> int:
    if network.prefixlen == 32:
        return 1
    if network.prefixlen == 31:
        return 2
    return max(network.num_addresses - 2, 0)

def plan_subnets(base: str, prefix: int, count: int):
    network = ipaddress.IPv4Network(f"{base}/{prefix}")
    subnets = list(network.subnets(new_prefix=prefix + 4))[:count]
    for i, sn in enumerate(subnets):
        print(f"  Subnet {i+1}: {sn}  "
              f"({sn.network_address} – {sn.broadcast_address}, "
              f"{usable_hosts(sn)} usable)")

# Divide 10.10.0.0/16 into /20 blocks

plan_subnets("10.10.0.0", 16, 8)
```

## Route Summarization

```text
Each /16 per DC summarizes to a single route advertisement.
DC1:  10.10.0.0/16  → core router advertises one prefix
DC2:  10.20.0.0/16  → summarized at DC2 border
DR:   10.30.0.0/16  → summarized at DR border
All:  10.0.0.0/8    → single summary to WAN/MPLS
```

## VLAN-to-Subnet Mapping Table

```text
VLAN  Name           Subnet          Gateway
10    Management     10.10.1.0/24    10.10.1.1
20    OOB            10.10.2.0/24    10.10.2.1
100   Compute-A      10.10.10.0/24   10.10.10.1
101   Compute-B      10.10.11.0/24   10.10.11.1
200   Storage        10.10.20.0/23   10.10.20.1
300   DMZ            10.10.40.0/24   10.10.40.1
```

## Conclusion

Start with a large /8 or /12 block and partition it by data center, then by function. Reserve space for growth (at least 50% headroom per zone), document every allocation in an IPAM tool, and ensure every subnet summarizes cleanly to its parent block. Consistent alignment simplifies ACLs, firewall rules, and troubleshooting.
