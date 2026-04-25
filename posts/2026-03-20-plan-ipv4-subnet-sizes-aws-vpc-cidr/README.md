# How to Plan IPv4 Subnet Sizes for AWS VPC Using CIDR Notation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, VPC, IPv4, CIDR, Subnetting, Network Planning

Description: Plan IPv4 subnet sizes for an AWS VPC by calculating host counts, accounting for AWS reserved addresses, and allocating CIDR blocks for application, database, and public tiers across multiple...

## Introduction

AWS VPC subnetting requires careful planning because AWS reserves 5 IP addresses per subnet, subnets cannot be resized after creation, and adding extra AZs later requires pre-allocated space. A well-thought-out CIDR plan prevents IP exhaustion and simplifies future expansion.

## AWS Reserved Addresses Per Subnet

For any subnet, AWS reserves:
- `.0`: Network address
- `.1`: VPC router
- `.2`: AWS DNS
- `.3`: Future use
- Last address: Broadcast

A /24 subnet has 256 total addresses minus 5 = **251 usable**.

## Quick Reference: Subnet Sizes

| CIDR | Total IPs | Usable (AWS) |
|---|---|---|
| /28 | 16 | 11 |
| /27 | 32 | 27 |
| /26 | 64 | 59 |
| /25 | 128 | 123 |
| /24 | 256 | 251 |
| /23 | 512 | 507 |
| /22 | 1024 | 1019 |

## Planning a Three-Tier, Three-AZ VPC

Starting with a `10.0.0.0/16` VPC:

```text
VPC: 10.0.0.0/16  (65,536 IPs)

─── Public Subnets (web/load balancer tier) ───
10.0.1.0/24   - public-1a  (251 usable)
10.0.2.0/24   - public-1b
10.0.3.0/24   - public-1c

─── App Subnets (EC2, ECS, Lambda) ───
10.0.10.0/23  - app-1a  (507 usable per AZ)
10.0.12.0/23  - app-1b
10.0.14.0/23  - app-1c

─── Database Subnets ───
10.0.20.0/24  - db-1a  (251 usable)
10.0.21.0/24  - db-1b
10.0.22.0/24  - db-1c

─── Reserved for future expansion ───
10.0.100.0/22 - EKS expansion subnet
10.0.200.0/24 - Management/VPN
```

## Python Script to Validate No Overlaps

```python
#!/usr/bin/env python3
import ipaddress

subnets = [
    "10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24",
    "10.0.10.0/23", "10.0.12.0/23", "10.0.14.0/23",
    "10.0.20.0/24", "10.0.21.0/24", "10.0.22.0/24",
]

networks = [ipaddress.IPv4Network(s) for s in subnets]

# Check for overlaps

for i, a in enumerate(networks):
    for j, b in enumerate(networks):
        if i < j and a.overlaps(b):
            print(f"OVERLAP: {a} and {b}")

print("No overlaps found - plan is valid") if not any(
    a.overlaps(b) for i, a in enumerate(networks)
    for j, b in enumerate(networks) if i < j
) else None
```

## Sizing for EKS

Kubernetes pods can consume many IPs. By default, Amazon VPC CNI assigns Pod IPs from the node subnet. If you use EKS custom networking, plan a secondary VPC CIDR range (for example, from `100.64.0.0/10`) for Pod networking.

## Conclusion

Plan subnets before creating the VPC. Use /24 for small tiers, /23 for app tiers (double density), and /28 only for very small-purpose subnets. RDS subnet groups typically need larger subnets so Amazon RDS has spare addresses for failover and maintenance. Document the allocation in a CIDR spreadsheet and reserve space for future AZs and services.
