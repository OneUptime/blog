# How to Understand Fixed-Length Subnet Masks vs VLSM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, VLSM, FLSM, Subnetting, Networking, Address Planning

Description: Fixed-Length Subnet Masking (FLSM) uses the same prefix length for all subnets in a block, while VLSM allows different prefix lengths per segment, dramatically improving address utilization.

## FLSM: All Subnets Same Size

FLSM divides a parent block into equal-sized pieces. All subnets share the same prefix length:

```text
Parent: 192.168.1.0/24 divided into /27 (FLSM):
  192.168.1.0/27   (30 hosts)
  192.168.1.32/27  (30 hosts)
  192.168.1.64/27  (30 hosts)
  192.168.1.96/27  (30 hosts)
  192.168.1.128/27 (30 hosts)
  192.168.1.160/27 (30 hosts)
  192.168.1.192/27 (30 hosts)
  192.168.1.224/27 (30 hosts)
All subnets: 30 usable hosts, whether they need 2 or 30.
```

**FLSM Problem**: A P2P link needing 2 hosts gets a /27 with 30 usable - 28 wasted.

## VLSM: Right-Size Each Subnet

```python
import ipaddress, math

def vlsm_demo():
    """Demonstrate FLSM waste vs VLSM efficiency."""
    segments = [
        ("LAN-A", 25), ("LAN-B", 20), ("LAN-C", 10),
        ("Server", 5), ("P2P-1", 2), ("P2P-2", 2)
    ]

    # FLSM: use /27 for all (30 hosts each)
    total_flsm = 30 * len(segments)
    needed_total = sum(h for _, h in segments)
    flsm_waste = total_flsm - needed_total

    print(f"FLSM ({len(segments)} × /27 = {total_flsm} hosts allocated)")
    print(f"  Needed: {needed_total}, Wasted: {flsm_waste}")

    # VLSM: right-size each
    vlsm_total = 0
    print("\nVLSM allocations:")
    for name, hosts in segments:
        bits = math.ceil(math.log2(hosts + 2))
        prefix = 32 - bits
        allocated = 2**bits - 2
        vlsm_total += allocated
        print(f"  {name:10s}: /{prefix} = {allocated} hosts (need {hosts})")

    print(f"\nVLSM total allocated: {vlsm_total}")
    print(f"VLSM saved vs FLSM:  {total_flsm - vlsm_total} usable host addresses")

vlsm_demo()
```

## When to Use Each

| Scenario | Recommendation |
|----------|----------------|
| Simple home/SOHO network | FLSM (simpler) |
| Exam simulation (CCNA lab) | FLSM (per question requirements) |
| Enterprise with mixed segment sizes | VLSM |
| ISP customer assignments | VLSM (essential) |
| Routing protocol support | FLSM: works with classful or classless protocols; VLSM: needs classless support |

## Routing Protocol Requirements

- **FLSM**: Can be used with classful protocols such as RIPv1 and IGRP, and also with classless protocols.
- **VLSM**: Requires classless routing support. RIPv2, OSPF, EIGRP, and BGP all carry mask or prefix information.

## Key Takeaways

- FLSM wastes addresses when segment sizes vary; VLSM greatly reduces this waste.
- VLSM requires classless routing protocols that carry prefix lengths in updates.
- Modern networks typically use VLSM; FLSM is mainly seen in legacy environments or exam scenarios.
- A common practice is to allocate largest segments first in a VLSM design to avoid fragmentation.
