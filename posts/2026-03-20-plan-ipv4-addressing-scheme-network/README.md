# How to Plan an IPv4 Addressing Scheme for Your Network

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Networking, Network Design, Subnetting, IP Addressing, VLSM

Description: A well-planned IPv4 addressing scheme assigns logical, hierarchical subnets to each network segment, ensuring efficient address utilization, scalability, and summarizable routing.

## Planning Principles

1. **Hierarchical addressing**: Allocate large blocks per site, subdivide into VLANs, further into hosts.
2. **Summarization**: Choose contiguous blocks per site so routes can be aggregated into a single prefix.
3. **Growth room**: Allocate 2× the expected hosts to allow future expansion.
4. **Consistent subnet sizes**: Use standard prefix lengths (/24, /25, /26) per segment type for simplicity.
5. **Reserve ranges**: Set aside blocks for infrastructure (routers, switches), servers, and users.

## Example: Multi-Site Enterprise

```text
Total space: 10.0.0.0/8

Site A (HQ):     10.0.0.0/16    (65,534 usable hosts)
  Servers:       10.0.0.0/24    (254 hosts)
  Users-VLAN10:  10.0.10.0/23   (510 hosts)
  Users-VLAN20:  10.0.20.0/23   (510 hosts)
  Management:    10.0.254.0/24  (254 hosts)

Site B (Branch): 10.1.0.0/16
  Servers:       10.1.0.0/24
  Users:         10.1.10.0/24
  Management:    10.1.254.0/24

Cloud VPC:       10.100.0.0/16
  Subnet-AZ1:   10.100.1.0/24
  Subnet-AZ2:   10.100.2.0/24
```

## Python: Automated Subnet Allocation

```python
import ipaddress

def allocate_subnets(parent: str, allocations: list) -> list:
    """
    Allocate named subnets from a parent block.
    allocations: list of (name, prefix_len) tuples in assignment order.
    Returns list of (name, subnet) tuples.
    """
    parent_net = ipaddress.IPv4Network(parent)
    results = []
    next_addr = parent_net.network_address

    for name, prefix_len in allocations:
        try:
            subnet = next(
                candidate
                for candidate in parent_net.subnets(new_prefix=prefix_len)
                if candidate.network_address >= next_addr
            )
        except StopIteration as exc:
            raise ValueError(f"Not enough space in {parent_net} for {name} /{prefix_len}") from exc

        results.append((name, subnet))
        next_addr = subnet.broadcast_address + 1

    return results

# Simpler sequential allocation

parent = "10.0.0.0/16"
vlans = [
    ("Servers",    24),  # 254 usable hosts
    ("UserVLAN10", 23),  # 510 usable hosts
    ("UserVLAN20", 23),  # 510 usable hosts
    ("Mgmt",       24),  # 254 usable hosts
]

for name, net in allocate_subnets(parent, vlans):
    print(f"{name:12s}: {net}  ({net.num_addresses - 2} usable hosts)")
```

## VLAN-to-Subnet Mapping Best Practice

| VLAN ID | Segment | Subnet | Prefix |
|---------|---------|--------|--------|
| 10 | Servers | 10.0.10.0 | /24 |
| 20 | Users | 10.0.20.0 | /23 |
| 30 | VoIP | 10.0.30.0 | /24 |
| 40 | Management | 10.0.40.0 | /24 |
| 50 | IoT | 10.0.50.0 | /24 |

Aligning VLAN IDs with the third octet makes ACL writing and troubleshooting intuitive.

## Key Takeaways

- Assign entire /16 or /20 blocks per site to enable route summarization.
- Reserve .0/24 (or similar) within each site block for servers and management.
- Account for 2× growth when sizing subnets.
- Consistent patterns (VLAN ID = third octet) reduce human error in access lists and routing configs.
