# How to Design a VLSM Addressing Plan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, VLSM, Subnetting, Network Design, Address Planning

Description: Designing a VLSM plan requires listing all network segments ordered by size, selecting the parent block, and sequentially allocating the smallest fitting prefix to each segment while preserving...

## The VLSM Design Process

1. List all network segments and their host requirements.
2. Sort segments from largest to smallest host count.
3. Select a parent address block large enough for all segments combined.
4. Allocate the first (largest) segment from the start of the block.
5. Continue sequentially, each new subnet starting immediately after the previous.
6. Document network address, mask, broadcast, and host range for each segment.

## Design Example: 6-Segment Campus Network

Requirements:
- Building-A Users: 200 hosts
- Building-B Users: 100 hosts
- Faculty Servers: 60 hosts
- Lab Network: 30 hosts
- Management: 14 hosts
- WAN Link: 2 hosts

Parent block: `192.168.20.0/23`

```python
import ipaddress, math

def design_vlsm(parent: str, segments: list) -> None:
    """
    Print a VLSM design table for the given segments.
    segments: [(name, required_hosts), ...] - will be sorted internally.
    """
    parent_net = ipaddress.IPv4Network(parent, strict=False)
    sorted_segs = sorted(segments, key=lambda x: x[1], reverse=True)

    print(f"Parent Block: {parent_net}\n")
    print(f"{'Segment':18s} {'Subnet':18s} {'Mask':16s} {'Broadcast':15s} {'First':14s} {'Last':14s} {'Hosts':>6}")
    print("-" * 111)

    pointer = int(parent_net.network_address)
    parent_end = int(parent_net.broadcast_address)

    for name, hosts_needed in sorted_segs:
        # Find required prefix
        h_bits = math.ceil(math.log2(hosts_needed + 2))
        prefix = 32 - h_bits
        # Align pointer to subnet boundary (size = 2^h_bits)
        size = 2 ** h_bits
        # Round up pointer to next multiple of size
        if pointer % size != 0:
            pointer = ((pointer // size) + 1) * size

        # Check that the subnet still fits inside the parent block
        if pointer + size - 1 > parent_end:
            raise ValueError(f"Segment {name!r} does not fit inside parent block {parent_net}")

        subnet = ipaddress.IPv4Network(f"{ipaddress.IPv4Address(pointer)}/{prefix}")
        host_list = list(subnet.hosts())

        print(f"{name:18s} {str(subnet):18s} {str(subnet.netmask):16s} {str(subnet.broadcast_address):15s} "
              f"{str(host_list[0]):14s} {str(host_list[-1]):14s} {len(host_list):>6}")

        pointer = int(subnet.broadcast_address) + 1

segments = [
    ("Building-A Users", 200),
    ("Building-B Users", 100),
    ("Faculty Servers",   60),
    ("Lab Network",       30),
    ("Management",        14),
    ("WAN Link",           2),
]

design_vlsm("192.168.20.0/23", segments)
```

## Verify Total Space Used

```python
import ipaddress, math

def total_addresses_needed(segments: list) -> int:
    total = 0
    for _, hosts in segments:
        h_bits = math.ceil(math.log2(hosts + 2))
        total += 2 ** h_bits
    return total

needed = total_addresses_needed(segments)
parent = ipaddress.IPv4Network("192.168.20.0/23")
print(f"\nTotal addresses needed: {needed}")
print(f"Parent block size:      {parent.num_addresses}")
print(f"Utilization: {100*needed/parent.num_addresses:.1f}%")
```

## Key Design Rules

1. **Always sort largest-first**: Prevents fragmentation and alignment issues.
2. **Check fit before allocating**: Verify remaining space can accommodate the segment.
3. **Leave growth room**: Add 20-50% buffer to host estimates.
4. **Document everything**: Record each allocation in an IPAM tool.
5. **Use classless routing**: RIPv1 cannot handle VLSM because it does not advertise subnet masks.

## Key Takeaways

- Sort segments largest-to-smallest before allocating to minimize fragmentation.
- Each new subnet starts immediately after the previous allocation (pointer arithmetic).
- Always verify the design fits within the parent block before deployment.
- VLSM dramatically improves address efficiency compared to fixed-length subnetting.
