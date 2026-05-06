# How to Choose Between 10.0.0.0, 172.16.0.0, and 192.168.0.0 Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Networking, RFC 1918, Private Addresses, Network Design, IP Addressing

Description: Selecting the right RFC 1918 private address range depends on your organization's size, growth plans, VPN requirements, and the risk of IP overlap with partner networks.

## Quick Comparison

| Range | Size | Subnets Available | Best For |
|-------|------|------------------|----------|
| 10.0.0.0/8 | 16.7 million addresses | 65,536 /24 subnets | Large enterprises, cloud |
| 172.16.0.0/12 | 1 million addresses | 4,096 /24 subnets | Medium organizations |
| 192.168.0.0/16 | 65,536 addresses | 256 /24 subnets | SOHO, home networks |

## Decision Factors

### 1. Scale and Growth
Use `10.0.0.0/8` for organizations with multiple sites, data centers, or cloud deployments. Its 24 bits beyond the `/8` prefix allow hierarchical addressing: site ID + VLAN + host.

### 2. VPN and Peering Conflicts
`192.168.0.0/16` is commonly used by home routers (192.168.1.0/24, 192.168.0.0/24). If employees use VPNs from home, address overlap between the corporate network and the employee's home router causes routing conflicts.

```text
Problem: Employee home router uses 192.168.1.0/24
         Corporate VPN also uses 192.168.1.0/24
Result:  VPN client cannot distinguish traffic destined for 
         corporate systems from local home systems.
```

Prefer `10.0.0.0/8` or `172.16.0.0/12` for corporate networks to avoid this.

### 3. Multi-Tenant and Cloud Environments
Cloud deployments often use RFC 1918 ranges, and overlapping CIDR blocks can prevent peering or complicate hybrid connectivity. Avoid choosing overlapping ranges if you plan to peer with cloud VPCs or VNets.

## Hierarchical Addressing Example with 10.0.0.0/8

```python
import ipaddress

# Allocate /16 per site, /24 per VLAN within each site

sites = {
    "HQ":       "10.0.0.0/16",
    "Branch-1": "10.1.0.0/16",
    "Branch-2": "10.2.0.0/16",
    "Cloud-VPC": "10.100.0.0/16",
}

for site, prefix in sites.items():
    net = ipaddress.IPv4Network(prefix)
    # Subdivide into /24 VLANs
    vlans = list(net.subnets(new_prefix=24))[:4]
    print(f"\n{site} ({prefix}):")
    for i, vlan in enumerate(vlans, 1):
        print(f"  VLAN {i}: {vlan}")
```

## Avoiding Overlap in Multi-Site Environments

```python
import ipaddress

def check_overlap(networks: list) -> list:
    """Return pairs of overlapping networks."""
    overlaps = []
    nets = [ipaddress.IPv4Network(n) for n in networks]
    for i in range(len(nets)):
        for j in range(i+1, len(nets)):
            if nets[i].overlaps(nets[j]):
                overlaps.append((str(nets[i]), str(nets[j])))
    return overlaps

allocated = ["10.0.0.0/16", "10.1.0.0/16", "10.2.0.0/16"]
conflicts = check_overlap(allocated)
print("Overlaps:", conflicts or "None")
```

## Recommended Allocation Strategy

1. **Home/SOHO**: `192.168.x.x` - commonplace, sufficient for small needs.
2. **Branch offices**: `172.16.x.0/24` through `172.31.x.0/24` - distinct from home routers.
3. **Enterprise / Cloud**: `10.x.x.x/8` - maximum flexibility, hierarchical subnetting.
4. **VPN clients**: Assign a sub-block of `10.0.0.0/8` outside all site ranges to avoid overlap.

## Key Takeaways

- `192.168.0.0/16` is overused in consumer gear; avoid it for VPN-connected corporate networks.
- `10.0.0.0/8` is the best choice for large or growing organizations.
- Always check for overlap between your network and partner/cloud networks before finalizing addressing.
- Use hierarchical allocation (site → VLAN → host) to keep routes summarizable.
