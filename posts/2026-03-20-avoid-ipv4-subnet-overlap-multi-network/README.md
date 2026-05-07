# How to Avoid IPv4 Subnet Overlap When Connecting Multiple Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Subnetting, Network Design, VPN, IPAM, Routing

Description: Detect and prevent IPv4 subnet overlaps when connecting corporate networks, cloud VPCs, VPN tunnels, and partner networks to avoid routing conflicts.

Subnet overlap is one of the most common and frustrating networking problems. It occurs when the same IPv4 address range appears in multiple connected networks, making routing ambiguous.

## Why Subnet Overlap is Problematic

```text
Network A: 10.100.1.0/24 (Corporate)
Network B: 10.100.1.0/24 (AWS VPC being connected via VPN)

Problem: Packets destined for 10.100.1.50 - which network?
Router can't distinguish → routing breaks
```

## Detecting Overlap with Python

```python
#!/usr/bin/env python3
# check_overlap.py

import ipaddress

def check_overlaps(networks):
    """Check for any overlapping networks in a list."""
    nets = [(name, ipaddress.IPv4Network(cidr)) for name, cidr in networks]
    overlaps = []

    for i, (name1, net1) in enumerate(nets):
        for name2, net2 in nets[i+1:]:
            if net1.overlaps(net2):
                overlaps.append((name1, str(net1), name2, str(net2)))

    return overlaps

# Define all your connected networks
all_networks = [
    ("Corporate LAN", "10.100.0.0/16"),
    ("AWS VPC us-east-1", "172.31.0.0/16"),
    ("AWS VPC us-west-2", "10.100.0.0/16"),  # CONFLICT!
    ("Office WiFi", "192.168.1.0/24"),
    ("VPN Clients", "10.200.0.0/16"),
    ("Docker", "172.17.0.0/16"),
    ("Partner Network", "10.100.50.0/24"),    # CONFLICT! (subset of Corporate)
]

overlaps = check_overlaps(all_networks)
if overlaps:
    print("OVERLAPS DETECTED:")
    for n1, c1, n2, c2 in overlaps:
        print(f"  {n1} ({c1}) overlaps with {n2} ({c2})")
else:
    print("No overlaps found")
```

## Common Overlap Scenarios

### 1. AWS VPC Default CIDR

```bash
# AWS automatically assigns 172.31.0.0/16 to default VPCs
# If your corp network uses 172.16.0.0/12, this overlaps!

# Check:
python3 -c "
import ipaddress
corp = ipaddress.IPv4Network('172.16.0.0/12')
aws_default = ipaddress.IPv4Network('172.31.0.0/16')
print('OVERLAP!' if corp.overlaps(aws_default) else 'OK')
# AWS default VPC is within 172.16.0.0/12 → OVERLAP
"

# Solution: Always create AWS VPCs with custom CIDRs
# Use: 10.200.0.0/16 or 10.201.0.0/16 for cloud VPCs
```

### 2. Common Kubernetes CIDRs

```bash
# A common kubeadm + Flannel setup uses 10.244.0.0/16 (pods), 10.96.0.0/12 (services)
# If your corp uses 10.0.0.0/8 without excluding these ranges → conflict

# Check:
python3 -c "
import ipaddress
corp = ipaddress.IPv4Network('10.0.0.0/8')
k8s_pods = ipaddress.IPv4Network('10.244.0.0/16')
print('OVERLAP!' if corp.overlaps(k8s_pods) else 'OK')
# True → they overlap
"
```

### 3. Site-to-Site VPN Overlap

```bash
# Before connecting networks, validate no overlap
python3 check_overlap.py

# If overlap found, options:
# 1. Re-address one of the networks (ideal)
# 2. Use NAT on the VPN tunnel to translate conflicting ranges
```

## NAT as a Workaround for Unavoidable Overlap

If re-addressing isn't possible and your platform supports `NETMAP`, use NAT to translate the remote side:

```bash
# On the VPN gateway, NAT the remote 10.100.0.0/24 to appear as 10.200.0.0/24
sudo iptables -t nat -A PREROUTING \
  -d 10.200.0.0/24 -j NETMAP --to 10.100.0.0/24

sudo iptables -t nat -A POSTROUTING \
  -s 10.100.0.0/24 -j NETMAP --to 10.200.0.0/24
```

## Pre-Deployment Checklist

```bash
# Before connecting any new network:
# 1. List all existing connected network CIDRs
# 2. Get the new network's CIDR
# 3. Run the overlap check
# 4. Check common defaults (Docker, K8s, cloud default VPCs)
# 5. Document the new network in your IPAM tool
echo "Overlap check complete"
```

Prevention is always better than troubleshooting - run overlap checks before any network interconnection project.
