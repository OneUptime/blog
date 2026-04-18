# How to Use VLSM to Efficiently Allocate IPv4 Address Space

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VLSM, IPv4, Subnetting, Network Design, CIDR, Addressing

Description: Apply Variable Length Subnet Masking (VLSM) to allocate IPv4 address space efficiently by matching subnet sizes precisely to the number of hosts required.

VLSM allows different subnets within the same network to have different prefix lengths, minimizing wasted IPv4 addresses by sizing each subnet to fit actual needs.

## Why VLSM?

Classic fixed-length subnetting wastes addresses. For example, using `/24` subnets everywhere:
- A 3-host server VLAN gets 254 addresses (251 wasted)
- A 200-host office VLAN gets 254 addresses (54 wasted)

With VLSM, give each subnet exactly what it needs.

## VLSM Process

1. List all subnets sorted by required hosts (largest first)
2. Allocate the smallest prefix that satisfies each requirement
3. Assign non-overlapping address blocks

## Example: Planning a 10.10.0.0/22 Block

Available: `10.10.0.0/22` = 1022 usable hosts

Requirements (sorted largest to smallest):
1. Production servers: 200 hosts
2. Office LAN: 100 hosts
3. Development: 50 hosts
4. Management: 20 hosts
5. DMZ: 10 hosts
6. WAN link 1: 2 hosts
7. WAN link 2: 2 hosts

## Allocation

```bash
# Host sizing reference:

# Need 200 hosts → /24 gives 254 (next power of 2 after 200 + 2)
# Need 100 hosts → /25 gives 126
# Need 50 hosts  → /26 gives 62
# Need 20 hosts  → /27 gives 30
# Need 10 hosts  → /28 gives 14
# Need 2 hosts   → /30 gives 2

# Allocation (assign from start of block):
# 200 hosts: 10.10.0.0/24   (starts at 10.10.0.0, ends at 10.10.0.255)
# 100 hosts: 10.10.1.0/25   (starts at 10.10.1.0, ends at 10.10.1.127)
# 50 hosts:  10.10.1.128/26 (starts at 10.10.1.128, ends at 10.10.1.191)
# 20 hosts:  10.10.1.192/27 (starts at 10.10.1.192, ends at 10.10.1.223)
# 10 hosts:  10.10.1.224/28 (starts at 10.10.1.224, ends at 10.10.1.239)
# 2 hosts:   10.10.1.240/30 (starts at 10.10.1.240, ends at 10.10.1.243)
# 2 hosts:   10.10.1.244/30 (starts at 10.10.1.244, ends at 10.10.1.247)
# Remaining: 10.10.2.0/23   (future use)
```

## Verifying with ipcalc

```bash
# Verify each subnet doesn't overlap
ipcalc 10.10.0.0/24
# HostMax: 10.10.0.254

ipcalc 10.10.1.0/25
# HostMax: 10.10.1.126 (doesn't overlap with /24 above)

ipcalc 10.10.1.128/26
# HostMin: 10.10.1.129, HostMax: 10.10.1.190 (doesn't overlap)
```

## VLSM Calculator Script

```python
#!/usr/bin/env python3
# vlsm_calc.py - simple VLSM subnet allocator
import ipaddress

def hosts_to_prefix(n):
    """Return the smallest prefix length that fits n hosts."""
    for prefix in range(30, 0, -1):
        usable = 2 ** (32 - prefix) - 2
        if usable >= n:
            return prefix
    return 0

def vlsm_allocate(base_network, requirements):
    """
    Allocate VLSM subnets from a base network.
    requirements: list of (name, hosts_needed) tuples, sorted by hosts desc
    """
    network = ipaddress.IPv4Network(base_network)
    available = list(network.subnets(new_prefix=32))  # all IPs as /32

    allocations = []
    start = network.network_address

    for name, hosts in sorted(requirements, key=lambda x: -x[1]):
        prefix = hosts_to_prefix(hosts)
        subnet = ipaddress.IPv4Network(f"{start}/{prefix}", strict=False)
        allocations.append((name, hosts, str(subnet), 2**(32-prefix)-2))
        # Move start to next available block
        start = list(subnet.subnets())[-1].broadcast_address + 1

    return allocations

reqs = [
    ("Production", 200),
    ("Office", 100),
    ("Development", 50),
    ("Management", 20),
    ("DMZ", 10),
    ("WAN-1", 2),
    ("WAN-2", 2),
]

for name, needed, subnet, available in vlsm_allocate("10.10.0.0/22", reqs):
    print(f"{name:15} needs {needed:4} hosts → {subnet} ({available} available)")
```

VLSM reduces IPv4 waste significantly in constrained environments while keeping the address plan readable and non-overlapping.
