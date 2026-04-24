# How to Plan a Private IPv4 Address Scheme Using RFC 1918 Ranges

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, RFC 1918, Private Addressing, Network Design, IPAM

Description: Design a private IPv4 addressing plan using RFC 1918 ranges that scales with your organization while avoiding common conflicts and overlaps.

RFC 1918 defines three private IPv4 ranges reserved for internal use. Planning their deployment carefully avoids future routing headaches and enables clean summarization.

## The Three RFC 1918 Ranges

```bash
10.0.0.0/8
  - 16,777,216 addresses
  - Ideal for large enterprises, cloud environments
  - Subnettable from /8 to /32

172.16.0.0/12
  - 1,048,576 addresses (172.16.0.0 – 172.31.255.255)
  - Good for medium enterprises, VPN ranges
  - Docker commonly uses 172.17.0.0/16 first - avoid conflicts

192.168.0.0/16
  - 65,536 addresses
  - Common in home/small office equipment
  - Often avoided for corporate VPN space because it commonly overlaps with home routers
```

## Common Conflicts to Avoid

```bash
172.17.0.0/16     - Docker default bridge network
172.31.0.0/16     - AWS default VPC CIDR block
192.168.0.0/24    - Common consumer-router default
192.168.1.0/24    - Another common consumer-router default
10.0.0.0/24       - Very commonly used in labs/small setups
```

## Recommended Enterprise Scheme Using 10.0.0.0/8

```text
10.0.0.0/8 - Total enterprise space
│
├── 10.0.0.0/9   (10.0.0.0 – 10.127.255.255)
│   └── Sites/offices (up to 128 × /16 site allocations)
│
├── 10.128.0.0/9 (10.128.0.0 – 10.255.255.255)
│   ├── 10.128.0.0/12  - Data centers (up to 16 × /16 DCs)
│   ├── 10.144.0.0/12  - Cloud VPCs
│   ├── 10.160.0.0/12  - VPN ranges
│   ├── 10.176.0.0/12  - Kubernetes pods
│   ├── 10.192.0.0/12  - Kubernetes services
│   └── 10.240.0.0/12  - Future / Reserve
```

## Typical Site Allocation (/16 per site)

```text
Site: 10.1.0.0/16 (e.g., New York)
  ├── 10.1.0.0/24   - Infrastructure / Gateway
  ├── 10.1.1.0/24   - Servers / VLAN 10
  ├── 10.1.2.0/24   - Workstations / VLAN 20
  ├── 10.1.3.0/24   - WiFi / VLAN 30
  ├── 10.1.4.0/24   - VoIP / VLAN 40
  ├── 10.1.5.0/24   - Printers / VLAN 50
  ├── 10.1.254.0/24 - Management / OOB
  └── 10.1.255.0/30 - WAN uplink
```

## Avoiding VPN Overlap

A critical consideration: remote workers connect from `192.168.x.x` or `10.x.x.x` home networks. If your corporate range overlaps, split tunneling can break access to internal resources:

```bash
# Test overlap before deployment

python3 -c "
import ipaddress
corp = ipaddress.IPv4Network('10.100.0.0/16')
home = ipaddress.IPv4Network('10.100.0.0/24')
print('OVERLAP!' if corp.overlaps(home) else 'No overlap')
"
```

Choose a less common sub-range like `10.100.0.0/16` rather than `10.0.0.0/16` or `10.1.0.0/16`.

## Documentation Template

```markdown
# IP Addressing Scheme v1.0

## Summary
Parent: 10.0.0.0/8

## Allocations
| Block | Range | Purpose |
|-------|-------|---------|
| 10.1.0.0/16 | 10.1.0.0 – 10.1.255.255 | NYC Office |
| 10.2.0.0/16 | 10.2.0.0 – 10.2.255.255 | LON Office |
| 10.100.0.0/16 | 10.100.0.0 – 10.100.255.255 | NYC-DC1 |
| 10.200.0.0/16 | 10.200.0.0 – 10.200.255.255 | VPN Clients |

## Forbidden Ranges
- 172.17.0.0/16 (Docker)
- 192.168.0.0/16 (Too common in home networks)
```

A clear, documented RFC 1918 plan is the foundation of every well-managed enterprise network.
