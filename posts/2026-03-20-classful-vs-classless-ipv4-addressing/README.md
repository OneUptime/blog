# How to Understand Classful vs Classless IPv4 Addressing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Networking, CIDR, Classful, Classless, Subnetting

Description: Classful addressing assigned fixed network boundaries based on address class (A/B/C), while classless addressing (CIDR) allows arbitrary prefix lengths, dramatically improving address utilization...

## Classful Addressing (Pre-1993)

In classful addressing, the network boundary was implied by the first octet:

| Class | Network Bits | Host Bits | Default Mask |
|-------|-------------|-----------|-------------|
| A | 8 | 24 | /8 |
| B | 16 | 16 | /16 |
| C | 24 | 8 | /24 |

**Problem**: A company needing 500 hosts received a Class B (/16 = 65,534 hosts), wasting 65,034 addresses.

## Classless Inter-Domain Routing (CIDR, RFC 1519; updated by RFC 4632)

CIDR (1993) introduced explicit prefix lengths, allowing arbitrary contiguous prefix lengths:

```text
Old: 172.16.0.0 → Class B → /16 implied
New: 172.16.0.0/23 → 510 usable hosts, far less waste
```

## Comparing Address Efficiency

```python
import ipaddress

def compare_efficiency(hosts_needed: int):
    """Compare classful vs CIDR allocation for a given host count."""
    import math

    # Classful: must fit in A, B, or C
    if hosts_needed <= 254:
        classful_hosts = 254
        classful_prefix = 24
    elif hosts_needed <= 65534:
        classful_hosts = 65534
        classful_prefix = 16
    else:
        classful_hosts = 16777214
        classful_prefix = 8

    # CIDR: smallest fitting prefix
    host_bits = math.ceil(math.log2(hosts_needed + 2))
    cidr_prefix = 32 - host_bits
    cidr_hosts = 2 ** host_bits - 2

    print(f"Hosts needed: {hosts_needed}")
    print(f"Classful: /{classful_prefix} = {classful_hosts} hosts "
          f"(waste: {classful_hosts - hosts_needed})")
    print(f"CIDR:     /{cidr_prefix} = {cidr_hosts} hosts "
          f"(waste: {cidr_hosts - hosts_needed})")

compare_efficiency(500)
```

Output:
```text
Hosts needed: 500
Classful: /16 = 65534 hosts (waste: 65034)
CIDR:     /23 = 510 hosts (waste: 10)
```

## Routing Table Impact

Classful routing protocols (RIPv1) did not carry subnet mask information; they inferred it from address class. Classless protocols (RIPv2, OSPF, BGP) carry prefix length or mask information explicitly:

```bash
# Old classful route (mask inferred)

# Equivalent to: network 10.0.0.0 (always /8)

# Modern classless route (explicit mask)
ip route add 10.1.2.0/24 via 192.168.1.1
```

## Supernetting (Route Aggregation)

CIDR enables supernetting: combining multiple networks into one advertisement:

```text
192.168.0.0/24
192.168.1.0/24  →  192.168.0.0/22
192.168.2.0/24
192.168.3.0/24
```

## Key Takeaways

- Classful addressing can waste tens of thousands of addresses for mid-sized allocations; CIDR allocates much closer to what's needed.
- CIDR introduced the /N prefix notation and allows any contiguous prefix length from /0 to /32.
- Classless routing protocols (OSPF, BGP, RIPv2, EIGRP) carry prefix length or mask information; RIPv1 and IGRP do not.
- Supernetting (aggregation) reduces routing table size by combining contiguous blocks.
